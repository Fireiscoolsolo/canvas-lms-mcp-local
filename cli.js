// Command-line side of the Local server: setup, doctor, print-config, --version and --help. index.js sends any
// command-line arguments here; with none it runs the MCP server, which is what AI apps do.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { APPS, PACKAGE, detect, hasCommand, serverEnv, writeEntry, readEntry, snippet } from './lib/apps.js';
import { normalizeBase } from './core/canvas-client.js';
import { saveStoredToken, readStoredToken, storeName } from './core/token-store.js';
import { matchToken, daysLeft } from './core/token-watch.js';
import { ipFamilyFrom } from './core/config.js';
import { applyNetworkSettings, reportConnections } from './core/network.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(fs.readFileSync(path.join(DIR, 'package.json'), 'utf8')).version;
const GUIDE = 'https://fireiscoolsolo.github.io/canvas-lms-mcp-local/';

const HELP = `canvas-lms-mcp-local ${VERSION}: Canvas LMS tools for your AI app

  npx canvas-lms-mcp-local setup                Set it up in your AI apps (asks for your Canvas token)
  npx canvas-lms-mcp-local doctor               Check your setup and say how to fix problems
  npx canvas-lms-mcp-local print-config [app]   Print a snippet to paste into an app's settings
  npx canvas-lms-mcp-local --version
  npx canvas-lms-mcp-local                      Run the server (AI apps start it this way)

setup options, to answer the questions up front:
  --url <school address>      e.g. yourschool.instructure.com
  --token-stdin               read the token from standard input instead of asking
  --apps <list>               comma-separated, e.g. claude,chatgpt,cursor
  --store keychain|config     keep the token in ${storeName()} (keychain) or in each app's settings (config)
  --yes                       replace existing Canvas entries without asking

Apps: ${Object.keys(APPS).join(', ')}
Guide: ${GUIDE}`;

/** --name value / --flag parsing. Positional words come back in `_`. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [k, inline] = a.slice(2).split('=');
    const key = k.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
    if (inline !== undefined) out[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--') && !['yes', 'tokenStdin', 'help', 'version'].includes(key)) out[key] = argv[++i];
    else out[key] = true;
  }
  return out;
}

/** Ask Canvas who the token belongs to, and when it expires. Never throws. */
export async function checkToken(base, token, fetchImpl = fetch) {
  const get = (p) => fetchImpl(`${base}/api/v1${p}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  try {
    const res = await get('/users/self');
    if (res.status === 401) return { ok: false, message: 'Canvas rejected the token: it expired, was deleted, or was copied wrong.', fix: `Make a new one at ${base}/profile/settings (Approved Integrations, + New Access Token).` };
    if (!res.ok) return { ok: false, message: `Canvas answered with HTTP ${res.status}.`, fix: 'Check the school address; it should look like https://yourschool.instructure.com.' };
    let me;
    try { me = await res.json(); } catch { return { ok: false, message: 'That address answered with a web page, not Canvas data.', fix: 'Use the address you see in your browser when you are in Canvas, e.g. https://yourschool.instructure.com.' }; }
    let expires = null;
    try {
      const t = await get(`/users/${me.id}/user_generated_tokens?per_page=100`);
      if (t.ok) expires = matchToken(await t.json(), token)?.expires_at || null;
    } catch { /* some schools hide the token list */ }
    return { ok: true, name: me.name, expires };
  } catch (e) {
    return { ok: false, message: `Couldn't reach ${base} (${e.cause?.code || e.message}).`, fix: 'Check your internet connection and the school address.' };
  }
}

function prompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  let muted = false;
  const write = rl._writeToOutput?.bind(rl);
  if (write) rl._writeToOutput = (s) => { if (!muted) write(s); };
  return {
    ask: (q) => rl.question(q),
    async secret(q) {
      const p = rl.question(q);
      muted = Boolean(process.stdin.isTTY);
      const answer = await p;
      if (muted) process.stdout.write('\n');
      muted = false;
      return answer.trim();
    },
    close: () => rl.close(),
  };
}

const readStdin = async () => { let s = ''; for await (const chunk of process.stdin) s += chunk; return s.trim(); };
const storeUsable = () => process.platform === 'win32' || (process.platform === 'darwin' ? hasCommand('security') : hasCommand('secret-tool'));

export async function setup(opts) {
  const io = opts.tokenStdin && opts.url && opts.apps ? null : prompter();
  try {
    console.log(`Canvas LMS setup (${PACKAGE} ${VERSION})\n`);
    const base = normalizeBase(opts.url || await io.ask('Your school\'s Canvas address (for example yourschool.instructure.com): '));
    try { new URL(base); } catch { throw new Error(`"${opts.url || base}" isn't a web address.`); }

    let token = opts.tokenStdin ? await readStdin() : '';
    let me;
    for (let tries = 0; ; tries++) {
      if (!token) {
        console.log(`\nMake a Canvas token: open ${base}/profile/settings, scroll to Approved Integrations, click + New Access Token, then copy it.`);
        token = await io.secret('Paste your Canvas token (it stays hidden): ');
      }
      me = await checkToken(base, token);
      if (me.ok) break;
      console.log(`✖ ${me.message} ${me.fix || ''}`);
      if (opts.tokenStdin || tries >= 2) throw new Error('Setup stopped because the token did not work.');
      token = '';
    }
    console.log(`✔ Signed in to Canvas as ${me.name}.${me.expires ? ` This token expires ${new Date(me.expires).toDateString()}.` : ''}`);

    const ids = Object.keys(APPS);
    const found = ids.filter((id) => detect(id).installed);
    let chosen;
    if (opts.apps) {
      chosen = String(opts.apps).split(',').map((s) => s.trim()).filter(Boolean);
      const unknown = chosen.filter((id) => !APPS[id]);
      if (unknown.length) throw new Error(`Unknown app: ${unknown.join(', ')}. Choose from ${ids.join(', ')}.`);
    } else {
      console.log('\nWhich apps should get Canvas?');
      ids.forEach((id, i) => console.log(`  ${i + 1}. ${APPS[id].label}${found.includes(id) ? '' : ' (not found on this computer)'}`));
      const def = found.map((id) => ids.indexOf(id) + 1).join(',') || '1';
      const answer = (await io.ask(`Numbers, separated by commas [${def}]: `)).trim() || def;
      chosen = [...new Set(answer.split(/[\s,]+/).map((n) => ids[Number(n) - 1]).filter(Boolean))];
      if (!chosen.length) throw new Error('No apps picked.');
    }

    let useStore = opts.store === 'keychain';
    if (!opts.store && io && storeUsable()) {
      useStore = !/^n/i.test((await io.ask(`\nKeep the token in ${storeName()} instead of in each app's settings file? It's safer. [Y/n]: `)).trim());
    }
    if (useStore) {
      saveStoredToken(token);
      if (readStoredToken() !== token) throw new Error(`The token didn't save in ${storeName()}. Run setup again and answer "n" to keep it in the app settings instead.`);
      console.log(`✔ Token saved in ${storeName()}.`);
    }
    const env = serverEnv({ baseUrl: base, token, useStore });

    console.log('');
    const done = [];
    for (const id of chosen) {
      const app = APPS[id];
      try {
        const file = detect(id).files[0];
        let existing = null;
        try { existing = app.kind === 'cli' ? null : readEntry(id, file); } catch { /* writeEntry reports a broken file */ }
        if (existing && !opts.yes && io && /^n/i.test((await io.ask(`${app.label} already has a Canvas entry. Replace it? [Y/n]: `)).trim())) {
          console.log(`- ${app.label}: left as it was.`);
          continue;
        }
        const r = writeEntry(id, env);
        console.log(`✔ ${app.label}: Canvas added${r.backup ? ` (old settings backed up to ${r.backup})` : ''}.`);
        done.push(id);
      } catch (e) {
        console.log(`✖ ${app.label}: ${e.message}`);
      }
    }
    if (!done.length) return 1;
    console.log('\nNext:');
    for (const id of done) console.log(`  - ${APPS[id].label}: ${APPS[id].restart}`);
    console.log('  Then ask your AI: "What\'s due this week?"');
    if (done.includes('chatgpt')) console.log('  In the ChatGPT app, Canvas works in Codex chats.');
    return 0;
  } finally {
    io?.close();
  }
}

export async function doctor({ fetchImpl = fetch } = {}) {
  let problems = 0;
  const good = (m) => console.log(`  ✔ ${m}`);
  const bad = (m, fix) => { problems++; console.log(`  ✖ ${m}${fix ? `\n      Fix: ${fix}` : ''}`); };
  const note = (m) => console.log(`  - ${m}`);
  const warn = (m) => console.log(`  ! ${m}`);
  console.log(`Canvas MCP doctor (${PACKAGE} ${VERSION})\n\nThis computer:`);
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 18) good(`Node.js ${process.versions.node}`); else bad(`Node.js ${process.versions.node} is too old`, 'Install Node.js 20 or newer from https://nodejs.org');
  if (hasCommand('npx')) good('npx is available'); else bad('npx was not found', 'Install Node.js from https://nodejs.org (it includes npx), then restart your apps.');

  console.log('\nAI apps:');
  const sources = [];
  for (const [id, app] of Object.entries(APPS)) {
    const d = detect(id);
    if (!d.installed) { note(`${app.label}: not installed`); continue; }
    if (app.kind === 'cli') {
      const r = spawnSync('claude', ['mcp', 'get', 'canvas'], { encoding: 'utf8', shell: process.platform === 'win32', windowsHide: true });
      if (r.status === 0) good(`${app.label}: Canvas is set up`); else note(`${app.label}: installed, Canvas not set up (npx ${PACKAGE} setup --apps claude-code)`);
      continue;
    }
    let entry = null;
    let where = null;
    for (const f of d.files) {
      try { entry = readEntry(id, f); } catch (e) { bad(`${app.label}: ${e.message}`); }
      if (entry) { where = f; break; }
    }
    if (!entry) { note(`${app.label}: installed, Canvas not set up (npx ${PACKAGE} setup)`); continue; }
    const ours = JSON.stringify(entry).includes(PACKAGE);
    good(`${app.label}: Canvas is set up${ours ? '' : ' (with a different Canvas server)'} in ${where}`);
    if (ours) sources.push({ label: app.label, env: entry.env || {} });
  }
  if (process.env.CANVAS_API_TOKEN || process.env.CANVAS_BASE_URL) sources.push({ label: 'environment variables', env: process.env });

  console.log('\nCanvas:');
  if (!sources.length) bad('No Canvas settings found in any app', `Run: npx ${PACKAGE} setup`);
  const seen = new Set();
  for (const s of sources) {
    const base = normalizeBase(s.env.CANVAS_BASE_URL);
    let token = s.env.CANVAS_API_TOKEN || '';
    if (!token && /keychain/i.test(String(s.env.CANVAS_TOKEN_STORE || ''))) {
      try { token = readStoredToken(); } catch (e) { bad(`${s.label}: ${e.message}`); continue; }
      if (!token) { bad(`${s.label}: the token isn't in ${storeName()}`, `Run: npx ${PACKAGE} setup`); continue; }
    }
    if (!base) { bad(`${s.label}: no school address (CANVAS_BASE_URL)`, `Run: npx ${PACKAGE} setup`); continue; }
    if (!token) { bad(`${s.label}: no Canvas token`, `Run: npx ${PACKAGE} setup`); continue; }
    const key = `${base}|${token}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = await checkToken(base, token, fetchImpl);
    if (!r.ok) { bad(`${s.label}: ${r.message}`, r.fix); continue; }
    good(`${s.label}: signed in as ${r.name} at ${base}`);
    const d = daysLeft(r.expires);
    if (d !== null && d <= 7) { problems++; warn(`The token expires in ${Math.max(0, Math.ceil(d))} day(s). Make a new one at ${base}/profile/settings, then run setup again.`); }
    else if (d !== null) note(`The token expires ${new Date(r.expires).toDateString()} (${Math.ceil(d)} days).`);
  }

  const schools = [...new Set(sources.map((s) => normalizeBase(s.env.CANVAS_BASE_URL)))].filter((b) => b.startsWith('https:'));
  if (schools.length) console.log('\nNetwork:');
  for (const school of schools) await reportConnections(school, { good, bad });

  console.log(problems ? `\n${problems} problem${problems === 1 ? '' : 's'} found.` : '\nEverything looks good.');
  return problems ? 1 : 0;
}

export function printConfig(opts) {
  const id = opts._[1] || 'claude';
  if (!APPS[id]) { console.error(`Unknown app: ${id}. Choose from ${Object.keys(APPS).join(', ')}.`); return 1; }
  const env = serverEnv({ baseUrl: opts.url ? normalizeBase(opts.url) : 'https://yourschool.instructure.com', token: 'paste-your-canvas-token-here', useStore: opts.store === 'keychain' });
  const app = APPS[id];
  const where = app.kind === 'cli' ? 'Run this in a terminal:' : `Add this to ${detect(id).files[0]}${app.kind === 'json' ? ' (merge it with what is already there)' : ''}:`;
  console.log(`${app.label}. ${where}\n\n${snippet(id, env)}\n`);
  if (opts.store !== 'keychain') console.log(`Replace the placeholder values, or run "npx ${PACKAGE} setup" to fill them in for you.`);
  return 0;
}

export async function runCli(argv) {
  const opts = parseArgs(argv);
  const cmd = opts._[0];
  if (opts.version || cmd === 'version' || argv.includes('-v')) { console.log(VERSION); return 0; }
  if (opts.help || cmd === 'help' || argv.includes('-h') || !cmd) { console.log(HELP); return 0; }
  applyNetworkSettings({ ipFamily: ipFamilyFrom() });
  try {
    if (cmd === 'setup') return await setup(opts);
    if (cmd === 'doctor') return await doctor();
    if (cmd === 'print-config') return printConfig(opts);
  } catch (e) {
    console.error(`\n${e.message}`);
    return 1;
  }
  console.error(`Unknown command: ${cmd}\n\n${HELP}`);
  return 1;
}
