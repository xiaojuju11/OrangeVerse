// Synthesized ambience & tactile haptic soundscape using Web Audio API.
// 100% procedural sound synthesis. No external audio files or network requests required.

export class ForestAudio {
  constructor() {
    this.enabled = false;
    this.night = false;
    this.context = null;
    this.timer = null;
    this.waveNode = null;
    this.waveGain = null;
  }

  ensureContext() {
    if (!this.context) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.context = new AudioCtx();
      }
    }
    if (this.context && this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
    return this.context;
  }

  async toggle() {
    if (this.enabled) {
      this.stop();
      return false;
    }
    const c = this.ensureContext();
    if (!c) throw new Error("Web Audio unavailable");
    await c.resume();
    this.enabled = true;
    
    // Master ambient gain
    this.master = c.createGain();
    this.master.gain.setValueAtTime(0, c.currentTime);
    this.master.gain.linearRampToValueAtTime(0.18, c.currentTime + 1.2);
    this.master.connect(c.destination);

    // Drone chords (warm gentle pad)
    this.oscs = [130.81, 196, 261.63, 329.63].map((f, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = 0.055 / (i + 1);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      return osc;
    });

    // Gentle ocean/wind surf generator
    this.startSurfSwell();

    this.chime();
    this.timer = setInterval(() => this.chime(), 4200);
    return true;
  }

  startSurfSwell() {
    if (!this.context || !this.master) return;
    const c = this.context;
    
    // Create 2-second pink noise buffer
    const bufferSize = c.sampleRate * 2;
    const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.06;
    }

    const whiteNoise = c.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = this.night ? 320 : 480;

    const swellGain = c.createGain();
    swellGain.gain.setValueAtTime(0.015, c.currentTime);

    // LFO for periodic wave swell
    const lfo = c.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.16; // One wave breath every ~6 seconds
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.035;

    lfo.connect(lfoGain);
    lfoGain.connect(swellGain.gain);

    whiteNoise.connect(filter);
    filter.connect(swellGain);
    swellGain.connect(this.master);

    whiteNoise.start();
    lfo.start();

    this.waveNode = whiteNoise;
    this.waveLfo = lfo;
    this.waveFilter = filter;
  }

  chime() {
    if (!this.enabled || document.hidden || !this.context) return;
    const c = this.context;
    const t = c.currentTime;
    const notes = this.night 
      ? [392.00, 440.00, 523.25, 587.33, 659.25] // Ethereal night minor/pentatonic
      : [523.25, 587.33, 659.25, 783.99, 880.00]; // Forest sun kalimba
    const f = notes[Math.floor(Math.random() * notes.length)];
    
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 3.3);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  // ASMR Micro-Haptic UI Sound
  playHaptic(type = "tap") {
    try {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      
      if (type === "tap") {
        // Soft marimba / woodblock ping
        const freqs = [880, 1046.5, 1174.66, 1318.5];
        const f = freqs[Math.floor(Math.random() * freqs.length)];
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.08);
        gain.gain.setValueAtTime(0.035, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      } else if (type === "open") {
        // Soft rising chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.22);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.27);
      } else if (type === "close") {
        // Soft dropping chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(740, t);
        osc.frequency.exponentialRampToValueAtTime(370, t + 0.18);
        gain.gain.setValueAtTime(0.035, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.21);
      }
    } catch {
      // Audio autoplay policy fail-safe
    }
  }

  stop() {
    if (!this.context) return;
    this.enabled = false;
    clearInterval(this.timer);
    const end = this.context.currentTime + 0.3;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
    }
    this.oscs?.forEach((o) => {
      try { o.stop(end); } catch {}
    });
    try {
      this.waveNode?.stop(end);
      this.waveLfo?.stop(end);
    } catch {}
    const old = this.master;
    setTimeout(() => {
      try { old?.disconnect(); } catch {}
    }, 500);
  }

  setNight(night) {
    const next = Boolean(night);
    if (next === this.night) return;
    this.night = next;
    // 正在出声时同步把浪声滤到更闷的频段，否则切到浅海黄昏后
    // 只有下次重新开启环境音才会变调（听起来像"主题没生效"）。
    const filter = this.waveFilter;
    if (this.context && filter && this.enabled) {
      const target = next ? 320 : 480;
      try {
        filter.frequency.cancelScheduledValues(this.context.currentTime);
        filter.frequency.setTargetAtTime(target, this.context.currentTime, 0.6);
      } catch {}
    }
  }
}
