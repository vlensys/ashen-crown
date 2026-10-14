'use strict';
// Procedural dungeon interiors. Every dungeon is generated from its own seed, so it is the
// same each time you enter; what you looted and killed is remembered in the save.
(function (G) {
  const D = (G.dungeon = {});
  const C = (D.CELL = 3);
  const THEME = {
    cave: { wall: 'cave', floor: 'cave_floor', ceil: 'cave', h: 4.2, amb: [0.21, 0.19, 0.16], fog: [0.02, 0.018, 0.016] },
    fort: { wall: 'brick', floor: 'wood', ceil: 'ceiling', h: 4, amb: [0.17, 0.15, 0.13], fog: [0.03, 0.025, 0.02], floor2: 'flagstone' },
    crypt: { wall: 'brick_dark', floor: 'flagstone', ceil: 'brick_dark', h: 3.6, amb: [0.14, 0.15, 0.18], fog: [0.015, 0.02, 0.025] },
    ruin: { wall: 'brick_dark', floor: 'flagstone', ceil: 'brick_dark', h: 3.6, amb: [0.09, 0.1, 0.12], fog: [0.015, 0.02, 0.025] },
    spire: { wall: 'brick_dark', floor: 'ash', ceil: 'brick_dark', h: 5.5, amb: [0.16, 0.08, 0.06], fog: [0.06, 0.02, 0.01], floor2: 'flagstone' },
  };
  D.THEME = THEME;

  D.generate = function (site) {
    const r = G.rng(site.seed);
    const kind = site.kind;
    const th = THEME[kind];
    const w = kind === 'cave' ? 46 : kind === 'spire' ? 40 : 44, h = w;
    const grid = new Uint8Array(w * h);
    const L = { site, kind, th, w, h, grid, cell: C, rooms: [], props: [], lights: [], chests: [], spawns: [], ores: [], solids: [] };
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : grid[y * w + x]);
    L.at = at;
    if (kind === 'cave') {
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) grid[y * w + x] = r() < 0.53 ? 1 : 0;
      for (let it = 0; it < 5; it++) {
        const g2 = grid.slice();
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !at(x + dx, y + dy)) n++;
          g2[y * w + x] = n >= 5 ? 0 : n <= 2 ? 1 : grid[y * w + x];
        }
        grid.set(g2);
      }
      // keep the largest connected region
      const lab = new Int32Array(w * h).fill(-1);
      let best = -1, bestN = 0;
      for (let i = 0; i < w * h; i++) {
        if (!grid[i] || lab[i] >= 0) continue;
        const q = [i]; lab[i] = i; let n = 0;
        while (q.length) { const k = q.pop(); n++; for (const o of [1, -1, w, -w]) { const m = k + o; if (grid[m] && lab[m] < 0) { lab[m] = i; q.push(m); } } }
        if (n > bestN) { bestN = n; best = i; }
      }
      for (let i = 0; i < w * h; i++) if (grid[i] && lab[i] !== best) grid[i] = 0;
      // fake "rooms" = clusters for placing things
      for (let k = 0; k < 14; k++) for (let t = 0; t < 50; t++) { const x = r.int(2, w - 3), y = r.int(2, h - 3); if (at(x, y) && at(x + 1, y) && at(x, y + 1) && at(x - 1, y) && at(x, y - 1)) { L.rooms.push({ x0: x - 1, y0: y - 1, x1: x + 1, y1: y + 1, cx: x, cy: y }); break; } }
    } else {
      const want = kind === 'crypt' ? r.int(10, 14) : r.int(9, 13);
      for (let t = 0; t < 400 && L.rooms.length < want; t++) {
        const rw = r.int(kind === 'crypt' ? 3 : 4, kind === 'spire' ? 9 : 8), rh = r.int(kind === 'crypt' ? 3 : 4, kind === 'spire' ? 9 : 8);
        const x0 = r.int(2, w - rw - 3), y0 = r.int(2, h - rh - 3);
        if (L.rooms.some((o) => x0 - 2 < o.x1 && x0 + rw + 2 > o.x0 && y0 - 2 < o.y1 && y0 + rh + 2 > o.y0)) continue;
        L.rooms.push({ x0, y0, x1: x0 + rw, y1: y0 + rh, cx: Math.floor(x0 + rw / 2), cy: Math.floor(y0 + rh / 2) });
      }
      for (const o of L.rooms) for (let y = o.y0; y < o.y1; y++) for (let x = o.x0; x < o.x1; x++) grid[y * w + x] = 1;
      const carve = (x0, y0, x1, y1, wid) => {
        let x = x0, y = y0;
        const horizFirst = r.chance(0.5);
        const step = (tx, ty) => { while (x !== tx || y !== ty) { for (let k = 0; k < wid; k++) { grid[y * w + x] = 1; if (x === tx) grid[y * w + Math.min(w - 2, x + k)] = 1; else grid[Math.min(h - 2, y + k) * w + x] = 1; } if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y); } grid[y * w + x] = 1; };
        if (horizFirst) { step(x1, y0); step(x1, y1); } else { step(x0, y1); step(x1, y1); }
      };
      const conn = [L.rooms[0]];
      for (const o of L.rooms.slice(1)) {
        const near = conn.reduce((a, b) => (Math.hypot(b.cx - o.cx, b.cy - o.cy) < Math.hypot(a.cx - o.cx, a.cy - o.cy) ? b : a));
        carve(o.cx, o.cy, near.cx, near.cy, kind === 'spire' ? 2 : 1);
        conn.push(o);
      }
      // a couple of loops so it isn't a pure tree
      for (let k = 0; k < 2; k++) { const a = r.pick(L.rooms), b = r.pick(L.rooms); if (a !== b) carve(a.cx, a.cy, b.cx, b.cy, 1); }
    }
    // distance field from the start
    const startRoom = kind === 'cave' ? null : L.rooms[0];
    let sx, sy;
    if (startRoom) { sx = startRoom.cx; sy = startRoom.cy; }
    else { let bd = 1e9; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y)) { const d = Math.abs(x - w / 2) + (h - y) * 2; if (d < bd) { bd = d; sx = x; sy = y; } } }
    const dist = new Int32Array(w * h).fill(-1);
    { const q = [sy * w + sx]; dist[q[0]] = 0; for (let i = 0; i < q.length; i++) { const k = q[i]; for (const o of [1, -1, w, -w]) { const m = k + o; if (grid[m] && dist[m] < 0) { dist[m] = dist[k] + 1; q.push(m); } } } }
    L.dist = dist;
    let far = sy * w + sx;
    for (let i = 0; i < w * h; i++) if (dist[i] > dist[far]) far = i;
    const bx = far % w, by = Math.floor(far / w);
    L.start = { x: sx * C + C / 2, z: sy * C + C / 2 };
    L.boss = { x: bx * C + C / 2, z: by * C + C / 2 };
    // exit stairs on a wall next to the start
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!at(sx + dx, sy + dy)) { L.exit = { x: sx * C + C / 2 + dx * (C / 2 - 0.05), z: sy * C + C / 2 + dy * (C / 2 - 0.05), dx, dy }; break; }
    if (!L.exit) L.exit = { x: L.start.x, z: L.start.z, dx: 0, dy: 1 };
    // facing into the dungeon
    L.startYaw = Math.atan2(-(L.exit.dx || 0) * -1, (L.exit.dy || 1));
    L.startYaw = Math.atan2(-L.exit.dx, L.exit.dy);

    // ------- contents -------
    const floorCells = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (at(x, y)) floorCells.push([x, y]);
    const wallAdj = floorCells.filter(([x, y]) => !at(x + 1, y) || !at(x - 1, y) || !at(x, y + 1) || !at(x, y - 1));
    const used = new Set([sy * w + sx, far]);
    const pickCell = (pool, minStart) => { for (let t = 0; t < 200; t++) { const [x, y] = r.pick(pool); const k = y * w + x; if (used.has(k) || dist[k] < (minStart || 0)) continue; used.add(k); return [x, y]; } return null; };
    const cc = ([x, y], j) => ({ x: x * C + C / 2 + (j ? r.range(-0.8, 0.8) : 0), z: y * C + C / 2 + (j ? r.range(-0.8, 0.8) : 0) });
    // lights
    const nLights = kind === 'cave' ? 18 : 22;
    for (let k = 0; k < nLights; k++) {
      const c = pickCell(wallAdj, 0); if (!c) break;
      const p = cc(c);
      if (kind === 'cave') { L.props.push({ kind: 'mushroom', x: p.x, z: p.z, w: 0.7, h: 0.7, glow: true }); L.lights.push({ x: p.x, y: 0.5, z: p.z, r: 6, c: [0.1, 0.45, 0.4] }); }
      else if (kind === 'spire') { L.props.push({ kind: 'campfire0', x: p.x, z: p.z, w: 1.3, h: 1.2, glow: true, anim: 'campfire' }); L.lights.push({ x: p.x, y: 1, z: p.z, r: 10, c: [1, 0.4, 0.12], flicker: true }); }
      else if (kind === 'crypt') { L.props.push({ kind: 'candles', x: p.x, z: p.z, w: 0.7, h: 0.6, glow: true }); L.lights.push({ x: p.x, y: 0.6, z: p.z, r: 7, c: [0.9, 0.65, 0.3], flicker: true }); }
      else { const [cx, cy] = c; let ox = 0, oz = 0; if (!at(cx + 1, cy)) ox = 1.35; else if (!at(cx - 1, cy)) ox = -1.35; else if (!at(cx, cy + 1)) oz = 1.35; else oz = -1.35; L.props.push({ kind: 'torch0', x: p.x + ox, z: p.z + oz, w: 0.45, h: 1, y: 1.4, glow: true, anim: 'torch' }); L.lights.push({ x: p.x + ox * 0.7, y: 2, z: p.z + oz * 0.7, r: 9, c: [1, 0.6, 0.25], flicker: true }); }
    }
    // clutter
    const clutter = { cave: ['stalagmite', 'bones', 'boulder', 'stalagmite'], fort: ['barrel', 'crate', 'barrel', 'bones'], crypt: ['urn', 'bones', 'urn', 'bones'], spire: ['bones', 'urn', 'boulder2'] }[kind] || ['bones'];
    const SZ = { stalagmite: [0.9, 1.9], bones: [1.3, 0.5], boulder: [1.6, 1.1], boulder2: [1.6, 1.1], barrel: [0.9, 1.2], crate: [1, 1], urn: [0.6, 0.8] };
    for (let k = 0; k < 30; k++) {
      const c = pickCell(wallAdj, 2); if (!c) break;
      const kd = r.pick(clutter), p = cc(c, true);
      L.props.push({ kind: kd, x: p.x, z: p.z, w: SZ[kd][0], h: SZ[kd][1] });
      if (kd !== 'bones') L.solids.push({ x: p.x, z: p.z, r: 0.45 });
    }
    // crypt sarcophagi and fort tables
    L.boxes = [];
    for (const o of L.rooms) {
      if (kind === 'crypt' && o.x1 - o.x0 >= 4 && r.chance(0.6)) {
        const x = o.cx * C + 0.4, z = (o.y0 + 1) * C + 0.6;
        L.boxes.push({ x0: x - 0.9, z0: z - 1.4, x1: x + 0.9, z1: z + 1.4, y1: 1.1, tex: 'sarc' });
      }
      if (kind === 'fort' && o.x1 - o.x0 >= 5 && r.chance(0.5)) {
        const x = o.cx * C + 1.5, z = o.cy * C + 1.5;
        L.boxes.push({ x0: x - 1.6, z0: z - 0.8, x1: x + 1.6, z1: z + 0.8, y1: 0.95, tex: 'wood' });
      }
      if ((kind === 'spire' || kind === 'fort') && o.x1 - o.x0 >= 7) {
        for (const [dx, dy] of [[1, 1], [-2, 1], [1, -2], [-2, -2]]) { const x = (dx > 0 ? o.x0 + dx : o.x1 + dx) * C + C / 2, z = (dy > 0 ? o.y0 + dy : o.y1 + dy) * C + C / 2; L.boxes.push({ x0: x - 0.6, z0: z - 0.6, x1: x + 0.6, z1: z + 0.6, y1: th.h, tex: th.wall }); }
      }
    }
    for (const b of L.boxes) L.solids.push({ x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 });
    // ore veins in caves
    if (kind === 'cave') for (let k = 0; k < 5; k++) { const c = pickCell(wallAdj, 6); if (!c) break; const p = cc(c); L.ores.push({ id: site.id + ':o' + k, x: p.x, z: p.z }); }
    // chests
    const nChests = kind === 'cave' ? 3 : 4;
    for (let k = 0; k < nChests; k++) { const c = pickCell(wallAdj, 8); if (!c) break; const p = cc(c); L.chests.push({ id: site.id + ':c' + k, x: p.x, z: p.z, lvl: site.lvl, seed: site.seed + k * 101 }); }
    L.chests.push({ id: site.id + ':boss', x: L.boss.x + 1.2, z: L.boss.z + 0.5, lvl: site.lvl, seed: site.seed + 999, rich: true, boss: true });
    // monsters
    const th2 = G.THEMES[kind === 'ruin' ? 'crypt' : kind];
    const pool = th2.normal.filter((id) => G.CREATURES[id].lvl <= site.lvl + 2);
    const nMon = kind === 'cave' ? 13 + Math.floor(site.lvl / 2) : L.rooms.length + 5 + Math.floor(site.lvl / 3);
    for (let k = 0; k < nMon; k++) {
      const c = pickCell(floorCells, 5); if (!c) break;
      const p = cc(c, true);
      L.spawns.push({ id: site.id + ':m' + k, x: p.x, z: p.z, cr: r.pick(pool.length ? pool : th2.normal) });
    }
    L.spawns.push({ id: site.id + ':boss', x: L.boss.x, z: L.boss.z, cr: site.boss || r.pick(th2.boss.filter((b) => G.CREATURES[b].lvl <= site.lvl + 4).concat(th2.boss.slice(0, 1))), boss: true });
    return L;
  };

  // ---------- meshes ----------
  D.buildMeshes = function (L) {
    const C = L.cell, U = C / 2;
    const B = new G.gfx.Builder();
    const R = (n) => G.tex.r(n);
    const th = L.th, H = th.h, a = th.amb;
    const wallT = R(th.wall), floorT = R(th.floor), ceilT = R(th.ceil), floor2 = th.floor2 ? R(th.floor2) : floorT;
    const at = L.at;
    const amb = (k) => [a[0] * k, a[1] * k, a[2] * k];
    const roomOf = (x, y) => L.rooms.find((o) => x >= o.x0 && x < o.x1 && y >= o.y0 && y < o.y1);
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (!at(x, y)) continue;
      const x0 = x * C, z0 = y * C, x1 = x0 + C, z1 = z0 + C;
      // corner occlusion: darker where walls meet
      const occ = (dx, dy) => 1 - 0.18 * (!at(x + dx, y) + !at(x, y + dy) + !at(x + dx, y + dy));
      const fc = [amb(occ(-1, -1)), amb(occ(1, -1)), amb(occ(1, 1)), amb(occ(-1, 1))];
      const ft = L.kind !== 'cave' && th.floor2 && !roomOf(x, y) ? floor2 : floorT;
      B.quad([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], ft, [[0, 0], [U, 0], [U, U], [0, U]], fc, 1);
      const ch = L.kind === 'cave' ? H + (G.hash2(x, y, 5) - 0.5) * 0.8 : H;
      B.quad([[x0, ch, z0], [x1, ch, z0], [x1, ch, z1], [x0, ch, z1]], ceilT, [[0, 0], [U, 0], [U, U], [0, U]], amb(0.7), 1);
      const wv = H / 2;
      const top = [amb(0.75), amb(0.75), amb(1.05), amb(1.05)];
      if (!at(x, y - 1)) B.quad([[x0, 0, z0], [x1, 0, z0], [x1, H, z0], [x0, H, z0]], wallT, [[0, wv], [U, wv], [U, 0], [0, 0]], top.map((c, i) => c.map((v) => v * 0.95)), 1);
      if (!at(x, y + 1)) B.quad([[x1, 0, z1], [x0, 0, z1], [x0, H, z1], [x1, H, z1]], wallT, [[0, wv], [U, wv], [U, 0], [0, 0]], top, 1);
      if (!at(x - 1, y)) B.quad([[x0, 0, z1], [x0, 0, z0], [x0, H, z0], [x0, H, z1]], wallT, [[0, wv], [U, wv], [U, 0], [0, 0]], top.map((c) => c.map((v) => v * 0.85)), 1);
      if (!at(x + 1, y)) B.quad([[x1, 0, z0], [x1, 0, z1], [x1, H, z1], [x1, H, z0]], wallT, [[0, wv], [U, wv], [U, 0], [0, 0]], top.map((c) => c.map((v) => v * 0.9)), 1);
    }
    for (const b of L.boxes) B.box(b.x0, 0, b.z0, b.x1, b.y1, b.z1, { side: R(b.tex), top: R(b.tex === 'sarc' || b.tex === 'hearth' ? 'flagstone' : b.tex === 'blanket' ? 'blanket' : b.tex) }, amb(1.2), 1, b.tile || 2);
    // exit stairs
    const e = L.exit;
    const ex = e.x - e.dx * 0.02, ez = e.z - e.dy * 0.02;
    const pdx = e.dy, pdz = e.dx;
    const ew = L.exitTex ? 0.85 : 1.2, eh = L.exitTex ? 2.6 : 3;
    B.quad([[ex - pdx * ew, 0, ez - pdz * ew], [ex + pdx * ew, 0, ez + pdz * ew], [ex + pdx * ew, eh, ez + pdz * ew], [ex - pdx * ew, eh, ez - pdz * ew]], R(L.exitTex || 'exit'), [[0, 1], [1, 1], [1, 0], [0, 0]], L.exitTex ? amb(2.2) : [1, 1, 1], L.exitTex ? 1 : 2);
    for (const p of L.props) if (!p.anim) B.sprite(p.x, p.y || 0, p.z, p.w, p.h, R(p.kind), amb(1.4), p.glow ? 2 : 1);
    return [B.build()];
  };
  // grid collision helpers
  D.solid = function (L, x, z) { return !L.at(Math.floor(x / L.cell), Math.floor(z / L.cell)); };
  D.los = function (L, x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.6);
    for (let i = 1; i < n; i++) if (D.solid(L, x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n)) return false;
    return true;
  };
  // BFS next step toward target on the grid
  D.nextStep = function (L, fx, fz, tx, tz) {
    const C = L.cell, w = L.w, s = Math.floor(fz / C) * w + Math.floor(fx / C), t = Math.floor(tz / C) * w + Math.floor(tx / C);
    if (s === t) return null;
    const prev = new Map([[t, -1]]);
    const q = [t];
    for (let i = 0; i < q.length && i < 900; i++) {
      const k = q[i];
      if (k === s) break;
      for (const o of [1, -1, w, -w]) { const m = k + o; if (L.grid[m] && !prev.has(m)) { prev.set(m, k); q.push(m); } }
    }
    if (!prev.has(s)) return null;
    const n = prev.get(s);
    if (n < 0) return null;
    return { x: (n % w) * C + C / 2, z: Math.floor(n / w) * C + C / 2 };
  };
})(window.G);
