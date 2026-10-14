'use strict';
// Town layouts (streets, houses, walls, NPC posts) and structures at dungeon sites.
(function (G) {
  const W = G.world;
  const CS = W.CS, N = W.N;
  W.lights = [];
  W.interact = []; // static interactables: dungeon doors, chests at ruins, signposts

  // ======================= towns =======================
  W.genTowns = function () {
    W.lights = [];
    W.interact = [];
    W.towns = G.TOWNS.map((t, k) => layout(t, k));
  };
  function layout(t, k) {
    const r = G.rng(G.hashStr(t.id));
    const cx = t.x * CS + 2, cz = t.z * CS + 2, R = t.r * CS, Y = t.h;
    const L = { t, cx, cz, R, y: Y, buildings: [], boxes: [], props: [], posts: {}, walls: [] };
    // ground
    for (let j = -t.r; j <= t.r; j++) for (let i = -t.r; i <= t.r; i++) {
      const I = t.x + i, J = t.z + j;
      const street = Math.abs(i) <= 1 || Math.abs(j) <= 1, plaza = Math.max(Math.abs(i), Math.abs(j)) <= 3;
      W.type[J * N + I] = plaza ? (t.major ? W.T.flagstone : W.T.cobble) : street ? (t.major ? W.T.cobble : W.T.road) : t.snow ? W.T.snow : t.major ? W.T.dirt : W.T.grass;
    }
    // lots
    const lot = 15;
    const lots = [];
    for (let lz = -R + 4; lz + lot <= R - 2; lz += lot) for (let lx = -R + 4; lx + lot <= R - 2; lx += lot) {
      const mx = lx + lot / 2, mz = lz + lot / 2;
      if (Math.abs(mx) < 6 + lot / 2 - 1 || Math.abs(mz) < 6 + lot / 2 - 1) continue;
      if (Math.max(Math.abs(mx), Math.abs(mz)) < 16) continue;
      lots.push({ lx, lz, mx, mz, d: Math.hypot(mx, mz) });
    }
    lots.sort((a, b) => a.d - b.d);
    const people = Object.values(G.NPCS).filter((n) => n.town === t.id);
    const needs = people.filter((n) => ['shop', 'inn', 'temple', 'elder', 'scholar', 'harbor'].includes(n.role));
    for (const l of lots) {
      if (t.keep && l.mz < -R * 0.25 && Math.abs(l.mx) < 26) continue; // room for the keep
      if (!t.major && r.chance(0.35) && L.buildings.length > 3) continue;
      const w = r.int(8, 11), d = r.int(8, 11);
      const x0 = cx + l.mx - w / 2 + r.range(-1.5, 1.5), z0 = cz + l.mz - d / 2 + r.range(-1.5, 1.5);
      const face = Math.abs(l.mx) < Math.abs(l.mz) ? (l.mx > 0 ? 'W' : 'E') : l.mz > 0 ? 'N' : 'S';
      const b = { x0, z0, x1: x0 + w, z1: z0 + d, h: t.major ? r.range(4.5, 6.5) : r.range(3.4, 4.5), rh: r.range(2.2, 3.4), wall: t.wall, roof: t.roof, face, role: null };
      if (t.wall === 'timber' && r.chance(0.35)) b.wall = 'plaster';
      if (t.major && r.chance(0.25)) b.wall = 'brick';
      L.buildings.push(b);
    }
    // give special buildings to the people who need them (closest to the centre first)
    const free = L.buildings.slice();
    for (const n of needs) {
      const b = free.shift();
      if (!b) break;
      b.role = n.role; b.owner = n.id;
      if (n.role === 'temple') { b.wall = 'marble'; b.roof = 'slate'; b.h += 2.5; b.rh += 1; }
      if (n.role === 'inn') { b.h += 2; b.wall = t.wall === 'brick_dark' ? 'brick_dark' : 'timber'; }
      if (n.role === 'scholar') { b.wall = 'brick_dark'; b.h += 3; }
      L.posts[n.id] = doorSpot(b, 2.2);
    }
    // every house can be entered; shopkeepers, innkeepers, priests and scholars live inside
    L.inside = new Set();
    L.buildings.forEach((b, bi) => {
      const ds = doorSpot(b, 1.0);
      if (b.owner && ['shop', 'inn', 'temple', 'scholar'].includes(b.role)) L.inside.add(b.owner);
      b.inside = b.owner && L.inside.has(b.owner) ? b.owner : null;
      W.interact.push({ kind: 'house', x: ds.x, z: ds.z, r: 1.6, town: t.id, bi, building: b });
    });
    // keep
    if (t.keep) {
      const kx0 = cx - 14, kz0 = cz - R + 6, kx1 = cx + 14, kz1 = kz0 + 20;
      L.boxes.push({ x0: kx0, z0: kz0, x1: kx1, z1: kz1, y0: Y - 1, y1: Y + 11, tex: 'brick', top: 'flagstone' });
      [[kx0 - 2, kz0 - 2], [kx1 - 4, kz0 - 2], [kx0 - 2, kz1 - 4], [kx1 - 4, kz1 - 4]].forEach(([x, z]) => L.boxes.push({ x0: x, z0: z, x1: x + 6, z1: z + 6, y0: Y - 1, y1: Y + 16, tex: 'brick', top: 'slate' }));
      L.boxes.push({ x0: cx - 3, z0: kz1, x1: cx + 3, z1: kz1 + 0.15, y0: Y, y1: Y + 4.5, tex: 'door', top: null, nocollide: true });
      L.banners = [[cx - 6, kz1 + 0.05], [cx + 6, kz1 + 0.05]];
      L.posts.captain_voss = { x: cx + 1.5, z: kz1 + 3 };
      L.keep = { x0: kx0, z0: kz0, x1: kx1, z1: kz1 };
    }
    // walls & gates
    if (t.major) {
      const H = 7, th = 1.6, gap = 7;
      const seg = (x0, z0, x1, z1) => L.boxes.push({ x0, z0, x1, z1, y0: Y - 2, y1: Y + H, tex: t.wall === 'timber' ? 'planks_v' : t.wall === 'brick_dark' ? 'brick_dark' : 'brick', top: 'flagstone', wall: true });
      const a = R + 1;
      seg(cx - a, cz - a, cx - gap, cz - a + th); seg(cx + gap, cz - a, cx + a, cz - a + th);
      seg(cx - a, cz + a - th, cx - gap, cz + a); seg(cx + gap, cz + a - th, cx + a, cz + a);
      seg(cx - a, cz - a, cx - a + th, cz - gap); seg(cx - a, cz + gap, cx - a + th, cz + a);
      seg(cx + a - th, cz - a, cx + a, cz - gap); seg(cx + a - th, cz + gap, cx + a, cz + a);
      const tower = (x, z, h) => L.boxes.push({ x0: x - 2.5, z0: z - 2.5, x1: x + 2.5, z1: z + 2.5, y0: Y - 2, y1: Y + h, tex: 'brick', top: 'flagstone' });
      [[-a, -a], [a, -a], [-a, a], [a, a]].forEach(([dx, dz]) => tower(cx + dx, cz + dz, 11));
      [[-gap - 2, -a], [gap + 2, -a], [-gap - 2, a], [gap + 2, a], [-a, -gap - 2], [-a, gap + 2], [a, -gap - 2], [a, gap + 2]].forEach(([dx, dz]) => tower(cx + dx, cz + dz, 9));
      // gate braziers & guard posts
      L.gates = [[cx, cz - a], [cx, cz + a], [cx - a, cz], [cx + a, cz]];
      L.gates.forEach(([gx, gz]) => {
        const ox = gx === cx ? 5 : (gx < cx ? 3 : -3), oz = gz === cz ? 5 : (gz < cz ? 3 : -3);
        L.props.push({ kind: 'campfire', x: gx + (gx === cx ? 5 : ox), z: gz + (gz === cz ? 5 : oz), light: true });
      });
    }
    // plaza
    L.boxes.push({ x0: cx - 1.4, z0: cz - 1.4, x1: cx + 1.4, z1: cz + 1.4, y0: Y - 0.5, y1: Y + 1.1, tex: 'brick', top: 'water' });
    L.props.push({ kind: 'signpost', x: cx + 4.5, z: cz + 4.5 });
    for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) L.props.push({ kind: 'lamppost', x: cx + dx, z: cz + dz, light: 'night' });
    for (let s = 20; s < R; s += 20) for (const [dx, dz] of [[4, s], [-4, -s], [s, -4], [-s, 4]]) L.props.push({ kind: 'lamppost', x: cx + dx, z: cz + dz, light: 'night' });
    if (!t.major) L.props.push({ kind: 'campfire', x: cx + 5, z: cz - 5, light: true });
    // market stalls in big towns
    if (t.major) for (const [dx, dz] of [[-8, 4], [8, -4]]) { L.boxes.push({ x0: cx + dx - 2, z0: cz + dz - 1, x1: cx + dx + 2, z1: cz + dz + 1, y0: Y, y1: Y + 1, tex: 'wood' }); L.boxes.push({ x0: cx + dx - 2.4, z0: cz + dz - 1.4, x1: cx + dx + 2.4, z1: cz + dz + 1.4, y0: Y + 2.6, y1: Y + 2.8, tex: 'banner', nocollide: true }); }
    // clutter near houses
    for (const b of L.buildings) if (r.chance(0.6)) { const s = doorSpot(b, 1.4); const side = r.chance(0.5) ? 1 : -1; L.props.push({ kind: r.pick(['barrel', 'crate', 'barrel']), x: s.x + (b.face === 'N' || b.face === 'S' ? side * 2.6 : 0), z: s.z + (b.face === 'E' || b.face === 'W' ? side * 2.6 : 0), solid: true }); }
    // docks
    if (t.id === 'duskport') {
      const x0 = cx + R - 2, z0 = cz - 2.5;
      L.boxes.push({ x0, z0, x1: x0 + 52, z1: z0 + 5, y0: 0.6, y1: Math.max(1.1, Y - 1.4), tex: 'wood', dock: true });
      L.posts.orrin = { x: x0 + 8, z: z0 + 2.5 }; L.posts.wenna = { x: x0 + 30, z: z0 + 2.5 };
      L.props.push({ kind: 'lamppost', x: x0 + 20, z: z0 + 4.5, light: 'night' }, { kind: 'lamppost', x: x0 + 44, z: z0 + 4.5, light: 'night' }, { kind: 'barrel', x: x0 + 12, z: z0 + 1, solid: true }, { kind: 'crate', x: x0 + 14, z: z0 + 1, solid: true });
    }
    // remaining NPC posts
    for (const n of people) {
      if (L.posts[n.id]) continue;
      if (n.role === 'guardpost') L.posts[n.id] = L.gates ? { x: L.gates[1][0] + 3, z: L.gates[1][1] - 4 } : { x: cx + 6, z: cz + 6 };
      else if (n.role === 'farmer') L.posts[n.id] = { x: cx - R + 6, z: cz + R - 8, wander: 8 };
      else L.posts[n.id] = { x: cx + r.range(-8, 8), z: cz + r.range(-8, 8), wander: 18 };
    }
    // colliders
    for (const b of L.buildings) W.addCollider({ x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 });
    for (const b of L.boxes) if (!b.nocollide && !b.dock) W.addCollider({ x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 });
    for (const p of L.props) {
      if (p.solid) W.addCollider({ x: p.x, z: p.z, r: 0.5 });
      if (p.light) W.lights.push({ x: p.x, y: W.groundH(p.x, p.z) + (p.kind === 'lamppost' ? 2.6 : 0.8), z: p.z, r: p.kind === 'lamppost' ? 11 : 13, c: p.kind === 'lamppost' ? [0.9, 0.7, 0.35] : [1, 0.55, 0.2], night: p.light === 'night', flicker: p.kind === 'campfire' });
    }
    L.signText = t.name + (t.major ? ' - a city of the old kingdom' : ' - a village');
    W.interact.push({ kind: 'sign', x: cx + 4.5, z: cz + 4.5, r: 1.6, text: t.name, desc: t.desc });
    return L;
  }
  function doorSpot(b, out) {
    const mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2;
    return { N: { x: mx, z: b.z0 - out }, S: { x: mx, z: b.z1 + out }, W: { x: b.x0 - out, z: mz }, E: { x: b.x1 + out, z: mz } }[b.face];
  }
  W.doorSpot = doorSpot;

  // ======================= meshes =======================
  const R = (n) => G.tex.r(n);
  function house(B, b, Y) {
    const wt = R(b.wall);
    B.box(b.x0, Y - 1.5, b.z0, b.x1, Y + b.h, b.z1, { side: wt, top: null, bottom: null }, [1, 1, 1], 0, 2.5);
    const yt = Y + b.h, o = 0.5;
    const alongX = b.x1 - b.x0 >= b.z1 - b.z0;
    const rt = R(b.roof);
    const yr = yt + b.rh;
    if (alongX) {
      const zm = (b.z0 + b.z1) / 2, L = (b.x1 - b.x0 + 2 * o) / 2, S = Math.hypot(b.rh, (b.z1 - b.z0) / 2 + o) / 2;
      B.quad([[b.x0 - o, yt - 0.3, b.z0 - o], [b.x1 + o, yt - 0.3, b.z0 - o], [b.x1 + o, yr, zm], [b.x0 - o, yr, zm]], rt, [[0, S], [L, S], [L, 0], [0, 0]], [0.62, 0.62, 0.62], 0);
      B.quad([[b.x0 - o, yt - 0.3, b.z1 + o], [b.x1 + o, yt - 0.3, b.z1 + o], [b.x1 + o, yr, zm], [b.x0 - o, yr, zm]], rt, [[0, S], [L, S], [L, 0], [0, 0]], [0.95, 0.95, 0.95], 0);
      for (const x of [b.x0, b.x1]) B.quad([[x, yt, b.z0], [x, yt, b.z1], [x, yr, zm], [x, yr, zm]], wt, [[0, 1], [(b.z1 - b.z0) / 2.5, 1], [(b.z1 - b.z0) / 5, 0], [(b.z1 - b.z0) / 5, 0]], [0.75, 0.75, 0.75], 0);
    } else {
      const xm = (b.x0 + b.x1) / 2, L = (b.z1 - b.z0 + 2 * o) / 2, S = Math.hypot(b.rh, (b.x1 - b.x0) / 2 + o) / 2;
      B.quad([[b.x0 - o, yt - 0.3, b.z0 - o], [b.x0 - o, yt - 0.3, b.z1 + o], [xm, yr, b.z1 + o], [xm, yr, b.z0 - o]], rt, [[0, S], [L, S], [L, 0], [0, 0]], [0.8, 0.8, 0.8], 0);
      B.quad([[b.x1 + o, yt - 0.3, b.z0 - o], [b.x1 + o, yt - 0.3, b.z1 + o], [xm, yr, b.z1 + o], [xm, yr, b.z0 - o]], rt, [[0, S], [L, S], [L, 0], [0, 0]], [0.7, 0.7, 0.7], 0);
      for (const z of [b.z0, b.z1]) B.quad([[b.x0, yt, z], [b.x1, yt, z], [xm, yr, z], [xm, yr, z]], wt, [[0, 1], [(b.x1 - b.x0) / 2.5, 1], [(b.x1 - b.x0) / 5, 0], [(b.x1 - b.x0) / 5, 0]], [0.8, 0.8, 0.8], 0);
    }
    // door & windows
    const e = 0.04;
    const face = (side, along, y0, y1, w, tex) => {
      const t = R(tex), s = side === 'N' || side === 'E' ? 0.75 : 0.95;
      if (side === 'N') B.quad([[along - w / 2, y0, b.z0 - e], [along + w / 2, y0, b.z0 - e], [along + w / 2, y1, b.z0 - e], [along - w / 2, y1, b.z0 - e]], t, [[0, 1], [1, 1], [1, 0], [0, 0]], [s, s, s], 0);
      if (side === 'S') B.quad([[along - w / 2, y0, b.z1 + e], [along + w / 2, y0, b.z1 + e], [along + w / 2, y1, b.z1 + e], [along - w / 2, y1, b.z1 + e]], t, [[0, 1], [1, 1], [1, 0], [0, 0]], [s, s, s], 0);
      if (side === 'W') B.quad([[b.x0 - e, y0, along - w / 2], [b.x0 - e, y0, along + w / 2], [b.x0 - e, y1, along + w / 2], [b.x0 - e, y1, along - w / 2]], t, [[0, 1], [1, 1], [1, 0], [0, 0]], [s, s, s], 0);
      if (side === 'E') B.quad([[b.x1 + e, y0, along - w / 2], [b.x1 + e, y0, along + w / 2], [b.x1 + e, y1, along + w / 2], [b.x1 + e, y1, along - w / 2]], t, [[0, 1], [1, 1], [1, 0], [0, 0]], [s, s, s], 0);
    };
    const mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2;
    const alongOf = (s) => (s === 'N' || s === 'S' ? mx : mz);
    face(b.face, alongOf(b.face), Y, Y + 2.6, 1.7, 'door');
    const lit = G.hash2(b.x0 | 0, b.z0 | 0, 3) < 0.55 ? 'window_lit' : 'window';
    for (const s of ['N', 'S', 'E', 'W']) {
      const len = s === 'N' || s === 'S' ? b.x1 - b.x0 : b.z1 - b.z0;
      const base = alongOf(s);
      const rows = b.h > 5.5 ? [Y + 1.6, Y + 4] : [Y + 1.6];
      for (const wy of rows) for (const off of [-len / 3, len / 3]) {
        if (s === b.face && wy < Y + 3 && Math.abs(off) < 1.6) continue;
        face(s, base + off, wy, wy + 1.2, 1.2, lit);
      }
      if (s !== b.face && b.h <= 5.5) face(s, base, Y + 1.6, Y + 2.8, 1.2, lit);
    }
  }
  W.buildTownMeshes = function () {
    const out = [];
    for (const L of W.towns) {
      const B = new G.gfx.Builder();
      for (const b of L.buildings) house(B, b, L.y);
      for (const b of L.boxes) {
        const tex = { side: R(b.tex), top: b.top === null ? null : R(b.top || b.tex) };
        B.box(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, tex, [1, 1, 1], 0, b.tex === 'door' || b.tex === 'banner' ? 100 : 2.5);
        if (b.tex === 'door') B.box(b.x0, b.y0, b.z0 - 0.01, b.x1, b.y1, b.z1, { side: R('door'), top: null, bottom: null }, [1, 1, 1], 0, 6);
      }
      for (const [x, z] of L.banners || []) B.quad([[x - 1.2, L.y + 3, z], [x + 1.2, L.y + 3, z], [x + 1.2, L.y + 8, z], [x - 1.2, L.y + 8, z]], R('banner'), [[0, 1], [1, 1], [1, 0], [0, 0]], [1, 1, 1], 0);
      const PS = { barrel: [0.9, 1.2], crate: [1.1, 1.1], signpost: [1.1, 1.6], lamppost: [0.7, 3.2], campfire: [1.4, 1.3] };
      for (const p of L.props) { if (p.kind === 'campfire') continue; const [w, h] = PS[p.kind]; B.sprite(p.x, W.groundH(p.x, p.z), p.z, w, h, R(p.kind), [1, 1, 1], p.kind === 'lamppost' ? 0 : 0); }
      out.push(B.build());
    }
    return out;
  };

  // ======================= dungeon sites =======================
  W.siteMeshes = function () {
    const B = new G.gfx.Builder();
    W.siteProps = [];
    const rock = R('rock'), brick = R('brick_dark'), flag = R('flagstone'), dark = R('cave');
    const doorQuad = (x, y, z, ang, w, h, tex, shade) => {
      const dx = Math.cos(ang) * w / 2, dz = Math.sin(ang) * w / 2;
      B.quad([[x - dx, y, z - dz], [x + dx, y, z + dz], [x + dx, y + h, z + dz], [x - dx, y + h, z - dz]], R(tex), [[0, 1], [1, 1], [1, 0], [0, 0]], [shade, shade, shade], 1);
    };
    for (const d of W.dungeons) {
      const r = G.rng(d.seed);
      const y = W.groundH(d.x, d.z);
      d.y = y;
      // entrances face one of four directions
      const q = Math.round(d.face / (Math.PI / 2)) & 3;
      const fx = [0, 1, 0, -1][q], fz = [1, 0, -1, 0][q];
      const box = (x0, z0, x1, z1, y0, y1, side, top, col) => { B.box(x0, y0, z0, x1, y1, z1, { side, top }, [1, 1, 1], 0, 2.5); if (col !== false) W.addCollider({ x0, z0, x1, z1 }); };
      if (d.kind === 'cave') {
        const s = 4.5;
        box(d.x - s, d.z - s, d.x + s, d.z + s, y - 2, y + 5, rock, rock);
        box(d.x - s - 2, d.z - s + 1, d.x - s + 1, d.z + s - 2, y - 2, y + 3.4, rock, rock);
        box(d.x + s - 1, d.z - s + 2, d.x + s + 2, d.z + s - 1, y - 2, y + 3, rock, rock);
        const ex = d.x + fx * (s + 0.06), ez = d.z + fz * (s + 0.06);
        doorQuad(ex, y, ez, Math.atan2(fz, fx) + Math.PI / 2, 2.8, 3, 'cave', 0.04);
        d.door = { x: d.x + fx * (s + 1.5), z: d.z + fz * (s + 1.5) };
      } else if (d.kind === 'crypt' || d.kind === 'fort' || d.kind === 'spire') {
        const big = d.kind === 'fort' ? 6 : d.kind === 'spire' ? 7 : 3.4, hgt = d.kind === 'fort' ? 9 : d.kind === 'spire' ? 10 : 4.5;
        const side = d.kind === 'spire' ? R('brick_dark') : d.kind === 'fort' ? R('brick') : brick;
        box(d.x - big, d.z - big, d.x + big, d.z + big, y - 2, y + hgt, side, flag);
        if (d.kind === 'fort') {
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(d.x + a * big - 2, d.z + b * big - 2, d.x + a * big + 2, d.z + b * big + 2, y - 2, y + hgt + 3 + r.range(-2, 1), side, flag));
          for (let k = 0; k < 7; k++) { const a = r() * Math.PI * 2, rr = big + 6 + r() * 3, wx = d.x + Math.cos(a) * rr, wz = d.z + Math.sin(a) * rr; if (Math.abs(Math.cos(a) - fx) < 0.6 && Math.abs(Math.sin(a) - fz) < 0.6) continue; box(wx - 2, wz - 0.7, wx + 2, wz + 0.7, y - 1, y + r.range(1, 4), side, flag); }
        }
        if (d.kind === 'spire') {
          let s = big - 1.5, yy = y + hgt;
          for (let k = 0; k < 4; k++) { const hh = 9 + k * 2; box(d.x - s, d.z - s, d.x + s, d.z + s, yy, yy + hh, side, flag, false); yy += hh; s *= 0.68; }
          for (let k = 0; k < 4; k++) W.lights.push({ x: d.x + [1, -1, 0, 0][k] * 9, y: y + 1, z: d.z + [0, 0, 1, -1][k] * 9, r: 14, c: [1, 0.35, 0.1], flicker: true });
        }
        if (d.kind === 'crypt') for (let k = 0; k < 7; k++) { const a = r() * Math.PI * 2, rr = 6 + r() * 5; W.siteProps.push({ kind: 'gravestone', x: d.x + Math.cos(a) * rr, z: d.z + Math.sin(a) * rr, w: 0.8, h: 1.1 }); }
        const ex = d.x + fx * (big + 0.06), ez = d.z + fz * (big + 0.06);
        doorQuad(ex, y, ez, Math.atan2(fz, fx) + Math.PI / 2, d.kind === 'crypt' ? 2 : 3, d.kind === 'crypt' ? 2.8 : 3.8, d.kind === 'spire' ? 'bars' : 'door', 0.55);
        d.door = { x: d.x + fx * (big + 1.5), z: d.z + fz * (big + 1.5) };
        W.lights.push({ x: d.door.x + fz * 2, y: y + 1.6, z: d.door.z - fx * 2, r: 9, c: [1, 0.6, 0.25], flicker: true });
        W.siteProps.push({ kind: 'torch0', x: d.door.x + fz * 2, z: d.door.z - fx * 2, w: 0.4, h: 0.9, yoff: 1.2, glow: true });
      } else if (d.kind === 'ruin') {
        for (let k = 0; k < 10; k++) {
          const a = k / 10 * Math.PI * 2, rr = 7, wx = d.x + Math.cos(a) * rr, wz = d.z + Math.sin(a) * rr;
          if (r.chance(0.3)) continue;
          const hh = r.range(0.8, 4.5);
          box(wx - 1.6, wz - 1.6, wx + 1.6, wz + 1.6, y - 1, y + hh, brick, flag);
        }
        W.siteProps.push({ kind: 'bones', x: d.x + 2, z: d.z - 1, w: 1.3, h: 0.5 }, { kind: 'urn', x: d.x - 2, z: d.z + 2, w: 0.6, h: 0.8 });
        d.chest = { x: d.x, z: d.z };
        d.door = null;
      }
      if (d.door) W.interact.push({ kind: 'door', x: d.door.x, z: d.door.z, r: 2.4, dungeon: d.id });
    }
    // watchtower
    const wt = G.SITES.watchtower, wx = wt.x * CS + 2, wz = wt.z * CS + 2, wy = W.groundH(wx, wz);
    B.box(wx - 3, wy - 1, wz - 3, wx + 3, wy + 13, wz + 3, { side: R('brick'), top: R('ash') }, [0.7, 0.66, 0.62], 0, 2.5);
    W.addCollider({ x0: wx - 3, z0: wz - 3, x1: wx + 3, z1: wz + 3 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3, x = wx + Math.cos(a) * 9, z = wz + Math.sin(a) * 9, h = 1 + G.hash2(k, 3, 9) * 3; B.box(x - 1.4, wy - 1, z - 1.4, x + 1.4, wy + h, z + 1.4, { side: R('brick'), top: R('flagstone') }, [0.7, 0.66, 0.62], 0, 2.5); W.addCollider({ x0: x - 1.4, z0: z - 1.4, x1: x + 1.4, z1: z + 1.4 }); }
    W.lights.push({ x: wx + 5, y: wy + 0.8, z: wz + 5, r: 12, c: [1, 0.5, 0.2], flicker: true });
    W.siteProps.push({ kind: 'campfire0', x: wx + 5, z: wz + 5, w: 1.4, h: 1.3, glow: true, anim: 'campfire' });
    // camps
    for (const s of W.spawns) {
      if (!s.camp) continue;
      const x = s.i * CS + 2, z = s.j * CS + 2, y = W.groundH(x, z);
      W.lights.push({ x, y: y + 0.8, z, r: 12, c: [1, 0.5, 0.2], flicker: true });
      W.siteProps.push({ kind: 'campfire0', x, z, w: 1.4, h: 1.3, glow: true, anim: 'campfire' });
      for (const a of [0.6, 2.8, 4.6]) {
        const tx = x + Math.cos(a) * 5, tz = z + Math.sin(a) * 5, ty = W.groundH(tx, tz);
        const ca = Math.cos(a + Math.PI / 2) * 1.6, sa = Math.sin(a + Math.PI / 2) * 1.6, ox = Math.cos(a) * 1.2, oz = Math.sin(a) * 1.2;
        B.quad([[tx - ca - ox, ty, tz - sa - oz], [tx + ca - ox, ty, tz + sa - oz], [tx + ca, ty + 2, tz + sa], [tx - ca, ty + 2, tz - sa]], R('thatch'), [[0, 1], [1, 1], [1, 0], [0, 0]], [0.8, 0.8, 0.8], 0);
        B.quad([[tx - ca + ox, ty, tz - sa + oz], [tx + ca + ox, ty, tz + sa + oz], [tx + ca, ty + 2, tz + sa], [tx - ca, ty + 2, tz - sa]], R('thatch'), [[0, 1], [1, 1], [1, 0], [0, 0]], [0.6, 0.6, 0.6], 0);
        W.addCollider({ x: tx, z: tz, r: 1.2 });
      }
      s.chest = { x: x + 2.5, z: z - 2 };
    }
    for (const p of W.siteProps) { if (p.anim) continue; p.y = W.groundH(p.x, p.z) + (p.yoff || 0); B.sprite(p.x, p.y, p.z, p.w, p.h, R(p.kind), [1, 1, 1], p.glow ? 2 : 0); }
    return [B.build()];
  };
})(window.G);
