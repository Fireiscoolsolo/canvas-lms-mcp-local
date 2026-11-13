// The command-line side: --version, print-config, and setup/doctor against a local fake Canvas with a throwaway
// home folder, so no real app settings or Canvas account are touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse as parseToml } from 'smol-toml';
import { spliceTomlTable, tomlBlock } from '../lib/apps.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function run(args, { env = {}, input = '' } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'index.js'), ...args], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('exit', (code) => resolve({ code, out }));
    child.stdin.end(input);
  });
}

function fakeHome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-cli-'));
  const env = { HOME: dir, USERPROFILE: dir, APPDATA: path.join(dir, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(dir, 'AppData', 'Local'), XDG_CONFIG_HOME: path.join(dir, '.config'), CANVAS_API_TOKEN: '', CANVAS_BASE_URL: '' };
  return { dir, env };
}

function fakeCanvas() {
  const server = http.createServer((req, res) => {
    const auth = req.headers.authorization;
    res.setHeader('content-type', 'application/json');
    if (auth !== 'Bearer good-token-123') { res.statusCode = 401; return res.end('{"errors":[{"message":"Invalid access token."}]}'); }
    if (req.url.startsWith('/api/v1/users/self')) return res.end('{"id":"5","name":"Alex Example"}');
    if (req.url.startsWith('/api/v1/users/5/user_generated_tokens')) return res.end(JSON.stringify([{ id: '1', token_hint: 'good-', expires_at: new Date(Date.now() + 39.5 * 86400000).toISOString() }]));
    res.statusCode = 404;
    res.end('{}');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

test('--version and --help answer without starting the server', async () => {
  assert.equal((await run(['--version'])).out.trim(), pkg.version);
  const help = await run(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.out, /setup/);
  assert.match(help.out, /doctor/);
});

test('print-config shows a paste-ready snippet with placeholders', async () => {
  const claude = await run(['print-config', 'claude']);
  const json = JSON.parse(claude.out.slice(claude.out.indexOf('{'), claude.out.lastIndexOf('}') + 1));
  assert.deepEqual(json.mcpServers.canvas.args.slice(-2), ['-y', 'canvas-lms-mcp-local']);
  assert.equal(json.mcpServers.canvas.env.CANVAS_API_TOKEN, 'paste-your-canvas-token-here');
  const chatgpt = await run(['print-config', 'chatgpt', '--store', 'keychain']);
  assert.match(chatgpt.out, /\[mcp_servers\.canvas\.env\]\nCANVAS_BASE_URL = "https:\/\/yourschool\.instructure\.com"\nCANVAS_TOKEN_STORE = "keychain"/);
  assert.equal((await run(['print-config', 'nope'])).code, 1);
});

test('setup writes Canvas into each app, keeps other settings and backs them up', async () => {
  const { server, url } = await fakeCanvas();
  const { dir, env } = fakeHome();
  try {
    const claudeFile = path.join(env.APPDATA, 'Claude', 'claude_desktop_config.json');
    const darwinClaude = path.join(dir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    const linuxClaude = path.join(env.XDG_CONFIG_HOME, 'Claude', 'claude_desktop_config.json');
    const target = process.platform === 'win32' ? claudeFile : process.platform === 'darwin' ? darwinClaude : linuxClaude;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({ mcpServers: { other: { command: 'x' } }, theme: 'dark' }));
    const codex = path.join(dir, '.codex', 'config.toml');
    fs.mkdirSync(path.dirname(codex), { recursive: true });
    fs.writeFileSync(codex, 'model = "gpt-5"\n\n[mcp_servers.canvas]\ncommand = "old"\n\n[mcp_servers.canvas.env]\nX = "1"\n\n[mcp_servers.other]\ncommand = "keep"\n');

    const r = await run(['setup', '--url', url, '--token-stdin', '--apps', 'claude,chatgpt,cursor', '--store', 'config', '--yes'], { env, input: 'good-token-123\n' });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /Signed in to Canvas as Alex Example/);

    const claude = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.equal(claude.theme, 'dark');
    assert.equal(claude.mcpServers.other.command, 'x');
    assert.equal(claude.mcpServers.canvas.env.CANVAS_API_TOKEN, 'good-token-123');
    assert.equal(claude.mcpServers.canvas.env.CANVAS_BASE_URL, url);
    assert.ok(fs.readdirSync(path.dirname(target)).some((f) => f.includes('.backup-')), 'Claude settings backed up');

    const toml = parseToml(fs.readFileSync(codex, 'utf8'));
    assert.equal(toml.model, 'gpt-5');
    assert.equal(toml.mcp_servers.other.command, 'keep');
    assert.equal(toml.mcp_servers.canvas.startup_timeout_sec, 120);
    assert.equal(toml.mcp_servers.canvas.env.CANVAS_API_TOKEN, 'good-token-123');
    assert.equal(toml.mcp_servers.canvas.env.X, undefined, 'old sub-table replaced');

    const cursor = JSON.parse(fs.readFileSync(path.join(dir, '.cursor', 'mcp.json'), 'utf8'));
    assert.ok(cursor.mcpServers.canvas);

    const doc = await run(['doctor'], { env });
    assert.match(doc.out, /Claude Desktop: Canvas is set up/);
    assert.match(doc.out, /signed in as Alex Example/);
    assert.match(doc.out, /The token expires .* \(40 days\)/);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('setup stops on a bad token and never writes anything', async () => {
  const { server, url } = await fakeCanvas();
  const { dir, env } = fakeHome();
  try {
    const r = await run(['setup', '--url', url, '--token-stdin', '--apps', 'cursor', '--store', 'config'], { env, input: 'wrong\n' });
    assert.equal(r.code, 1);
    assert.match(r.out, /Canvas rejected the token/);
    assert.ok(!fs.existsSync(path.join(dir, '.cursor', 'mcp.json')));
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('setup --profile writes the profile by name, and full needs no line', async () => {
  const { server, url } = await fakeCanvas();
  const { dir, env } = fakeHome();
  try {
    const cursor = path.join(dir, '.cursor', 'mcp.json');
    const r = await run(['setup', '--url', url, '--token-stdin', '--apps', 'cursor', '--store', 'config', '--profile', '3', '--yes'], { env, input: 'good-token-123\n' });
    assert.equal(r.code, 0, r.out);
    assert.equal(JSON.parse(fs.readFileSync(cursor, 'utf8')).mcpServers.canvas.env.CANVAS_PROFILE, 'study');
    const full = await run(['setup', '--url', url, '--token-stdin', '--apps', 'cursor', '--store', 'config', '--profile', 'full', '--yes'], { env, input: 'good-token-123\n' });
    assert.equal(full.code, 0, full.out);
    assert.equal(JSON.parse(fs.readFileSync(cursor, 'utf8')).mcpServers.canvas.env.CANVAS_PROFILE, undefined);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('setup --profile with a name nobody can read stops before writing anything', async () => {
  const { server, url } = await fakeCanvas();
  const { dir, env } = fakeHome();
  try {
    const r = await run(['setup', '--url', url, '--token-stdin', '--apps', 'cursor', '--store', 'config', '--profile', 'nope', '--yes'], { env, input: 'good-token-123\n' });
    assert.equal(r.code, 1);
    assert.match(r.out, /isn't a tool profile/);
    assert.match(r.out, /essentials/);
    assert.ok(!fs.existsSync(path.join(dir, '.cursor', 'mcp.json')));
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('print-config --profile adds the line', async () => {
  const r = await run(['print-config', 'cursor', '--profile', 'grades']);
  assert.equal(JSON.parse(r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1)).mcpServers.canvas.env.CANVAS_PROFILE, 'grades');
  assert.equal((await run(['print-config', 'cursor', '--profile', '9'])).code, 1);
});

test('doctor shows each app\'s profile and warns when an app can\'t handle that many tools', async () => {
  const { server, url } = await fakeCanvas();
  const { dir, env } = fakeHome();
  try {
    const vscode = process.platform === 'win32' ? path.join(env.APPDATA, 'Code', 'User', 'mcp.json')
      : process.platform === 'darwin' ? path.join(dir, 'Library', 'Application Support', 'Code', 'User', 'mcp.json')
        : path.join(env.XDG_CONFIG_HOME, 'Code', 'User', 'mcp.json');
    fs.mkdirSync(path.dirname(vscode), { recursive: true });
    const entry = (profile) => ({ servers: { canvas: { type: 'stdio', command: 'npx', args: ['-y', 'canvas-lms-mcp-local'], env: { CANVAS_BASE_URL: url, CANVAS_API_TOKEN: 'good-token-123', ...(profile ? { CANVAS_PROFILE: profile } : {}) } } } });
    fs.writeFileSync(vscode, JSON.stringify(entry()));
    const big = await run(['doctor'], { env });
    assert.match(big.out, /VS Code \(Copilot\).*Everything \(\d{3} tools\)/);
    assert.match(big.out, /128/, 'says why: VS Code stops at 128 tools');
    assert.match(big.out, /--profile core/);
    fs.writeFileSync(vscode, JSON.stringify(entry('core')));
    const fine = await run(['doctor'], { env });
    assert.match(fine.out, /Core \(49 tools\)/);
    assert.doesNotMatch(fine.out, /128/);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('broken app settings are reported, not overwritten', async () => {
  const { server, url } = await fakeCanvas();
  const { dir, env } = fakeHome();
  try {
    const file = path.join(dir, '.cursor', 'mcp.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{ not json');
    const r = await run(['setup', '--url', url, '--token-stdin', '--apps', 'cursor', '--store', 'config', '--yes'], { env, input: 'good-token-123\n' });
    assert.match(r.out, /isn't valid JSON/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{ not json');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the TOML splice only touches the canvas tables', () => {
  const before = '# my settings\nmodel = "x"\n[mcp_servers."canvas"]\ncommand = "a"\n[mcp_servers.canvas.env]\nA = "1"\n[profiles.work]\nmodel = "y"\n';
  const after = spliceTomlTable(before, tomlBlock({ command: 'npx', args: ['-y', 'canvas-lms-mcp-local'], env: { B: '2' } }));
  const t = parseToml(after);
  assert.equal(t.profiles.work.model, 'y');
  assert.deepEqual({ ...t.mcp_servers.canvas.env }, { B: '2' });
  assert.match(after, /^# my settings/);
});
