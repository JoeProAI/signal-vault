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
  { id: 'astral-cathedral', code: 'V09', name: 'ASTRAL CATHEDRAL', mood: 'AI-forged architecture / living spectral shrine' }
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
    this.artTextures = new Map();
    const astralCathedral = new Image();
    astralCathedral.decoding = 'async';
    astralCathedral.src = '/visuals/astral-cathedral.webp';
    this.artTextures.set('astral-cathedral', astralCathedral);
    for (const variant of ['bass', 'treble']) {
      const texture = new Image();
      texture.decoding = 'async';
      texture.src = `/visuals/astral-cathedral-${variant}.webp`;
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
    if (analyser) {
      if (this.frequencyData.length !== analyser.frequencyBinCount) this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
      if (this.waveData.length !== analyser.fftSize) this.waveData = new Uint8Array(analyser.fftSize);
      analyser.getByteFrequencyData(this.frequencyData);
      analyser.getByteTimeDomainData(this.waveData);
    } else {
      const time = now * 0.001;
      for (let index = 0; index < this.frequencyData.length; index += 1) {
        const decay = 1 - index / this.frequencyData.length;
        const position = index / this.frequencyData.length;
        const bassBeat = Math.pow(Math.max(0, Math.sin(time * 2.15)), 7) * Math.max(0, 1 - position * 8);
        const midSweep = Math.pow(Math.max(0, Math.sin(time * 0.73 + position * 11)), 3) * Math.max(0, 1 - Math.abs(position - 0.34) * 4);
        const trebleFlicker = Math.pow(Math.max(0, Math.sin(time * 4.6 + index * 0.91)), 10) * position;
        this.frequencyData[index] = 18 + Math.min(190, bassBeat * 155 + midSweep * 92 + trebleFlicker * 125 + Math.max(0, Math.sin(time * 1.1 + index * 0.27)) * 24 * decay);
      }
      for (let index = 0; index < this.waveData.length; index += 1) this.waveData[index] = 128 + Math.sin(time * 1.2 + index * 0.09) * 13;
    }
    const length = this.frequencyData.length;
    const bass = average(this.frequencyData, 0, Math.ceil(length * 0.12));
    const lowMid = average(this.frequencyData, Math.ceil(length * 0.12), Math.ceil(length * 0.32));
    const highMid = average(this.frequencyData, Math.ceil(length * 0.32), Math.ceil(length * 0.62));
    const treble = average(this.frequencyData, Math.ceil(length * 0.62), length);
    const energy = clamp((bass * 1.45 + lowMid + highMid * 0.8 + treble * 0.55) / 3.3);
    return { bass, lowMid, highMid, treble, energy, frequency: this.frequencyData, wave: this.waveData };
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
      'astral-cathedral': this.drawAstralCathedral
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

  drawAstralCathedral(time, signal) {
    const image = this.artTextures.get('astral-cathedral');
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
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const viewportRatio = width / height;
    const sourceWidth = viewportRatio > imageRatio ? image.naturalWidth : image.naturalHeight * viewportRatio;
    const sourceHeight = viewportRatio > imageRatio ? image.naturalWidth / viewportRatio : image.naturalHeight;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    const bassPulse = bands.bass * this.intensity;
    const breath = 1.025 + Math.sin(time * 0.24) * 0.012 + bassPulse * 0.045;
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
    ctx.filter = `saturate(${1.08 + bands.highMid * 1.1}) contrast(${1.1 + bands.bass * 0.42}) brightness(${0.58 + bands.energy * 0.5}) hue-rotate(${Math.sin(time * 0.11) * 7 + bands.lowMid * 13}deg)`;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
    ctx.filter = 'none';

    // Blend into composition-matched AI artwork states so bass and treble alter
    // the material world itself, rather than only changing an overlay.
    const bassImage = this.artTextures.get('astral-cathedral-bass');
    const trebleImage = this.artTextures.get('astral-cathedral-treble');
    const drawArtworkState = (texture, amount, filter) => {
      if (!texture?.complete || !texture.naturalWidth || amount <= 0.01) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = clamp(amount);
      ctx.filter = filter;
      ctx.drawImage(texture, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    };
    const bassState = clamp((bands.bass - 0.035) * 1.5 * this.intensity, 0, 0.82);
    const trebleState = clamp((bands.treble - 0.025) * 2.1 * this.intensity, 0, 0.76);
    drawArtworkState(bassImage, bassState, `brightness(${0.72 + bands.energy * 0.35}) saturate(${1.05 + bands.bass * 0.45})`);
    drawArtworkState(trebleImage, trebleState, `brightness(${0.68 + bands.energy * 0.45}) saturate(${1.12 + bands.treble * 0.7})`);

    // Midrange energy bends the cathedral's two halves in opposite directions,
    // making the architectural ribs flex without destabilizing the composition.
    const ribBend = bands.lowMid * width * 0.028 * this.intensity;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.06 + bands.lowMid * 0.2;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth / 2, sourceHeight, -ribBend, 0, width / 2 + ribBend, height);
    ctx.drawImage(image, sourceX + sourceWidth / 2, sourceY, sourceWidth / 2, sourceHeight, width / 2, 0, width / 2 + ribBend, height);

    // Each horizontal band is driven by a different FFT bin, turning the artwork
    // into shifting architecture instead of a static image backdrop.
    ctx.globalCompositeOperation = 'screen';
    const slices = 30;
    for (let slice = 0; slice < slices; slice += 1) {
      const progress = slice / slices;
      const bin = Math.floor(progress * (signal.frequency.length - 1));
      const value = signal.frequency[bin] / 255;
      const sourceSliceY = sourceY + progress * sourceHeight;
      const sourceSliceHeight = sourceHeight / slices + 1;
      const targetY = progress * height;
      const targetHeight = height / slices + 1;
      const direction = slice % 2 === 0 ? 1 : -1;
      const offset = direction * value * width * (0.009 + bands.highMid * 0.035) * this.intensity * Math.sin(time * 1.2 + slice * 0.7);
      ctx.globalAlpha = 0.025 + value * (0.08 + bands.highMid * 0.2);
      ctx.drawImage(image, sourceX, sourceSliceY, sourceWidth, sourceSliceHeight, offset, targetY, width, targetHeight);
    }

    // High mids produce a restrained cyan/magenta prism split at architectural edges.
    const prismOffset = 2 + bands.highMid * width * 0.012 * this.intensity;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = bands.highMid * 0.14;
    ctx.filter = 'hue-rotate(115deg) saturate(1.8)';
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, -prismOffset, 0, width, height);
    ctx.filter = 'hue-rotate(-95deg) saturate(1.8)';
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, prismOffset, 0, width, height);
    ctx.filter = 'none';

    const centerX = width / 2;
    const centerY = height * 0.51;
    const veilRadius = Math.min(width, height) * (0.1 + bands.bass * 0.055);
    const radialBars = Math.min(96, signal.frequency.length);
    ctx.translate(centerX, centerY);
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < radialBars; index += 1) {
      const value = signal.frequency[index] / 255;
      const angle = index / radialBars * TAU + time * (0.018 + bands.treble * 0.08);
      const inner = veilRadius * (0.88 + Math.sin(index * 0.8 + time) * 0.025);
      const outer = inner + 4 + value * Math.min(width, height) * 0.14 * this.intensity;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.strokeStyle = `hsla(${150 + index * 1.9 + bands.treble * 95},100%,${58 + value * 24}%,${0.08 + value * 0.48})`;
      ctx.lineWidth = 0.6 + value * 2.2;
      ctx.stroke();
    }

    const portal = ctx.createRadialGradient(0, 0, 0, 0, 0, veilRadius * 1.4);
    portal.addColorStop(0, `rgba(0,0,0,${0.84 - bands.bass * 0.28})`);
    portal.addColorStop(0.62, 'rgba(0,7,8,.45)');
    portal.addColorStop(0.84, `rgba(94,255,196,${0.08 + bands.energy * 0.18})`);
    portal.addColorStop(1, 'rgba(0,217,255,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = portal;
    ctx.beginPath();
    ctx.arc(0, 0, veilRadius * 1.4, 0, TAU);
    ctx.fill();

    // Bass creates pressure waves that travel out from the central aperture.
    for (let ring = 0; ring < 3; ring += 1) {
      const phase = (time * (0.22 + bands.bass * 0.38) + ring / 3) % 1;
      ctx.beginPath();
      ctx.arc(0, 0, veilRadius * (1.1 + phase * 3.8), 0, TAU);
      ctx.strokeStyle = `rgba(130,255,190,${bands.bass * (1 - phase) * 0.32})`;
      ctx.lineWidth = 1 + bands.bass * 5 * (1 - phase);
      ctx.stroke();
    }
    ctx.restore();

    // Treble releases fine crystalline sparks into the upper architecture.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sparkCount = 84;
    for (let spark = 0; spark < sparkCount; spark += 1) {
      const seed = (spark * 73.137) % 1;
      const x = ((seed + Math.sin(spark * 91.7) * 0.5 + time * (0.003 + (spark % 5) * 0.0007)) % 1 + 1) % 1 * width;
      const y = height * (0.05 + ((spark * 0.618 + time * 0.016 * (1 + spark % 3)) % 1) * 0.7);
      const flicker = Math.max(0, Math.sin(time * (4 + spark % 7) + spark * 1.7));
      const alpha = bands.treble * flicker * (0.16 + (spark % 4) * 0.07);
      const size = 0.6 + bands.treble * (1 + spark % 3) * this.intensity;
      ctx.fillStyle = spark % 3 === 0 ? `rgba(255,77,218,${alpha})` : `rgba(126,244,255,${alpha})`;
      ctx.fillRect(x, y, size, size * (1.4 + bands.treble * 2.5));
    }
    ctx.restore();

    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.68);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.7, 'rgba(0,0,0,.08)');
    vignette.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
}
