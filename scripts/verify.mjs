import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const failures = [];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesUnder(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return nested.flat();
}

const files = await filesUnder(distRoot);
const textFiles = files.filter((file) => /\.(html|js|css|json|txt|md)$/i.test(file));
const publicText = (await Promise.all(textFiles.map((file) => readFile(file, 'utf8')))).join('\n');
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));

if (!files.some((file) => file.endsWith('index.html'))) failures.push('Production index.html is missing.');
if (!publicText.includes('CHOOSE A MUSIC FOLDER')) failures.push('Universal folder onboarding is missing from the production build.');
if (!publicText.includes('SIGNAL THEATER') || !publicText.includes('LAUNCH VZX PLAYER')) failures.push('Signal Theater or its VZX launch path is missing from the production build.');
if (!publicText.includes('ASTRAL CATHEDRAL')) failures.push('AI-forged Astral Cathedral scene is missing from the production build.');
if (!files.some((file) => /visuals[\\/]astral-cathedral\.webp$/i.test(file))) failures.push('Astral Cathedral visual texture is missing from the production build.');
for (const variant of ['bass', 'treble']) {
  if (!files.some((file) => new RegExp(`visuals[\\\\/]astral-cathedral-${variant}\\.webp$`, 'i').test(file))) failures.push(`Astral Cathedral ${variant} texture is missing from the production build.`);
}
if (/C:\\Users\\|JOEPROAI|8\.15\.26/i.test(publicText)) failures.push('Production build contains personal archive data.');
if (files.some((file) => /catalog\.json$/i.test(file))) failures.push('Production build contains a prebuilt personal catalog.');
if (files.some((file) => /\.(mp3|m4a|flac|wav|ogg|opus|aac|aiff?)$/i.test(file))) failures.push('Production build contains audio.');
if (!packageJson.dependencies?.['music-metadata']) failures.push('Browser metadata parser dependency is missing.');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Verified universal build: ${files.length} files, local folder onboarding and Signal Theater present, and no personal catalog, path, or audio leakage.`);
