// Copy the shared core (core/ and tests/core/) from this repo into the Remote Edition's repo, so the tools are
// written once. Run after changing anything in core/:
//   npm run sync-core                     copies to ../canvas-lms-mcp-server
//   npm run sync-core -- <path>           copies to another checkout
//   npm run sync-core -- --check [path]   only reports differences (exit 1 if any)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const target = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, '..', 'canvas-lms-mcp-server'));
const FOLDERS = ['core', path.join('tests', 'core')];

if (!fs.existsSync(path.join(target, 'package.json'))) {
  console.error(`No repo at ${target}. Pass the path to canvas-lms-mcp-server.`);
  process.exit(1);
}

const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()) : []);

let differences = 0;
for (const folder of FOLDERS) {
  const from = path.join(ROOT, folder);
  const to = path.join(target, folder);
  const want = new Set(list(from));
  for (const f of want) {
    const src = fs.readFileSync(path.join(from, f));
    const dest = path.join(to, f);
    if (fs.existsSync(dest) && Buffer.compare(src, fs.readFileSync(dest)) === 0) continue;
    differences++;
    console.log(`${check ? 'differs' : 'copied '} ${path.join(folder, f)}`);
    if (!check) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, src); }
  }
  for (const f of list(to)) {
    if (want.has(f)) continue;
    differences++;
    console.log(`${check ? 'extra  ' : 'removed'} ${path.join(folder, f)}`);
    if (!check) fs.rmSync(path.join(to, f));
  }
}
console.log(differences ? `${differences} file(s) ${check ? 'differ' : 'synced'} with ${target}` : `core is identical in ${target}`);
process.exit(check && differences ? 1 : 0);
