// Dev-only: prints the ASSETS array for sw.js from the real file tree.
// Not shipped. Run: node tools/list-assets.mjs
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const rootFiles = ['index.html', 'manifest.webmanifest'];
const dirs = ['css', 'js', 'icons'];

async function list(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await list(full));
    else out.push('./' + full.slice(root.length + 1));
  }
  return out;
}

(async () => {
  const assets = [];
  for (const f of rootFiles) assets.push('./' + f);
  for (const d of dirs) assets.push(...(await list(join(root, d))));
  assets.sort();
  console.log('const ASSETS = [');
  for (const a of assets) console.log('  ' + JSON.stringify(a) + ',');
  console.log('];');
})();
