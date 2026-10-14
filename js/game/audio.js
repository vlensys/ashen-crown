'use strict';
// Small synthesized sound effects (no audio files needed).
(function (G) {
  const A = (G.audio = {});
  let ctx = null;
  A.unlock = function () { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } };
  function tone(freq, dur, type, vol, slide) {
    if (!ctx || G.settings.mute) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol, hp) {
    if (!ctx || G.settings.mute) return;
    const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 400;
    s.buffer = buf; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start();
  }
  A.play = function (k) {
    switch (k) {
      case 'swing': noise(0.12, 0.12, 1800); break;
      case 'hit': noise(0.08, 0.25, 300); tone(110, 0.1, 'square', 0.06, 0.5); break;
      case 'block': tone(700, 0.08, 'square', 0.06, 0.7); noise(0.05, 0.1, 2000); break;
      case 'hurt': tone(160, 0.18, 'sawtooth', 0.07, 0.5); break;
      case 'die': tone(220, 0.4, 'sawtooth', 0.06, 0.25); break;
      case 'cast': tone(300, 0.25, 'triangle', 0.08, 2.5); noise(0.2, 0.06, 900); break;
      case 'heal': tone(500, 0.3, 'sine', 0.07, 1.6); break;
      case 'drink': tone(400, 0.1, 'sine', 0.05, 0.7); tone(300, 0.1, 'sine', 0.05, 0.7); break;
      case 'level': [392, 494, 587, 784].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.07), i * 110)); break;
      case 'quest': [330, 415, 494].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'triangle', 0.07), i * 140)); break;
    }
  };
})(window.G);
