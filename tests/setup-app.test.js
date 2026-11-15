// The files the Canvas MCP Installer Assistant reads to update itself (docs/setup-app/latest.json and latest-beta.json),
// and docs/setup-app/pick.js, which the download page and the app page use to hand out the right installer.
// The URL shapes are the ones the app's own updater accepts (main/updates.js in the app).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const read = (rel) => fs.readFileSync(path.join(DOCS, rel), 'utf8');

const EXE = /^https:\/\/github\.com\/Fireiscoolsolo\/canvas-lms-mcp-(?:local|server)\/releases\/download\/v\d+(?:\.\d+)*\/(CanvasMCPInstallerAssistant-Setup-(\d+\.\d+\.\d+)\.exe)$/;
const ZIP = /^https:\/\/github\.com\/Fireiscoolsolo\/canvas-lms-mcp-(?:local|server)\/releases\/download\/v\d+(?:\.\d+)*\/(CanvasMCPInstallerAssistant-(\d+\.\d+\.\d+)-mac-universal\.zip)$/;
const DMG = /^https:\/\/github\.com\/Fireiscoolsolo\/canvas-lms-mcp-(?:local|server)\/releases\/download\/v\d+(?:\.\d+)*\/(CanvasMCPInstallerAssistant-(\d+\.\d+\.\d+)-mac-universal\.dmg)$/;
const SHA = /^[0-9a-f]{64}$/;

function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return Math.sign(pa[i] - pb[i]);
  return 0;
}

/** One update file: the Windows installer at the top (apps before 0.9.0 read only that) and a section per system. */
function checkFeed(name) {
  const j = JSON.parse(read(`setup-app/${name}`));
  assert.match(j.version, /^\d+\.\d+\.\d+$/, `${name}: a plain x.y.z version`);
  const exe = EXE.exec(j.url);
  assert.ok(exe, `${name}: the top level is the Windows installer on a vX.Y.Z release`);
  assert.equal(exe[2], j.version, `${name}: the installer's name has the same version`);
  assert.match(j.sha256, SHA, `${name}: the installer's checksum`);
  assert.ok(j.notes, `${name}: notes for the update popup`);

  const win = j.platforms?.win32;
  assert.ok(win, `${name}: platforms.win32`);
  assert.deepEqual({ version: win.version, url: win.url, sha256: win.sha256 }, { version: j.version, url: j.url, sha256: j.sha256 }, `${name}: platforms.win32 matches the top level`);

  const mac = j.platforms?.darwin;
  assert.ok(mac, `${name}: platforms.darwin`);
  const zip = ZIP.exec(mac.url);
  const dmg = DMG.exec(mac.dmg);
  assert.ok(zip, `${name}: the Mac url is the universal zip the updater swaps in`);
  assert.ok(dmg, `${name}: the Mac dmg for the download page and the browser fallback`);
  assert.equal(zip[2], mac.version);
  assert.equal(dmg[2], mac.version);
  assert.match(mac.sha256, SHA, `${name}: the zip's checksum (a Mac only swaps in place with one)`);
  assert.match(mac.dmgSha256, SHA, `${name}: the dmg's checksum`);
  assert.equal(mac.minOs, '13.0', `${name}: the oldest macOS the app runs on`);
  return j;
}

test('latest.json: the Windows installer at the top, and a section for each system', () => {
  checkFeed('latest.json');
});

test('latest-beta.json: the same format, and never older than latest.json', () => {
  const stable = checkFeed('latest.json');
  const beta = checkFeed('latest-beta.json');
  assert.ok(compare(beta.version, stable.version) >= 0, 'turning on beta updates must never offer an older app');
  assert.ok(compare(beta.platforms.darwin.version, stable.platforms.darwin.version) >= 0);
});

function loadPick() {
  const sandbox = {};
  vm.runInNewContext(read('setup-app/pick.js'), sandbox);
  return sandbox.CanvasDownload;
}

test('pick.js gives a Mac the dmg and everything else the Windows installer', () => {
  const { pickDownload } = loadPick();
  const feed = { version: '1.0.0', url: 'W0', platforms: { win32: { version: '1.0.0', url: 'W' }, darwin: { version: '1.0.0', url: 'Z', dmg: 'D' } } };
  assert.deepEqual({ ...pickDownload(feed, 'mac') }, { system: 'mac', url: 'D', version: '1.0.0' });
  assert.deepEqual({ ...pickDownload(feed, 'windows') }, { system: 'windows', url: 'W', version: '1.0.0' });
  const old = { version: '0.4.3', url: 'W' };
  assert.deepEqual({ ...pickDownload(old, 'windows') }, { system: 'windows', url: 'W', version: '0.4.3' }, 'a file without platforms still gives Windows');
  assert.equal(pickDownload(old, 'mac'), null, 'no Mac build: nothing to hand a Mac');
  assert.equal(pickDownload(null, 'windows'), null);
});

test('pick.js tells a Mac from Windows and an iPad, and ?os= overrides it', () => {
  const { isMac, systemFor } = loadPick();
  const mac = { platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 };
  const ipad = { platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 };
  const win = { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', maxTouchPoints: 0 };
  assert.equal(isMac(mac), true);
  assert.equal(isMac({ userAgentData: { platform: 'macOS' }, userAgent: '' }), true);
  assert.equal(isMac(ipad), false, 'an iPad asks for the desktop site but can not run the dmg');
  assert.equal(isMac(win), false);
  assert.equal(systemFor('', mac), 'mac');
  assert.equal(systemFor('', win), 'windows');
  assert.equal(systemFor('?os=windows', mac), 'windows');
  assert.equal(systemFor('?os=mac', win), 'mac');
  assert.equal(systemFor('?os=linux', win), 'windows', 'anything else falls back to what the browser says');
});

test('the download page and the app page use pick.js and offer both systems', () => {
  const download = read('download/index.html');
  assert.match(download, /<script src="\.\.\/setup-app\/pick\.js"><\/script>/);
  assert.match(download, /href="\?os=windows"/);
  assert.match(download, /href="\?os=mac"/);
  assert.match(download, /Open Anyway/, 'the Mac first-open steps');
  assert.match(download, /Run anyway/, 'the Windows first-open steps');
  const app = read('app/index.html');
  assert.match(app, /<script src="\.\.\/setup-app\/pick\.js"><\/script>/);
  assert.match(app, /data-os="mac"/);
  assert.match(app, /data-os="windows"/);
  assert.doesNotMatch(app, /Does it work on a Mac\?<\/summary><p>Not yet/);
});
