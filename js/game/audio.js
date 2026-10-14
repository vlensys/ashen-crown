'use strict';
// Synthesized audio: effects, footsteps, ambience (wind, dungeon drips, hearth crackle) and a slow
// generative music drone in a minor key. No audio files.
(function (G) {
  const A = (G.audio = {});
  let ctx = null, master, sfx, amb, mus, verb, windGain, windFilter, rumbleGain, noiseBuf, whiteBuf;
  const vol = () => (G.settings.mute ? 0 : G.settings.vol == null ? 0.8 : G.settings.vol);
  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = vol(); master.connect(ctx.destination);
    // a dark stone-hall reverb that everything is sent through
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - i / len, 2.6); } }
    verb = ctx.createConvolver(); verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35; verb.connect(wet); wet.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master); sfx.connect(verb);
    amb = ctx.createGain(); amb.gain.value = 0.9; amb.connect(master); amb.connect(verb);
    mus = ctx.createGain(); mus.gain.value = G.settings.music === false ? 0 : 0.5; mus.connect(master); mus.connect(verb);
    const n = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); whiteBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0), wd = whiteBuf.getChannelData(0);
    let br = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; wd[i] = w; br = 0.97 * br + 0.03 * w; d[i] = br * 6; }
    const w = ctx.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    w.connect(windFilter); windFilter.connect(windGain); windGain.connect(amb); w.start();
    const rb = ctx.createBufferSource(); rb.buffer = noiseBuf; rb.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
    rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
    rb.connect(lp); lp.connect(rumbleGain); rumbleGain.connect(amb); rb.start();
  };
  A.setVolume = () => { if (master) master.gain.value = vol(); if (mus) mus.gain.value = G.settings.music === false ? 0 : 0.5; };

  // oscillator through a lowpass, so nothing comes out bright or beepy
  function tone(freq, dur, type, v, slide, dest, attack, lp) {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    f.type = 'lowpass'; f.frequency.value = lp || Math.max(300, freq * 3);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  // filtered noise; optional frequency sweep for whooshes
  function noise(dur, v, f, type, o) {
    if (!ctx) return;
    o = o || {};
    const s = ctx.createBufferSource(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    s.buffer = o.white ? whiteBuf : noiseBuf; fl.type = type || 'lowpass'; fl.frequency.value = f; fl.Q.value = o.q || 0.8;
    const t = ctx.currentTime;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(o.attack ? 0.0001 : v, t);
    if (o.attack) g.gain.linearRampToValueAtTime(v, t + o.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(o.dest || sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // inharmonic partials: struck iron, not a chime
  function metal(base, dur, v) {
    [1, 2.76, 5.4, 8.93].forEach((r, i) => tone(base * r * (1 + (Math.random() - 0.5) * 0.01), dur / (1 + i * 0.8), 'sine', v / (1 + i), 0, sfx, 0.002, base * r * 1.5));
  }
  const later = (ms, fn) => setTimeout(fn, ms);
  A.play = function (k) {
    if (!ctx) return;
    switch (k) {
      case 'swing': noise(0.2, 0.22, 350, 'bandpass', { white: true, to: 1300, q: 1.2 }); break;
      case 'hit': noise(0.14, 0.9, 170); tone(70, 0.18, 'sine', 0.22, 0.55, sfx, 0.002, 200); noise(0.05, 0.08, 1100, 'bandpass', { white: true }); break;
      case 'block': metal(380, 0.7, 0.1); noise(0.08, 0.5, 220); break;
      case 'hurt': tone(105, 0.28, 'sawtooth', 0.12, 0.65, sfx, 0.01, 380); noise(0.12, 0.5, 200); break;
      case 'die': tone(85, 1.1, 'sawtooth', 0.12, 0.4, sfx, 0.02, 280); noise(0.9, 0.35, 400, 'lowpass', { to: 80 }); break;
      case 'cast': noise(0.55, 0.14, 180, 'bandpass', { white: true, to: 1800, q: 1.5, attack: 0.08 }); tone(55, 0.7, 'sawtooth', 0.08, 1.3, sfx, 0.05, 260); break;
      case 'heal': noise(0.9, 0.12, 500, 'bandpass', { attack: 0.35, q: 1.2 }); tone(196, 1, 'sine', 0.05, 1.1, sfx, 0.35, 400); break;
      case 'drink': noise(0.08, 0.3, 320); later(140, () => noise(0.08, 0.25, 280)); break;
      case 'draw': tone(68, 0.45, 'sawtooth', 0.05, 1.35, sfx, 0.05, 240); noise(0.4, 0.04, 900, 'bandpass', { white: true, attack: 0.2 }); break;
      case 'bow': tone(92, 0.3, 'triangle', 0.16, 0.6, sfx, 0.002, 500); noise(0.07, 0.06, 2200, 'bandpass', { white: true }); break;
      case 'coin': metal(1700, 0.18, 0.025); later(60, () => metal(1950, 0.14, 0.018)); break;
      case 'door': tone(58, 0.8, 'sawtooth', 0.06, 1.45, sfx, 0.1, 200); later(500, () => noise(0.3, 0.7, 140)); break;
      case 'step': noise(0.07, 0.22, G.scene && G.scene.grid ? 450 : 800); break;
      case 'level':
        // a slow, ominous swell rather than a fanfare
        [55, 82.4, 110, 130.8].forEach((f) => tone(f, 3, 'sawtooth', 0.05, 0, sfx, 0.7, 700));
        noise(2.5, 0.25, 90, 'lowpass', { attack: 0.5 });
        break;
      case 'quest': metal(98, 3.5, 0.13); noise(1.5, 0.4, 110, 'lowpass'); break;
    }
  };

  // ---------- ambience & music, driven every frame ----------
  const SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor
  const PROG = [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2], [0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]];
  let musT = 2, chord = 0, dripT = 3, crackT = 0, stepAcc = 0;
  A.update = function (dt, moving, speed) {
    if (!ctx || !G.scene) return;
    const s = G.scene, p = G.S.p;
    // footsteps
    if (moving && p.onGround) { stepAcc += dt * speed; if (stepAcc > 2.1) { stepAcc = 0; A.play('step'); } }
    // ambience targets
    const outdoors = s.kind === 'overworld';
    const high = outdoors ? G.clamp((p.y - 8) / 25, 0, 1) : 0;
    const night = G.time.isNight();
    const wTarget = outdoors ? 0.05 + high * 0.12 + (night ? 0.03 : 0) : 0;
    windGain.gain.value += (wTarget - windGain.gain.value) * Math.min(1, dt * 2);
    windFilter.frequency.value = 350 + Math.sin(performance.now() / 3100) * 180 + high * 300;
    const rTarget = s.kind === 'dungeon' ? 0.22 : 0;
    rumbleGain.gain.value += (rTarget - rumbleGain.gain.value) * Math.min(1, dt * 2);
    if (s.kind === 'dungeon') { dripT -= dt; if (dripT <= 0) { dripT = 2 + Math.random() * 6; tone(420 + Math.random() * 260, 0.5, 'sine', 0.02, 0.7, amb, 0.002, 900); } }
    if (s.kind === 'interior' || (outdoors && s.lights.some((l) => l.flicker && Math.hypot(l.x - p.x, l.z - p.z) < 8))) {
      crackT -= dt;
      if (crackT <= 0) { crackT = 0.08 + Math.random() * 0.4; noise(0.03, 0.05 + Math.random() * 0.07, 1800, 'bandpass', { white: true, dest: amb }); }
    }
    // music: slow minor chords; darker and sparser underground and at night
    musT -= dt;
    if (musT <= 0 && G.settings.music !== false) {
      const dark = s.kind === 'dungeon' || night;
      musT = dark ? 9 : 7;
      chord = (chord + 1) % PROG.length;
      const root = dark ? 110 : 146.8; // A2 or D3
      const notes = PROG[chord];
      notes.forEach((semi, i) => {
        const f = root * Math.pow(2, semi / 12);
        tone(f, musT * 1.15, 'triangle', 0.045 - i * 0.008, 0, mus, musT * 0.35);
        tone(f * 1.003, musT * 1.15, 'sine', 0.03, 0, mus, musT * 0.4);
      });
      if (!dark && Math.random() < 0.6) {
        // a lonely melody note on top
        const deg = SCALE[Math.floor(Math.random() * SCALE.length)];
        setTimeout(() => tone(root * 2 * Math.pow(2, deg / 12), 3, 'sine', 0.02, 0, mus, 0.6), 1500 + Math.random() * 2500);
      }
    }
  };
})(window.G);
