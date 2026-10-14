'use strict';
// Procedural pixel art: tileable 32x32 textures and sprites packed into one atlas.
(function (G) {
  const T = (G.tex = { rects: {}, sizes: {} });
  const SZ = 2048;
  const hexc = {};
  const C = (h) => {
    if (Array.isArray(h)) return h;
    if (hexc[h]) return hexc[h];
    const s = h.replace('#', '');
    return (hexc[h] = [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16), s.length >= 8 ? parseInt(s.substr(6, 2), 16) : 255]);
  };
  const sh = (c, k) => { c = C(c); return [G.clamp(c[0] * k, 0, 255), G.clamp(c[1] * k, 0, 255), G.clamp(c[2] * k, 0, 255), 255]; };
  T.C = C; T.sh = sh;

  // ---------- pixel buffer ----------
  function Pix(w, h) {
    const d = new Uint8ClampedArray(w * h * 4);
    const p = {
      w, h, d,
      set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h || !c) return; c = C(c); const k = (y * w + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = c[3] == null ? 255 : c[3]; },
      get(x, y) { const k = (((y + h) % h) * w + ((x + w) % w)) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; },
      a(x, y) { if (x < 0 || y < 0 || x >= w || y >= h) return 0; return d[(y * w + x) * 4 + 3]; },
      rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) p.set(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) p.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); },
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) p.set(x, y, c); } },
      // dark outline around opaque pixels
      outline(c) {
        c = C(c || '#0e0b0a');
        const out = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!p.a(x, y) && (p.a(x - 1, y) || p.a(x + 1, y) || p.a(x, y - 1) || p.a(x, y + 1))) out.push([x, y]);
        out.forEach(([x, y]) => p.set(x, y, c));
        return p;
      },
      flipX() { const q = Pix(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) q.set(w - 1 - x, y, p.get(x, y)); return q; },
    };
    return p;
  }
  T.Pix = Pix;
  // periodic value noise for tileable textures
  function pnoise(x, y, period, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const H = (a, b) => G.hash2(((a % period) + period) % period, ((b % period) + period) % period, seed);
    const s = (t) => t * t * (3 - 2 * t);
    const u = s(xf), v = s(yf);
    const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // fill with a palette driven by tileable noise + ordered dithering
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
  function noiseFill(p, pal, seed, scale, contrast) {
    scale = scale || 4; contrast = contrast || 1;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      let n = pnoise(x / p.w * scale, y / p.h * scale, scale, seed) * 0.6 + pnoise(x / p.w * scale * 2, y / p.h * scale * 2, scale * 2, seed + 7) * 0.3 + G.hash2(x, y, seed + 3) * 0.1;
      n = 0.5 + (n - 0.5) * contrast + BAYER[(y % 4) * 4 + (x % 4)] * 0.18;
      p.set(x, y, pal[G.clamp(Math.floor(n * pal.length), 0, pal.length - 1)]);
    }
    return p;
  }
  T.noiseFill = noiseFill;

  // ---------- atlas packing ----------
  let atlas, actx, cx = 0, cy = 0, rowH = 0;
  T.begin = function () {
    atlas = document.createElement('canvas');
    atlas.width = atlas.height = SZ;
    actx = atlas.getContext('2d');
    T.atlas = atlas;
  };
  T.add = function (name, p) {
    if (cx + p.w + 1 > SZ) { cx = 0; cy += rowH + 1; rowH = 0; }
    if (cy + p.h > SZ) throw new Error('atlas full');
    const img = new ImageData(p.d, p.w, p.h);
    actx.putImageData(img, cx, cy);
    const e = 0.02 / SZ;
    T.rects[name] = [cx / SZ + e, cy / SZ + e, p.w / SZ - 2 * e, p.h / SZ - 2 * e];
    T.sizes[name] = [p.w, p.h];
    cx += p.w + 1; rowH = Math.max(rowH, p.h);
    return T.rects[name];
  };
  T.r = (name) => { const r = T.rects[name]; if (!r) throw new Error('missing texture ' + name); return r; };
  T.flip = (name) => { const r = T.r(name); return [r[0] + r[2], r[1], -r[2], r[3]]; };

  // =====================================================================
  // TEXTURES (32x32, tileable)
  // =====================================================================
  const tex = {};
  tex.grass = () => { const p = noiseFill(Pix(32, 32), ['#1f2a16', '#26331b', '#2d3b1f', '#344423', '#3d4c28'], 11, 4); for (let i = 0; i < 40; i++) { const x = G.hash2(i, 1, 5) * 32, y = G.hash2(i, 2, 5) * 32; p.set(x, y, '#4a5a30'); p.set(x, y - 1, '#3d4c28'); } return p; };
  tex.grass_dead = () => noiseFill(Pix(32, 32), ['#2c2617', '#352d1b', '#3e3520', '#463d25', '#4f442b'], 12, 4);
  tex.forest = () => { const p = noiseFill(Pix(32, 32), ['#171a10', '#1d2114', '#232817', '#2a2f1b'], 13, 4); for (let i = 0; i < 25; i++) { const x = G.hash2(i, 3, 6) * 32, y = G.hash2(i, 4, 6) * 32; p.line(x, y, x + 2, y + 1, '#3a2c1a'); } return p; };
  tex.dirt = () => { const p = noiseFill(Pix(32, 32), ['#2e2418', '#382c1d', '#423423', '#4b3c29'], 14, 5); for (let i = 0; i < 12; i++) p.set(G.hash2(i, 5, 7) * 32, G.hash2(i, 6, 7) * 32, '#5d5040'); return p; };
  tex.road = () => { const p = noiseFill(Pix(32, 32), ['#3a3023', '#43382a', '#4c4031', '#554838'], 15, 5); for (let y = 0; y < 32; y++) { p.set(9, y, '#2e261b'); p.set(10, y, '#352c20'); p.set(22, y, '#2e261b'); p.set(21, y, '#352c20'); } for (let i = 0; i < 10; i++) { const x = G.hash2(i, 7, 8) * 32, y = G.hash2(i, 8, 8) * 32; p.set(x, y, '#6a604f'); p.set(x + 1, y, '#5a5040'); } return p; };
  tex.cobble = () => {
    const p = Pix(32, 32); p.rect(0, 0, 32, 32, '#1e1c1a');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const ox = c * 8 + (r % 2) * 4, oy = r * 8, k = 0.75 + G.hash2(r, c, 9) * 0.4;
      for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) { const xx = (ox + x) % 32; const n = G.hash2(xx, oy + y, 10) * 0.12; p.set(xx, oy + y, sh('#5c5852', k + n - (y > 4 || x > 5 ? 0.15 : 0) + (y < 2 ? 0.1 : 0))); }
    }
    return p;
  };
  tex.flagstone = () => {
    const p = Pix(32, 32); p.rect(0, 0, 32, 32, '#24221f');
    [[0, 0, 16, 16], [16, 0, 16, 10], [16, 10, 16, 22], [0, 16, 16, 16]].forEach(([x, y, w, h], i) => { for (let j = 1; j < h - 1; j++) for (let k = 1; k < w - 1; k++) p.set(x + k, y + j, sh('#6a655c', 0.8 + G.hash2(i, 0, 11) * 0.3 + G.hash2(x + k, y + j, 12) * 0.12 - (j === h - 2 ? 0.15 : 0))); });
    return p;
  };
  tex.rock = () => { const p = noiseFill(Pix(32, 32), ['#2a2826', '#33302d', '#3c3935', '#46423d', '#524d47'], 16, 3, 1.3); for (let i = 0; i < 5; i++) { let x = G.hash2(i, 9, 13) * 32, y = G.hash2(i, 10, 13) * 32; for (let k = 0; k < 7; k++) { p.set(x, y, '#1c1a18'); x += G.hash2(i, k, 14) > 0.5 ? 1 : 0; y += 1; } } return p; };
  tex.snow = () => noiseFill(Pix(32, 32), ['#a9b0b8', '#b8bfc6', '#c6ccd2', '#d3d8dd'], 17, 4);
  tex.ash = () => { const p = noiseFill(Pix(32, 32), ['#262322', '#2f2b29', '#383331', '#423c39'], 18, 4); for (let i = 0; i < 4; i++) p.set(G.hash2(i, 11, 15) * 32, G.hash2(i, 12, 15) * 32, '#c0501a'); return p; };
  tex.mud = () => { const p = noiseFill(Pix(32, 32), ['#1b1d12', '#222617', '#2a2e1b', '#30331e'], 19, 4); p.ell(8, 22, 5, 2.5, '#1a2420'); p.ell(23, 9, 4, 2, '#1a2420'); return p; };
  tex.sand = () => noiseFill(Pix(32, 32), ['#5a5038', '#655a40', '#706449', '#7a6e52'], 20, 5);
  tex.water = () => { const p = noiseFill(Pix(32, 32), ['#0e1a20', '#122228', '#162a30', '#1b3238'], 21, 4); for (let i = 0; i < 6; i++) { const x = G.hash2(i, 13, 16) * 32, y = G.hash2(i, 14, 16) * 32; p.line(x, y, x + 4, y, '#2a4a52'); } return p; };
  const bricks = (base, mortar, seed, moss) => {
    const p = Pix(32, 32); p.rect(0, 0, 32, 32, mortar);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const ox = c * 11 + (r % 2 ? 5 : 0), oy = r * 8, k = 0.8 + G.hash2(r, c, seed) * 0.35;
      for (let y = 1; y < 8; y++) for (let x = 1; x < 11; x++) {
        const xx = (ox + x) % 32;
        let col = sh(base, k + G.hash2(xx, oy + y, seed + 1) * 0.15 + (y === 1 ? 0.15 : 0) - (y === 7 ? 0.2 : 0));
        if (moss && G.hash2(xx, oy + y, seed + 2) < moss * (y / 8)) col = C('#2e3a1e');
        p.set(xx, oy + y, col);
      }
    }
    return p;
  };
  tex.brick = () => bricks('#57524b', '#1e1c19', 22, 0);
  tex.brick_dark = () => bricks('#34312f', '#121110', 23, 0.35);
  tex.brick_red = () => bricks('#5a3a2e', '#1c1310', 24, 0);
  tex.cave = () => { const p = noiseFill(Pix(32, 32), ['#1a1714', '#221e1a', '#2b2621', '#352e28', '#3e362e'], 25, 3, 1.4); for (let i = 0; i < 5; i++) p.ell(G.hash2(i, 15, 17) * 32, G.hash2(i, 16, 17) * 32, 2, 1.2, '#14110f'); return p; };
  tex.cave_floor = () => noiseFill(Pix(32, 32), ['#1c1814', '#231e19', '#2a241e', '#312a23'], 26, 4, 1.2);
  tex.wood = () => { const p = Pix(32, 32); for (let r = 0; r < 4; r++) { const k = 0.8 + G.hash2(r, 0, 27) * 0.3; for (let y = 0; y < 8; y++) for (let x = 0; x < 32; x++) p.set(x, r * 8 + y, y === 7 ? '#140d08' : sh('#5a3e26', k + Math.sin((x + r * 7) * 0.7 + y) * 0.04 + G.hash2(x, y + r * 8, 28) * 0.1)); const j = Math.floor(G.hash2(r, 1, 27) * 32); p.set(j, r * 8 + 3, '#140d08'); } return p; };
  tex.planks_v = () => { const p = Pix(32, 32); for (let c = 0; c < 4; c++) { const k = 0.75 + G.hash2(c, 0, 29) * 0.3; for (let x = 0; x < 8; x++) for (let y = 0; y < 32; y++) p.set(c * 8 + x, y, x === 7 ? '#140d08' : sh('#4a3220', k + G.hash2(c * 8 + x, y, 30) * 0.12)); } return p; };
  tex.plaster = () => noiseFill(Pix(32, 32), ['#7a7266', '#847b6e', '#8d8477', '#968c7f'], 31, 4, 0.8);
  tex.timber = () => { const p = tex.plaster(); const B = '#2c1d12'; p.rect(0, 0, 32, 3, B); p.rect(0, 0, 3, 32, B); p.rect(29, 0, 3, 32, B); p.line(3, 31, 29, 3, B); p.line(4, 31, 29, 4, B); return p; };
  tex.thatch = () => { const p = noiseFill(Pix(32, 32), ['#4a3b20', '#56452a', '#625033', '#6e5b3a'], 32, 6); for (let y = 0; y < 32; y += 4) for (let x = 0; x < 32; x++) if ((x + y) % 3 === 0) p.set(x, y, '#3a2e18'); return p; };
  tex.slate = () => { const p = Pix(32, 32); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const ox = c * 8 + (r % 2) * 4; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) p.set((ox + x) % 32, r * 8 + y, y === 7 || x === 7 ? '#141618' : sh('#3a4048', 0.8 + G.hash2(r, c, 33) * 0.3 + (y < 2 ? 0.12 : 0))); } return p; };
  tex.roof_red = () => { const p = Pix(32, 32); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const ox = c * 8 + (r % 2) * 4; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const round = Math.abs(x - 3.5) / 4; p.set((ox + x) % 32, r * 8 + y, y === 7 ? '#1a0c08' : sh('#6a2e22', 1.05 - round * 0.4 + G.hash2(r, c, 34) * 0.2)); } } return p; };
  tex.marble = () => { const p = noiseFill(Pix(32, 32), ['#8a8682', '#96928e', '#a19d98', '#aba7a2'], 35, 3); for (let i = 0; i < 3; i++) { let x = G.hash2(i, 0, 36) * 32, y = 0; while (y < 32) { p.set(x, y, '#6a6560'); y++; x += G.hash2(i, y, 37) > 0.5 ? 1 : -1; } } return p; };
  tex.door = () => { const p = tex.planks_v(); p.rect(0, 6, 32, 2, '#1a1a1c'); p.rect(0, 24, 32, 2, '#1a1a1c'); p.ell(25, 16, 1.5, 1.5, '#8a7a50'); p.rect(0, 0, 32, 1, '#0d0806'); return p; };
  tex.window = () => { const p = Pix(32, 32); p.rect(0, 0, 32, 32, '#2a1d12'); p.rect(3, 3, 26, 26, '#0b0d10'); p.rect(15, 3, 2, 26, '#2a1d12'); p.rect(3, 15, 26, 2, '#2a1d12'); return p; };
  tex.window_lit = () => { const p = Pix(32, 32); p.rect(0, 0, 32, 32, '#2a1d12'); for (let y = 3; y < 29; y++) for (let x = 3; x < 29; x++) p.set(x, y, sh('#d8a040', 0.8 + G.hash2(x, y, 38) * 0.3)); p.rect(15, 3, 2, 26, '#2a1d12'); p.rect(3, 15, 26, 2, '#2a1d12'); return p; };
  tex.ceiling = () => { const p = tex.wood(); for (let x = 0; x < 32; x += 16) p.rect(x, 0, 4, 32, '#1e140c'); return p; };
  tex.banner = () => { const p = Pix(32, 32); p.rect(0, 0, 32, 32, '#4a1010'); p.rect(2, 0, 28, 32, '#6a1616'); p.ell(16, 14, 7, 8, '#b09040'); p.ell(16, 14, 5, 6, '#6a1616'); p.rect(15, 6, 2, 16, '#b09040'); return p; };
  tex.bars = () => { const p = Pix(32, 32); for (let x = 2; x < 32; x += 8) p.rect(x, 0, 3, 32, '#2a2a2e'); p.rect(0, 4, 32, 3, '#2a2a2e'); p.rect(0, 26, 32, 3, '#2a2a2e'); return p; };
  tex.lava = () => noiseFill(Pix(32, 32), ['#5a1206', '#8a2a08', '#c0500c', '#e88a20'], 39, 4, 1.3);
  tex.sarc = () => { const p = bricks('#4a4642', '#1c1a18', 40, 0.1); p.rect(0, 0, 32, 4, '#5a5652'); return p; };
  tex.gold = () => noiseFill(Pix(32, 32), ['#5a4410', '#7a5c18', '#9a7820', '#c09a30'], 41, 4);

  // =====================================================================
  // SPRITES
  // =====================================================================
  const spr = {};
  // trees
  spr.pine = (v) => {
    const p = Pix(48, 88);
    p.rect(22, 66, 5, 22, '#2a1c10'); p.rect(23, 66, 2, 22, '#3a2716');
    const g = ['#0f1a10', '#14231a', '#1a2c1e', '#203424'];
    for (let i = 0; i < 6; i++) {
      const top = 4 + i * 11, half = 5 + i * 3.6;
      for (let y = 0; y < 16; y++) {
        const w = half * (y / 16);
        for (let x = -w; x <= w; x++) {
          const k = (x + w) / (2 * w + 0.01);
          p.set(24 + x, top + y, g[G.clamp(Math.floor((1 - k) * 3.2 + G.hash2(x | 0, y + i * 20, v) * 1.2 - (y > 12 ? 1 : 0)), 0, 3)]);
        }
      }
    }
    if (v % 3 === 0) for (let i = 0; i < 20; i++) p.set(10 + G.hash2(i, 0, v) * 28, 16 + G.hash2(i, 1, v) * 50, p.a(10 + G.hash2(i, 0, v) * 28 | 0, 16 + G.hash2(i, 1, v) * 50 | 0) ? '#8a9090' : null);
    return p.outline();
  };
  spr.deadtree = (v) => {
    const p = Pix(56, 80), b = '#2a221c', l = '#3a3028';
    p.rect(26, 40, 5, 40, b); p.rect(27, 40, 2, 40, l);
    const branch = (x, y, ang, len, w) => {
      if (len < 3) return;
      const x2 = x + Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
      for (let i = 0; i < w; i++) p.line(x + i, y, x2 + i, y2, b);
      branch(x2, y2, ang + 0.5 + G.hash2(x | 0, y | 0, v) * 0.3, len * 0.68, Math.max(1, w - 1));
      branch(x2, y2, ang - 0.45 - G.hash2(y | 0, x | 0, v) * 0.3, len * 0.62, Math.max(1, w - 1));
    };
    branch(28, 42, Math.PI / 2 + (G.hash2(v, 0, 1) - 0.5) * 0.3, 16, 3);
    return p.outline();
  };
  spr.oak = (v) => {
    const p = Pix(64, 80);
    p.rect(29, 48, 7, 32, '#2a1c10'); p.rect(30, 48, 3, 32, '#3a2716');
    const g = ['#14200f', '#1a2914', '#213319', '#283c1d', '#30461f'];
    const blobs = [[32, 26, 22, 18], [18, 36, 13, 11], [46, 36, 13, 11], [32, 14, 15, 11]];
    for (const [bx, by, rx, ry] of blobs) for (let y = by - ry; y <= by + ry; y++) for (let x = bx - rx; x <= bx + rx; x++) {
      const dx = (x - bx) / rx, dy = (y - by) / ry, d = dx * dx + dy * dy;
      if (d > 1 - G.hash2(x, y, v) * 0.25) continue;
      const k = G.clamp(Math.floor((1 - dy) * 2 - dx * 0.8 + G.hash2(x, y, v + 1) * 1.5), 0, 4);
      p.set(x, y, g[k]);
    }
    return p.outline();
  };
  spr.bush = (v) => { const p = Pix(28, 18); for (let i = 0; i < 4; i++) p.ell(6 + i * 5, 11 - (i % 2) * 2, 6, 6, ['#18240f', '#1e2d13', '#243416'][i % 3]); for (let i = 0; i < 6; i++) p.set(4 + G.hash2(i, 0, v) * 20, 6 + G.hash2(i, 1, v) * 10, '#33461f'); return p.outline(); };
  spr.boulder = (v) => { const p = Pix(28, 20); for (let y = 0; y < 20; y++) for (let x = 0; x < 28; x++) { const dx = (x - 14) / 13, dy = (y - 13) / 9; if (dx * dx + dy * dy < 1 - G.hash2(x, y, v) * 0.15) p.set(x, y, sh('#4a4640', 0.7 + (1 - dy) * 0.25 - dx * 0.15 + G.hash2(x, y, v + 2) * 0.1)); } return p.outline(); };
  spr.tuft = () => { const p = Pix(16, 10); for (let i = 0; i < 7; i++) p.line(2 + i * 2, 10, 1 + i * 2 + (i % 3), 2 + (i % 3), ['#2a3a1a', '#33461f', '#3d5225'][i % 3]); return p; };
  spr.stump = () => { const p = Pix(20, 12); p.rect(4, 3, 12, 9, '#3a2716'); p.ell(10, 3, 6, 2, '#6a5236'); return p.outline(); };
  spr.gravestone = () => { const p = Pix(14, 18); p.rect(2, 4, 10, 14, '#4a4844'); p.ell(7, 5, 5, 4, '#4a4844'); p.rect(3, 4, 2, 13, '#5a5854'); p.rect(6, 7, 2, 7, '#2a2826'); p.rect(4, 9, 6, 2, '#2a2826'); return p.outline(); };
  // props
  spr.torch = (f) => { const p = Pix(10, 22); p.rect(4, 10, 2, 12, '#3a2716'); p.rect(3, 9, 4, 2, '#2a2a2e'); const h = f ? 1 : 0; p.ell(5, 6 - h, 3, 4, '#c04a10'); p.ell(5, 7 - h, 2, 3, '#f0a020'); p.ell(5, 8, 1, 1.5, '#fff0a0'); return p; };
  spr.campfire = (f) => { const p = Pix(24, 22); p.line(3, 20, 20, 16, '#3a2716'); p.line(3, 16, 20, 20, '#3a2716'); for (let i = 0; i < 5; i++) { const x = 6 + i * 3, h = 8 + ((i + f) % 3) * 3; for (let y = 0; y < h; y++) { const w = Math.max(0, 2 - y / h * 2); p.rect(x - w, 18 - y, w * 2 + 1, 1, y > h * 0.6 ? '#f0a020' : y > h * 0.3 ? '#e06010' : '#c03008'); } } p.ell(12, 17, 3, 2, '#fff0a0'); return p; };
  spr.candles = () => { const p = Pix(14, 12); [[3, 6], [7, 4], [11, 7]].forEach(([x, y]) => { p.rect(x - 1, y, 2, 12 - y, '#d8d0b8'); p.set(x, y - 1, '#f0c040'); p.set(x, y - 2, '#fff0a0'); }); return p; };
  spr.chest = (open) => {
    const p = Pix(26, 20);
    p.rect(2, 8, 22, 12, '#4a2e18'); p.rect(2, 8, 22, 2, '#2a2a2e'); p.rect(2, 17, 22, 2, '#2a2a2e'); p.rect(4, 8, 2, 12, '#2a2a2e'); p.rect(20, 8, 2, 12, '#2a2a2e');
    if (open) { p.rect(2, 1, 22, 6, '#3a2212'); p.rect(4, 5, 18, 3, '#100a06'); p.set(9, 6, '#e0b040'); p.set(14, 6, '#e0b040'); }
    else { p.ell(13, 8, 11, 4, '#5a3820'); p.rect(2, 7, 22, 2, '#2a2a2e'); p.rect(11, 9, 4, 4, '#c0a040'); }
    return p.outline();
  };
  spr.barrel = () => { const p = Pix(16, 22); for (let y = 0; y < 22; y++) { const w = 6 + Math.sin(y / 21 * Math.PI) * 2; p.rect(8 - w, y, w * 2, 1, sh('#4a3220', 0.9 + (y % 7 === 0 ? -0.3 : 0))); } p.rect(1, 4, 14, 1, '#2a2a2e'); p.rect(1, 17, 14, 1, '#2a2a2e'); return p.outline(); };
  spr.urn = () => { const p = Pix(14, 18); for (let y = 2; y < 18; y++) { const w = 3 + Math.sin((y - 2) / 15 * Math.PI) * 3; p.rect(7 - w, y, w * 2, 1, sh('#5a4a3a', 0.8 + (y < 8 ? 0.2 : 0))); } p.rect(4, 0, 6, 2, '#4a3a2a'); return p.outline(); };
  spr.crate = () => { const p = Pix(18, 18); p.rect(0, 0, 18, 18, '#5a4028'); p.rect(0, 0, 18, 2, '#3a2716'); p.rect(0, 16, 18, 2, '#3a2716'); p.rect(0, 0, 2, 18, '#3a2716'); p.rect(16, 0, 2, 18, '#3a2716'); p.line(2, 2, 15, 15, '#3a2716'); return p.outline(); };
  spr.bones = () => { const p = Pix(22, 10); p.line(2, 8, 16, 5, '#c8c0a8'); p.line(5, 4, 18, 8, '#b8b098'); p.ell(18, 4, 3, 3, '#d0c8b0'); p.set(17, 4, '#202020'); p.set(19, 4, '#202020'); return p.outline(); };
  spr.mushroom = () => { const p = Pix(14, 14); [[4, 8], [9, 5], [11, 10]].forEach(([x, y], i) => { p.rect(x, y, 1, 14 - y, '#c8d8d0'); p.ell(x + 0.5, y, 3 - (i % 2), 2, '#40c0b0'); p.set(x, y - 1, '#a0fff0'); }); return p; };
  spr.stalagmite = (v) => { const p = Pix(16, 34); for (let y = 0; y < 34; y++) { const w = 1 + y / 34 * 6; p.rect(8 - w, y, w * 2, 1, sh('#3a332c', 0.8 + G.hash2(y, 0, v) * 0.2)); } return p.outline(); };
  spr.lamppost = () => { const p = Pix(12, 48); p.rect(5, 10, 2, 38, '#1e1e22'); p.rect(2, 46, 8, 2, '#1e1e22'); p.rect(2, 2, 8, 9, '#1e1e22'); p.rect(3, 4, 6, 6, '#f0c060'); p.rect(4, 5, 4, 4, '#fff0b0'); return p; };
  spr.signpost = () => { const p = Pix(20, 30); p.rect(9, 6, 2, 24, '#3a2716'); p.rect(1, 5, 18, 7, '#5a4028'); p.line(3, 8, 15, 8, '#2a1c10'); return p.outline(); };
  spr.nightshade = (picked) => { const p = Pix(14, 16); p.line(7, 16, 7, 5, '#2a4020'); p.line(7, 10, 3, 6, '#2a4020'); p.line(7, 9, 11, 6, '#2a4020'); if (!picked) [[7, 4], [3, 5], [11, 5]].forEach(([x, y]) => p.ell(x, y, 2, 2, '#6a2a9a')); return p.outline(); };
  spr.lotus = (picked) => { const p = Pix(16, 12); p.ell(8, 10, 7, 2, '#1e3a20'); if (!picked) { p.ell(8, 7, 4, 3, '#d8b0c8'); p.ell(8, 6, 2, 2, '#f0e0e8'); } return p.outline(); };
  spr.ore = () => { const p = Pix(22, 16); p.ell(11, 10, 10, 6, '#3a3632'); for (let i = 0; i < 6; i++) p.ell(4 + G.hash2(i, 0, 50) * 14, 7 + G.hash2(i, 1, 50) * 6, 1.5, 1, '#b06030'); return p.outline(); };
  spr.sack = () => { const p = Pix(16, 14); p.ell(8, 9, 7, 5, '#6a5236'); p.rect(6, 2, 4, 4, '#6a5236'); p.rect(5, 4, 6, 1, '#3a2716'); return p.outline(); };
  spr.exit = () => { const p = Pix(24, 30); p.rect(0, 0, 24, 30, '#0a0806'); for (let i = 0; i < 6; i++) p.rect(2 + i, 24 - i * 4, 20 - i * 2, 3, sh('#4a4640', 0.6 + i * 0.1)); p.ell(12, 2, 10, 4, '#d8c890'); return p; };
  spr.marker = (col) => { const p = Pix(8, 18); p.rect(2, 1, 4, 11, col); p.rect(2, 14, 4, 4, col); p.rect(3, 1, 1, 10, sh(col, 1.3)); return p.outline('#000000'); };
  spr.bolt = (col) => { const p = Pix(12, 12); p.ell(6, 6, 5, 5, sh(col, 0.7)); p.ell(6, 6, 3.5, 3.5, col); p.ell(6, 6, 1.8, 1.8, '#fff8e0'); return p; };
  spr.spark = () => { const p = Pix(4, 4); p.rect(1, 1, 2, 2, '#ffd060'); return p; };
  spr.blood = () => { const p = Pix(4, 4); p.rect(1, 1, 2, 2, '#8a1010'); return p; };

  // ---------- humanoids (32x48, frames: 0 idle 1 walk 2 walk 3 attack 4 dead) ----------
  T.human = function (s, frame) {
    const big = s.big ? 1 : 0;
    const W = big ? 48 : 32, H = big ? 72 : 48;
    const p = Pix(W, H);
    const S = big ? 1.5 : 1;
    const P = (x, y, w, h, c) => p.rect(Math.round(x * S), Math.round(y * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)), c);
    const skin = s.skin || '#b08868', top = s.top || '#5a4a3a', legs = s.legs || '#3a3028', boots = s.boots || '#2a1e14';
    if (frame === 4) {
      // lying dead, head to the left
      P(4, 40, 9, 6, top); P(13, 41, 9, 5, legs); P(22, 42, 6, 4, boots); P(0, 39, 5, 6, s.undead ? '#d8d0b8' : skin);
      if (s.hair && s.hairStyle !== 0) P(0, 38, 4, 3, s.hair);
      if (s.weapon) P(6, 46, 14, 1, '#8a8a90');
      P(8, 46, 12, 2, '#3a0a08');
      return p.outline();
    }
    const walk = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const atk = frame === 3;
    const float = s.wraith;
    // legs
    if (!s.robe && !float) {
      P(11, 30 + (walk > 0 ? -1 : 0), 4, 12 - (walk > 0 ? 1 : 0), legs); P(17, 30 + (walk < 0 ? -1 : 0), 4, 12 - (walk < 0 ? 1 : 0), legs);
      P(12, 30, 1, 11, T.sh(legs, 1.25));
      P(10, 41 + (walk > 0 ? -1 : 0), 5, 5, boots); P(17, 41 + (walk < 0 ? -1 : 0), 5, 5, boots);
      if (s.undead === 'skel') { P(11, 30, 4, 12, '#00000000'); P(17, 30, 4, 12, '#00000000'); P(12, 30, 2, 12, '#d8d0b8'); P(18, 30, 2, 12, '#d8d0b8'); P(11, 41, 4, 2, '#c8c0a8'); P(17, 41, 4, 2, '#c8c0a8'); }
    } else {
      const robe = s.robeColor || top;
      for (let y = 26; y < (float ? 42 : 46); y++) { const w = 6 + (y - 26) * 0.25; P(16 - w, y, w * 2, 1, T.sh(robe, y % 5 === 0 ? 0.85 : 1)); }
      if (float) for (let x = 9; x < 23; x += 2) P(x, 42, 1, 2 + ((x + frame) % 3), T.sh(robe, 0.7));
      else { P(11, 45, 4, 2, boots); P(17, 45, 4, 2, boots); }
    }
    // torso
    const armor = s.armor;
    const tc = armor === 'plate' ? (s.armorColor || '#6a6e74') : armor === 'chain' ? '#5a5e62' : armor === 'leather' ? (s.armorColor || '#4a3420') : top;
    P(10, 16, 12, 15, tc);
    P(10, 16, 3, 15, T.sh(tc, 1.2)); P(19, 16, 3, 15, T.sh(tc, 0.75));
    if (armor === 'chain') for (let y = 17; y < 30; y += 2) for (let x = 11; x < 21; x += 2) P(x + (y % 4 ? 1 : 0), y, 1, 1, '#7a7e82');
    if (armor === 'plate') { P(12, 18, 8, 1, T.sh(tc, 1.4)); P(15, 17, 2, 12, T.sh(tc, 1.15)); }
    if (s.trim) { P(15, 16, 2, 14, s.trim); }
    if (s.undead === 'skel') { P(10, 16, 12, 15, '#00000000'); for (let y = 17; y < 27; y += 2) P(11, y, 10, 1, '#d8d0b8'); P(15, 16, 2, 14, '#c8c0a8'); P(12, 27, 8, 3, '#c8c0a8'); }
    P(10, 29, 12, 2, s.belt || '#2a1e14'); P(15, 29, 2, 2, '#a08040');
    if (s.cape) P(8, 16, 2, 22, s.cape), P(22, 16, 2, 22, T.sh(s.cape, 0.7));
    // arms
    const armC = s.undead === 'skel' ? '#d0c8b0' : armor ? tc : top;
    const lArmY = 17 - (walk < 0 ? 1 : 0), rArmY = 17 - (walk > 0 ? 1 : 0);
    P(7, lArmY, 3, 11, armC); P(7, lArmY + 11, 3, 2, s.undead === 'skel' ? '#d0c8b0' : skin);
    if (s.shield) { P(3, 19, 7, 10, s.shield); P(4, 20, 5, 8, T.sh(s.shield, 1.2)); P(6, 22, 1, 4, '#c0a040'); }
    if (atk) { P(22, 10, 3, 8, armC); P(22, 8, 3, 2, skin); }
    else { P(22, rArmY, 3, 11, armC); P(22, rArmY + 11, 3, 2, s.undead === 'skel' ? '#d0c8b0' : skin); }
    // weapon
    const hx = atk ? 23 : 23, hy = atk ? 8 : rArmY + 12;
    const wc = s.weaponColor || '#9a9ea4';
    if (s.weapon === 'sword') { if (atk) { P(23, 0, 2, 9, wc); P(21, 8, 6, 1, '#4a3a20'); } else { P(23, hy - 1, 2, 2, '#4a3a20'); P(23, hy + 1, 2, 10, wc); } }
    if (s.weapon === 'axe') { if (atk) { P(23, 1, 1, 9, '#4a3220'); P(24, 1, 4, 4, wc); } else { P(23, hy, 1, 10, '#4a3220'); P(24, hy + 6, 4, 4, wc); } }
    if (s.weapon === 'dagger') { if (atk) P(23, 3, 2, 5, wc); else P(23, hy + 1, 2, 4, wc); }
    if (s.weapon === 'club') { if (atk) P(22, 0, 4, 10, '#5a4028'); else P(22, hy, 4, 11, '#5a4028'); }
    if (s.weapon === 'staff') { P(24, atk ? 0 : 6, 1, atk ? 14 : 36, '#4a3220'); P(23, atk ? -1 : 4, 3, 3, s.orb || '#e05010'); }
    if (s.weapon === 'spear') { P(24, atk ? 0 : 4, 1, 34, '#4a3220'); P(23, atk ? -2 : 2, 3, 3, wc); }
    // head
    const headC = s.undead === 'skel' ? '#d8d0b8' : skin;
    P(12, 5, 8, 10, headC); P(12, 5, 2, 10, T.sh(headC, 1.15)); P(18, 5, 2, 10, T.sh(headC, 0.8));
    const eye = s.eyes || (s.undead ? '#e04020' : '#1a1410');
    P(13, 9, 2, 2, s.undead === 'skel' ? '#100808' : '#e8e0d8'); P(17, 9, 2, 2, s.undead === 'skel' ? '#100808' : '#e8e0d8');
    P(14, 10, 1, 1, eye); P(17, 10, 1, 1, eye);
    if (s.undead) { P(13, 9, 2, 2, s.eyes || '#e04020'); P(17, 9, 2, 2, s.eyes || '#e04020'); }
    if (s.undead === 'skel') { P(14, 13, 4, 1, '#3a3028'); P(15, 12, 1, 1, '#3a3028'); P(17, 12, 1, 1, '#3a3028'); }
    else P(15, 13, 2, 1, T.sh(headC, 0.6));
    if (s.beard) { P(12, 12, 8, 4, s.beard); P(15, 13, 2, 1, T.sh(headC, 0.6)); }
    // hair / headgear
    const hat = s.hat;
    if (hat === 'helm' || hat === 'greathelm') { const hc = s.helmColor || '#5a5e64'; P(11, 3, 10, 6, hc); P(11, 3, 10, 1, T.sh(hc, 1.3)); if (hat === 'greathelm') { P(11, 9, 10, 4, hc); P(12, 10, 8, 1, '#08080a'); P(13, 9, 2, 1, s.undead ? s.eyes || '#e04020' : '#08080a'); P(17, 9, 2, 1, s.undead ? s.eyes || '#e04020' : '#08080a'); } else P(15, 6, 2, 6, hc); }
    else if (hat === 'hood') { const hc = s.hoodColor || top; P(10, 3, 12, 5, hc); P(10, 3, 2, 12, hc); P(20, 3, 2, 12, hc); P(12, 8, 8, 2, T.sh(hc, 0.6)); }
    else if (hat === 'crown') { if (s.hair) P(11, 3, 10, 4, s.hair); P(11, 1, 10, 3, '#c09030'); P(12, 0, 1, 1, '#c09030'); P(15, 0, 2, 1, '#c09030'); P(19, 0, 1, 1, '#c09030'); P(15, 2, 2, 1, '#d02020'); }
    else if (hat === 'wizard') { const hc = s.hoodColor || '#2a2a4a'; P(9, 5, 14, 2, hc); P(11, 0, 10, 5, hc); P(14, -4, 4, 4, hc); }
    else if (hat === 'cap') { P(11, 3, 10, 3, s.hoodColor || '#5a3a2a'); }
    else if (s.hair && s.hairStyle !== 0) {
      P(11, 3, 10, 4, s.hair); P(11, 3, 1, 7, s.hair); P(20, 3, 1, 7, s.hair);
      if (s.hairStyle === 2) { P(10, 5, 2, 12, s.hair); P(20, 5, 2, 12, s.hair); }
    }
    if (s.horns) { P(9, 1, 2, 5, '#d8d0b8'); P(21, 1, 2, 5, '#d8d0b8'); }
    if (s.glow) { P(13, 9, 2, 2, s.glow); P(17, 9, 2, 2, s.glow); }
    return p.outline();
  };
  // quadrupeds & monsters (side view, facing right)
  T.beast = function (kind, frame, s) {
    s = s || {};
    if (kind === 'wolf') {
      const p = Pix(44, 28), c = s.c || '#4a4a4c', d = T.sh(c, 0.7), l = T.sh(c, 1.25);
      if (frame === 4) { p.rect(4, 20, 30, 6, c); p.rect(32, 19, 8, 6, c); p.rect(4, 25, 30, 1, d); p.rect(10, 26, 16, 2, '#3a0a08'); return p.outline(); }
      const st = frame === 1 ? 2 : frame === 2 ? -2 : 0, lunge = frame === 3 ? 4 : 0;
      p.rect(8 + lunge, 10, 24, 9, c); p.rect(8 + lunge, 10, 24, 3, l); p.rect(10 + lunge, 17, 20, 2, d);
      [[10, st], [15, -st], [26, -st], [30, st]].forEach(([x, o]) => p.rect(x + lunge + o * 0.5, 18, 3, 9, x > 20 ? c : d));
      p.rect(31 + lunge, 6, 9, 8, c); p.rect(38 + lunge, 9, 6, 4, c); p.rect(32 + lunge, 3, 3, 4, d); p.rect(36 + lunge, 3, 2, 4, d);
      p.set(37 + lunge, 8, s.eye || '#e0c020'); p.set(43 + lunge, 10, '#101010');
      if (frame === 3) { p.rect(39 + lunge, 13, 5, 1, '#e8e0d0'); }
      p.line(8 + lunge, 12, 1 + lunge, 8 + (frame % 2) * 3, c); p.line(8 + lunge, 13, 2 + lunge, 9 + (frame % 2) * 3, c);
      return p.outline();
    }
    if (kind === 'spider') {
      const p = Pix(44, 28), c = s.c || '#1e1a18';
      if (frame === 4) { p.ell(22, 22, 12, 4, c); for (let i = 0; i < 4; i++) { p.line(14 + i * 5, 22, 10 + i * 6, 16, c); } return p.outline(); }
      const w = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      for (let i = 0; i < 4; i++) { const y = 12 + i * 2; p.line(16, y, 4 - i, y + 10 + (i % 2 ? w : -w), c); p.line(4 - i, y + 10 + (i % 2 ? w : -w), 2 - i, 27, c); p.line(28, y, 40 + i, y + 10 + (i % 2 ? -w : w), c); p.line(40 + i, y + 10 + (i % 2 ? -w : w), 42 + i, 27, c); }
      p.ell(22, 13, 10, 8, c); p.ell(22, 12, 7, 5, T.sh(c, 1.4)); p.ell(22, 21 - (frame === 3 ? 2 : 0), 6, 4, T.sh(c, 1.2));
      [[19, 19], [25, 19], [20, 21], [24, 21]].forEach(([x, y]) => p.set(x, y - (frame === 3 ? 2 : 0), '#e03020'));
      p.rect(18, 13, 8, 1, s.mark || '#8a2010');
      return p.outline();
    }
    if (kind === 'rat') {
      const p = Pix(26, 14), c = '#4a3e36';
      if (frame === 4) { p.rect(3, 9, 14, 4, c); p.rect(5, 12, 8, 2, '#3a0a08'); return p.outline(); }
      const st = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      p.ell(11, 8, 7, 4, c); p.ell(19, 8, 4, 3, c); p.set(21, 7, '#e02020'); p.rect(23, 8, 2, 1, '#c09090');
      p.rect(7 + st, 11, 2, 3, c); p.rect(14 - st, 11, 2, 3, c); p.line(4, 8, 0, 4 + st, '#a08080');
      return p.outline();
    }
    if (kind === 'troll') {
      const p = Pix(56, 76), c = s.c || '#4a5246', d = T.sh(c, 0.7);
      if (frame === 4) { p.rect(2, 60, 44, 12, c); p.rect(44, 58, 10, 12, c); p.rect(10, 70, 30, 3, '#3a0a08'); return p.outline(); }
      const st = frame === 1 ? 2 : frame === 2 ? -2 : 0, atk = frame === 3;
      p.rect(16, 52 + Math.max(0, st), 9, 24 - Math.max(0, st), d); p.rect(31, 52 + Math.max(0, -st), 9, 24 - Math.max(0, -st), d);
      p.ell(28, 38, 17, 18, c); p.ell(24, 32, 10, 10, T.sh(c, 1.15));
      p.rect(14, 52, 28, 6, '#3a2e20');
      p.rect(6, 28, 8, 26, c); p.rect(5, 52, 10, 6, d);
      if (atk) { p.rect(42, 8, 8, 24, c); p.rect(42, 0, 10, 12, '#4a3420'); }
      else { p.rect(42, 28, 8, 26, c); p.rect(43, 50, 8, 22, '#4a3420'); }
      p.ell(28, 16, 9, 9, c); p.rect(22, 14, 3, 2, '#e0c020'); p.rect(31, 14, 3, 2, '#e0c020'); p.rect(23, 22, 10, 2, '#1a1410'); p.set(24, 21, '#d8d0b8'); p.set(31, 21, '#d8d0b8');
      if (s.crown) { p.rect(20, 5, 16, 4, '#c09030'); p.set(22, 4, '#c09030'); p.set(28, 3, '#c09030'); p.set(34, 4, '#c09030'); }
      return p.outline();
    }
    if (kind === 'wraith') return T.human(Object.assign({ wraith: true, robe: true, robeColor: '#1a1820', top: '#1a1820', hat: 'hood', hoodColor: '#141218', skin: '#0a0a0e', undead: 'wraith', eyes: '#80e0ff' }, s), frame === 4 ? 4 : frame);
    return Pix(8, 8);
  };

  // =====================================================================
  // build everything
  // =====================================================================
  T.HUMAN_FRAMES = 5;
  T.build = function (npcSpecs) {
    T.begin();
    for (const k in tex) T.add(k, tex[k]());
    for (let v = 0; v < 3; v++) { T.add('pine' + v, spr.pine(v + 3)); T.add('deadtree' + v, spr.deadtree(v + 1)); T.add('oak' + v, spr.oak(v + 1)); }
    T.add('bush', spr.bush(1)); T.add('boulder', spr.boulder(1)); T.add('boulder2', spr.boulder(5)); T.add('tuft', spr.tuft()); T.add('stump', spr.stump()); T.add('gravestone', spr.gravestone());
    T.add('torch0', spr.torch(0)); T.add('torch1', spr.torch(1)); T.add('campfire0', spr.campfire(0)); T.add('campfire1', spr.campfire(1)); T.add('candles', spr.candles());
    T.add('chest', spr.chest(false)); T.add('chest_open', spr.chest(true)); T.add('barrel', spr.barrel()); T.add('urn', spr.urn()); T.add('crate', spr.crate());
    T.add('bones', spr.bones()); T.add('mushroom', spr.mushroom()); T.add('stalagmite', spr.stalagmite(1)); T.add('lamppost', spr.lamppost()); T.add('signpost', spr.signpost());
    T.add('nightshade', spr.nightshade(false)); T.add('nightshade_picked', spr.nightshade(true)); T.add('lotus', spr.lotus(false)); T.add('lotus_picked', spr.lotus(true));
    T.add('ore', spr.ore()); T.add('sack', spr.sack()); T.add('exit', spr.exit());
    T.add('mark_grey', spr.marker('#a8a8a8')); T.add('mark_yellow', spr.marker('#f0d020')); T.add('mark_green', spr.marker('#40e040'));
    T.add('bolt_fire', spr.bolt('#f07020')); T.add('bolt_frost', spr.bolt('#60c0ff')); T.add('bolt_dark', spr.bolt('#a040e0')); T.add('bolt_green', spr.bolt('#60e040'));
    T.add('spark', spr.spark()); T.add('blood', spr.blood());
    // creatures and people
    for (const key in npcSpecs) {
      const s = npcSpecs[key];
      for (let f = 0; f < 5; f++) {
        const p = s.beast ? T.beast(s.beast, f, s) : T.human(s, f);
        T.add(key + '_' + f, p);
      }
    }
    return T.atlas;
  };
})(window.G);
