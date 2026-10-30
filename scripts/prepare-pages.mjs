import { readFile, writeFile } from 'node:fs/promises';
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
manifest.id = `${base}/`;
manifest.start_url = `${base}/`;
manifest.scope = `${base}/`;
manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: `${base}${icon.src}` }));
await writeFile('out/manifest.webmanifest', JSON.stringify(manifest, null, 2));
await writeFile('out/.nojekyll', '');
