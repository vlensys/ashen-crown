'use strict';
// Building interiors. Each house in a town can be entered; shops, inns, temples and the homes of
// quest-givers have their owner inside. Layouts are generated in a "canonical" frame with the door
// at the bottom, then rotated to match the side the real door is on.
(function (G) {
  const IN = (G.interior = {});
  const CELL = 2;

  IN.name = function (L, b) {
    if (!b.owner) return 'House';
    const n = G.NPCS[b.owner];
    return n.title ? n.title : n.role === 'elder' ? n.name + '\'s home' : n.role === 'scholar' ? 'The Archive' : n.name + '\'s house';
  };

  IN.generate = function (L, bi) {
    const b = L.buildings[bi], t = L.t;
    const r = G.rng(G.hashStr(t.id + ':' + bi));
    const owner = b.owner ? G.NPCS[b.owner] : null;
    const role = owner ? (owner.shop === 'inn' ? 'inn' : owner.role === 'temple' ? 'temple' : owner.shop === 'smith' ? 'smith' : owner.shop ? 'shop' : owner.role === 'scholar' ? 'library' : 'home') : 'home';
    const sideX = b.face === 'N' || b.face === 'S';
    const cw = Math.max(4, Math.round((sideX ? b.x1 - b.x0 : b.z1 - b.z0) / CELL)) + (role === 'inn' || role === 'temple' ? 1 : 0);
    const cd = Math.max(4, Math.round((sideX ? b.z1 - b.z0 : b.x1 - b.x0) / CELL)) + (role === 'inn' || role === 'temple' ? 1 : 0);
    const gw = sideX ? cw + 2 : cd + 2, gh = sideX ? cd + 2 : cw + 2;
    const grid = new Uint8Array(gw * gh);
    // canonical (u along the door wall, v from back wall to door) -> grid cells
    const map = (u, v) => {
      if (b.face === 'S') return [u, v];
      if (b.face === 'N') return [cw + 2 - u, cd + 2 - v];
      if (b.face === 'W') return [cd + 2 - v, u];
      return [v, cw + 2 - u];
    };
    const P = (u, v) => { const [x, z] = map(u, v); return { x: x * CELL, z: z * CELL }; };
    for (let v = 1; v <= cd; v++) for (let u = 1; u <= cw; u++) { const [x, y] = map(u + 0.5, v + 0.5); grid[Math.floor(y) * gw + Math.floor(x)] = 1; }
    const wallTex = role === 'temple' ? 'brick' : b.wall === 'brick' || b.wall === 'brick_dark' ? b.wall : b.wall === 'planks_v' ? 'planks_v' : r.chance(0.5) ? 'timber' : 'plaster';
    const th = { wall: wallTex, floor: role === 'temple' ? 'flagstone' : 'wood', ceil: 'ceiling', h: role === 'temple' ? 6 : 4, amb: role === 'temple' ? [0.3, 0.29, 0.28] : [0.27, 0.22, 0.18], fog: [0.05, 0.04, 0.03] };
    const at = (x, y) => (x < 0 || y < 0 || x >= gw || y >= gh ? 0 : grid[y * gw + x]);
    const Lv = { kind: 'interior', th, w: gw, h: gh, grid, cell: CELL, at, rooms: [{ x0: 0, y0: 0, x1: gw, y1: gh }], props: [], lights: [], chests: [], spawns: [], ores: [], solids: [], boxes: [], exitTex: 'door', people: [] };
    // door / exit on the canonical bottom wall
    const du = Math.floor(cw / 2) + 1;
    const dOut = { S: [0, 1], N: [0, -1], W: [-1, 0], E: [1, 0] }[b.face];
    const dc = P(du + 0.5, cd + 1 - 0.025);
    Lv.exit = { x: dc.x, z: dc.z, dx: dOut[0], dy: dOut[1] };
    Lv.start = P(du + 0.5, cd + 0.4);
    Lv.startYaw = Math.atan2(-dOut[0], dOut[1]);
    // furniture helpers (canonical units)
    const box = (u0, v0, u1, v1, y1, tex, solid) => {
      const a = P(u0, v0), c = P(u1, v1);
      const bx = { x0: Math.min(a.x, c.x), z0: Math.min(a.z, c.z), x1: Math.max(a.x, c.x), z1: Math.max(a.z, c.z), y1, tex };
      Lv.boxes.push(bx);
      if (solid !== false) Lv.solids.push({ x0: bx.x0, z0: bx.z0, x1: bx.x1, z1: bx.z1 });
      return bx;
    };
    const prop = (u, v, kind, w, h, y, glow, anim) => { const p = P(u, v); Lv.props.push({ kind, x: p.x, z: p.z, w, h, y: y || 0, glow, anim }); return p; };
    const light = (u, v, y, rad, c) => { const p = P(u, v); Lv.lights.push({ x: p.x, y, z: p.z, r: rad, c, flicker: true }); };
    const person = (u, v, sprite, o) => { const p = P(u, v); Lv.people.push(Object.assign({ x: p.x, z: p.z, sprite }, o)); };
    const hearth = (u) => { box(u - 0.9, 1, u + 0.9, 1.6, 2.4, 'hearth').tile = 3.6; prop(u, 1.75, 'campfire', 1.1, 1, 0, true, 'campfire'); light(u, 2.3, 1, 11, [1, 0.55, 0.22]); };
    const mid = cw / 2 + 1;
    if (role === 'shop' || role === 'smith') {
      box(1.6, 2.6, cw - 0.3, 3.15, 1.05, 'wood');
      box(1, 1, cw + 1, 1.45, 2.8, role === 'smith' ? 'brick' : owner.shop === 'mage' || owner.shop === 'alchemist' ? 'books' : 'planks_v');
      person(mid, 2.15, owner.spec, { npc: owner });
      prop(cw + 0.5, 3.6, 'barrel', 0.9, 1.2); prop(1.5, cd + 0.2, 'crate', 1, 1);
      prop(2.3, 2.85, 'candles', 0.6, 0.5, 1.05, true); light(2.3, 2.9, 1.4, 6, [1, 0.75, 0.4]);
      if (role === 'smith') { box(cw - 1.2, cd - 1.4, cw - 0.4, cd - 1, 0.9, 'rock'); prop(1.6, cd - 0.6, 'campfire', 1.2, 1.1, 0, true, 'campfire'); light(1.6, cd - 0.6, 1, 10, [1, 0.5, 0.2]); }
      else light(mid, cd / 2 + 1, 3.2, 9, [0.85, 0.65, 0.4]);
    } else if (role === 'inn') {
      box(1.9, 2.2, 2.4, cd - 0.6, 1.1, 'wood');
      person(1.4, cd / 2 + 1, owner.spec, { npc: owner });
      hearth(mid + 1);
      const tables = [[mid, cd / 2 + 1.2], [cw - 0.8, cd / 2 + 1.2], [mid + 1, cd - 0.3]];
      tables.forEach(([u, v], i) => { box(u - 0.6, v - 0.45, u + 0.6, v + 0.45, 0.85, 'wood'); prop(u, v, 'candles', 0.5, 0.45, 0.85, true); light(u, v, 1.2, 5, [1, 0.7, 0.35]); if (i < 2) person(u + 0.9, v, 'commoner' + r.int(0, 13), { name: r.pick(['Drunk', 'Traveller', 'Mercenary', 'Farmhand']) }); });
      prop(1.4, 1.5, 'barrel', 0.9, 1.2); prop(2.3, 1.5, 'barrel', 0.9, 1.2);
    } else if (role === 'temple') {
      box(mid - 1, 1.2, mid + 1, 1.9, 1.2, 'marble');
      prop(mid - 0.6, 1.55, 'candles', 0.6, 0.5, 1.2, true); prop(mid + 0.6, 1.55, 'candles', 0.6, 0.5, 1.2, true);
      light(mid - 1.5, 2, 1.6, 9, [1, 0.8, 0.5]); light(mid + 1.5, 2, 1.6, 9, [1, 0.8, 0.5]);
      for (let v = 3.6; v < cd; v += 1.4) { box(1.4, v, mid - 0.5, v + 0.45, 0.5, 'wood'); box(mid + 1.5, v, cw + 0.6, v + 0.45, 0.5, 'wood'); }
      person(mid, 2.5, owner.spec, { npc: owner });
      light(mid, cd, 4, 10, [0.6, 0.6, 0.75]);
    } else {
      // homes and the archive
      hearth(cw - 0.6);
      box(1, 1, 2.1, 2.9, 0.6, 'blanket');
      box(mid - 0.6, cd / 2 + 0.7, mid + 0.6, cd / 2 + 1.5, 0.85, 'wood');
      prop(mid, cd / 2 + 1.1, 'candles', 0.5, 0.45, 0.85, true); light(mid, cd / 2 + 1.1, 1.2, 6, [1, 0.72, 0.4]);
      if (role === 'library') { box(1, cd - 0.4, 1.45, cd + 1, 3, 'books'); box(cw + 0.55, 3, cw + 1, cd - 0.4, 3, 'books'); }
      else prop(cw + 0.2, cd + 0.3, 'barrel', 0.9, 1.2);
      if (owner) person(mid + 1, cd / 2 + 2.2, owner.spec, { npc: owner });
      else if (r.chance(0.55)) person(mid + 1, cd / 2 + 2, 'commoner' + r.int(0, 13), { name: r.pick(['Householder', 'Widow', 'Old man', 'Tenant']) });
      const cp = P(1.5, cd + 0.4);
      Lv.chests.push({ id: 'in:' + t.id + ':' + bi + ':c', x: cp.x, z: cp.z, lvl: 1, seed: G.hashStr(t.id) + bi });
    }
    Lv.name = IN.name(L, b);
    return Lv;
  };
})(window.G);
