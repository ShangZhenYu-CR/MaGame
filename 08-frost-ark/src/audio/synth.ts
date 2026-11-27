// Browser-only sound engine. The sim stays deterministic and independent of audio.
type Effect = 'hook' | 'hit' | 'place' | 'craft' | 'dismantle' | 'undo' | 'solar' | 'whale' | 'victory';
const MUTE_KEY = 'frost-ark-muted';

class ArkAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private wind?: GainNode;
  private fire?: GainNode;
  private noise?: AudioBuffer;
  private muted = this.readMute();

  private readMute(): boolean {
    try { return localStorage.getItem(MUTE_KEY) === '1'; }
    catch { return false; } // Some browser privacy settings block storage for file://.
  }

  unlock(): void {
    if (!this.ctx) {
      if (typeof AudioContext === 'undefined') return;
      const ctx = this.ctx = new AudioContext();
      const master = this.master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.56;
      master.connect(ctx.destination);
      const noise = this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      this.wind = this.ambient('lowpass', 470, master);
      this.fire = this.ambient('bandpass', 1270, master, true);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
  }

  private ambient(type: BiquadFilterType, frequency: number, master: GainNode, crackle = false): GainNode {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    let clip = this.noise!;
    if (crackle) {
      const buffer = ctx.createBuffer(1, this.noise!.length, ctx.sampleRate);
      const from = this.noise!.getChannelData(0), samples = buffer.getChannelData(0);
      for (let i = 0, pulse = 0; i < samples.length; i++) {
        if (Math.abs(from[i]) > 0.9992) pulse = 0.8;
        pulse *= 0.995;
        samples[i] = from[i] * pulse;
      }
      clip = buffer;
    }
    source.buffer = clip;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(master);
    source.start();
    return gain;
  }

  update({wind, fire}: {wind:number; fire:number}): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.wind!.gain.setTargetAtTime(Math.max(0, Math.min(1, wind)) * 0.25 + 0.012, now, 0.4);
    this.fire!.gain.setTargetAtTime(Math.max(0, Math.min(1, fire)) * 0.24, now, 0.23);
  }

  isMuted(): boolean { return this.muted; }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); }
    catch { /* the current session can still be muted */ }
    this.master?.gain.setTargetAtTime(muted ? 0 : 0.56, this.ctx!.currentTime, 0.035);
  }

  play(effect: Effect): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted || ctx.state !== 'running') return;
    const patterns: Record<Effect, [number, number, number, OscillatorType]> = {
      hook: [320, 125, 0.22, 'triangle'],
      hit: [184, 73, 0.14, 'triangle'],
      place: [118, 46, 0.17, 'sine'],
      craft: [269, 411, 0.18, 'triangle'],
      dismantle: [160, 65, 0.15, 'triangle'],
      undo: [260, 495, 0.20, 'sine'],
      solar: [196, 528, .66, 'triangle'],
      whale: [92, 42, .72, 'sine'],
      victory: [392, 784, 1.1, 'sine'],
    };
    const [from, to, seconds, tone] = patterns[effect], now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(effect === 'place' ? 0.31 : 0.17, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    gain.connect(this.master);
    const osc = ctx.createOscillator();
    osc.type = tone;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + seconds * 0.78);
    osc.connect(gain);
    osc.start();
    osc.stop(now + seconds);
    if (effect === 'hook' || effect === 'hit' || effect === 'place' || effect === 'dismantle') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noise!;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = effect === 'hook' ? 1610 : effect === 'hit' ? 860 : 420;
      noise.connect(filter).connect(gain);
      noise.start(now, Math.random());
      noise.stop(now + seconds * 0.64);
    }
  }
}

export const audio = new ArkAudio();
