import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const exportPath = process.argv[2];
const musicRoot = process.argv[3];
const outputDir = path.join(projectRoot, 'public', 'share', 'tracks');
const manifestPath = path.join(projectRoot, 'public', 'share', 'manifest.json');

if (!exportPath || !musicRoot) {
  console.error('Usage: npm run stage:keepers -- <vault-export.json> <music-folder>');
  process.exit(1);
}

const payload = JSON.parse(await readFile(path.resolve(exportPath), 'utf8'));
const keepers = (payload.ratings || []).filter((item) => item.rating === 'vault');
if (!keepers.length) throw new Error('The export contains no VAULT-rated tracks.');

await mkdir(outputDir, { recursive: true });
let totalBytes = 0;
const staged = [];
for (const keeper of keepers) {
  const source = path.join(musicRoot, path.basename(keeper.fileName));
  const info = await stat(source);
  totalBytes += info.size;
  staged.push({ ...keeper, source, size: info.size });
}

const maxBytes = 500 * 1024 * 1024;
if (totalBytes > maxBytes && !process.argv.includes('--allow-large')) {
  throw new Error(`Selection is ${(totalBytes / 1024 / 1024).toFixed(1)} MB. Refusing to stage more than 500 MB without --allow-large.`);
}

for (const item of staged) {
  await copyFile(item.source, path.join(outputDir, item.fileName));
}

const manifest = {
  generatedAt: new Date().toISOString(),
  tracks: staged.map(({ id, fileName, title, artist, size }) => ({
    id,
    fileName,
    title,
    artist,
    size,
    src: `/share/tracks/${encodeURIComponent(fileName)}`
  }))
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Staged ${staged.length} tracks (${(totalBytes / 1024 / 1024).toFixed(1)} MB).`);
console.log('Review public/share/manifest.json and public/share/tracks before publishing.');
