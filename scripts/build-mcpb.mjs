// Build the one-click Claude Desktop extension: dist/canvas-lms.mcpb, a zip of mcpb/manifest.json, the icon,
// and the server with its dependencies under server/. Double-clicking it in Claude Desktop installs Canvas and
// asks for the school address and token. Run: npm run build-mcpb
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'mcpb', 'manifest.json'), 'utf8'));
if (manifest.version !== pkg.version) {
  console.error(`mcpb/manifest.json is version ${manifest.version} but package.json is ${pkg.version}. Make them match.`);
  process.exit(1);
}
if (Object.keys(pkg.devDependencies || {}).length) {
  console.error('package.json has devDependencies; run "npm ci --omit=dev" in a clean copy before building so they are not bundled.');
  process.exit(1);
}

const zip = new JSZip();
const add = (rel, dest = rel) => zip.file(dest.split(path.sep).join('/'), fs.readFileSync(path.join(ROOT, rel)));
const addTree = (rel, dest, skip = () => false) => {
  for (const f of fs.readdirSync(path.join(ROOT, rel), { recursive: true })) {
    const full = path.join(ROOT, rel, f);
    if (fs.statSync(full).isFile() && !skip(f)) add(path.join(rel, f), path.join(dest, f));
  }
};

zip.file('manifest.json', JSON.stringify(manifest, null, 2));
add(path.join('docs', 'icon.png'), 'icon.png');
for (const f of ['index.js', 'cli.js', 'package.json', 'LICENSE', 'README.md']) add(f, path.join('server', f));
addTree('core', path.join('server', 'core'));
addTree('lib', path.join('server', 'lib'));
// Dependencies, without source maps, markdown, tests or the npm bin shims (none are needed at run time).
addTree('node_modules', path.join('server', 'node_modules'), (f) => /(^|[\\/])(\.bin|\.cache|__tests__)([\\/]|$)|\.(map|md|markdown)$/i.test(f) || f === '.package-lock.json');

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'canvas-lms.mcpb');
fs.writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }));
console.log(`Built ${out} (${(fs.statSync(out).size / 1048576).toFixed(1)} MB, version ${manifest.version})`);
