import { execFile } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, '..');
const musicRoot = process.argv[2];
if (!musicRoot) {
  console.error('Usage: npm run catalog -- <music-folder>');
  process.exit(1);
}
const dataDir = path.join(projectRoot, '.local');
const playlistDir = path.join(projectRoot, 'playlists');

const CRATES = [
  {
    id: 'world-ender',
    code: '01',
    name: 'WORLD ENDER',
    subtitle: 'Cinematic scale, brass weather, final-boss lift',
    accent: '#ff5b38',
    terms: ['epic', 'cinematic', 'orchestral', 'trailer', 'heroic', 'triumphant', 'majestic', 'anthem', 'battle', 'adventure', 'dramatic', 'soaring', 'powerful', 'symphonic', 'brass', 'final boss', 'storm']
  },
  {
    id: 'neon-afterburn',
    code: '02',
    name: 'NEON AFTERBURN',
    subtitle: 'Breakbeats, circuitry, velocity, midnight heat',
    accent: '#00d9ff',
    terms: ['electronic', 'synthwave', 'techno', 'house', 'edm', 'electro', 'cyber', 'jungle', 'drum and bass', 'dnb', 'breakbeat', 'glitch', 'club', 'rave', 'trance', 'footwork', 'baltimore', 'juke', 'arpeggio']
  },
  {
    id: 'concrete-oracle',
    code: '03',
    name: 'CONCRETE ORACLE',
    subtitle: 'Boom bap, bars, bass pressure, curbside prophecy',
    accent: '#f4cf47',
    terms: ['hip hop', 'hip-hop', 'boom bap', 'rap', 'trap', 'mpc', 'cypher', 'drill', 'turntablism', 'east coast', 'west coast', 'breakbeat drums', 'street groove', 'rapper', 'bars']
  },
  {
    id: 'velvet-engine',
    code: '04',
    name: 'VELVET ENGINE',
    subtitle: 'Rhodes smoke, pocket grooves, brass and low light',
    accent: '#f28dc4',
    terms: ['jazz', 'funk', 'soul', 'rhodes', 'sax', 'brass', 'swing', 'r&b', 'neo-soul', 'groove', 'blues', 'lounge', 'finger-snap', 'horn', 'bassline']
  },
  {
    id: 'iron-weather',
    code: '05',
    name: 'IRON WEATHER',
    subtitle: 'Riffs, distortion, impact, scorched amplifiers',
    accent: '#d1d5d8',
    terms: ['rock', 'metal', 'guitar', 'riff', 'punk', 'grunge', 'heavy', 'distortion', 'amplifier', 'hardcore', 'industrial', 'drums', 'power chord']
  },
  {
    id: 'zero-gravity',
    code: '06',
    name: 'ZERO GRAVITY',
    subtitle: 'Lo-fi drift, soft focus, rooms with no clocks',
    accent: '#80e6b2',
    terms: ['lofi', 'lo-fi', 'ambient', 'mellow', 'chill', 'dreamy', 'serene', 'peaceful', 'meditation', 'warm pads', 'downtempo', 'tranquil', 'soft', 'ethereal', 'sleep', 'calm']
  },
  {
    id: 'green-magic',
    code: '07',
    name: 'GREEN MAGIC',
    subtitle: 'Forests, sigils, strange worlds, ancient light',
    accent: '#a7ff3f',
    terms: ['fantasy', 'magical', 'magic', 'forest', 'druid', 'medieval', 'ancient', 'world', 'enchanted', 'harp', 'flute', 'nature', 'ritual', 'mystical', 'arcane', 'mythic']
  },
  {
    id: 'left-turn-only',
    code: '08',
    name: 'LEFT TURN ONLY',
    subtitle: 'Surreal jokes, broken genres, beautiful mistakes',
    accent: '#c792ff',
    terms: ['experimental', 'comedy', 'satire', 'surreal', 'cartoon', 'quirky', 'weird', 'slapstick', 'playful', 'sampledelia', 'absurd', 'novelty', 'glitch', 'vaudeville', 'whimsical']
  }
];

const slug = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const round = (value, places = 3) => Number(value.toFixed(places));
const textTag = (tags, key) => {
  const match = Object.entries(tags || {}).find(([name]) => name.toLowerCase() === key);
  return match ? String(match[1]).trim() : '';
};

function parseFileName(fileName) {
  const stem = path.basename(fileName, path.extname(fileName));
  const idMatch = stem.match(/-([0-9a-f]{8})$/i);
  const id = idMatch?.[1].toLowerCase() || slug(stem);
  const noHash = idMatch ? stem.slice(0, -9) : stem;
  const dash = noHash.indexOf('-');
  const source = dash > 0 ? noHash.slice(0, dash) : 'Unknown';
  const fallbackTitle = dash > 0 ? noHash.slice(dash + 1) : noHash;
  return { id, source: source.replaceAll('_', ' '), fallbackTitle: fallbackTitle.replaceAll('_', ' ') };
}

function inferBpm(text) {
  const match = text.match(/\b(\d{2,3})\s*bpm\b/i);
  if (!match) return null;
  const bpm = Number(match[1]);
  return bpm >= 45 && bpm <= 220 ? bpm : null;
}

function energyFor(text, bpm, duration) {
  let energy = 0.5;
  const boosts = ['high energy', 'intense', 'aggressive', 'powerful', 'hype', 'driving', 'fast', 'rave', 'battle', 'hard', 'punchy', 'euphoric', 'explosive', 'adrenaline', 'peak'];
  const softens = ['calm', 'soft', 'sleep', 'peaceful', 'serene', 'ambient', 'meditation', 'mellow', 'gentle', 'tranquil', 'dreamy', 'downtempo'];
  for (const term of boosts) if (text.includes(term)) energy += 0.045;
  for (const term of softens) if (text.includes(term)) energy -= 0.04;
  if (bpm) energy += clamp((bpm - 95) / 150, -0.18, 0.32);
  if (duration < 30) energy -= 0.1;
  return round(clamp(energy, 0.08, 0.98));
}

function qualityFor({ title, comment, duration, bitrate }) {
  let quality = 0.42;
  if (duration >= 75 && duration <= 330) quality += 0.24;
  else if (duration >= 45 && duration <= 480) quality += 0.12;
  else if (duration < 15) quality -= 0.3;
  if (bitrate >= 176000) quality += 0.15;
  else if (bitrate >= 128000) quality += 0.08;
  else if (bitrate < 64000) quality -= 0.08;
  if (comment.length >= 40) quality += 0.1;
  if (comment.length >= 150) quality += 0.04;
  if (/untitled|^\d+$|^unknown$/i.test(title)) quality -= 0.08;
  return round(clamp(quality));
}

function relevanceFor(crate, text) {
  let score = 0;
  for (const term of crate.terms) {
    if (text.includes(term)) score += term.includes(' ') ? 0.17 : 0.11;
  }
  return round(clamp(score));
}

async function probe(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,bit_rate:format_tags=title,artist,date,comment,genre',
    '-of', 'json',
    '--', filePath
  ], { windowsHide: true, maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout).format || {};
}

async function mapConcurrent(items, concurrency, task) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index], index);
      if ((index + 1) % 250 === 0) process.stdout.write(`  ${index + 1}/${items.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function selectRepresentatives(tracks) {
  const groups = new Map();
  for (const track of tracks) {
    const key = slug(track.title) || track.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(track);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => b.quality - a.quality || b.duration - a.duration || a.fileName.localeCompare(b.fileName));
    group.forEach((track, index) => {
      track.variantCount = group.length;
      track.variantRank = index + 1;
      track.groupId = slug(track.title) || track.id;
    });
  }
  return [...groups.values()].map((group) => group[0]);
}

function sequenceArc(tracks) {
  const pool = [...tracks];
  const count = pool.length;
  const targets = Array.from({ length: count }, (_, index) => {
    const position = count <= 1 ? 0 : index / (count - 1);
    if (position < 0.18) return 0.38 + (position / 0.18) * 0.25;
    if (position < 0.78) return 0.63 + ((position - 0.18) / 0.6) * 0.3;
    return 0.93 - ((position - 0.78) / 0.22) * 0.31;
  });
  return targets.map((target) => {
    pool.sort((a, b) => Math.abs(a.energy - target) - Math.abs(b.energy - target));
    return pool.shift();
  });
}

function playlistText(name, tracks) {
  const lines = ['#EXTM3U', `#PLAYLIST:${name}`];
  for (const track of tracks) {
    lines.push(`#EXTINF:${Math.round(track.duration)},${track.artist || 'Unknown Artist'} - ${track.title}`);
    lines.push(track.absolutePath);
  }
  return `${lines.join('\r\n')}\r\n`;
}

async function writePlaylist(fileName, name, tracks) {
  await writeFile(path.join(playlistDir, fileName), playlistText(name, tracks), 'utf8');
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(playlistDir, { recursive: true });
  const entries = (await readdir(musicRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mp3'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (!entries.length) throw new Error(`No MP3 files found in ${musicRoot}`);
  process.stdout.write(`Reading ${entries.length} tracks from ${musicRoot}\n`);

  const tracks = await mapConcurrent(entries, 18, async (fileName) => {
    const absolutePath = path.join(musicRoot, fileName);
    const format = await probe(absolutePath);
    const parsed = parseFileName(fileName);
    const tags = format.tags || {};
    const title = textTag(tags, 'title') || parsed.fallbackTitle;
    const artist = textTag(tags, 'artist') || 'Unknown Artist';
    const comment = textTag(tags, 'comment');
    const genre = textTag(tags, 'genre');
    const duration = round(Number(format.duration || 0), 1);
    const bitrate = Number(format.bit_rate || 0);
    const searchText = `${title} ${comment} ${genre}`.toLowerCase().replaceAll('-', ' ');
    const bpm = inferBpm(searchText);
    const energy = energyFor(searchText, bpm, duration);
    const quality = qualityFor({ title, comment, duration, bitrate });
    const crateScores = Object.fromEntries(CRATES.map((crate) => [crate.id, relevanceFor(crate, searchText)]));
    const crates = Object.entries(crateScores).filter(([, score]) => score >= 0.11).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    return {
      id: parsed.id,
      fileName,
      absolutePath,
      title,
      artist,
      source: parsed.source,
      year: textTag(tags, 'date'),
      comment,
      genre,
      duration,
      bitrate,
      bpm,
      energy,
      quality,
      crateScores,
      crates
    };
  });

  const representatives = selectRepresentatives(tracks);
  const totalSeconds = tracks.reduce((sum, track) => sum + track.duration, 0);
  const publicTracks = tracks.map(({ absolutePath, crateScores, ...track }) => track);
  const publicCrates = CRATES.map(({ terms, ...crate }) => {
    const candidates = representatives
      .filter((track) => track.crateScores[crate.id] >= 0.11 && track.duration >= 45)
      .sort((a, b) => (b.crateScores[crate.id] + b.quality * 0.4) - (a.crateScores[crate.id] + a.quality * 0.4));
    const tight = sequenceArc(candidates.slice(0, 32));
    return { ...crate, total: candidates.length, tightTrackIds: tight.map((track) => track.id) };
  });

  const catalog = {
    generatedAt: new Date().toISOString(),
    collection: `${path.basename(path.resolve(musicRoot))} SIGNAL ARCHIVE`,
    privacy: 'Metadata only. No local paths or audio are included.',
    stats: {
      tracks: tracks.length,
      songs: representatives.length,
      variants: tracks.length - representatives.length,
      hours: round(totalSeconds / 3600, 1),
      microCuts: tracks.filter((track) => track.duration < 45).length
    },
    crates: publicCrates,
    tracks: publicTracks
  };
  await writeFile(path.join(dataDir, 'catalog.json'), `${JSON.stringify(catalog)}\n`, 'utf8');

  const prioritized = representatives
    .filter((track) => track.duration >= 45)
    .sort((a, b) => b.quality - a.quality || b.energy - a.energy)
    .slice(0, 250);
  const variantShowdowns = tracks
    .filter((track) => track.variantCount > 1)
    .sort((a, b) => a.groupId.localeCompare(b.groupId) || a.variantRank - b.variantRank);

  await writePlaylist('00_ALL_TRACKS.m3u8', `ALL TRACKS / ${path.basename(path.resolve(musicRoot))}`, tracks);
  await writePlaylist('00_PRIORITY_AUDITIONS.m3u8', 'PRIORITY AUDITIONS / 250', prioritized);
  await writePlaylist('00_ONE_PER_SONG.m3u8', 'ONE PER SONG', representatives.filter((track) => track.duration >= 15));
  await writePlaylist('00_VARIANT_SHOWDOWNS.m3u8', 'VARIANT SHOWDOWNS', variantShowdowns);
  await writePlaylist('09_MICRO_CUTS.m3u8', 'MICRO CUTS / UNDER 45 SECONDS', tracks.filter((track) => track.duration < 45).sort((a, b) => b.duration - a.duration));

  for (const crate of publicCrates) {
    const tight = crate.tightTrackIds.map((id) => tracks.find((track) => track.id === id)).filter(Boolean);
    const full = representatives
      .filter((track) => track.crateScores[crate.id] >= 0.11 && track.duration >= 45)
      .sort((a, b) => b.crateScores[crate.id] - a.crateScores[crate.id] || b.quality - a.quality);
    await writePlaylist(`${crate.code}_${crate.name.replaceAll(' ', '_')}_TIGHT.m3u8`, `${crate.name} / TIGHT SET`, tight);
    await writePlaylist(`${crate.code}_${crate.name.replaceAll(' ', '_')}_CRATE.m3u8`, `${crate.name} / FULL CRATE`, full);
  }

  process.stdout.write(`Cataloged ${tracks.length} tracks / ${representatives.length} song groups / ${round(totalSeconds / 3600, 1)} hours\n`);
  process.stdout.write(`Wrote metadata to ${path.join(dataDir, 'catalog.json')}\n`);
  process.stdout.write(`Wrote Foobar playlists to ${playlistDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
