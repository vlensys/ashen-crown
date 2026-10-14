'use strict';
// Shared namespace, math, randomness and small helpers.
window.G = window.G || {};
(function (G) {
  G.VERSION = 1;

  // ---------- random ----------
  G.mulberry32 = function (a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  G.rng = function (seed) {
    const r = G.mulberry32(seed);
    const o = () => r();
    o.int = (a, b) => a + Math.floor(r() * (b - a + 1));
    o.pick = (arr) => arr[Math.floor(r() * arr.length)];
    o.chance = (p) => r() < p;
    o.range = (a, b) => a + r() * (b - a);
    o.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return o;
  };
  G.R = G.rng((Math.random() * 2 ** 31) | 0); // gameplay randomness
  G.hashStr = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  G.hash2 = function (x, y, seed) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 982451653)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  G.noise = function (x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = (t) => t * t * (3 - 2 * t);
    const a = G.hash2(xi, yi, seed), b = G.hash2(xi + 1, yi, seed), c = G.hash2(xi, yi + 1, seed), d = G.hash2(xi + 1, yi + 1, seed);
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  G.fbm = function (x, y, seed, oct) {
    let t = 0, amp = 1, f = 1, n = 0;
    for (let i = 0; i < (oct || 4); i++) { t += G.noise(x * f, y * f, seed + i * 31) * amp; n += amp; amp *= 0.5; f *= 2; }
    return t / n;
  };

  // ---------- math ----------
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.smooth = (t) => t * t * (3 - 2 * t);
  G.dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  G.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  G.m4 = {
    persp(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
    },
    view(eye, yaw, pitch) {
      const cp = Math.cos(pitch);
      const f = [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
      const z = [-f[0], -f[1], -f[2]];
      let x = [z[2], 0, -z[0]]; // cross(up, z)
      const xl = Math.hypot(x[0], x[2]) || 1; x = [x[0] / xl, 0, x[2] / xl];
      const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
      const d = (a) => a[0] * eye[0] + a[1] * eye[1] + a[2] * eye[2];
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x), -d(y), -d(z), 1]);
    },
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
      return o;
    },
  };

  // ---------- misc ----------
  G.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  G.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  G.fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const handlers = {};
  G.on = (e, fn) => (handlers[e] = handlers[e] || []).push(fn);
  G.emit = (e, ...a) => (handlers[e] || []).forEach((fn) => fn(...a));
})(window.G);
