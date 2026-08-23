const TAU = Math.PI * 2;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const average = (values, start, end) => {
  let total = 0;
  const safeEnd = Math.max(start + 1, Math.min(values.length, end));
  for (let index = start; index < safeEnd; index += 1) total += values[index];
  return total / (safeEnd - start) / 255;
};

export const VISUAL_SCENES = [
  { id: 'neon-rift', code: 'V01', name: 'NEON RIFT', mood: 'Mirrored frequency blades / cyan voltage' },
  { id: 'black-sun', code: 'V02', name: 'BLACK SUN', mood: 'Bass corona / molten orbital pressure' },
  { id: 'wave-temple', code: 'V03', name: 'WAVE TEMPLE', mood: 'Layered oscilloscopes / spectral architecture' },
  { id: 'gravity-grid', code: 'V04', name: 'GRAVITY GRID', mood: 'Perspective field / low-end singularity' },
  { id: 'spectral-crown', code: 'V05', name: 'SPECTRAL CROWN', mood: 'Symmetric skyline / frequency monarchy' },
  { id: 'chromatic-wormhole', code: 'V06', name: 'CHROMATIC WORMHOLE', mood: 'Infinite geometry / tempo descent' },
  { id: 'particle-cathedral', code: 'V07', name: 'PARTICLE CATHEDRAL', mood: 'Luminous dust / towering harmonics' },
  { id: 'signal-ghost', code: 'V08', name: 'SIGNAL GHOST', mood: 'Feedback trails / haunted transmission' },
  { id: 'astral-cathedral', code: 'V09', name: 'ASTRAL CATHEDRAL', mood: 'Ten-state image spectrum / filament oscilloscope' },
  { id: 'motion-rig', code: 'V10', name: 'CUTLIGHT', mood: 'Music-directed moving artwork / any image' }
];

function polygon(context, x, y, radius, sides, rotation = 0) {
  context.beginPath();
  for (let side = 0; side <= sides; side += 1) {
    const angle = rotation + (side / sides) * TAU;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (side === 0) context.moveTo(px, py); else context.lineTo(px, py);
  }
}

export class SignalVisualizer {
  constructor({ canvas, analyserProvider, trackProvider, onSceneChange }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.analyserProvider = analyserProvider;
    this.trackProvider = trackProvider;
    this.onSceneChange = onSceneChange;
    this.sceneIndex = Number(localStorage.getItem('signal-vault-visual-scene') || 0) % VISUAL_SCENES.length;
    this.intensity = Number(localStorage.getItem('signal-vault-visual-intensity') || 1.15);
    this.shuffle = localStorage.getItem('signal-vault-visual-shuffle') === 'true';
    this.running = false;
    this.frameHandle = null;
    this.startedAt = performance.now();
    this.lastShuffleAt = performance.now();
    this.particles = [];
    this.ghosts = [];
    this.astralBands = { bass: 0, lowMid: 0, highMid: 0, treble: 0, energy: 0 };
    this.astralPreviousEnergy = 0;
    this.astralTransient = 0;
    this.astralAfterglow = 0;
    this.astralCentroid = 0;
    this.rigImage = new Image();
    this.rigImage.decoding = 'async';
    this.rigImage.src = '/visuals/astral-cathedral.webp';
    this.rigImageName = 'Astral Cathedral / built-in demo';
    this.rigPieces = this.buildRigPieces();
    this.rigDirectives = { motion: 1, bass: 1, palette: 'cycle', beatColor: true, cutSensitivity: 0.055 };
    this.rigPreviousSignal = { energy: 0, bass: 0, highMid: 0 };
    this.rigCutPulse = 0;
    this.rigHue = 0;
    this.rigLastCutAt = 0;
    this.artTextures = new Map();
    for (const variant of ['base', 'sub', 'bass', 'lowmid', 'mid', 'highmid', 'treble', 'air', 'transient', 'decay']) {
      const texture = new Image();
      texture.decoding = 'async';
      texture.src = variant === 'base' ? '/visuals/astral-cathedral.webp' : `/visuals/astral-cathedral-${variant}.webp`;
      this.artTextures.set(`astral-cathedral-${variant}`, texture);
    }
    this.frequencyData = new Uint8Array(128);
    this.waveData = new Uint8Array(256);
    this.resize = this.resize.bind(this);
    this.draw = this.draw.bind(this);
  }

  get scene() { return VISUAL_SCENES[this.sceneIndex]; }

  start() {
    if (this.running) return;
    this.running = true;
    this.startedAt = performance.now();
    this.lastShuffleAt = performance.now();
    window.addEventListener('resize', this.resize);
    this.resize();
    this.onSceneChange?.(this.scene, this);
    this.frameHandle = requestAnimationFrame(this.draw);
  }

  stop() {
    this.running = false;
    window.removeEventListener('resize', this.resize);
    if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
    this.width = Math.max(320, window.innerWidth);
    this.height = Math.max(320, window.innerHeight);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ratio = ratio;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.context.fillStyle = '#050607';
    this.context.fillRect(0, 0, this.width, this.height);
    this.particles = [];
    this.ghosts = [];
  }

  setScene(index) {
    this.sceneIndex = (index + VISUAL_SCENES.length) % VISUAL_SCENES.length;
    localStorage.setItem('signal-vault-visual-scene', String(this.sceneIndex));
    this.particles = [];
    this.ghosts = [];
    this.onSceneChange?.(this.scene, this);
  }

  setSceneById(id) {
    const index = VISUAL_SCENES.findIndex((scene) => scene.id === id);
    if (index >= 0) this.setScene(index);
  }

  buildRigPieces() {
    const pieces = [];
    const columns = 5;
    const rows = 4;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const centerX = (column + 0.5) / columns;
        const centerY = (row + 0.5) / rows;
        const radialX = centerX - 0.5;
        const radialY = centerY - 0.5;
        const length = Math.hypot(radialX, radialY) || 1;
        const band = row === rows - 1
          ? (column > 0 && column < columns - 1 ? 'bass' : 'treble')
          : row === 2
            ? (column > 0 && column < columns - 1 ? 'lowMid' : 'highMid')
            : row === 1
              ? (column === 2 ? 'bass' : 'lowMid')
              : (column === 2 ? 'highMid' : 'treble');
        pieces.push({
          index,
          row,
          column,
          x: column / columns,
          y: row / rows,
          width: 1 / columns,
          height: 1 / rows,
          directionX: radialX / length,
          directionY: radialY / length,
          band,
          phase: index * 0.73 + row * 0.41,
          level: 0
        });
      }
    }
    return pieces;
  }

  async setRigImage(file) {
    if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file');
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('This image could not be decoded'));
      image.src = url;
    });
    URL.revokeObjectURL(url);
    this.rigImage = image;
    this.rigImageName = file.name;
    this.rigPieces = this.buildRigPieces();
    this.setSceneById('motion-rig');
    return { name: file.name, pieces: this.rigPieces.length, width: image.naturalWidth, height: image.naturalHeight };
  }

  applyRigPrompt(prompt) {
    const text = String(prompt || '').trim().toLowerCase();
    if (!text) return 'Describe color, movement, bass, smoothness, or musical cuts.';
    const directives = { ...this.rigDirectives };
    if (/wild|intense|hard|huge|epic|more movement|explode/.test(text)) directives.motion = 1.65;
    if (/smooth|cinematic|slow|gentle/.test(text)) directives.motion = 0.78;
    if (/subtle|minimal|calm/.test(text)) directives.motion = 0.52;
    if (/bass|low end|kick/.test(text)) directives.bass = /hard|huge|more|heavy/.test(text) ? 1.8 : 1.4;
    if (/monochrome|black and white|grayscale/.test(text)) directives.palette = 'mono';
    else if (/warm|orange|red|gold|fire/.test(text)) directives.palette = 'warm';
    else if (/cold|cool|blue|cyan|ice/.test(text)) directives.palette = 'cool';
    else if (/green|acid|lime/.test(text)) directives.palette = 'acid';
    else if (/color|colour|rainbow|spectrum|hue/.test(text)) directives.palette = 'cycle';
    if (/cut|change|transition|drop|beat|section/.test(text)) {
      directives.beatColor = !/do not|don't|without/.test(text);
      directives.cutSensitivity = /every|each|sensitive/.test(text) ? 0.032 : 0.048;
    }
    if (/no color change|keep the color|fixed color/.test(text)) directives.beatColor = false;
    this.rigDirectives = directives;
    const color = directives.palette === 'mono' ? 'monochrome' : `${directives.palette} color`;
    const cuts = directives.beatColor ? 'colors react to musical changes' : 'color stays continuous';
    return `${Math.round(directives.motion * 100)}% motion · ${Math.round(directives.bass * 100)}% bass · ${color} · ${cuts}`;
  }

  next() { this.setScene(this.sceneIndex + 1); }
  previous() { this.setScene(this.sceneIndex - 1); }
  random() {
    const jump = 1 + Math.floor(Math.random() * (VISUAL_SCENES.length - 1));
    this.setScene(this.sceneIndex + jump);
  }

  setIntensity(value) {
    this.intensity = clamp(Number(value), 0.5, 2);
    localStorage.setItem('signal-vault-visual-intensity', String(this.intensity));
  }

  setShuffle(enabled) {
    this.shuffle = Boolean(enabled);
    this.lastShuffleAt = performance.now();
    localStorage.setItem('signal-vault-visual-shuffle', String(this.shuffle));
    this.onSceneChange?.(this.scene, this);
  }

  sample(now) {
    const analyser = this.analyserProvider?.();
    let live = false;
    if (analyser) {
      if (this.frequencyData.length !== analyser.frequencyBinCount) this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
      if (this.waveData.length !== analyser.fftSize) this.waveData = new Uint8Array(analyser.fftSize);
      analyser.getByteFrequencyData(this.frequencyData);
      analyser.getByteTimeDomainData(this.waveData);
      live = this.frequencyData.some((value) => value > 3);
    }
    if (!live) {
      const time = now * 0.001;
      for (let index = 0; index < this.frequencyData.length; index += 1) {
        const decay = 1 - index / this.frequencyData.length;
        const position = index / this.frequencyData.length;
        const bassBeat = Math.pow(Math.max(0, Math.sin(time * 2.15)), 7) * Math.max(0, 1 - position * 8);
        const midSweep = Math.pow(Math.max(0, Math.sin(time * 0.73 + position * 11)), 3) * Math.max(0, 1 - Math.abs(position - 0.34) * 4);
        const trebleFlicker = Math.pow(Math.max(0, Math.sin(time * 4.6 + index * 0.91)), 10) * position;
        this.frequencyData[index] = 18 + Math.min(190, bassBeat * 155 + midSweep * 92 + trebleFlicker * 125 + Math.max(0, Math.sin(time * 1.1 + index * 0.27)) * 24 * decay);
      }
      for (let index = 0; index < this.waveData.length; index += 1) this.waveData[index] = 128 + Math.sin(time * 1.8 + index * 0.09) * (24 + Math.sin(time * 0.63) * 12);
    }
    const length = this.frequencyData.length;
    const bass = average(this.frequencyData, 0, Math.ceil(length * 0.12));
    const lowMid = average(this.frequencyData, Math.ceil(length * 0.12), Math.ceil(length * 0.32));
    const highMid = average(this.frequencyData, Math.ceil(length * 0.32), Math.ceil(length * 0.62));
    const treble = average(this.frequencyData, Math.ceil(length * 0.62), length);
    const energy = clamp((bass * 1.45 + lowMid + highMid * 0.8 + treble * 0.55) / 3.3);
    return { bass, lowMid, highMid, treble, energy, frequency: this.frequencyData, wave: this.waveData, live };
  }

  prepareFrame(alpha = 0.18) {
    const context = this.context;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.fillStyle = `rgba(3, 4, 5, ${alpha})`;
    context.fillRect(0, 0, this.width, this.height);
  }

  draw(now) {
    if (!this.running) return;
    if (this.shuffle && now - this.lastShuffleAt > 22000) {
      this.random();
      this.lastShuffleAt = now;
    }
    const signal = this.sample(now);
    const time = (now - this.startedAt) * 0.001;
    const drawScene = {
      'neon-rift': this.drawNeonRift,
      'black-sun': this.drawBlackSun,
      'wave-temple': this.drawWaveTemple,
      'gravity-grid': this.drawGravityGrid,
      'spectral-crown': this.drawSpectralCrown,
      'chromatic-wormhole': this.drawChromaticWormhole,
      'particle-cathedral': this.drawParticleCathedral,
      'signal-ghost': this.drawSignalGhost,
      'astral-cathedral': this.drawAstralCathedral,
      'motion-rig': this.drawMotionRig
    }[this.scene.id];
    drawScene.call(this, time, signal);
    this.frameHandle = requestAnimationFrame(this.draw);
  }

  drawNeonRift(time, signal) {
    this.prepareFrame(0.15);
    const { context: ctx, width, height } = this;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * (0.12 + signal.bass * 0.12);
    const bins = Math.min(84, signal.frequency.length);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(time * 0.035);
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < bins; index += 1) {
      const value = signal.frequency[index] / 255;
      const angle = (index / bins) * Math.PI;
      const length = 16 + value * Math.min(width, height) * 0.36 * this.intensity;
      for (const mirror of [-1, 1]) {
        const x1 = Math.cos(angle * mirror) * radius;
        const y1 = Math.sin(angle * mirror) * radius;
        const x2 = Math.cos(angle * mirror) * (radius + length);
        const y2 = Math.sin(angle * mirror) * (radius + length);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${178 + index * 1.45 + signal.treble * 80}, 100%, ${50 + value * 22}%, ${0.18 + value * 0.7})`;
        ctx.lineWidth = 1 + value * 3.5;
        ctx.stroke();
      }
    }
    ctx.strokeStyle = `rgba(167,255,63,${0.3 + signal.bass})`;
    ctx.lineWidth = 2;
    polygon(ctx, 0, 0, radius * 0.72, 6, time * -0.15);
    ctx.stroke();
    ctx.restore();
  }

  drawBlackSun(time, signal) {
    this.prepareFrame(0.1);
    const { context: ctx, width, height } = this;
    const x = width / 2;
    const y = height / 2;
    const base = Math.min(width, height) * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
    const rays = Math.min(120, signal.frequency.length * 2);
    for (let index = 0; index < rays; index += 1) {
      const value = signal.frequency[index % signal.frequency.length] / 255;
      const angle = (index / rays) * TAU + time * 0.02;
      const inner = base * (1.05 + signal.bass * 0.2);
      const outer = inner + 22 + value * base * 2.8 * this.intensity;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.strokeStyle = `hsla(${8 + value * 36},100%,${46 + value * 22}%,${0.12 + value * 0.75})`;
      ctx.lineWidth = 0.7 + value * 2.4;
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(0, 0, base * 0.2, 0, 0, base * 1.35);
    glow.addColorStop(0, '#020202'); glow.addColorStop(0.68, '#050403'); glow.addColorStop(0.82, `rgba(255,91,56,${0.34 + signal.bass * 0.5})`); glow.addColorStop(1, 'rgba(255,91,56,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, base * 1.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#010102'; ctx.beginPath(); ctx.arc(0, 0, base * (0.82 + signal.bass * 0.11), 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawWaveTemple(time, signal) {
    this.prepareFrame(0.22);
    const { context: ctx, width, height } = this;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bands = 11;
    for (let band = 0; band < bands; band += 1) {
      const progress = band / (bands - 1);
      const centerY = height * (0.18 + progress * 0.64);
      const amplitude = (10 + progress * 42) * (0.35 + signal.energy * this.intensity);
      ctx.beginPath();
      for (let x = 0; x <= width; x += 5) {
        const sampleIndex = Math.floor((x / width) * (signal.wave.length - 1));
        const sample = (signal.wave[sampleIndex] - 128) / 128;
        const y = centerY + sample * amplitude + Math.sin(x * 0.008 + time * (0.3 + progress)) * 5;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${155 + band * 10 + time * 4},100%,${48 + band * 2}%,${0.12 + progress * 0.42})`;
      ctx.lineWidth = 1 + progress * 2;
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(241,238,228,.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < width; x += width / 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    ctx.restore();
  }

  drawGravityGrid(time, signal) {
    this.prepareFrame(0.28);
    const { context: ctx, width, height } = this;
    const horizon = height * 0.42;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(0,217,255,${0.12 + signal.highMid * 0.34})`; ctx.lineWidth = 1;
    for (let line = -12; line <= 12; line += 1) {
      ctx.beginPath(); ctx.moveTo(width / 2 + line * 8, horizon); ctx.lineTo(width / 2 + line * width * 0.12, height); ctx.stroke();
    }
    for (let row = 0; row < 24; row += 1) {
      const phase = (row / 24 + time * (0.045 + signal.bass * 0.08)) % 1;
      const eased = phase * phase;
      const y = horizon + eased * (height - horizon);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    const orbCount = 18;
    for (let index = 0; index < orbCount; index += 1) {
      const value = signal.frequency[(index * 3) % signal.frequency.length] / 255;
      const orbit = Math.min(width, height) * (0.16 + index * 0.018);
      const angle = time * (0.12 + index * 0.002) + index * 2.4;
      const x = width / 2 + Math.cos(angle) * orbit * 1.6;
      const y = horizon + Math.sin(angle) * orbit * 0.38;
      const size = 2 + value * 12 * this.intensity;
      ctx.fillStyle = `hsla(${185 + index * 8},100%,62%,${0.2 + value * 0.7})`;
      ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawSpectralCrown(time, signal) {
    this.prepareFrame(0.2);
    const { context: ctx, width, height } = this;
    const bars = Math.min(64, signal.frequency.length);
    const barWidth = width / (bars * 2);
    ctx.save(); ctx.translate(width / 2, height / 2); ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < bars; index += 1) {
      const value = signal.frequency[index] / 255;
      const x = index * barWidth;
      const barHeight = 6 + value * height * 0.42 * this.intensity;
      const hue = 42 + index * 2.8 + Math.sin(time) * 20;
      ctx.fillStyle = `hsla(${hue},100%,${52 + value * 20}%,${0.18 + value * 0.72})`;
      ctx.fillRect(x, -barHeight / 2, Math.max(1, barWidth - 2), barHeight);
      ctx.fillRect(-x - barWidth, -barHeight / 2, Math.max(1, barWidth - 2), barHeight);
    }
    ctx.strokeStyle = `rgba(167,255,63,${0.25 + signal.bass * 0.7})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-width / 2, 0); ctx.lineTo(width / 2, 0); ctx.stroke();
    ctx.restore();
  }

  drawChromaticWormhole(time, signal) {
    this.prepareFrame(0.12);
    const { context: ctx, width, height } = this;
    ctx.save(); ctx.translate(width / 2, height / 2); ctx.globalCompositeOperation = 'lighter';
    const maxRadius = Math.hypot(width, height) * 0.55;
    for (let ring = 0; ring < 42; ring += 1) {
      const phase = (ring / 42 + time * (0.035 + signal.bass * 0.06)) % 1;
      const radius = 12 + phase * phase * maxRadius;
      const sides = 5 + (ring % 4);
      const value = signal.frequency[(ring * 2) % signal.frequency.length] / 255;
      polygon(ctx, Math.sin(time * 0.19) * width * 0.04 * phase, Math.cos(time * 0.13) * height * 0.04 * phase, radius * (1 + value * 0.13 * this.intensity), sides, time * 0.08 + ring * 0.15);
      ctx.strokeStyle = `hsla(${ring * 8 + time * 16},100%,${48 + value * 28}%,${0.08 + (1 - phase) * 0.5})`;
      ctx.lineWidth = 0.7 + value * 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticleCathedral(time, signal) {
    this.prepareFrame(0.12);
    const { context: ctx, width, height } = this;
    const targetCount = Math.min(520, Math.round(180 + width * 0.1));
    while (this.particles.length < targetCount) {
      this.particles.push({
        x: Math.random() * width, y: Math.random() * height,
        z: Math.random(), speed: 0.15 + Math.random() * 0.7,
        hue: 82 + Math.random() * 120, size: 0.5 + Math.random() * 2.5
      });
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      const band = signal.frequency[index % signal.frequency.length] / 255;
      particle.y -= particle.speed * (0.5 + signal.energy * 5 * this.intensity);
      particle.x += Math.sin(time * 0.4 + particle.y * 0.006 + particle.z * 10) * (0.15 + signal.lowMid);
      if (particle.y < -10) { particle.y = height + 10; particle.x = Math.random() * width; }
      const size = particle.size * (0.7 + band * 3 * this.intensity);
      ctx.fillStyle = `hsla(${particle.hue + time * 6},100%,70%,${0.18 + band * 0.7})`;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, size, 0, TAU); ctx.fill();
    }
    const columns = 9;
    for (let index = 0; index < columns; index += 1) {
      const x = (index + 0.5) * width / columns;
      const value = signal.frequency[Math.floor(index / columns * signal.frequency.length)] / 255;
      const gradient = ctx.createLinearGradient(x, height, x, height * 0.12);
      gradient.addColorStop(0, `rgba(167,255,63,${0.1 + value * 0.35})`);
      gradient.addColorStop(1, 'rgba(0,217,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 2 - value * 7, height * 0.18, 4 + value * 14, height * 0.82);
    }
    ctx.restore();
  }

  drawSignalGhost(time, signal) {
    this.prepareFrame(0.055);
    const { context: ctx, width, height } = this;
    const path = [];
    for (let index = 0; index < signal.wave.length; index += 3) {
      path.push({
        x: index / (signal.wave.length - 1) * width,
        y: height / 2 + ((signal.wave[index] - 128) / 128) * height * (0.12 + signal.energy * 0.24 * this.intensity)
      });
    }
    this.ghosts.unshift({ path, hue: (time * 28) % 360 });
    if (this.ghosts.length > 18) this.ghosts.pop();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    this.ghosts.forEach((ghost, ghostIndex) => {
      const drift = ghostIndex * 5;
      ctx.beginPath();
      ghost.path.forEach((point, index) => {
        const y = point.y + Math.sin(index * 0.31 + time) * drift * 0.22 + drift;
        if (index === 0) ctx.moveTo(point.x, y); else ctx.lineTo(point.x, y);
      });
      ctx.strokeStyle = `hsla(${ghost.hue + ghostIndex * 7},100%,65%,${(1 - ghostIndex / this.ghosts.length) * 0.22})`;
      ctx.lineWidth = 1 + (1 - ghostIndex / this.ghosts.length) * 3;
      ctx.stroke();
    });
    ctx.restore();
  }

  drawMotionRig(time, signal) {
    const image = this.rigImage;
    if (!image?.complete || !image.naturalWidth) {
      this.drawChromaticWormhole(time, signal);
      return;
    }

    const { context: ctx, width, height } = this;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const viewportRatio = width / height;
    const sourceWidth = viewportRatio > imageRatio ? image.naturalWidth : image.naturalHeight * viewportRatio;
    const sourceHeight = viewportRatio > imageRatio ? image.naturalWidth / viewportRatio : image.naturalHeight;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    const directives = this.rigDirectives;
    const signalChange = Math.abs(signal.energy - this.rigPreviousSignal.energy) * 1.25
      + Math.abs(signal.bass - this.rigPreviousSignal.bass)
      + Math.abs(signal.highMid - this.rigPreviousSignal.highMid) * 0.8;
    if (signal.live && signalChange > directives.cutSensitivity && time - this.rigLastCutAt > 0.22) {
      this.rigCutPulse = 1;
      this.rigLastCutAt = time;
      if (directives.beatColor) this.rigHue = (this.rigHue + 47 + Math.round(signal.treble * 90)) % 360;
    }
    this.rigCutPulse *= 0.88;
    this.rigPreviousSignal = { energy: signal.energy, bass: signal.bass, highMid: signal.highMid };
    const paletteHue = directives.palette === 'warm' ? -28
      : directives.palette === 'cool' ? 145
        : directives.palette === 'acid' ? 78
          : directives.palette === 'cycle' ? this.rigHue + time * 4 : 0;
    const paletteFilter = directives.palette === 'mono'
      ? 'grayscale(1) contrast(1.2) brightness(.88)'
      : `hue-rotate(${paletteHue}deg) brightness(.84) saturate(1.12) contrast(1.08)`;

    ctx.save();
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#020304';
    ctx.fillRect(0, 0, width, height);
    ctx.filter = paletteFilter;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    ctx.filter = 'none';

    for (const piece of this.rigPieces) {
      const bandSignal = signal[piece.band] ?? signal.energy;
      const target = clamp(bandSignal * (piece.band === 'bass' ? directives.bass : 1));
      const easing = target > piece.level ? 0.11 : 0.038;
      piece.level += (target - piece.level) * easing;
      const idle = Math.sin(time * (0.22 + piece.row * 0.025) + piece.phase);
      const response = piece.level * this.intensity * directives.motion;
      const centerX = (piece.x + piece.width / 2) * width;
      const centerY = (piece.y + piece.height / 2) * height;
      const floorPush = piece.row === 3 ? 1.45 : 1;
      const travel = Math.min(width, height) * (0.012 + response * 0.034) * floorPush;
      const cutDirection = piece.index % 2 ? -1 : 1;
      const translateX = piece.directionX * travel + Math.cos(piece.phase) * idle * 2.5 + cutDirection * this.rigCutPulse * width * 0.006;
      const translateY = piece.directionY * travel + (piece.row === 0 ? -1 : piece.row === 3 ? 1 : 0) * response * height * 0.018 + Math.sin(piece.phase) * idle * 2.5;
      const scale = 1.006 + response * (piece.column === 2 ? 0.105 : 0.072) + idle * 0.006 + this.rigCutPulse * 0.018;
      const targetX = piece.x * width - 2;
      const targetY = piece.y * height - 2;
      const targetWidth = piece.width * width + 4;
      const targetHeight = piece.height * height + 4;
      const cropX = sourceX + piece.x * sourceWidth;
      const cropY = sourceY + piece.y * sourceHeight;
      const cropWidth = piece.width * sourceWidth;
      const cropHeight = piece.height * sourceHeight;

      ctx.save();
      ctx.translate(centerX + translateX, centerY + translateY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.beginPath();
      ctx.rect(targetX, targetY, targetWidth, targetHeight);
      ctx.clip();
      ctx.globalAlpha = clamp(0.54 + response * 0.54, 0, 1);
      const pieceColor = directives.palette === 'mono' ? 'grayscale(1)' : `hue-rotate(${paletteHue + piece.index * 1.7}deg)`;
      ctx.filter = `${pieceColor} brightness(${1.08 + response * 0.34}) saturate(${1.18 + response * 0.74}) contrast(${1.04 + response * 0.18})`;
      ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, targetX, targetY, targetWidth, targetHeight);
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.11 + signal.energy * 0.2;
    const glow = ctx.createRadialGradient(width / 2, height * 0.52, 0, width / 2, height * 0.52, Math.max(width, height) * 0.58);
    glow.addColorStop(0, 'rgba(167,255,63,.26)');
    glow.addColorStop(.48, 'rgba(0,217,255,.08)');
    glow.addColorStop(1, 'rgba(255,79,216,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawAstralCathedral(time, signal) {
    const image = this.artTextures.get('astral-cathedral-base');
    if (!image?.complete || !image.naturalWidth) {
      this.drawChromaticWormhole(time, signal);
      return;
    }

    const { context: ctx, width, height } = this;
    for (const band of ['bass', 'lowMid', 'highMid', 'treble', 'energy']) {
      const response = signal[band] > this.astralBands[band] ? 0.24 : 0.065;
      this.astralBands[band] += (signal[band] - this.astralBands[band]) * response;
    }
    const bands = this.astralBands;
    const energyRise = Math.max(0, bands.energy - this.astralPreviousEnergy);
    this.astralTransient = Math.max(energyRise * 8.5, this.astralTransient * 0.86);
    this.astralAfterglow = Math.max(this.astralTransient * 0.8, this.astralAfterglow * 0.965);
    this.astralPreviousEnergy = bands.energy;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const viewportRatio = width / height;
    const sourceWidth = viewportRatio > imageRatio ? image.naturalWidth : image.naturalHeight * viewportRatio;
    const sourceHeight = viewportRatio > imageRatio ? image.naturalWidth / viewportRatio : image.naturalHeight;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    const breath = 1.012 + Math.sin(time * 0.19) * 0.004;
    const drawWidth = width * breath;
    const drawHeight = height * breath;
    const drawX = (width - drawWidth) / 2 + Math.sin(time * 0.17) * width * 0.006;
    const drawY = (height - drawHeight) / 2 + Math.cos(time * 0.13) * height * 0.004;

    ctx.save();
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#010203';
    ctx.fillRect(0, 0, width, height);
    ctx.filter = `saturate(${1.04 + bands.energy * 0.28}) contrast(1.16) brightness(${0.4 + bands.energy * 0.16})`;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
    ctx.filter = 'none';

    // The overall material state follows the spectral center of gravity. Adjacent
    // images crossfade, so color and filament length migrate through the bank
    // instead of simply getting brighter and darker.
    const spectrumStates = ['sub', 'bass', 'lowmid', 'base', 'mid', 'highmid', 'treble', 'air'];
    let spectralTotal = 0;
    let spectralWeight = 0;
    for (let index = 0; index < signal.frequency.length; index += 1) {
      const magnitude = signal.frequency[index] / 255;
      spectralTotal += magnitude;
      spectralWeight += magnitude * Math.pow(index / Math.max(1, signal.frequency.length - 1), 0.72);
    }
    const liveCentroid = spectralTotal ? spectralWeight / spectralTotal : 0;
    const demoCentroid = (Math.sin(time * 0.72 - Math.PI / 2) + 1) / 2;
    const targetCentroid = signal.live ? liveCentroid : demoCentroid;
    if (signal.live) this.astralCentroid += (targetCentroid - this.astralCentroid) * 0.075;
    else this.astralCentroid = targetCentroid;
    const statePosition = clamp(this.astralCentroid) * (spectrumStates.length - 1);
    const lowerState = Math.floor(statePosition);
    const upperState = Math.min(spectrumStates.length - 1, lowerState + 1);
    const stateMix = statePosition - lowerState;
    const drawFullState = (state, alpha) => {
      const texture = this.artTextures.get(`astral-cathedral-${state}`);
      if (!texture?.complete || !texture.naturalWidth) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.filter = `saturate(${1.18 + bands.energy * 0.5}) contrast(1.1) brightness(${0.72 + bands.energy * 0.3})`;
      ctx.drawImage(texture, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
    };
    drawFullState(spectrumStates[lowerState], 0.96);
    drawFullState(spectrumStates[upperState], stateMix);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // A fading full-spectrum image records recent impacts behind the live columns.
    const decayImage = this.artTextures.get('astral-cathedral-decay');
    if (decayImage?.complete && decayImage.naturalWidth && this.astralAfterglow > 0.015) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = this.astralAfterglow * 0.26;
      const ghostShift = Math.sin(time * 2.7) * width * 0.008 * this.astralAfterglow;
      ctx.drawImage(decayImage, sourceX, sourceY, sourceWidth, sourceHeight, drawX + ghostShift, drawY, drawWidth, drawHeight);
      ctx.drawImage(decayImage, sourceX, sourceY, sourceWidth, sourceHeight, drawX - ghostShift, drawY, drawWidth, drawHeight);
    }

    // Build the visible architecture from mirrored spectrum strips. Low bins sit
    // at the center; high bins travel toward the edges. Every strip selects its
    // own artwork state, color family, displacement and vertical filament length.
    const columns = Math.max(48, Math.min(88, Math.round(width / 18)));
    ctx.globalCompositeOperation = 'source-over';
    for (let column = 0; column < columns; column += 1) {
      const progress = (column + 0.5) / columns;
      const spectralPosition = Math.abs(progress - 0.5) * 2;
      const stateIndex = Math.min(spectrumStates.length - 1, Math.floor(spectralPosition * spectrumStates.length));
      const texture = this.artTextures.get(`astral-cathedral-${spectrumStates[stateIndex]}`) || image;
      if (!texture.complete || !texture.naturalWidth) continue;
      const frequencyPosition = Math.pow(spectralPosition, 1.7);
      const binCenter = Math.floor(frequencyPosition * (signal.frequency.length - 1));
      const binStart = Math.max(0, binCenter - 2);
      const binEnd = Math.min(signal.frequency.length, binCenter + 3);
      const measuredValue = average(signal.frequency, binStart, binEnd);
      const demoSweep = 0.22 + Math.pow(Math.max(0, Math.sin(time * 1.35 - spectralPosition * 8.5)), 3) * 0.68;
      const value = signal.live ? measuredValue : Math.max(measuredValue, demoSweep);
      const waveIndex = Math.floor(progress * (signal.wave.length - 1));
      const wave = (signal.wave[waveIndex] - 128) / 128;
      const sourceColumnWidth = sourceWidth / columns + 1;
      const sourceColumnX = sourceX + column / columns * sourceWidth;
      const targetColumnWidth = width / columns + 1.5;
      const targetColumnX = column / columns * width + wave * width * 0.018 * this.intensity;
      const extension = value * height * (0.32 + (1 - spectralPosition) * 0.42) * this.intensity;
      const targetColumnHeight = height + extension;
      const targetColumnY = -extension * (0.72 + spectralPosition * 0.2);
      ctx.globalAlpha = clamp(0.3 + value * 0.72);
      ctx.filter = `saturate(${1.12 + value * 1.15}) contrast(${1.06 + value * 0.42}) brightness(${0.78 + value * 0.62})`;
      ctx.drawImage(texture, sourceColumnX, sourceY, sourceColumnWidth, sourceHeight, targetColumnX, targetColumnY, targetColumnWidth, targetColumnHeight);

      // A narrow spectral filament makes each strip's extension readable while
      // keeping the generated architecture visible inside the wider column.
      const capY = Math.max(0, height * 0.72 - value * height * 0.58 * this.intensity);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.08 + value * 0.38;
      ctx.fillStyle = `hsl(${105 + spectralPosition * 205},100%,68%)`;
      ctx.fillRect(targetColumnX + targetColumnWidth * 0.37, capY, Math.max(1, targetColumnWidth * 0.18), height * 0.72 - capY);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.filter = 'none';

    // On sharp attacks, the ninth artwork state breaks through in alternating
    // columns. It falls away into the tenth, spectral-decay state above.
    const transientImage = this.artTextures.get('astral-cathedral-transient');
    if (transientImage?.complete && transientImage.naturalWidth && this.astralTransient > 0.018) {
      ctx.globalAlpha = clamp(this.astralTransient * 0.72);
      ctx.globalCompositeOperation = 'lighter';
      const burstColumns = 18;
      for (let column = 0; column < burstColumns; column += 2) {
        const sourceColumnX = sourceX + column / burstColumns * sourceWidth;
        const columnWidth = sourceWidth / burstColumns + 1;
        const value = signal.frequency[Math.floor(column / burstColumns * (signal.frequency.length - 1))] / 255;
        ctx.drawImage(transientImage, sourceColumnX, sourceY, columnWidth, sourceHeight, column / burstColumns * width, -value * height * 0.22, width / burstColumns + 2, height * (1 + value * 0.22));
      }
    }

    // A three-trace oscilloscope line makes the waveform legible without hiding
    // the image-spectrum construction underneath it.
    ctx.globalCompositeOperation = 'lighter';
    const waveformGradient = ctx.createLinearGradient(width * 0.1, 0, width * 0.9, 0);
    waveformGradient.addColorStop(0, '#ff4fd8');
    waveformGradient.addColorStop(0.28, '#45dcff');
    waveformGradient.addColorStop(0.5, '#a7ff3f');
    waveformGradient.addColorStop(0.72, '#45dcff');
    waveformGradient.addColorStop(1, '#ff4fd8');
    for (let trail = 2; trail >= 0; trail -= 1) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const sampleIndex = Math.floor(x / width * (signal.wave.length - 1));
        const sample = (signal.wave[sampleIndex] - 128) / 128;
        const idleBoost = signal.live ? 0 : 0.11;
        const y = height * 0.72 + sample * height * (0.12 + idleBoost + bands.energy * 0.24) * this.intensity + trail * 4;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = waveformGradient;
      ctx.globalAlpha = 0.18 + (2 - trail) * 0.16;
      ctx.lineWidth = 1 + (2 - trail) * 0.9;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.68);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.7, 'rgba(0,0,0,.08)');
    vignette.addColorStop(1, 'rgba(0,0,0,.54)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
}
