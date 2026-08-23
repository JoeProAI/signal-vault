import './styles.css';
import { audioFilesFrom, buildCatalogFromFiles, createEmptyCatalog } from './catalog.js';
import { forgetCurrentLibrary, loadCurrentLibrary, saveLibrary } from './storage.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const PAGE_SIZE = 60;

const state = {
  catalog: createEmptyCatalog(), tracksById: new Map(), localFiles: new Map(), ratings: {},
  activeCrate: 'priority', query: '', sort: 'signal', visible: PAGE_SIZE, selectedId: null,
  currentObjectUrl: null, audioContext: null, analyser: null, sourceNode: null, importController: null
};

const audio = $('#audio');
const folderInput = $('#folder-input');
audio.volume = 0.85;

const ratingsKey = () => `signal-vault-ratings-v2:${state.catalog.id}`;
function loadRatings() { try { return JSON.parse(localStorage.getItem(ratingsKey()) || '{}'); } catch { return {}; } }
function formatTime(seconds = 0) { if (!Number.isFinite(seconds)) return '0:00'; return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]); }
function signalScore(track) { return track.quality * 0.6 + Math.max(0, ...Object.values(track.crateScores || {})) * 0.4; }
function relativeKey(file) { return (file.webkitRelativePath || file.name).toLowerCase(); }

function mapLocalFiles(files) {
  const mapped = new Map();
  for (const file of files) {
    mapped.set(relativeKey(file), file);
    if (!mapped.has(file.name.toLowerCase())) mapped.set(file.name.toLowerCase(), file);
  }
  return mapped;
}

function localFileForTrack(track) { return state.localFiles.get(String(track.relativePath || '').toLowerCase()) || state.localFiles.get(track.fileName.toLowerCase()); }
function trackSource(track) { const local = localFileForTrack(track); return local ? URL.createObjectURL(local) : null; }

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2800);
}

function setRating(id, rating) {
  if (!id) return;
  if (state.ratings[id] === rating) delete state.ratings[id]; else state.ratings[id] = rating;
  localStorage.setItem(ratingsKey(), JSON.stringify(state.ratings));
  updateRatingControls();
  renderTracks();
  const count = Object.values(state.ratings).filter((value) => value === 'vault').length;
  toast(`${rating.toUpperCase()} / ${count} TRACK${count === 1 ? '' : 'S'} IN THE VAULT`);
}

function updateRatingControls() {
  const selectedRating = state.ratings[state.selectedId];
  $$('.rating-bank [data-rate]').forEach((button) => button.classList.toggle('active', button.dataset.rate === selectedRating));
}

function activeDefinition() {
  if (state.activeCrate === 'priority') return { code: '00 / CONTROL ROOM', name: 'PRIORITY AUDITIONS', subtitle: state.catalog.stats.tracks ? 'One strong candidate from each song family, ordered for fast discovery.' : 'Open a music folder to build your private audition deck.' };
  if (state.activeCrate === 'all') return { code: '00 / FULL ARCHIVE', name: 'EVERY SIGNAL', subtitle: `The complete ${state.catalog.collection} library, including alternate cuts.` };
  if (state.activeCrate === 'vault') return { code: 'V / YOUR DECISIONS', name: 'THE VAULT', subtitle: 'The tracks you marked to survive. Export them whenever the set feels right.' };
  if (state.activeCrate === 'unreviewed') return { code: '? / REVIEW QUEUE', name: 'UNREVIEWED', subtitle: 'Everything still waiting for a verdict.' };
  if (state.activeCrate === 'micro') return { code: '09 / FRAGMENTS', name: 'MICRO CUTS', subtitle: 'Sketches, stings, broken starts, and transmissions under 45 seconds.' };
  const crate = state.catalog.crates.find((item) => item.id === state.activeCrate);
  return crate ? { code: `${crate.code} / CURATED CRATE`, name: crate.name, subtitle: crate.subtitle } : { code: '00 / CONTROL ROOM', name: 'OPEN A LIBRARY', subtitle: 'Choose a music folder to begin.' };
}

function crateTracks() {
  const all = state.catalog.tracks;
  if (state.activeCrate === 'priority') return all.filter((track) => track.variantRank === 1 && track.duration >= 30).sort((a, b) => signalScore(b) - signalScore(a)).slice(0, 250);
  if (state.activeCrate === 'all') return all;
  if (state.activeCrate === 'vault') return all.filter((track) => state.ratings[track.id] === 'vault');
  if (state.activeCrate === 'unreviewed') return all.filter((track) => !state.ratings[track.id] && track.duration >= 10);
  if (state.activeCrate === 'micro') return all.filter((track) => track.duration < 45);
  const crate = state.catalog.crates.find((item) => item.id === state.activeCrate);
  if (!crate) return all;
  const tightOrder = new Map(crate.tightTrackIds.map((id, index) => [id, index]));
  return all.filter((track) => tightOrder.has(track.id)).sort((a, b) => tightOrder.get(a.id) - tightOrder.get(b.id));
}

function filteredTracks() {
  let tracks = [...crateTracks()];
  const query = state.query.trim().toLowerCase();
  if (query) tracks = tracks.filter((track) => `${track.title} ${track.comment} ${track.genre} ${track.album} ${track.source} ${track.artist}`.toLowerCase().includes(query));
  if (state.sort === 'energy-desc') tracks.sort((a, b) => b.energy - a.energy);
  if (state.sort === 'energy-asc') tracks.sort((a, b) => a.energy - b.energy);
  if (state.sort === 'title') tracks.sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === 'duration') tracks.sort((a, b) => b.duration - a.duration);
  if (state.sort === 'signal' && !state.catalog.crates.some((crate) => crate.id === state.activeCrate)) tracks.sort((a, b) => signalScore(b) - signalScore(a));
  return tracks;
}

function renderStats() {
  const { stats } = state.catalog;
  $('#collection-stats').innerHTML = [['TRACKS', stats.tracks.toLocaleString()], ['SONG FAMILIES', stats.songs.toLocaleString()], ['HOURS', stats.hours.toLocaleString()], ['ALTERNATES', stats.variants.toLocaleString()]]
    .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  const hasTracks = stats.tracks > 0;
  $('#collection-kicker').textContent = hasTracks ? `${state.catalog.collection.toUpperCase()} / PRIVATE MASTER DECK` : 'NO COLLECTION / PRIVATE MASTER DECK';
  $('#hero-note').textContent = hasTracks ? `${stats.tracks.toLocaleString()} transmissions across ${stats.songs.toLocaleString()} song families. Find the records that deserve to survive.` : 'Open any music folder. Signal Vault analyzes it locally, groups alternate cuts, and helps you find the records that deserve to survive.';
  document.title = hasTracks ? `Signal Vault / ${state.catalog.collection}` : 'Signal Vault / Local Music Curator';
}

function renderCrates() {
  const priorityTotal = Math.min(250, state.catalog.tracks.filter((track) => track.variantRank === 1 && track.duration >= 30).length);
  const systemCrates = [
    { id: 'priority', code: '00', name: 'PRIORITY AUDITIONS', total: priorityTotal, accent: '#f4f0e6' },
    { id: 'vault', code: 'V', name: 'THE VAULT', total: Object.values(state.ratings).filter((value) => value === 'vault').length, accent: '#a7ff3f' },
    { id: 'unreviewed', code: '?', name: 'UNREVIEWED', total: state.catalog.tracks.filter((track) => !state.ratings[track.id]).length, accent: '#f4cf47' },
    ...state.catalog.crates,
    { id: 'micro', code: '09', name: 'MICRO CUTS', total: state.catalog.stats.microCuts, accent: '#8a8e93' },
    { id: 'all', code: '∞', name: 'EVERY SIGNAL', total: state.catalog.stats.tracks, accent: '#f4f0e6' }
  ];
  $('#crate-count').textContent = systemCrates.length.toString().padStart(2, '0');
  $('#crate-list').innerHTML = systemCrates.map((crate) => `<button class="crate-button ${crate.id === state.activeCrate ? 'active' : ''}" type="button" data-crate="${crate.id}" style="--crate-accent:${crate.accent}"><span class="crate-code">${crate.code}</span><span class="crate-name">${crate.name}</span><span class="crate-total">${Number(crate.total || 0).toLocaleString()}</span></button>`).join('');
  $$('.crate-button').forEach((button) => button.addEventListener('click', () => {
    state.activeCrate = button.dataset.crate;
    state.visible = PAGE_SIZE;
    renderCrates();
    renderDeckHeading();
    renderTracks();
  }));
}

function renderDeckHeading() {
  const active = activeDefinition();
  $('#active-code').textContent = active.code;
  $('#active-title').textContent = active.name;
  $('#active-subtitle').textContent = active.subtitle;
}

function renderTracks() {
  const tracks = filteredTracks();
  const visible = tracks.slice(0, state.visible);
  $('#result-count').textContent = `${tracks.length.toLocaleString()} SIGNAL${tracks.length === 1 ? '' : 'S'}`;
  $('#track-list').innerHTML = visible.length ? visible.map((track, index) => {
    const rating = state.ratings[track.id];
    const connected = Boolean(localFileForTrack(track));
    const prompt = track.comment || [track.genre, track.album].filter(Boolean).join(' · ') || 'No style notes embedded in this file.';
    return `<article class="track-row ${track.id === state.selectedId ? 'selected' : ''}" data-id="${track.id}">
      <button class="row-play" type="button" aria-label="${connected ? 'Play' : 'Select'} ${escapeHtml(track.title)}"><span>${track.id === state.selectedId && !audio.paused ? 'Ⅱ' : '▶'}</span><b>${String(index + 1).padStart(3, '0')}</b></button>
      <button class="track-copy" type="button"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(prompt)}</span><em>${track.variantCount > 1 ? `${track.variantCount} VARIANTS` : 'SOLE CUT'} · ${escapeHtml(track.artist)} · ${escapeHtml(track.source)}</em></button>
      <div class="readout"><span>${track.bpm || '––'}<small>BPM</small></span><span>${Math.round(track.energy * 100)}<small>NRG</small></span><span>${formatTime(track.duration)}<small>TIME</small></span></div>
      <div class="row-rating">${['cut', 'hold', 'vault'].map((value) => `<button type="button" data-rate="${value}" class="${rating === value ? 'active' : ''}" aria-label="Mark ${escapeHtml(track.title)} as ${value}">${value === 'cut' ? 'X' : value === 'hold' ? 'H' : 'V'}</button>`).join('')}</div>
    </article>`;
  }).join('') : `<div class="empty-state"><strong>${state.catalog.stats.tracks ? 'NO SIGNALS HERE YET' : 'OPEN A MUSIC FOLDER'}</strong><span>${state.catalog.stats.tracks ? 'Change the filter, clear the search, or start rating tracks.' : 'Your private listening deck will be built on this device.'}</span></div>`;
  $('#load-more').hidden = visible.length >= tracks.length;
  $$('.track-row').forEach((row) => {
    row.querySelector('.row-play').addEventListener('click', () => selectTrack(row.dataset.id, true));
    row.querySelector('.track-copy').addEventListener('click', () => selectTrack(row.dataset.id, false));
    row.querySelectorAll('[data-rate]').forEach((button) => button.addEventListener('click', () => setRating(row.dataset.id, button.dataset.rate)));
  });
  renderCrates();
}

function selectTrack(id, autoplay = false) {
  const track = state.tracksById.get(id);
  if (!track) return;
  state.selectedId = id;
  $('#now-index').textContent = id.toUpperCase();
  $('#now-title').textContent = track.title;
  $('#now-prompt').textContent = track.comment || [track.genre, track.album].filter(Boolean).join(' · ') || 'No style notes embedded in this file.';
  $('#now-energy').textContent = `${Math.round(track.energy * 100)}%`;
  $('#now-bpm').textContent = track.bpm || '––';
  $('#now-duration').textContent = formatTime(track.duration);
  $('#transport-title').textContent = track.title;
  updateRatingControls();
  renderTracks();
  if (autoplay) playTrack(track);
}

async function playTrack(track) {
  const source = trackSource(track);
  if (!source) { toast('RECONNECT THIS MUSIC FOLDER TO PLAY'); folderInput.click(); return; }
  if (state.currentObjectUrl) URL.revokeObjectURL(state.currentObjectUrl);
  state.currentObjectUrl = source;
  audio.src = source;
  $('#transport-status').textContent = 'LOCAL / PRIVATE PLAYBACK';
  await ensureAnalyser();
  try { await audio.play(); } catch { toast('PLAYBACK WAS BLOCKED. PRESS PLAY AGAIN.'); }
  updateTransport();
}

async function ensureAnalyser() {
  if (state.audioContext) { if (state.audioContext.state === 'suspended') await state.audioContext.resume(); return; }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  state.audioContext = new AudioContext();
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 128;
  state.sourceNode = state.audioContext.createMediaElementSource(audio);
  state.sourceNode.connect(state.analyser);
  state.analyser.connect(state.audioContext.destination);
}

function togglePlayback() {
  if (!state.selectedId) { const first = filteredTracks()[0]; if (first) selectTrack(first.id, true); else folderInput.click(); return; }
  if (!audio.src) playTrack(state.tracksById.get(state.selectedId)); else if (audio.paused) audio.play(); else audio.pause();
}

function updateTransport() {
  const playing = !audio.paused && !audio.ended;
  $('#transport-play').textContent = playing ? 'Ⅱ' : '▶';
  $('#main-play span').textContent = playing ? 'Ⅱ' : '▶';
  $('#current-time').textContent = formatTime(audio.currentTime);
  $('#total-time').textContent = formatTime(audio.duration || state.tracksById.get(state.selectedId)?.duration || 0);
  $('#seek').value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
}

function adjacentTrack(direction) {
  const tracks = filteredTracks();
  if (!tracks.length) return;
  const current = tracks.findIndex((track) => track.id === state.selectedId);
  const next = tracks[(current + direction + tracks.length) % tracks.length];
  selectTrack(next.id, Boolean(audio.src));
  document.querySelector(`[data-id="${next.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function exportBlob(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportRatings() {
  const ratings = Object.entries(state.ratings).map(([id, rating]) => { const track = state.tracksById.get(id); return track ? { id, rating, fileName: track.fileName, relativePath: track.relativePath, title: track.title, artist: track.artist } : null; }).filter(Boolean);
  if (!ratings.length) { toast('RATE AT LEAST ONE TRACK FIRST'); return; }
  const payload = { version: 2, libraryId: state.catalog.id, collection: state.catalog.collection, exportedAt: new Date().toISOString(), ratings };
  exportBlob('signal-vault-ratings.json', 'application/json', `${JSON.stringify(payload, null, 2)}\n`);
  toast(`EXPORTED ${ratings.length} DECISIONS`);
}

function playlistPath(track) {
  const parts = String(track.relativePath || track.fileName).split('/');
  return parts.length > 1 ? parts.slice(1).join('\\') : track.fileName;
}

function exportM3u() {
  const keepers = state.catalog.tracks.filter((track) => state.ratings[track.id] === 'vault');
  if (!keepers.length) { toast('MARK AT LEAST ONE TRACK VAULT FIRST'); return; }
  const lines = ['#EXTM3U', `#PLAYLIST:SIGNAL VAULT / ${state.catalog.collection} / KEEPERS`];
  keepers.forEach((track) => lines.push(`#EXTINF:${Math.round(track.duration)},${track.artist} - ${track.title}`, playlistPath(track)));
  exportBlob('SIGNAL_VAULT_KEEPERS.m3u8', 'audio/x-mpegurl;charset=utf-8', `${lines.join('\r\n')}\r\n`);
  toast(`EXPORTED ${keepers.length} VAULT TRACKS`);
}

function sameLibrary(files) {
  if (!state.catalog.stats.tracks || files.length !== state.catalog.stats.tracks) return false;
  const keys = new Set(files.map((file) => relativeKey(file)));
  const matched = state.catalog.tracks.filter((track) => keys.has(String(track.relativePath || track.fileName).toLowerCase()) || keys.has(track.fileName.toLowerCase())).length;
  return matched / state.catalog.stats.tracks >= 0.97;
}

function updateImportProgress({ completed, total, fileName }) {
  const percent = Math.round((completed / total) * 100);
  $('#import-progress-bar').style.width = `${percent}%`;
  $('#import-count').textContent = `${completed.toLocaleString()} / ${total.toLocaleString()}`;
  $('#import-percent').textContent = `${percent}%`;
  $('#import-file').textContent = fileName;
}

function setImportVisible(visible) { $('#import-screen').hidden = !visible; document.documentElement.style.overflow = visible ? 'hidden' : ''; }

function applyCatalog(catalog, files = []) {
  state.catalog = catalog;
  state.tracksById = new Map(catalog.tracks.map((track) => [track.id, track]));
  state.localFiles = mapLocalFiles(files);
  state.ratings = loadRatings();
  state.activeCrate = 'priority'; state.visible = PAGE_SIZE; state.selectedId = null;
  renderStats(); renderCrates(); renderDeckHeading(); renderTracks();
  const first = filteredTracks()[0];
  if (first) selectTrack(first.id, false);
  const connected = files.length > 0;
  $('#connection-label').textContent = connected ? `${catalog.stats.tracks.toLocaleString()} LOCAL SIGNALS CONNECTED` : `${catalog.stats.tracks.toLocaleString()} CACHED SIGNALS / RECONNECT TO PLAY`;
  $('#connect-button span:first-child').textContent = connected ? 'FOLDER CONNECTED' : 'RECONNECT MUSIC FOLDER';
  $('#connect-button').classList.toggle('connected', connected);
  $('#transport-status').textContent = connected ? 'READY FOR PRIVATE PLAYBACK' : 'RECONNECT FOLDER TO LISTEN';
  $('#welcome-screen').hidden = true;
}

async function forgetLibrary() {
  if (!state.catalog.stats.tracks) return;
  const confirmed = window.confirm('Forget this cached catalog and its ratings on this device? Your audio files will not be changed.');
  if (!confirmed) return;
  const oldRatingsKey = ratingsKey();
  await forgetCurrentLibrary();
  localStorage.removeItem(oldRatingsKey);
  audio.pause();
  audio.removeAttribute('src');
  if (state.currentObjectUrl) URL.revokeObjectURL(state.currentObjectUrl);
  state.currentObjectUrl = null;
  state.catalog = createEmptyCatalog();
  state.tracksById = new Map();
  state.localFiles = new Map();
  state.ratings = {};
  state.selectedId = null;
  state.activeCrate = 'priority';
  renderStats(); renderCrates(); renderDeckHeading(); renderTracks();
  $('#connection-label').textContent = 'NO LIBRARY CONNECTED';
  $('#connect-button span:first-child').textContent = 'OPEN MUSIC FOLDER';
  $('#connect-button').classList.remove('connected');
  $('#transport-title').textContent = 'NO SIGNAL LOADED';
  $('#transport-status').textContent = 'OPEN A FOLDER TO BEGIN';
  $('#welcome-screen').hidden = false;
}

async function connectFolder(fileList) {
  const files = audioFilesFrom(fileList);
  if (!files.length) { toast('NO SUPPORTED AUDIO FILES FOUND'); return; }
  if (sameLibrary(files)) {
    state.localFiles = mapLocalFiles(files);
    $('#connection-label').textContent = `${files.length.toLocaleString()} LOCAL SIGNALS CONNECTED`;
    $('#connect-button span:first-child').textContent = 'FOLDER CONNECTED';
    $('#connect-button').classList.add('connected');
    $('#transport-status').textContent = 'READY FOR PRIVATE PLAYBACK';
    $('#welcome-screen').hidden = true;
    renderTracks();
    toast(`${files.length.toLocaleString()} TRACKS RECONNECTED WITHOUT REANALYSIS`);
    return;
  }
  state.importController?.abort();
  state.importController = new AbortController();
  $('#welcome-screen').hidden = true;
  setImportVisible(true);
  updateImportProgress({ completed: 0, total: files.length, fileName: 'Preparing local metadata analysis…' });
  try {
    const catalog = await buildCatalogFromFiles(files, { signal: state.importController.signal, onProgress: updateImportProgress });
    try { await saveLibrary(catalog); } catch { toast('LIBRARY READY, BUT THIS BROWSER COULD NOT CACHE IT'); }
    applyCatalog(catalog, files);
    const warning = catalog.stats.parseErrors ? ` / ${catalog.stats.parseErrors} FILES USED FALLBACK METADATA` : '';
    toast(`${catalog.stats.tracks.toLocaleString()} TRACKS READY${warning}`);
  } catch (error) {
    if (error.name !== 'AbortError') toast(error.message || 'IMPORT FAILED');
    if (!state.catalog.stats.tracks) $('#welcome-screen').hidden = false;
  } finally {
    state.importController = null;
    setImportVisible(false);
  }
}

function animateSignalField() {
  const canvas = $('#signal-field'); const context = canvas.getContext('2d'); let phase = 0;
  const resize = () => { canvas.width = window.innerWidth * Math.min(devicePixelRatio, 2); canvas.height = window.innerHeight * Math.min(devicePixelRatio, 2); };
  window.addEventListener('resize', resize); resize();
  function frame() {
    const { width, height } = canvas; context.clearRect(0, 0, width, height);
    const samples = state.analyser ? new Uint8Array(state.analyser.frequencyBinCount) : null;
    if (samples) state.analyser.getByteFrequencyData(samples);
    context.beginPath();
    for (let x = 0; x <= width; x += 10) {
      const index = samples ? Math.floor((x / width) * samples.length) : 0;
      const signal = samples ? samples[index] / 255 : 0.2 + Math.sin(phase + x * 0.012) * 0.05;
      const y = height * 0.26 + Math.sin(x * 0.018 + phase) * 10 + signal * 42;
      if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.strokeStyle = 'rgba(167,255,63,.13)'; context.lineWidth = 1.5 * devicePixelRatio; context.stroke();
    phase += audio.paused ? 0.008 : 0.04; requestAnimationFrame(frame);
  }
  frame();
}

async function init() {
  renderStats(); renderCrates(); renderDeckHeading(); renderTracks(); animateSignalField();
  const cached = await loadCurrentLibrary();
  if (cached?.version === 2 && cached.tracks?.length) applyCatalog(cached);
}

const openFolder = () => folderInput.click();
$('#connect-button').addEventListener('click', openFolder);
$('#welcome-connect').addEventListener('click', openFolder);
folderInput.addEventListener('change', async () => { const files = [...folderInput.files]; folderInput.value = ''; await connectFolder(files); });
$('#cancel-import').addEventListener('click', () => state.importController?.abort());
$('#dismiss-privacy').addEventListener('click', () => $('#privacy-strip').remove());
$('#search').addEventListener('input', (event) => { state.query = event.target.value; state.visible = PAGE_SIZE; renderTracks(); });
$('#sort').addEventListener('change', (event) => { state.sort = event.target.value; renderTracks(); });
$('#load-more').addEventListener('click', () => { state.visible += PAGE_SIZE; renderTracks(); });
$('#main-play').addEventListener('click', togglePlayback);
$('#transport-play').addEventListener('click', togglePlayback);
$('#export-ratings').addEventListener('click', exportRatings);
$('#forget-library').addEventListener('click', forgetLibrary);
$('#export-m3u').addEventListener('click', exportM3u);
$$('.rating-bank [data-rate]').forEach((button) => button.addEventListener('click', () => setRating(state.selectedId, button.dataset.rate)));
$('#seek').addEventListener('input', (event) => { if (audio.duration) audio.currentTime = (Number(event.target.value) / 1000) * audio.duration; });
$('#volume').addEventListener('input', (event) => { audio.volume = Number(event.target.value); });
audio.addEventListener('play', () => { updateTransport(); renderTracks(); });
audio.addEventListener('pause', () => { updateTransport(); renderTracks(); });
audio.addEventListener('timeupdate', updateTransport);
audio.addEventListener('ended', () => adjacentTrack(1));
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, select, textarea')) return;
  if (event.code === 'Space') { event.preventDefault(); togglePlayback(); }
  if (event.key.toLowerCase() === 'v') setRating(state.selectedId, 'vault');
  if (event.key.toLowerCase() === 'h') setRating(state.selectedId, 'hold');
  if (event.key.toLowerCase() === 'x') setRating(state.selectedId, 'cut');
  if (event.key.toLowerCase() === 'j') adjacentTrack(1);
  if (event.key.toLowerCase() === 'k') adjacentTrack(-1);
});

init().catch((error) => { console.error(error); $('#welcome-screen').hidden = false; toast('SIGNAL VAULT COULD NOT START'); });
