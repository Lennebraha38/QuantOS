/**
 * QuantOS — Web Audio API Sentezleyici ve LIGO Kütleçekim Dalgası Ses Motoru
 * Tarayıcıda sıfır harici ses dosyasıyla gerçek osilatör/zarf sentezi yapar;
 * Node.js test ortamında sessizce (no-op) ve hatasız çalışır.
 */

export class SoundEngine {
  constructor() {
    this.volume = 0.65;
    this.muted = false;
    this._ctx = null;
    this._masterGain = null;
    this._analyser = null;
    this._freqData = null;
    this._virtualImpulse = 0;
    this._lastImpulseTime = 0;
  }

  _isBrowserAudioSupported() {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.AudioContext || window.webkitAudioContext)
    );
  }

  _ensureContext() {
    if (this.muted || !this._isBrowserAudioSupported()) {
      return null;
    }
    if (!this._ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this._ctx = new AudioCtx();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this.muted ? 0 : this.volume;

        this._analyser = this._ctx.createAnalyser();
        this._analyser.fftSize = 256;
        this._analyser.smoothingTimeConstant = 0.8;
        this._freqData = new Uint8Array(this._analyser.frequencyBinCount);

        this._masterGain.connect(this._analyser);
        this._analyser.connect(this._ctx.destination);
      } catch {
        this._ctx = null;
        return null;
      }
    }

    if (this._ctx.state === 'suspended' && typeof this._ctx.resume === 'function') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  _bumpActivity(amount = 0.5) {
    const now = Date.now();
    const current = this._computeDecayedImpulse(now);
    this._virtualImpulse = Math.min(1, Math.max(current, amount));
    this._lastImpulseTime = now;
  }

  _computeDecayedImpulse(now = Date.now()) {
    if (this._virtualImpulse <= 0) return 0;
    const elapsedSec = Math.max(0, (now - this._lastImpulseTime) / 1000);
    const decayed = this._virtualImpulse * Math.exp(-elapsedSec * 4.5);
    return decayed < 0.005 ? 0 : decayed;
  }

  setVolume(v) {
    const clamped = Math.max(0, Math.min(1, Number(v)));
    this.volume = Number.isFinite(clamped) ? clamped : this.volume;
    if (this._masterGain && this._ctx) {
      const target = this.muted ? 0 : this.volume;
      this._masterGain.gain.setValueAtTime(target, this._ctx.currentTime);
    }
    return this.volume;
  }

  getVolume() {
    return this.volume;
  }

  setMuted(m) {
    this.muted = Boolean(m);
    if (this._masterGain && this._ctx) {
      const target = this.muted ? 0 : this.volume;
      this._masterGain.gain.setValueAtTime(target, this._ctx.currentTime);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  _tone({
    freq = 440,
    endFreq = null,
    type = 'sine',
    startOffset = 0,
    duration = 0.14,
    gain = 0.18
  }) {
    if (this.muted || this.volume <= 0) return;
    this._bumpActivity(Math.min(1, gain * 3));

    const ctx = this._ensureContext();
    if (!ctx || !this._masterGain) return;

    try {
      const t0 = ctx.currentTime + Math.max(0, startOffset);
      const t1 = t0 + Math.max(0.015, duration);

      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (endFreq !== null && Number.isFinite(endFreq)) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t1);
      }

      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.018, duration * 0.25));
      env.gain.exponentialRampToValueAtTime(0.0001, t1);

      osc.connect(env);
      env.connect(this._masterGain);

      osc.start(t0);
      osc.stop(t1 + 0.01);
    } catch {
      // Ses alt sistemi kısıtlıysa sessizce devam et
    }
  }

  playBoot() {
    const notes = [220.0, 329.63, 440.0, 554.37, 659.25];
    notes.forEach((f, idx) => {
      this._tone({
        freq: f,
        type: idx % 2 === 0 ? 'sine' : 'triangle',
        startOffset: idx * 0.08,
        duration: 0.65 - idx * 0.06,
        gain: 0.12
      });
    });
  }

  playWindowOpen() {
    this._tone({ freq: 360, endFreq: 540, type: 'sine', duration: 0.11, gain: 0.12 });
    this._tone({ freq: 720, type: 'triangle', startOffset: 0.04, duration: 0.09, gain: 0.06 });
  }

  playWindowClose() {
    this._tone({ freq: 480, endFreq: 260, type: 'sine', duration: 0.11, gain: 0.1 });
  }

  playSnap() {
    this._tone({ freq: 680, endFreq: 920, type: 'triangle', duration: 0.06, gain: 0.11 });
  }

  playClick() {
    this._tone({ freq: 880, endFreq: 520, type: 'sine', duration: 0.03, gain: 0.07 });
  }

  playJarvisWake() {
    this._tone({ freq: 523.25, endFreq: 659.25, type: 'sine', duration: 0.12, gain: 0.15 });
    this._tone({
      freq: 783.99,
      endFreq: 1046.5,
      type: 'triangle',
      startOffset: 0.09,
      duration: 0.18,
      gain: 0.14
    });
  }

  playJarvisAck() {
    this._tone({ freq: 659.25, type: 'sine', duration: 0.08, gain: 0.12 });
    this._tone({ freq: 880.0, type: 'sine', startOffset: 0.06, duration: 0.12, gain: 0.12 });
  }

  playJarvisThink() {
    this._tone({ freq: 440, type: 'sine', duration: 0.09, gain: 0.08 });
    this._tone({ freq: 554.37, type: 'sine', startOffset: 0.07, duration: 0.09, gain: 0.08 });
    this._tone({ freq: 659.25, type: 'triangle', startOffset: 0.14, duration: 0.12, gain: 0.09 });
  }

  playQuantumCollapse() {
    this._tone({ freq: 1180, endFreq: 295, type: 'sine', duration: 0.22, gain: 0.15 });
    this._tone({
      freq: 590,
      endFreq: 440,
      type: 'triangle',
      startOffset: 0.05,
      duration: 0.2,
      gain: 0.1
    });
  }

  playNotification() {
    this._tone({ freq: 587.33, type: 'sine', duration: 0.1, gain: 0.13 });
    this._tone({ freq: 880.0, type: 'triangle', startOffset: 0.09, duration: 0.16, gain: 0.12 });
  }

  /**
   * LIGO kütleçekim dalgası vb. sayısal dalga dizilerini tepe genliğine normalize ederek çalar
   */
  playChirpArray(samples, sampleRate = 2048) {
    if (!samples || samples.length === 0 || this.muted || this.volume <= 0) {
      return false;
    }

    this._bumpActivity(0.85);
    const ctx = this._ensureContext();
    if (!ctx || !this._masterGain) {
      return false;
    }

    try {
      const inRate = Math.max(256, Math.floor(Number(sampleRate) || 2048));
      // Tarayıcı AudioBuffer alt sınırı (8000 Hz) için doğrusal yukarı örnekleme
      const upsampleFactor = inRate < 8000 ? Math.ceil(8000 / inRate) : 1;
      const outRate = inRate * upsampleFactor;
      const inLen = samples.length;
      const outLen = inLen * upsampleFactor;

      let peak = 0;
      for (let i = 0; i < inLen; i++) {
        const a = Math.abs(Number(samples[i]) || 0);
        if (a > peak) peak = a;
      }
      if (peak === 0) return false;

      const scale = 0.75 / peak;
      const audioBuf = ctx.createBuffer(1, outLen, outRate);
      const channel = audioBuf.getChannelData(0);

      for (let i = 0; i < outLen; i++) {
        const srcPos = i / upsampleFactor;
        const idx0 = Math.min(inLen - 1, Math.floor(srcPos));
        const idx1 = Math.min(inLen - 1, idx0 + 1);
        const frac = srcPos - idx0;
        const v0 = (Number(samples[idx0]) || 0) * scale;
        const v1 = (Number(samples[idx1]) || 0) * scale;
        channel[i] = v0 + (v1 - v0) * frac;
      }

      const srcNode = ctx.createBufferSource();
      srcNode.buffer = audioBuf;
      srcNode.connect(this._masterGain);
      srcNode.start();
      return true;
    } catch {
      return false;
    }
  }

  getActivityLevel() {
    if (this.muted || this.volume <= 0) return 0;

    const virtualLevel = this._computeDecayedImpulse();
    if (!this._analyser || !this._freqData) {
      return Number(virtualLevel.toFixed(4));
    }

    try {
      this._analyser.getByteFrequencyData(this._freqData);
      let sum = 0;
      for (let i = 0; i < this._freqData.length; i++) {
        sum += this._freqData[i];
      }
      const avg = sum / (this._freqData.length * 255);
      return Number(Math.min(1, Math.max(virtualLevel, avg * 2.2)).toFixed(4));
    } catch {
      return Number(virtualLevel.toFixed(4));
    }
  }

  async playAudioBuffer(arrayBuffer) {
    if (this.muted || this.volume <= 0) return false;
    const ctx = this._ensureContext();
    if (!ctx) return false;

    try {
      // Create a slice copy as decodeAudioData detaches the buffer
      const bufferCopy = arrayBuffer.slice(0);
      const audioBuffer = await ctx.decodeAudioData(bufferCopy);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (this._analyser) {
        source.connect(this._analyser);
      } else if (this._masterGain) {
        source.connect(this._masterGain);
      } else {
        source.connect(ctx.destination);
      }

      this._recentImpulses.push({ start: performance.now(), peak: 0.95, duration: audioBuffer.duration });
      if (this._recentImpulses.length > 8) this._recentImpulses.shift();

      return new Promise((resolve) => {
        source.onended = () => resolve(true);
        source.start(0);
      });
    } catch (err) {
      console.warn('[QuantOS Sound] Ses verisi çözme hatası:', err.message);
      return false;
    }
  }

  async playBase64Audio(base64Str) {
    if (!base64Str || typeof base64Str !== 'string') return false;
    try {
      const binary = atob(base64Str);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return await this.playAudioBuffer(bytes.buffer);
    } catch (e) {
      console.warn('[QuantOS Sound] Base64 çözümleme hatası:', e.message);
      return false;
    }
  }

  getFrequencyData(binCount = 36) {
    const out = new Float32Array(binCount);
    if (this.muted || this.volume <= 0) return out;

    const virtualLevel = this._computeDecayedImpulse();
    if (this._analyser && this._freqData) {
      try {
        this._analyser.getByteFrequencyData(this._freqData);
        const step = Math.max(1, Math.floor(this._freqData.length / binCount));
        for (let i = 0; i < binCount; i++) {
          const raw = this._freqData[Math.min(this._freqData.length - 1, i * step)] / 255;
          out[i] = Math.min(1, Math.max(raw, virtualLevel * (1 - i / (binCount * 1.4))));
        }
        return out;
      } catch {
        // Fallback below
      }
    }

    for (let i = 0; i < binCount; i++) {
      out[i] = virtualLevel * Math.exp(-i / (binCount * 0.65));
    }
    return out;
  }
}
