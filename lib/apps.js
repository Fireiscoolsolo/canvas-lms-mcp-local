// Where each AI app keeps its MCP settings, and safe edits to them: every write is backed up first, written
// through a temp file, read back and checked, and a broken file is reported rather than overwritten.
// Used by `npx canvas-lms-mcp-local setup`, `doctor` and `print-config` (cli.js).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseToml } from 'smol-toml';

export const PACKAGE = 'canvas-lms-mcp-local';
export const NAME = 'canvas';

const home = () => os.homedir();
const appData = () => process.env.APPDATA || path.join(home(), 'AppData', 'Roaming');
const configHome = () => process.env.XDG_CONFIG_HOME || path.join(home(), '.config');

/** Every place Claude Desktop might keep its config, including the Microsoft Store copy on Windows. */
function claudeFiles(platform = process.platform) {
  if (platform === 'darwin') return [path.join(home(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')];
  if (platform !== 'win32') return [path.join(configHome(), 'Claude', 'claude_desktop_config.json')];
  const out = [path.join(appData(), 'Claude', 'claude_desktop_config.json')];
  const pkgs = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Packages') : null;
  let names = [];
  try { names = pkgs ? fs.readdirSync(pkgs) : []; } catch { /* no Packages folder */ }
  for (const n of names) if (/^Claude_/i.test(n)) out.push(path.join(pkgs, n, 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json'));
  return out;
}

function vscodeFile(platform = process.platform) {
  if (platform === 'win32') return path.join(appData(), 'Code', 'User', 'mcp.json');
  if (platform === 'darwin') return path.join(home(), 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
  return path.join(configHome(), 'Code', 'User', 'mcp.json');
}

/**
 * The apps setup knows. kind: json (an mcpServers-style map), toml (the ChatGPT desktop app's config.toml) or
 * cli (Claude Code, set up through its own `claude mcp add` command).
 *   suggest  the tool profile setup suggests for it (core/profiles.js)
 *   limit    the most tools the app can use, where its docs give a hard number; doctor warns above it
 * The limits and suggestions come from each app's docs, listed in the README's "Tool profiles" section.
 */
export const APPS = {
  claude: { label: 'Claude Desktop', kind: 'json', key: 'mcpServers', files: claudeFiles, suggest: 'full', restart: { win32: 'Quit Claude Desktop completely (tray icon > Quit) and open it again.', darwin: 'Quit Claude Desktop with ⌘Q and open it again.', other: 'Quit Claude Desktop completely and open it again.' } },
  chatgpt: { label: 'ChatGPT desktop app', kind: 'toml', files: () => [path.join(home(), '.codex', 'config.toml')], suggest: 'full', restart: 'Quit the ChatGPT desktop app completely and open it again.' },
  'claude-code': { label: 'Claude Code', kind: 'cli', files: () => [path.join(home(), '.claude.json')], suggest: 'full', restart: 'Start a new Claude Code session.' },
  cursor: { label: 'Cursor', kind: 'json', key: 'mcpServers', files: () => [path.join(home(), '.cursor', 'mcp.json')], suggest: 'essentials', restart: 'Restart Cursor, or open Settings > MCP and refresh.' },
  vscode: { label: 'VS Code (Copilot)', kind: 'json', key: 'servers', extra: { type: 'stdio' }, files: () => [vscodeFile()], suggest: 'core', limit: 128, restart: 'Restart VS Code, then turn on the canvas server in the Copilot chat tools menu.' },
  windsurf: { label: 'Windsurf', kind: 'json', key: 'mcpServers', files: () => [path.join(home(), '.codeium', 'windsurf', 'mcp_config.json')], suggest: 'core', limit: 100, restart: 'Restart Windsurf, or refresh in Cascade > MCP servers.' },
  gemini: { label: 'Gemini CLI', kind: 'json', key: 'mcpServers', files: () => [path.join(home(), '.gemini', 'settings.json')], suggest: 'full', restart: 'Start a new Gemini CLI session.' },
  lmstudio: { label: 'LM Studio', kind: 'json', key: 'mcpServers', files: () => [path.join(home(), '.lmstudio', 'mcp.json')], suggest: 'essentials', restart: 'Restart LM Studio.' },
};

/** An app counts as installed when its settings folder exists (or, for Claude Code, its command does). */
export function detect(id) {
  const app = APPS[id];
  if (app.kind === 'cli') return { installed: hasCommand('claude'), files: app.files() };
  const files = app.files();
  const existing = files.filter((f) => fs.existsSync(path.dirname(f)));
  return { installed: existing.length > 0, files: existing.length ? existing : files.slice(0, 1) };
}

export function hasCommand(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8', windowsHide: true });
  return r.status === 0;
}

/** What to tell the student after setup, in the words their system uses. */
export function restartFor(id, platform = process.platform) {
  const r = APPS[id].restart;
  return typeof r === 'string' ? r : r[platform] || r.other;
}

// Where this Node is, so an app can find it. Tests pass made-up folders.
const thisNode = () => ({ nodeDir: path.dirname(process.execPath), exists: fs.existsSync });
// What a Mac or Linux app started from the Dock or a menu usually has on PATH, and nothing more.
const SYSTEM_PATH = '/usr/bin:/bin:/usr/sbin:/sbin';

/**
 * The npx to start the server with. On Windows, npx.cmd next to this Node for Claude Desktop, which needs the full
 * path there. On macOS and Linux, the npx next to this Node, because an AI app opened from the Dock or a menu starts
 * with a short PATH that may not have it (Node from nvm, Volta or the nodejs.org installer).
 */
export function npxCommand(platform = process.platform, { nodeDir, exists } = thisNode()) {
  const beside = platform === 'win32' ? path.win32.join(nodeDir, 'npx.cmd') : path.posix.join(nodeDir, 'npx');
  return exists(beside) ? beside : 'npx';
}

/** Environment for the server: the token itself, or a pointer to the password store, and the tool profile unless it's full. */
export function serverEnv({ baseUrl, token, useStore, profile }) {
  const env = useStore ? { CANVAS_BASE_URL: baseUrl, CANVAS_TOKEN_STORE: 'keychain' } : { CANVAS_BASE_URL: baseUrl, CANVAS_API_TOKEN: token };
  return profile && profile !== 'full' ? { ...env, CANVAS_PROFILE: profile } : env;
}

/**
 * The Local server entry for one app. On macOS and Linux it names npx in full and gives the server a PATH that starts
 * with Node's folder, so it starts whatever PATH the app was opened with. Windows entries are as they always were.
 */
export function entryFor(id, env, platform = process.platform, node = thisNode()) {
  const app = APPS[id];
  if (platform !== 'win32') {
    const unixEnv = { ...env, PATH: `${node.nodeDir}:${SYSTEM_PATH}` };
    const command = npxCommand(platform, node);
    if (app.kind === 'toml') return { command, args: ['-y', PACKAGE], startup_timeout_sec: 120, env: unixEnv };
    return { ...(app.extra || {}), command, args: ['-y', PACKAGE], env: unixEnv };
  }
  if (app.kind === 'toml') return { command: 'cmd', args: ['/c', 'npx', '-y', PACKAGE], startup_timeout_sec: 120, env };
  const command = id === 'claude' ? npxCommand(platform, node) : 'cmd';
  const args = command === 'cmd' ? ['/c', 'npx', '-y', PACKAGE] : ['-y', PACKAGE];
  return { ...(app.extra || {}), command, args, env };
}

export const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

/**
 * Back up the file, then write it through a temp file. On macOS and Linux a file that holds the Canvas token, and its
 * backup, are made readable only by you, since other accounts on the computer can read files by default there.
 */
function backupAndWrite(file, text, now, platform = process.platform) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const secret = platform !== 'win32' && [text, before].some((t) => t && t.includes('CANVAS_API_TOKEN'));
  let backup = null;
  if (before !== null) {
    const ext = path.extname(file);
    backup = path.join(path.dirname(file), `${path.basename(file, ext)}.backup-${stamp(now)}${ext}`);
    fs.copyFileSync(file, backup);
    if (secret) fs.chmodSync(backup, 0o600);
  }
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text, secret ? { mode: 0o600 } : undefined);
  if (secret) fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, file);
  return backup;
}

/** Read an app's JSON config: missing or empty is {}, broken JSON throws (never overwritten). */
export function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch (e) { throw new Error(`${file} isn't valid JSON (${e.message}). Fix or remove it, then run setup again.`); }
}

/** Current Canvas entry in an app's config, or null. */
export function readEntry(id, file) {
  const app = APPS[id];
  if (!fs.existsSync(file)) return null;
  if (app.kind === 'toml') return parseToml(fs.readFileSync(file, 'utf8'))?.mcp_servers?.[NAME] || null;
  if (app.kind === 'json') return readJson(file)?.[app.key]?.[NAME] || null;
  return null;
}

/** Replace the [mcp_servers.canvas] table (and its sub-tables) in TOML text, keeping everything else as written. */
export function spliceTomlTable(text, block) {
  const lines = String(text || '').split(/\r?\n/);
  const isOurs = (l) => /^\s*\[\s*mcp_servers\s*\.\s*"?canvas"?\s*(\.[^\]]*)?\]\s*(#.*)?$/.test(l);
  const out = [];
  let skipping = false;
  for (const l of lines) {
    if (/^\s*\[/.test(l)) skipping = isOurs(l);
    if (!skipping) out.push(l);
  }
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return `${out.join('\n')}${out.length ? '\n\n' : ''}${block}\n`;
}

const tomlValue = (v) => (Array.isArray(v) ? `[${v.map(tomlValue).join(', ')}]` : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(String(v)));

export function tomlBlock(entry) {
  const { env, ...rest } = entry;
  const lines = [`[mcp_servers.${NAME}]`, ...Object.entries(rest).map(([k, v]) => `${k} = ${tomlValue(v)}`)];
  if (env) lines.push('', `[mcp_servers.${NAME}.env]`, ...Object.entries(env).map(([k, v]) => `${k} = ${tomlValue(v)}`));
  return lines.join('\n');
}

/** Add (or replace) the Canvas entry in one app. Returns { file, backup } or throws a readable error. */
export function writeEntry(id, env, { file, now = new Date(), platform = process.platform } = {}) {
  const app = APPS[id];
  const entry = entryFor(id, env, platform);
  if (app.kind === 'cli') {
    const args = ['mcp', 'add', NAME, '--scope', 'user', ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]), '--', 'npx', '-y', PACKAGE];
    spawnSync('claude', ['mcp', 'remove', NAME, '--scope', 'user'], { encoding: 'utf8', shell: platform === 'win32', windowsHide: true });
    const r = spawnSync('claude', args, { encoding: 'utf8', shell: platform === 'win32', windowsHide: true });
    if (r.status !== 0) throw new Error(`claude mcp add failed: ${(r.stderr || r.stdout || '').trim().split('\n')[0] || `exit ${r.status}`}`);
    return { file: 'Claude Code user settings', backup: null };
  }
  const target = file || detect(id).files[0];
  if (app.kind === 'toml') {
    const before = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    try { parseToml(before); } catch (e) { throw new Error(`${target} isn't valid TOML (${e.message}). Fix or remove it, then run setup again.`); }
    const text = spliceTomlTable(before, tomlBlock(entry));
    const check = parseToml(text);
    if (!check?.mcp_servers?.[NAME]) throw new Error('Could not add the Canvas entry to config.toml.');
    const backup = backupAndWrite(target, text, now, platform);
    return { file: target, backup };
  }
  const config = readJson(target);
  config[app.key] = { ...(config[app.key] || {}), [NAME]: entry };
  const backup = backupAndWrite(target, `${JSON.stringify(config, null, 2)}\n`, now, platform);
  if (!readJson(target)?.[app.key]?.[NAME]) {
    if (backup) fs.copyFileSync(backup, target);
    throw new Error(`Writing ${target} didn't stick; your old settings were put back.`);
  }
  return { file: target, backup };
}

/** A ready-to-paste snippet for one app, with placeholders unless real values are given. */
export function snippet(id, env, platform = process.platform) {
  const app = APPS[id];
  const entry = entryFor(id, env, platform);
  if (app.kind === 'toml') return tomlBlock(entry);
  if (app.kind === 'cli') return `claude mcp add ${NAME} --scope user ${Object.entries(env).map(([k, v]) => `-e ${k}=${v}`).join(' ')} -- npx -y ${PACKAGE}`;
  return JSON.stringify({ [app.key]: { [NAME]: entry } }, null, 2);
}
