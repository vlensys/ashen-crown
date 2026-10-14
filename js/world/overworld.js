'use strict';
// Overworld: heightmap terrain, biomes, roads, vegetation, and randomly placed dungeons.
// Terrain, towns and roads are the same every game; dungeons, ruins and camps come from the world seed.
(function (G) {
  const W = (G.world = {});
  const N = (W.N = 256), CS = (W.CS = 4);
  W.SIZE = N * CS;
  W.WATER = 0;
  const VN = N + 1;
  const TEX = ['grass', 'grass_dead', 'forest', 'dirt', 'road', 'cobble', 'rock', 'snow', 'ash', 'mud', 'sand', 'flagstone'];
  const T = {}; TEX.forEach((t, i) => (T[t] = i));
  W.T = T; W.TEX = TEX;
  const FIXED = 777; // terrain seed (fixed so towns and roads always fit)

  W.hAt = (i, j) => W.h[G.clamp(j, 0, N) * VN + G.clamp(i, 0, N)];
  W.cellType = (i, j) => (i < 0 || j < 0 || i >= N || j >= N ? T.rock : W.type[j * N + i]);
  W.groundH = function (x, z) {
    const fx0 = x / CS, fz0 = z / CS;
    const i = Math.floor(fx0), j = Math.floor(fz0), fx = fx0 - i, fz = fz0 - j;
    const a = W.hAt(i, j), b = W.hAt(i + 1, j), c = W.hAt(i + 1, j + 1), d = W.hAt(i, j + 1);
    return fx > fz ? a + (b - a) * fx + (c - b) * fz : a + (c - d) * fx + (d - a) * fz;
  };

  // ---------------- heights ----------------
  function baseHeight(i, j) {
    let h = 6 + (G.fbm(i / 36, j / 36, FIXED, 5) - 0.5) * 24;
    const m = G.fbm(i / 55, j / 55, FIXED + 1, 3);
    if (m > 0.56) h += Math.pow((m - 0.56) * 6, 1.6) * 14;
    if (j < 75) h += ((75 - j) / 75) * 26 * G.fbm(i / 22, j / 22, FIXED + 2, 3);
    const e = Math.min(i, j, N - j);
    if (e < 16) h += Math.pow(16 - e, 1.5) * 1.8;
    if (i > 214) h -= (i - 214) * 0.9 * (0.6 + G.noise(j / 9, 1, FIXED + 3) * 0.8); // the Ashen Mere coast
    const sw = Math.hypot(i - 190, j - 208);
    if (sw < 34) h = G.lerp(h, 0.6 + (G.fbm(i / 6, j / 6, FIXED + 4, 2) - 0.5) * 2.4, G.smooth(G.clamp((34 - sw) / 14, 0, 1)));
    return h;
  }
  W.inSwamp = (i, j) => Math.hypot(i - 190, j - 208) < 30;
  W.inWaste = (i, j) => i > 176 && j < 92 && G.fbm(i / 14, j / 14, FIXED + 5, 2) + (i - 176) / 200 + (92 - j) / 200 > 0.5;

  W.ROADS = [['hollowbrook', 'ravenhold'], ['ravenhold', 'thornwick'], ['ravenhold', 'ashford'], ['ashford', 'emberfall'], ['ashford', 'duskport'], ['duskport', 'mirefen'], ['hollowbrook', 'mirefen'], ['emberfall', 'spire']];

  W.gen = function (seed) {
    W.seed = seed;
    W.h = new Float32Array(VN * VN);
    W.type = new Uint8Array(N * N);
    W.road = new Uint8Array(N * N);
    W.town = new Uint8Array(N * N); // town index + 1
    W.colliders = new Map(); // grid of 8x8 unit buckets
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) W.h[j * VN + i] = baseHeight(i, j);
    // towns: flatten
    G.TOWNS.forEach((t, k) => {
      let sum = 0, n = 0;
      for (let j = -t.r; j <= t.r; j++) for (let i = -t.r; i <= t.r; i++) { sum += W.hAt(t.x + i, t.z + j); n++; }
      t.h = Math.max(2.5, sum / n);
      const R = t.r + 7;
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
        const X = t.x + i, Z = t.z + j;
        if (X < 0 || Z < 0 || X > N || Z > N) continue;
        const d = Math.max(Math.abs(i), Math.abs(j));
        const k2 = G.smooth(G.clamp((R - d) / 7, 0, 1));
        W.h[Z * VN + X] = G.lerp(W.h[Z * VN + X], t.h, k2);
        if (d < t.r + 1 && X < N && Z < N) W.town[Z * N + X] = k + 1;
      }
    });
    // special sites flatten
    for (const k in G.SITES) {
      const s = G.SITES[k];
      s.h = Math.max(2, W.hAt(s.x, s.z));
      for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) { const d = Math.max(Math.abs(i), Math.abs(j)); const k2 = G.smooth(G.clamp((8 - d) / 4, 0, 1)); const X = s.x + i, Z = s.z + j; W.h[Z * VN + X] = G.lerp(W.h[Z * VN + X], s.h, k2); }
    }
    // roads
    const pos = (id) => { const t = G.townById(id); return t ? [t.x, t.z] : [G.SITES[id].x, G.SITES[id].z]; };
    for (const [a, b] of W.ROADS) {
      const [x0, z0] = pos(a), [x1, z1] = pos(b);
      const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(len * 2);
      const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const wob = Math.sin(t * Math.PI) * (G.noise(t * 4, a.length, FIXED + 9) - 0.5) * len * 0.3;
        const cx = x0 + (x1 - x0) * t + nx * wob, cz = z0 + (z1 - z0) * t + nz * wob;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const I = Math.round(cx + di * 0.6), J = Math.round(cz + dj * 0.6);
          if (I < 0 || J < 0 || I >= N || J >= N) continue;
          W.road[J * N + I] = 1;
        }
      }
    }
    // smooth heights along roads, raise causeways over water
    const H2 = W.h.slice();
    for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) {
      if (!(W.road[j * N + i] || W.road[(j - 1) * N + i] || W.road[j * N + i - 1] || W.road[(j - 1) * N + i - 1])) continue;
      let s = 0;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) s += H2[G.clamp(j + dj, 0, N) * VN + G.clamp(i + di, 0, N)];
      W.h[j * VN + i] = Math.max(0.7, s / 25);
    }
    // classify cells
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = W.hAt(i, j), b = W.hAt(i + 1, j), c = W.hAt(i + 1, j + 1), d = W.hAt(i, j + 1);
      const h = (a + b + c + d) / 4, slope = (Math.max(a, b, c, d) - Math.min(a, b, c, d)) / CS;
      let t;
      const n = G.fbm(i / 18, j / 18, FIXED + 6, 3);
      if (W.road[j * N + i]) t = T.road;
      else if (h < 0.5) t = W.inSwamp(i, j) ? T.mud : T.sand;
      else if (slope > 0.85) t = T.rock;
      else if ((h > 30 && j < 120) || (j < 58 && h > 13)) t = T.snow;
      else if (W.inWaste(i, j)) t = T.ash;
      else if (W.inSwamp(i, j)) t = n > 0.5 ? T.mud : T.grass_dead;
      else if (n > 0.58 && j > 40) t = T.forest;
      else t = G.hash2(i, j, 4) < 0.08 || n < 0.38 ? T.grass_dead : T.grass;
      W.type[j * N + i] = t;
    }
    W.genTowns();
    W.placeSites(seed);
    W.placeVegetation();
  };

  // ---------------- dungeons, ruins, camps (seeded per game) ----------------
  const NAMES = {
    cave: [['Bleak', 'Gloom', 'Hollow', 'Black', 'Wolf', 'Mire', 'Cold', 'Rot', 'Fang', 'Grim', 'Shiver', 'Ash'], ['rock Cave', 'den Grotto', 'maw Cavern', 'fang Den', 'hollow Caves', 'deep Cave', 'stone Warren']],
    fort: [['Fort ', 'Fort ', 'Keep of ', 'Castle '], ['Grimsward', 'Blackmoor', 'Ravensgate', 'Dunmoor', 'Cinderwall', 'Ironhold', 'Vargard', 'Kessel', 'Thornwatch']],
    crypt: [['Barrow of ', 'Tomb of ', 'Crypt of ', 'Sepulchre of '], ['Ulfric', 'the Nameless', 'Old Hraeg', 'the Pale Queen', 'Saint Morn', 'the Nine', 'Bael the Hollow', 'Ysolde']],
    ruin: [['Ruins of ', 'Fallen ', 'Shattered ', 'Broken '], ['Old Ketter', 'Chapel', 'Henge', 'Hallow', 'Watch', 'Varn', 'Mill', 'Shrine']],
  };
  W.placeSites = function (seed) {
    const r = G.rng(seed);
    W.dungeons = [];
    const used = new Set();
    const ok = (i, j, minD) => {
      if (i < 20 || j < 20 || i > 212 || j > 236) return false;
      const h = W.hAt(i, j);
      if (h < 1.5 || h > 24) return false;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { if (W.road[(j + dj) * N + i + di]) return false; if (W.hAt(i + di, j + dj) < 0.8) return false; }
      if ((Math.max(W.hAt(i - 2, j), W.hAt(i + 2, j), W.hAt(i, j - 2), W.hAt(i, j + 2)) - Math.min(W.hAt(i - 2, j), W.hAt(i + 2, j), W.hAt(i, j - 2), W.hAt(i, j + 2))) > 4) return false;
      for (const t of G.TOWNS) if (Math.hypot(t.x - i, t.z - j) < t.r + 14) return false;
      for (const k in G.SITES) if (Math.hypot(G.SITES[k].x - i, G.SITES[k].z - j) < 16) return false;
      for (const d of W.dungeons) if (Math.hypot(d.i - i, d.j - j) < minD) return false;
      return true;
    };
    const hb = G.townById('hollowbrook');
    const add = (kind, count) => {
      for (let n = 0, tries = 0; n < count && tries < 6000; tries++) {
        const i = r.int(20, 212), j = r.int(20, 236);
        if (!ok(i, j, 15)) continue;
        let name;
        do { const p = NAMES[kind]; name = r.pick(p[0]) + r.pick(p[1]); } while (used.has(name));
        used.add(name);
        const lvl = G.clamp(Math.round(1 + Math.hypot(i - hb.x, j - hb.z) / 15), 1, 13);
        W.dungeons.push({ id: 'd' + W.dungeons.length, kind, i, j, x: i * CS + 2, z: j * CS + 2, y: W.hAt(i, j), name, lvl, face: r() * Math.PI * 2, seed: r.int(1, 1e9) });
        n++;
      }
    };
    add('cave', 8); add('fort', 7); add('crypt', 8); add('ruin', 9);
    // the fixed final dungeon
    const sp = G.SITES.spire;
    W.dungeons.push({ id: 'spire', kind: 'spire', i: sp.x, j: sp.z, x: sp.x * CS + 2, z: sp.z * CS + 2, y: sp.h, name: 'The Ashen Spire', lvl: 15, face: Math.PI, seed: seed ^ 0x5151, fixed: true });
    // quests reserve dungeons, in story order
    W.questDungeon = {};
    for (const qid of G.QUEST_ORDER) {
      const q = G.QUESTS[qid];
      for (const o of q.obj) {
        if (!o.dungeon) continue;
        if (o.dungeon.kind === 'spire') { W.questDungeon[qid] = 'spire'; continue; }
        const t = G.townById(o.dungeon.near);
        const cand = W.dungeons.filter((d) => d.kind === o.dungeon.kind && !d.quest).sort((a, b) => Math.hypot(a.i - t.x, a.j - t.z) - Math.hypot(b.i - t.x, b.j - t.z));
        if (!cand.length) continue;
        const d = cand[0];
        d.quest = qid;
        d.boss = o.boss || null;
        d.lvl = { mq4: 5, mq6: 8, mq7: 9, mq8: 9, sq_ledger: 3, sq_bounty: 5, sq_bell: 6, sq_barrow: 6, sq_lantern: 2 }[qid] || d.lvl;
        W.questDungeon[qid] = d.id;
      }
    }
    // bandit camps along roads and creature dens
    W.spawns = [];
    const roadCells = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (W.road[j * N + i]) roadCells.push([i, j]);
    const nearTown = (i, j, pad) => G.TOWNS.some((t) => Math.hypot(t.x - i, t.z - j) < t.r + pad);
    for (let n = 0, tries = 0; n < 9 && tries < 800; tries++) {
      const [ri, rj] = r.pick(roadCells);
      const a = r() * Math.PI * 2, i = Math.round(ri + Math.cos(a) * 6), j = Math.round(rj + Math.sin(a) * 6);
      if (nearTown(i, j, 16) || W.hAt(i, j) < 1 || W.road[j * N + i] || W.spawns.some((s) => Math.hypot(s.i - i, s.j - j) < 20)) continue;
      const lvl = G.clamp(Math.round(1 + Math.hypot(i - hb.x, j - hb.z) / 18), 1, 10);
      W.spawns.push({ id: 's' + W.spawns.length, i, j, camp: true, list: lvl > 4 ? ['bandit', 'bandit', 'bandit_brute'] : ['bandit', 'bandit'], lvl });
      n++;
    }
    const den = (count, list, filter, extra) => {
      for (let n = 0, tries = 0; n < count && tries < 3000; tries++) {
        const i = r.int(18, 214), j = r.int(18, 238);
        if (W.hAt(i, j) < 1 || nearTown(i, j, 12) || !filter(i, j) || W.spawns.some((s) => Math.hypot(s.i - i, s.j - j) < 12)) continue;
        W.spawns.push(Object.assign({ id: 's' + W.spawns.length, i, j, list: list.slice(), lvl: G.clamp(Math.round(1 + Math.hypot(i - hb.x, j - hb.z) / 18), 1, 12) }, extra || {}));
        n++;
      }
    };
    den(16, ['wolf', 'wolf'], (i, j) => W.cellType(i, j) === T.forest || W.cellType(i, j) === T.grass);
    den(5, ['dire_wolf', 'wolf'], (i, j) => j < 90);
    den(3, ['troll'], (i, j) => W.hAt(i, j) > 14);
    den(10, ['ghoul', 'ghoul'], (i, j) => W.cellType(i, j) !== T.snow, { night: true });
    den(4, ['wraith'], (i, j) => W.inWaste(i, j), { night: true });
    den(4, ['ashen_knight'], (i, j) => W.inWaste(i, j) && i > 195);
    den(6, ['rat', 'rat', 'rat'], (i, j) => W.inSwamp(i, j));
    den(4, ['spider', 'spider'], (i, j) => W.cellType(i, j) === T.forest);
    // collectible plants (respawning)
    W.plants = [];
    for (let n = 0, tries = 0; n < 70 && tries < 6000; tries++) {
      const i = r.int(10, 240), j = r.int(10, 245), t = W.cellType(i, j);
      if (t === T.forest && W.plants.filter((p) => p.kind === 'nightshade').length < 45) W.plants.push({ id: 'p' + n, kind: 'nightshade', x: i * CS + r() * CS, z: j * CS + r() * CS });
      else if (t === T.mud && W.inSwamp(i, j)) W.plants.push({ id: 'p' + n, kind: 'lotus', x: i * CS + r() * CS, z: j * CS + r() * CS });
      else continue;
      n++;
    }
  };

  // ---------------- vegetation ----------------
  W.placeVegetation = function () {
    W.veg = [];
    const r = G.rng(FIXED + 10);
    const blocked = (i, j) => W.road[j * N + i] || W.town[j * N + i] || W.dungeons.some((d) => Math.abs(d.i - i) < 4 && Math.abs(d.j - j) < 4) || Object.values(G.SITES).some((s) => Math.abs(s.x - i) < 7 && Math.abs(s.z - j) < 7);
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const t = W.type[j * N + i];
      if (blocked(i, j) || W.hAt(i, j) < 0.4) continue;
      const add = (kind, p, w, h, col) => {
        if (r() >= p) return false;
        const x = i * CS + 0.5 + r() * (CS - 1), z = j * CS + 0.5 + r() * (CS - 1);
        const s = 0.8 + r() * 0.5;
        W.veg.push({ kind, x, z, y: W.groundH(x, z), w: w * s, h: h * s });
        if (col) W.addCollider({ x, z, r: col });
        return true;
      };
      if (t === T.forest) { add('pine' + r.int(0, 2), 0.55, 2.6, 5, 0.4) || add('bush', 0.2, 1.5, 0.95) || add('tuft', 0.3, 0.9, 0.55); }
      else if (t === T.grass) { add('oak' + r.int(0, 2), 0.035, 3.6, 4.4, 0.45) || add('pine' + r.int(0, 2), 0.03, 2.6, 5, 0.4) || add('bush', 0.04, 1.5, 0.95) || add('boulder', 0.012, 1.8, 1.25, 0.8) || add('tuft', 0.12, 0.9, 0.55); }
      else if (t === T.grass_dead) { add('deadtree' + r.int(0, 2), 0.04, 3.2, 4.5, 0.35) || add('bush', 0.03, 1.5, 0.95) || add('tuft', 0.1, 0.9, 0.55) || add('stump', 0.01, 1.1, 0.65); }
      else if (t === T.snow) { add('pine' + r.int(0, 2), 0.09, 2.6, 5, 0.4) || add('boulder2', 0.025, 1.8, 1.25, 0.8); }
      else if (t === T.rock) { add('boulder', 0.04, 2.2, 1.5, 0.95); }
      else if (t === T.ash) { add('deadtree' + r.int(0, 2), 0.06, 3.2, 4.5, 0.35) || add('boulder2', 0.015, 1.8, 1.25, 0.8) || add('bones', 0.008, 1.2, 0.5); }
      else if (t === T.mud) { add('deadtree' + r.int(0, 2), 0.05, 3.2, 4.5, 0.35) || add('tuft', 0.15, 0.9, 0.55); }
    }
  };
  // colliders: circles {x,z,r} or boxes {x0,z0,x1,z1}
  W.addCollider = function (c) {
    const x0 = c.r ? c.x - c.r : c.x0, x1 = c.r ? c.x + c.r : c.x1, z0 = c.r ? c.z - c.r : c.z0, z1 = c.r ? c.z + c.r : c.z1;
    for (let gz = Math.floor(z0 / 8); gz <= Math.floor(z1 / 8); gz++) for (let gx = Math.floor(x0 / 8); gx <= Math.floor(x1 / 8); gx++) {
      const k = gz * 1000 + gx;
      let b = W.colliders.get(k);
      if (!b) W.colliders.set(k, (b = []));
      b.push(c);
    }
  };
  W.collidersNear = function (x, z) {
    const out = [];
    const gx = Math.floor(x / 8), gz = Math.floor(z / 8);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const b = W.colliders.get((gz + dz) * 1000 + gx + dx); if (b) for (const c of b) out.push(c); }
    return out;
  };

  // ---------------- meshes ----------------
  const SUN = (() => { const v = [-0.45, 0.8, -0.35]; const l = Math.hypot(...v); return v.map((a) => a / l); })();
  W.SUN = SUN;
  W.shadeAt = function (i, j) {
    const hx = W.hAt(i + 1, j) - W.hAt(i - 1, j), hz = W.hAt(i, j + 1) - W.hAt(i, j - 1);
    const n = [-hx, 2 * CS, -hz], l = Math.hypot(...n);
    const d = (n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]) / l;
    return 0.42 + 0.62 * Math.max(0, d);
  };
  W.buildMeshes = function () {
    const meshes = [];
    const CH = 16;
    const R = G.tex.r;
    for (let cz = 0; cz < N / CH; cz++) for (let cx = 0; cx < N / CH; cx++) {
      const b = new G.gfx.Builder();
      for (let j = cz * CH; j < (cz + 1) * CH; j++) for (let i = cx * CH; i < (cx + 1) * CH; i++) {
        const t = W.type[j * N + i];
        const rect = R(TEX[t]);
        const p = [[i * CS, W.hAt(i, j), j * CS], [(i + 1) * CS, W.hAt(i + 1, j), j * CS], [(i + 1) * CS, W.hAt(i + 1, j + 1), (j + 1) * CS], [i * CS, W.hAt(i, j + 1), (j + 1) * CS]];
        const s = [W.shadeAt(i, j), W.shadeAt(i + 1, j), W.shadeAt(i + 1, j + 1), W.shadeAt(i, j + 1)].map((v) => [v, v, v]);
        const u0 = (i % 4) * 2, v0 = (j % 4) * 2;
        b.quad(p, rect, [[u0, v0], [u0 + 2, v0], [u0 + 2, v0 + 2], [u0, v0 + 2]], s, 0);
        if (Math.min(p[0][1], p[1][1], p[2][1], p[3][1]) < W.WATER) {
          const y = W.WATER;
          b.quad([[i * CS, y, j * CS], [(i + 1) * CS, y, j * CS], [(i + 1) * CS, y, (j + 1) * CS], [i * CS, y, (j + 1) * CS]], R('water'), [[0, 0], [1, 0], [1, 1], [0, 1]], [0.9, 0.95, 1], 3);
        }
      }
      for (const v of W.veg) {
        if (Math.floor(v.x / (CH * CS)) !== cx || Math.floor(v.z / (CH * CS)) !== cz) continue;
        b.sprite(v.x, v.y - 0.1, v.z, v.w, v.h, R(v.kind), [1, 1, 1], 0, G.hash2(v.x | 0, v.z | 0, 1) > 0.5);
      }
      meshes.push(b.build());
    }
    // the sea beyond the map edge
    const sea = new G.gfx.Builder();
    for (let z = -256; z < W.SIZE + 256; z += 64) for (let x = W.SIZE - 200; x < W.SIZE + 512; x += 64) sea.quad([[x, -0.05, z], [x + 64, -0.05, z], [x + 64, -0.05, z + 64], [x, -0.05, z + 64]], R('water'), [[0, 0], [16, 0], [16, 16], [0, 16]], [0.9, 0.95, 1], 3);
    meshes.push(sea.build());
    return meshes.concat(W.buildTownMeshes()).concat(W.siteMeshes()).filter(Boolean);
  };
})(window.G);
