import { parseBlob } from 'music-metadata';

export const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.mp4', '.aac', '.flac', '.wav', '.wave', '.ogg', '.oga', '.opus', '.aif', '.aiff', '.ape'
]);

export const CRATE_DEFINITIONS = [
  {
    id: 'world-ender', code: '01', name: 'WORLD ENDER',
    subtitle: 'Cinematic scale, brass weather, final-boss lift', accent: '#ff5b38',
    terms: ['epic', 'cinematic', 'orchestral', 'trailer', 'heroic', 'triumphant', 'majestic', 'anthem', 'battle', 'adventure', 'dramatic', 'soaring', 'powerful', 'symphonic', 'brass', 'final boss', 'storm']
  },
  {
    id: 'neon-afterburn', code: '02', name: 'NEON AFTERBURN',
    subtitle: 'Breakbeats, circuitry, velocity, midnight heat', accent: '#00d9ff',
    terms: ['electronic', 'synthwave', 'techno', 'house', 'edm', 'electro', 'cyber', 'jungle', 'drum and bass', 'dnb', 'breakbeat', 'glitch', 'club', 'rave', 'trance', 'footwork', 'baltimore', 'juke', 'arpeggio']
  },
  {
    id: 'concrete-oracle', code: '03', name: 'CONCRETE ORACLE',
    subtitle: 'Boom bap, bars, bass pressure, curbside prophecy', accent: '#f4cf47',
    terms: ['hip hop', 'hip-hop', 'boom bap', 'rap', 'trap', 'mpc', 'cypher', 'drill', 'turntablism', 'east coast', 'west coast', 'breakbeat drums', 'street groove', 'rapper', 'bars']
  },
  {
    id: 'velvet-engine', code: '04', name: 'VELVET ENGINE',
    subtitle: 'Rhodes smoke, pocket grooves, brass and low light', accent: '#f28dc4',
    terms: ['jazz', 'funk', 'soul', 'rhodes', 'sax', 'brass', 'swing', 'r&b', 'neo-soul', 'groove', 'blues', 'lounge', 'finger-snap', 'horn', 'bassline']
  },
  {
    id: 'iron-weather', code: '05', name: 'IRON WEATHER',
    subtitle: 'Riffs, distortion, impact, scorched amplifiers', accent: '#d1d5d8',
    terms: ['rock', 'metal', 'guitar', 'riff', 'punk', 'grunge', 'heavy', 'distortion', 'amplifier', 'hardcore', 'industrial', 'drums', 'power chord']
  },
  {
    id: 'zero-gravity', code: '06', name: 'ZERO GRAVITY',
    subtitle: 'Lo-fi drift, soft focus, rooms with no clocks', accent: '#80e6b2',
    terms: ['lofi', 'lo-fi', 'ambient', 'mellow', 'chill', 'dreamy', 'serene', 'peaceful', 'meditation', 'warm pads', 'downtempo', 'tranquil', 'soft', 'ethereal', 'sleep', 'calm']
  },
  {
    id: 'green-magic', code: '07', name: 'GREEN MAGIC',
    subtitle: 'Forests, sigils, strange worlds, ancient light', accent: '#a7ff3f',
    terms: ['fantasy', 'magical', 'magic', 'forest', 'druid', 'medieval', 'ancient', 'world', 'enchanted', 'harp', 'flute', 'nature', 'ritual', 'mystical', 'arcane', 'mythic']
  },
  {
    id: 'left-turn-only', code: '08', name: 'LEFT TURN ONLY',
    subtitle: 'Surreal jokes, broken genres, beautiful mistakes', accent: '#c792ff',
    terms: ['experimental', 'comedy', 'satire', 'surreal', 'cartoon', 'quirky', 'weird', 'slapstick', 'playful', 'sampledelia', 'absurd', 'novelty', 'glitch', 'vaudeville', 'whimsical']
  }
];

export const slug = (value = '') => String(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const round = (value, places = 3) => Number(Number(value || 0).toFixed(places));

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function extensionOf(name) {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

export function audioFilesFrom(fileList) {
  return [...fileList].filter((file) => file.type.startsWith('audio/') || AUDIO_EXTENSIONS.has(extensionOf(file.name)));
}

function collectionName(files) {
  const relative = files.find((file) => file.webkitRelativePath)?.webkitRelativePath || '';
  const root = relative.split('/').filter(Boolean)[0];
  return root || 'MY SIGNAL ARCHIVE';
}

function relativePath(file) {
  return file.webkitRelativePath || file.name;
}

function displayTitleFromFile(fileName) {
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/-[0-9a-f]{8}$/i, '');
  return stem.replaceAll('_', ' ').replace(/\s+/g, ' ').trim();
}

function commentText(common) {
  const comments = Array.isArray(common.comment) ? common.comment : common.comment ? [common.comment] : [];
  return comments.map((comment) => typeof comment === 'string' ? comment : comment?.text || '').filter(Boolean).join(' · ').trim();
}

function inferBpm(text, commonBpm) {
  if (Number.isFinite(commonBpm) && commonBpm >= 40 && commonBpm <= 240) return Math.round(commonBpm);
  const match = text.match(/\b(\d{2,3})\s*bpm\b/i);
  if (!match) return null;
  const bpm = Number(match[1]);
  return bpm >= 40 && bpm <= 240 ? bpm : null;
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
  else if (bitrate > 0 && bitrate < 64000) quality -= 0.08;
  if (comment.length >= 40) quality += 0.1;
  if (comment.length >= 150) quality += 0.04;
  if (/untitled|^\d+$|^unknown$/i.test(title)) quality -= 0.08;
  return round(clamp(quality));
}

function relevanceFor(crate, text) {
  let score = 0;
  for (const term of crate.terms) if (text.includes(term)) score += term.includes(' ') ? 0.17 : 0.11;
  return round(clamp(score));
}

function sourceFor(file) {
  const parts = relativePath(file).split('/').filter(Boolean);
  if (parts.length > 2) return parts.slice(1, -1).join(' / ');
  return extensionOf(file.name).slice(1).toUpperCase() || 'AUDIO';
}

async function trackFromFile(file) {
  let metadata = { common: {}, format: {} };
  let parseError = '';
  try {
    metadata = await parseBlob(file, { duration: true, skipCovers: true, skipPostHeaders: true });
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  const common = metadata.common || {};
  const format = metadata.format || {};
  const filePath = relativePath(file);
  const fileHash = file.name.match(/-([0-9a-f]{8})\.[^.]+$/i)?.[1]?.toLowerCase();
  const id = fileHash || stableHash(`${filePath}|${file.size}|${file.lastModified}`);
  const title = String(common.title || displayTitleFromFile(file.name)).trim();
  const artist = String(common.artist || common.albumartist || 'Unknown Artist').trim();
  const album = String(common.album || '').trim();
  const genres = Array.isArray(common.genre) ? common.genre : common.genre ? [common.genre] : [];
  const genre = genres.join(', ');
  const comment = commentText(common);
  const duration = round(format.duration || 0, 1);
  const bitrate = Math.round(format.bitrate || 0);
  const searchText = `${title} ${artist} ${album} ${genre} ${comment}`.toLowerCase().replaceAll('-', ' ');
  const bpm = inferBpm(searchText, common.bpm);
  const energy = energyFor(searchText, bpm, duration);
  const quality = qualityFor({ title, comment, duration, bitrate });
  const crateScores = Object.fromEntries(CRATE_DEFINITIONS.map((crate) => [crate.id, relevanceFor(crate, searchText)]));
  const crates = Object.entries(crateScores).filter(([, score]) => score >= 0.11).sort((a, b) => b[1] - a[1]).map(([crateId]) => crateId);

  return {
    id, fileName: file.name, relativePath: filePath, size: file.size,
    title, artist, album, year: common.year ? String(common.year) : '', comment, genre,
    duration, bitrate, sampleRate: format.sampleRate || null, codec: format.codec || extensionOf(file.name).slice(1).toUpperCase(),
    bpm, energy, quality, crateScores, crates, source: sourceFor(file), parseError
  };
}

function selectRepresentatives(tracks) {
  const groups = new Map();
  for (const track of tracks) {
    const groupId = slug(`${track.artist}-${track.title}`) || track.id;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(track);
  }
  for (const [groupId, group] of groups) {
    group.sort((a, b) => b.quality - a.quality || b.duration - a.duration || a.fileName.localeCompare(b.fileName));
    group.forEach((track, index) => {
      track.variantCount = group.length;
      track.variantRank = index + 1;
      track.groupId = groupId;
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

async function mapConcurrent(items, concurrency, task, signal) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      if (signal?.aborted) throw new DOMException('Import cancelled', 'AbortError');
      const index = cursor++;
      results[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function buildCatalogFromFiles(fileList, { onProgress, signal, concurrency = 8 } = {}) {
  const files = audioFilesFrom(fileList).sort((a, b) => relativePath(a).localeCompare(relativePath(b)));
  if (!files.length) throw new Error('No supported audio files were found in that folder.');
  let completed = 0;
  let errors = 0;
  const tracks = await mapConcurrent(files, concurrency, async (file) => {
    const track = await trackFromFile(file);
    completed += 1;
    if (track.parseError) errors += 1;
    onProgress?.({ completed, total: files.length, errors, fileName: file.name });
    return track;
  }, signal);

  const representatives = selectRepresentatives(tracks);
  const totalSeconds = tracks.reduce((sum, track) => sum + track.duration, 0);
  const crates = CRATE_DEFINITIONS.map(({ terms, ...crate }) => {
    const candidates = representatives
      .filter((track) => track.crateScores[crate.id] >= 0.11 && track.duration >= 30)
      .sort((a, b) => (b.crateScores[crate.id] + b.quality * 0.4) - (a.crateScores[crate.id] + a.quality * 0.4));
    const tight = sequenceArc(candidates.slice(0, 32));
    return { ...crate, total: candidates.length, tightTrackIds: tight.map((track) => track.id) };
  });
  const name = collectionName(files);
  const signature = `${name}|${files.length}|${files.slice(0, 24).map((file) => `${relativePath(file)}:${file.size}`).join('|')}`;

  return {
    version: 2,
    id: stableHash(signature),
    generatedAt: new Date().toISOString(),
    collection: name,
    privacy: 'Metadata was analyzed locally. No audio or paths were uploaded.',
    stats: {
      tracks: tracks.length,
      songs: representatives.length,
      variants: tracks.length - representatives.length,
      hours: round(totalSeconds / 3600, 1),
      microCuts: tracks.filter((track) => track.duration < 45).length,
      parseErrors: errors
    },
    crates,
    tracks
  };
}

export function createEmptyCatalog() {
  return {
    version: 2, id: 'empty', collection: 'YOUR MUSIC', generatedAt: null,
    stats: { tracks: 0, songs: 0, variants: 0, hours: 0, microCuts: 0, parseErrors: 0 },
    crates: CRATE_DEFINITIONS.map(({ terms, ...crate }) => ({ ...crate, total: 0, tightTrackIds: [] })),
    tracks: []
  };
}
