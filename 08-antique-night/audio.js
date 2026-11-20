/* MaGame 08: offline, synthesized sound. No audio context is created until unlock(). */
(function (global) {
  'use strict';
  const AudioContext = global.AudioContext || global.webkitAudioContext;
  let context = null, master = null, music = null, effects = null, noise = null;
  let muted = false, scene = 'shop', step = 0, nextNote = 0, timer = null;
  try { muted = global.localStorage.getItem('magame08-muted') === '1'; } catch (_) {}
  const scores = {
    shop:  { tempo: 1100, notes: [220, 261.63, 329.63, 293.66, 261.63, 196, 220, 0], root: 110 },
    world: { tempo: 880, notes: [293.66, 349.23, 440, 523.25, 440, 349.23, 329.63, 0], root: 146.83 },
    boss:  { tempo: 580, notes: [146.83, 174.61, 220, 196, 146.83, 174.61, 261.63, 220], root: 73.42 },
    quiet: { tempo: 1400, notes: [220, 0, 261.63, 0, 293.66, 0, 196, 0], root: 110 }
  };
  const cap = (value, low, high) => Math.min(high, Math.max(low, value));
  function ramp(param, value, when, duration) {
    param.cancelScheduledValues(when);
    param.setValueAtTime(Math.max(0.0001, param.value), when);
    param.exponentialRampToValueAtTime(Math.max(0.0001, value), when + duration);
  }
  function tone(frequency, duration, volume, options = {}) {
    if (!context || !effects) return;
    const at = options.at == null ? context.currentTime : options.at;
    const osc = context.createOscillator(), gain = context.createGain();
    osc.type = options.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, frequency), at);
    if (options.end) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.end), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), at + Math.min(.025, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain); gain.connect(options.music ? music : effects);
    osc.start(at); osc.stop(at + duration + .01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function hiss(duration, volume, frequency) {
    if (!context || !noise) return;
    let at = context.currentTime, source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
    gain.gain.setValueAtTime(Math.max(.0001, volume), at);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(effects); source.start(at); source.stop(at + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function schedule() {
    if (!context) return;
    if (context.state === 'running') {
      const score = scores[scene] || scores.quiet;
      if (nextNote < context.currentTime - .25) nextNote = context.currentTime + .05;
      while (nextNote < context.currentTime + .12) {
        const hz = score.notes[step % score.notes.length], duration = score.tempo / 1000;
        if (hz) {
          tone(hz, duration * .7, .11, { at: nextNote, type: 'sine', music: true });
          tone(hz * 2, duration * .3, .024, { at: nextNote, type: 'sine', music: true });
        }
        if (step % 4 === 0) tone(score.root, duration * 2.5, .055, { at: nextNote, type: 'sine', music: true });
        step++; nextNote += duration;
      }
    }
    timer = global.setTimeout(schedule, 100);
  }
  function unlock() {
    if (!AudioContext) return Promise.resolve(false);
    try {
      if (!context) {
        context = new AudioContext(); master = context.createGain(); music = context.createGain(); effects = context.createGain();
        master.gain.value = muted ? .0001 : .7; music.gain.value = .35; effects.gain.value = .65;
        music.connect(master); effects.connect(master); master.connect(context.destination);
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * .5), context.sampleRate);
        const data = noise.getChannelData(0); for (let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        nextNote = context.currentTime + .05; schedule();
      }
      const resumed = context.state === 'suspended' ? context.resume() : Promise.resolve();
      return Promise.resolve(resumed).then(() => true).catch(() => false);
    } catch (_) { return Promise.resolve(false); }
  }
  function play(name) {
    if (!context || muted || context.state !== 'running') return;
    switch (name) {
      case 'jump': tone(310,.15,.17,{type:'triangle',end:510}); break;
      case 'land': hiss(.09,.15,700); tone(115,.1,.12,{end:70}); break;
      case 'attack': hiss(.11,.13,2400); tone(720,.10,.08,{type:'triangle',end:360}); break;
      case 'heavy': hiss(.17,.22,1000); tone(180,.18,.19,{type:'triangle',end:65}); break;
      case 'dash': hiss(.17,.14,1800); tone(300,.13,.10,{end:95}); break;
      case 'hit': tone(520,.15,.14,{type:'triangle',end:240}); hiss(.08,.13,1500); break;
      case 'hurt': tone(210,.23,.19,{type:'sawtooth',end:90}); hiss(.12,.12,800); break;
      case 'collect': tone(660,.25,.14); tone(990,.32,.08,{at:context.currentTime+.08}); break;
      case 'interact': tone(440,.10,.10); tone(554,.16,.08,{at:context.currentTime+.08}); break;
      case 'warning': tone(165,.24,.16,{type:'triangle',end:220}); break;
      case 'boss': tone(80,.65,.20,{type:'triangle',end:55}); hiss(.35,.12,450); break;
      case 'win': [440,554.37,659.25,880].forEach((f,i)=>tone(f,.4,.10,{at:context.currentTime+i*.12})); break;
    }
  }
  function setScene(name) { const next = Object.prototype.hasOwnProperty.call(scores,name) ? name : 'quiet'; if (next === scene) return; scene = next; step = 0; if(context)nextNote=context.currentTime+.05; }
  function setMuted(value) {
    muted = !!value;
    try { global.localStorage.setItem('magame08-muted', muted ? '1' : '0'); } catch (_) {}
    if (context && master) ramp(master.gain, muted ? .0001 : .7, context.currentTime, .04);
    return muted;
  }
  function setVolume(value) { if (master && context) ramp(master.gain, muted ? .0001 : cap(Number(value) || 0, .0001, 1), context.currentTime, .04); }
  function destroy() { if(timer) global.clearTimeout(timer); timer=null; if(context) context.close(); context=master=music=effects=noise=null; }
  global.GameAudio = Object.freeze({ unlock, play, setScene, setMuted, setVolume, isMuted: () => muted, destroy });
})(window);
