import { AdaptiveScore,type ScoreScene } from './score';
// Browser-only sound engine. The sim stays deterministic and independent of audio.
type Effect = 'wood' | 'ore' | 'impact' | 'hook' | 'hit' | 'place' | 'craft' | 'dismantle' | 'undo' | 'solar' | 'whale' | 'victory' | 'step-wood' | 'step-snow' | 'door' | 'fuel' | 'beast' | 'thunder';
type Mix={music:number;effects:number;muteMusic:boolean;muteEffects:boolean};
const MIX_KEY='frost-ark-audio-mix';
const defaults:Mix={music:.64,effects:.85,muteMusic:false,muteEffects:false};
const limit=(n:number)=>Math.max(0,Math.min(1,n));
const readMix=():Mix=>{
 try{
  const x=JSON.parse(localStorage.getItem(MIX_KEY)??'{}');
  return {music:Number.isFinite(x.music)?limit(x.music):defaults.music,effects:Number.isFinite(x.effects)?limit(x.effects):defaults.effects,
   muteMusic:x.muteMusic===true,muteEffects:x.muteEffects===true};
 }catch{return {...defaults};}
};
const MUTE_KEY = 'frost-ark-muted';

class ArkAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfx?:GainNode;
  private music?:GainNode;
  private score?:AdaptiveScore;
  private level?:AnalyserNode;
  private samples=new Float32Array(512);
  private prefs=readMix();
  private scene:ScoreScene='day';
  private proofPeak=0;
  private changeAt=0;
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
      const comp=ctx.createDynamicsCompressor();
      comp.threshold.value=-12;comp.knee.value=14;comp.ratio.value=6;comp.attack.value=.008;comp.release.value=.18;
      this.level=ctx.createAnalyser();this.level.fftSize=512;
      master.connect(comp).connect(this.level).connect(ctx.destination);
      this.sfx=ctx.createGain();this.music=ctx.createGain();
      this.sfx.gain.value=this.prefs.muteEffects?0:this.prefs.effects;
      this.music.gain.value=this.prefs.muteMusic?0:this.prefs.music;
      this.sfx.connect(master);this.music.connect(master);this.score=new AdaptiveScore(ctx,this.music);
      const noise = this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      this.wind = this.ambient('lowpass', 470, this.sfx);
      this.fire = this.ambient('bandpass', 1270, this.sfx, true);
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

  mix():Mix{return {...this.prefs};}
  configure(values:Partial<Mix>):void{
    this.prefs={...this.prefs,...values,music:limit(values.music??this.prefs.music),effects:limit(values.effects??this.prefs.effects)};
    try{localStorage.setItem(MIX_KEY,JSON.stringify(this.prefs));}catch{}
    if(this.ctx){
      const t=this.ctx.currentTime;
      this.sfx?.gain.setTargetAtTime(this.prefs.muteEffects?0:this.prefs.effects,t,.075);
      this.music?.gain.setTargetAtTime(this.prefs.muteMusic?0:this.prefs.music,t,.075);
    }
  }
  diagnostics(){return {running:this.ctx?.state==='running',scene:this.scene,peak:this.proofPeak,tally:this.score?.tally??{},fade:this.changeAt};}
  update({wind, fire,scene='day'}: {wind:number; fire:number;scene?:ScoreScene}): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if(this.scene!==scene){this.scene=scene;this.changeAt=now;}
    this.score?.update(scene);
    if(this.level){
      this.level.getFloatTimeDomainData(this.samples);
      let peak=0;for(const n of this.samples)peak=Math.max(peak,Math.abs(n));
      this.proofPeak=Math.max(peak,this.proofPeak*.94);
    }
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
    if (!ctx || !this.sfx || this.muted || this.prefs.muteEffects || ctx.state !== 'running') return;
    const patterns: Record<Effect, [number, number, number, OscillatorType]> = {
      wood: [154, 58, .16, 'triangle'],
      ore: [715, 211, .22, 'sine'],
      impact: [120, 40, .18, 'triangle'],
      hook: [320, 125, 0.22, 'triangle'],
      hit: [184, 73, 0.14, 'triangle'],
      place: [118, 46, 0.17, 'sine'],
      craft: [269, 411, 0.18, 'triangle'],
      dismantle: [160, 65, 0.15, 'triangle'],
      undo: [260, 495, 0.20, 'sine'],
      solar: [196, 528, .66, 'triangle'],
      whale: [92, 42, .72, 'sine'],
      victory: [392, 784, 1.1, 'sine'],
      'step-wood': [143, 85, .092, 'triangle'],
      'step-snow': [89, 53, .12, 'sine'],
      door: [310, 155, .23, 'triangle'],
      fuel: [124, 49, .29, 'triangle'],
      beast: [385, 265, .26, 'sine'],
      thunder: [62, 27, 1.05, 'triangle'],
    };
    const [from, to, seconds, tone] = patterns[effect], now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(effect.startsWith('step-')?.056:effect==='thunder'?.23:effect === 'place' ? 0.31 : 0.17, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    gain.connect(this.sfx);
    const osc = ctx.createOscillator();
    osc.type = tone;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + seconds * 0.78);
    osc.connect(gain);
    osc.start();
    osc.stop(now + seconds);osc.onended=()=>{osc.disconnect();gain.disconnect();};
    if (effect === 'wood' || effect === 'ore' || effect === 'impact' || effect === 'hook' || effect === 'hit' || effect === 'place' || effect === 'dismantle' || effect.startsWith('step-') || effect==='door' || effect==='fuel' || effect==='thunder') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noise!;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = effect==='step-snow'?1980:effect==='step-wood'?510:effect==='thunder'?290:effect==='fuel'?1550:effect === 'hook' ? 1610 : effect === 'hit' || effect === 'impact' ? 860 : effect === 'ore' ? 1880 : 420;
      noise.connect(filter).connect(gain);
      noise.start(now, Math.random());
      noise.stop(now + seconds * 0.64);
    }
  }
}

export const audio = new ArkAudio();
