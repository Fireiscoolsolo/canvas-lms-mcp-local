// What setup writes into each AI app on each system. An app opened from the Dock on a Mac starts the server with a
// short PATH, so the entry has to name npx in full and give Node's folder. Temp files only; nothing is downloaded.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { entryFor, writeEntry, restartFor, APPS } from '../lib/apps.js';

const env = { CANVAS_BASE_URL: 'https://canvas.example.edu', CANVAS_API_TOKEN: 'made-up-token' };
const macNode = { nodeDir: '/Users/sam/.nvm/versions/node/v22.11.0/bin', exists: (p) => p === '/Users/sam/.nvm/versions/node/v22.11.0/bin/npx' };

test('on a Mac, each app gets the full path to npx and a PATH that starts with Node\'s folder', () => {
  for (const id of ['claude', 'cursor', 'vscode', 'windsurf', 'gemini', 'lmstudio', 'chatgpt']) {
    const e = entryFor(id, env, 'darwin', macNode);
    assert.equal(e.command, '/Users/sam/.nvm/versions/node/v22.11.0/bin/npx', id);
    assert.deepEqual(e.args, ['-y', 'canvas-lms-mcp-local'], id);
    assert.equal(e.env.PATH, '/Users/sam/.nvm/versions/node/v22.11.0/bin:/usr/bin:/bin:/usr/sbin:/sbin', id);
    assert.equal(e.env.CANVAS_API_TOKEN, 'made-up-token', id);
  }
  assert.equal(entryFor('chatgpt', env, 'darwin', macNode).startup_timeout_sec, 120);
  const noNpx = entryFor('claude', env, 'linux', { nodeDir: '/usr/local/bin', exists: () => false });
  assert.equal(noNpx.command, 'npx', 'falls back to plain npx when none sits next to Node');
  assert.match(noNpx.env.PATH, /^\/usr\/local\/bin:/);
});

test('on Windows, the entries are exactly what they were', () => {
  const win = { nodeDir: 'C:\\Program Files\\nodejs', exists: (p) => p === 'C:\\Program Files\\nodejs\\npx.cmd' };
  assert.deepEqual(entryFor('claude', env, 'win32', win), { command: 'C:\\Program Files\\nodejs\\npx.cmd', args: ['-y', 'canvas-lms-mcp-local'], env });
  assert.deepEqual(entryFor('cursor', env, 'win32', win), { command: 'cmd', args: ['/c', 'npx', '-y', 'canvas-lms-mcp-local'], env });
  assert.deepEqual(entryFor('vscode', env, 'win32', win), { type: 'stdio', command: 'cmd', args: ['/c', 'npx', '-y', 'canvas-lms-mcp-local'], env });
  assert.deepEqual(entryFor('chatgpt', env, 'win32', win), { command: 'cmd', args: ['/c', 'npx', '-y', 'canvas-lms-mcp-local'], startup_timeout_sec: 120, env });
});

test('restart steps use the right words on each system', () => {
  assert.match(restartFor('claude', 'win32'), /tray icon/);
  assert.match(restartFor('claude', 'darwin'), /⌘Q/);
  assert.doesNotMatch(restartFor('claude', 'darwin'), /tray/);
  for (const id of Object.keys(APPS)) for (const p of ['win32', 'darwin', 'linux']) assert.ok(restartFor(id, p), `${id} on ${p}`);
});

test('with only the system folders on PATH, the entry still finds npx and npx still finds Node', { skip: process.platform === 'win32' && 'a Windows entry runs through cmd' }, () => {
  const e = entryFor('claude', env, process.platform);
  assert.ok(path.isAbsolute(e.command), e.command);
  const r = spawnSync(e.command, ['--version'], { env: { HOME: os.homedir(), PATH: e.env.PATH }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('a config that holds the token is readable only by you on macOS and Linux, and so is its backup', { skip: process.platform === 'win32' && 'Windows file modes don\'t work this way' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-apps-'));
  try {
    const file = path.join(dir, 'mcp.json');
    fs.writeFileSync(file, JSON.stringify({ mcpServers: { other: { command: 'x' } } }), { mode: 0o644 });
    writeEntry('cursor', env, { file });
    const r = writeEntry('cursor', env, { file });
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(fs.statSync(r.backup).mode & 0o777, 0o600);
    const store = path.join(dir, 'store.json');
    writeEntry('cursor', { CANVAS_BASE_URL: 'https://canvas.example.edu', CANVAS_TOKEN_STORE: 'keychain' }, { file: store });
    assert.ok(fs.existsSync(store), 'a config without the token is written as usual');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
