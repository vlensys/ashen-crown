'use strict';
// Scenes (overworld / dungeon), entities, AI, physics.
(function (G) {
  const SC = (G.sc = {});
  const W = G.world, D = G.dungeon;
  const PR = 0.42; // player radius
  G.scene = null;

  // ======================= loading =======================
  SC.loadOverworld = function (x, z, yaw) {
    if (!SC.owMeshes) SC.owMeshes = W.buildMeshes();
    const s = { kind: 'overworld', meshes: SC.owMeshes, ents: [], projs: [], parts: [], sacks: [], dungeonId: null };
    G.scene = s;
    const p = G.S.p;
    p.scene = 'overworld';
    p.x = x; p.z = z; p.y = W.groundH(x, z); if (yaw != null) p.yaw = yaw;
    // townsfolk
    for (const L of W.towns) {
      for (const n of Object.values(G.NPCS).filter((n) => n.town === L.t.id)) {
        const post = L.posts[n.id];
        if (L.inside.has(n.id)) continue;
        if (post) s.ents.push(SC.makeNpc(n.spec, post.x, post.z, { npc: n, wander: post.wander || 0.8 }));
      }
      const r = G.rng(G.hashStr(L.t.id) + 5);
      const nCom = L.t.major ? 9 : 4;
      for (let k = 0; k < nCom; k++) s.ents.push(SC.makeNpc('commoner' + r.int(0, 13), L.cx + r.range(-L.R * 0.7, L.R * 0.7), L.cz + r.range(-L.R * 0.7, L.R * 0.7), { wander: 18, commoner: true, name: r.pick(['Townsman', 'Townswoman', 'Labourer', 'Beggar', 'Pilgrim', 'Farmhand']) }));
      if (L.t.major) {
        for (const [gx, gz] of L.gates) s.ents.push(SC.makeNpc(L.t.guard, gx + (gx === L.cx ? 4 : 0) + r.range(-1, 1), gz + (gz === L.cz ? 4 : 0), { wander: 2, guard: true, name: 'Guard' }));
        for (let k = 0; k < 3; k++) s.ents.push(SC.makeNpc(L.t.guard, L.cx + r.range(-20, 20), L.cz + r.range(-20, 20), { wander: 26, guard: true, name: 'Guard' }));
      }
    }
    s.interact = W.interact.slice();
    const S = G.S, now = S.day * 1440 + S.time;
    for (const pl of W.plants) s.interact.push({ kind: 'plant', x: pl.x, z: pl.z, r: 1.2, plant: pl, picked: now - (S.ow.plants[pl.id] == null ? -1e9 : S.ow.plants[pl.id]) < 1440 });
    const needed = (dId) => !!G.quests.bossDrop(dId);
    for (const d of W.dungeons) if (d.kind === 'ruin') { const id = d.id + ':c'; s.interact.push({ kind: 'chest', x: d.chest.x, z: d.chest.z, r: 1.4, chest: { id, lvl: d.lvl, seed: d.seed + 7, rich: true, ruin: d.id }, looted: !!S.ow.chests[id] && !needed(d.id) }); }
    for (const sp of W.spawns) if (sp.camp) { const id = sp.id + ':c'; s.interact.push({ kind: 'chest', x: sp.chest.x, z: sp.chest.z, r: 1.4, chest: { id, lvl: sp.lvl, seed: G.hashStr(id) + S.seed }, looted: !!S.ow.chests[id] }); }
    for (const sk of S.ow.sacks) s.interact.push({ kind: 'sack', x: sk.x, z: sk.z, r: 1.2, items: sk.items, save: sk });
    s.lights = W.lights;
    G.ui.locationCheck(true);
  };
  SC.loadDungeon = function (dId) {
    const site = W.dungeons.find((d) => d.id === dId);
    const L = D.generate(site);
    const p = G.S.p;
    p.ret = { x: site.door.x, z: site.door.z, yaw: Math.atan2(site.door.x - site.x, -(site.door.z - site.z)) };
    p.scene = dId;
    const ds = (G.S.dstate[dId] = G.S.dstate[dId] || { killed: {}, looted: {}, ores: {}, seen: '' });
    const s = { kind: 'dungeon', grid: true, levelId: dId, dungeonId: dId, site, L, meshes: D.buildMeshes(L), ents: [], projs: [], parts: [], sacks: [], lights: L.lights, interact: [] };
    G.scene = s;
    for (const sp of L.spawns) {
      if (ds.killed[sp.id] && !(sp.boss && G.quests.needsBoss(dId))) continue;
      const def = G.CREATURES[sp.cr];
      s.ents.push(SC.makeMob(def, sp.x, sp.z, site.lvl, { spawnId: sp.id, boss: sp.boss }));
    }
    for (const c of L.chests) s.interact.push({ kind: 'chest', x: c.x, z: c.z, r: 1.4, chest: c, looted: !!ds.looted[c.id] });
    for (const o of L.ores) s.interact.push({ kind: 'ore', x: o.x, z: o.z, r: 1.4, ore: o, mined: !!ds.ores[o.id] });
    s.interact.push({ kind: 'exit', x: L.exit.x - L.exit.dx * 0.8, z: L.exit.z - L.exit.dy * 0.8, r: 2 });
    p.x = L.start.x; p.z = L.start.z; p.y = 0; p.yaw = L.startYaw;
    G.ui.banner(site.name, 'Level ' + site.lvl + ' ' + { cave: 'cave', fort: 'fortress', crypt: 'crypt', spire: 'stronghold' }[site.kind]);
    G.save.auto();
  };
  SC.loadInterior = function (townId, bi) {
    const L0 = W.towns.find((t) => t.t.id === townId), b = L0.buildings[bi];
    const Lv = G.interior.generate(L0, bi);
    const p = G.S.p, ds = W.doorSpot(b, 1.7);
    p.ret = { x: ds.x, z: ds.z, yaw: { S: Math.PI, N: 0, W: -Math.PI / 2, E: Math.PI / 2 }[b.face] };
    const id = 'in:' + townId + ':' + bi;
    const s = { kind: 'interior', grid: true, levelId: id, name: Lv.name, L: Lv, meshes: D.buildMeshes(Lv), ents: [], projs: [], parts: [], sacks: [], lights: Lv.lights, interact: [] };
    G.scene = s;
    for (const pp of Lv.people) s.ents.push(SC.makeNpc(pp.npc ? pp.npc.spec : pp.sprite, pp.x, pp.z, { npc: pp.npc || null, name: pp.name, wander: pp.npc ? 0.6 : 0.3 }));
    for (const c of Lv.chests) s.interact.push({ kind: 'chest', x: c.x, z: c.z, r: 1.2, chest: c, looted: !!G.S.ow.chests[c.id] });
    s.interact.push({ kind: 'exit', x: Lv.exit.x - Lv.exit.dx * 0.8, z: Lv.exit.z - Lv.exit.dy * 0.8, r: 1.6, house: true });
    p.scene = id; p.x = Lv.start.x; p.z = Lv.start.z; p.y = 0; p.yaw = Lv.startYaw;
    G.ui.toast(Lv.name);
  };
  SC.enterHouse = function (townId, bi) { G.audio.play('door'); G.ui.fade(() => { SC.loadInterior(townId, bi); G.save.auto(); }); };
  SC.enter = function (dId) {
    G.audio.play('door');
    G.ui.fade(() => SC.loadDungeon(dId));
  };
  SC.leave = function () {
    G.audio.play('door');
    const r = G.S.p.ret;
    G.ui.fade(() => { SC.loadOverworld(r.x, r.z, r.yaw); G.save.auto(); });
  };

  // ======================= entities =======================
  SC.makeNpc = function (sprite, x, z, o) {
    return Object.assign({ kind: 'npc', sprite, x, z, y: SC.groundAt(x, z), hx: x, hz: z, wander: 1, w: 1.15, h: 1.75, frame: 0, t: Math.random() * 5, tx: x, tz: z, wait: 0 }, o);
  };
  SC.makeMob = function (def, x, z, lvl, o) {
    const sc = G.scaleCreature(def, lvl || def.lvl);
    return Object.assign({ kind: 'mob', def, sprite: def.sprite, x, z, y: SC.groundAt(x, z), hx: x, hz: z, hp: sc.hp, max: sc.hp, dmg: sc.dmg, lvl: Math.max(def.lvl, lvl || 0),
      w: def.w, h: def.h, state: 'idle', t: Math.random() * 3, cd: 0, atk: 0, frame: 0, hurt: 0, slow: 0, tx: x, tz: z, path: 0 }, o);
  };
  SC.groundAt = function (x, z) { return G.scene && G.scene.grid ? 0 : W.groundH(x, z); };

  // ======================= collision =======================
  // resolve a circle at (x,z) against the world; returns adjusted [x,z]
  SC.collide = function (x, z, r, oldX, oldZ) {
    const s = G.scene;
    if (s.grid) {
      const L = s.L, C = L.cell;
      for (let it = 0; it < 2; it++) {
        const cx = Math.floor(x / C), cz = Math.floor(z / C);
        for (let j = cz - 1; j <= cz + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
          if (L.at(i, j)) continue;
          [x, z] = pushBox(x, z, r, i * C, j * C, i * C + C, j * C + C);
        }
        for (const c of L.solids) [x, z] = c.r ? pushCircle(x, z, r, c) : pushBox(x, z, r, c.x0, c.z0, c.x1, c.z1);
      }
      return [x, z];
    }
    for (const c of W.collidersNear(x, z)) [x, z] = c.r ? pushCircle(x, z, r, c) : pushBox(x, z, r, c.x0, c.z0, c.x1, c.z1);
    // too steep or into deep water?
    const h0 = W.groundH(oldX, oldZ), h1 = W.groundH(x, z);
    const dd = Math.hypot(x - oldX, z - oldZ) || 1e-6;
    if ((h1 - h0) / dd > 1.25 || h1 < -1.6) return [oldX, oldZ];
    x = G.clamp(x, 6, W.SIZE - 6); z = G.clamp(z, 6, W.SIZE - 6);
    return [x, z];
  };
  function pushBox(x, z, r, x0, z0, x1, z1) {
    const nx = G.clamp(x, x0, x1), nz = G.clamp(z, z0, z1);
    const dx = x - nx, dz = z - nz, d = Math.hypot(dx, dz);
    if (d >= r) return [x, z];
    if (d < 1e-6) { // centre inside the box: push out the shortest way
      const opts = [[x0 - r, z, x - x0], [x1 + r, z, x1 - x], [x, z0 - r, z - z0], [x, z1 + r, z1 - z]];
      opts.sort((a, b) => a[2] - b[2]);
      return [opts[0][0], opts[0][1]];
    }
    return [nx + dx / d * r, nz + dz / d * r];
  }
  function pushCircle(x, z, r, c) {
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = r + c.r;
    if (d >= m || d < 1e-6) return [x, z];
    return [c.x + dx / d * m, c.z + dz / d * m];
  }
  SC.moveEnt = function (e, dx, dz, r) {
    const [x, z] = SC.collide(e.x + dx, e.z + dz, r || 0.4, e.x, e.z);
    e.mvx = x - e.x; e.mvz = z - e.z;
    if (Math.abs(e.mvx) + Math.abs(e.mvz) > 0.004) e.fy = Math.atan2(e.mvx, -e.mvz);
    e.x = x; e.z = z;
    e.y = SC.groundAt(x, z);
  };
  SC.los = function (x0, z0, x1, z1) {
    const s = G.scene;
    if (s.grid) return D.los(s.L, x0, z0, x1, z1);
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2);
    for (let i = 1; i < n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
      for (const c of W.collidersNear(x, z)) if (!c.r && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false;
    }
    return true;
  };

  // ======================= player movement =======================
  SC.updatePlayer = function (dt, input) {
    const p = G.S.p, st = G.player.stats();
    const s = G.scene;
    let fx = 0, fz = 0;
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    if (input.fwd) { fx += sy; fz -= cy; }
    if (input.back) { fx -= sy; fz += cy; }
    if (input.left) { fx -= cy; fz -= sy; }
    if (input.right) { fx += cy; fz += sy; }
    const len = Math.hypot(fx, fz);
    let speed = 4.6;
    const sprint = input.sprint && p.stam > 1 && len > 0;
    if (sprint) { speed = 7.4; p.stam = Math.max(0, p.stam - 14 * dt); }
    if (G.combat.blocking) speed *= 0.5;
    SC.moving = len > 0; SC.speed = speed;
    if (len > 0) {
      const vx = fx / len * speed * dt, vz = fz / len * speed * dt;
      const [x, z] = SC.collide(p.x + vx, p.z + vz, PR, p.x, p.z);
      // slide along walls: retry the axes separately if blocked
      if (Math.hypot(x - p.x, z - p.z) < 0.2 * speed * dt) {
        const [x2, z2] = SC.collide(p.x + vx, p.z, PR, p.x, p.z);
        const [x3, z3] = SC.collide(x2, z2 + vz, PR, x2, z2);
        p.x = x3; p.z = z3;
      } else { p.x = x; p.z = z; }
      p.bob = (p.bob || 0) + dt * speed * 1.6;
    }
    // vertical: gravity, jumping, terrain following
    const g = SC.groundAt(p.x, p.z);
    p.vy = (p.vy || 0) - 22 * dt;
    if (input.jump && p.onGround && p.stam > 8) { p.vy = 7.2; p.stam -= 8; }
    p.y += p.vy * dt;
    if (p.y <= g) { p.y = g; p.vy = 0; p.onGround = true; } else if (p.y - g > 0.15) p.onGround = false;
    if (s.kind === 'overworld' && g < -0.9) p.y = Math.max(p.y, g); // wading
    // regen
    if (!sprint && !G.combat.swinging()) p.stam = Math.min(st.stamMax, p.stam + 16 * dt);
    p.mana = Math.min(st.manaMax, p.mana + (0.8 + G.S.p.attr.arcana * 0.12) * dt);
    if (!SC.inCombat()) p.hp = Math.min(st.hpMax, p.hp + 0.6 * dt);
    // keep track of discoveries
    if (s.kind === 'overworld') {
      for (const d of W.dungeons) if (!p.discovered[d.id] && Math.hypot(d.x - p.x, d.z - p.z) < 45) { p.discovered[d.id] = 1; G.ui.toast('Discovered: ' + d.name); }
    } else {
      const C = s.L.cell, L = s.L;
      SC.seen = SC.seen || {};
      const key = s.levelId;
      const set = (SC.seen[key] = SC.seen[key] || new Set());
      const cx = Math.floor(p.x / C), cz = Math.floor(p.z / C);
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (L.at(cx + i, cz + j) || L.at(cx + i, cz + j) === 0) set.add((cz + j) * L.w + cx + i);
    }
  };
  SC.inCombat = function () { return G.scene.ents.some((e) => e.kind === 'mob' && !e.dead && e.state === 'chase'); };

  // ======================= AI =======================
  SC.update = function (dt) {
    const s = G.scene, p = G.S.p;
    const night = G.time.isNight();
    if (s.kind === 'overworld') SC.manageSpawns(night);
    for (const e of s.ents) {
      e.t += dt;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.kind === 'npc') SC.npcAI(e, dt);
      else if (!e.dead) SC.mobAI(e, dt, night);
    }
    // keep entities apart from the player
    for (const e of s.ents) {
      if (e.dead) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz), m = PR + e.w * 0.35;
      if (d < m && d > 0.001) { SC.moveEnt(e, dx / d * (m - d), dz / d * (m - d), 0.35); }
    }
    G.combat.updateProjectiles(dt);
    // particles
    for (const q of s.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vy -= 9 * dt; q.life -= dt; }
    s.parts = s.parts.filter((q) => q.life > 0);
  };
  SC.npcAI = function (e, dt) {
    if (e.talking) { e.frame = 0; const p = G.S.p; e.fy = Math.atan2(p.x - e.x, -(p.z - e.z)); return; }
    const d = Math.hypot(e.tx - e.x, e.tz - e.z);
    if (d < 0.3 || e.wait > 0) {
      e.frame = 0;
      e.wait -= dt;
      if (e.wait <= 0 && e.wander > 0.5) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * e.wander;
        e.tx = e.hx + Math.cos(a) * r; e.tz = e.hz + Math.sin(a) * r;
        e.wait = 2 + Math.random() * 5;
      } else if (e.wait <= 0) e.wait = 4;
      return;
    }
    const sp = 1.4 * dt;
    const ox = e.x, oz = e.z;
    SC.moveEnt(e, (e.tx - e.x) / d * sp, (e.tz - e.z) / d * sp, 0.4);
    if (Math.hypot(e.x - ox, e.z - oz) < sp * 0.3) { e.tx = e.x; e.tz = e.z; }
    e.frame = Math.floor(e.t * 4) % 2 ? 1 : 2;
  };
  SC.mobAI = function (e, dt, night) {
    const p = G.S.p, def = e.def;
    if (def.night && !night && e.state !== 'chase' && G.scene.kind === 'overworld') { e.gone = true; return; }
    const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
    e.cd -= dt;
    const slow = e.slow > 0 ? 0.45 : 1;
    if (e.slow > 0) e.slow -= dt;
    // attack in progress
    if (e.atk > 0 || e.state === 'chase') e.fy = Math.atan2(dx, -dz);
    if (e.atk > 0) {
      e.atk -= dt;
      e.frame = 3;
      if (e.atk <= 0) {
        if (e.atkKind === 'melee') { if (d < def.reach + 0.9 && !G.S.p.dead) G.combat.hitPlayer(G.R.int(e.dmg[0], e.dmg[1]), e); }
        else G.combat.mobCast(e);
        e.cd = def.ranged && e.atkKind === 'cast' ? def.ranged.cd : def.atk;
      }
      return;
    }
    const sees = d < def.aggro * (e.boss ? 1.3 : 1) && SC.los(e.x, e.z, p.x, p.z) && !p.dead;
    if (e.state !== 'chase' && (sees || (e.hurtBy && d < 40))) { e.state = 'chase'; if (e.boss && !e.announced) { e.announced = true; G.ui.bossBar(e); } }
    if (e.state === 'chase') {
      const leash = G.scene.kind === 'overworld' ? Math.hypot(e.x - e.hx, e.z - e.hz) > 70 : false;
      if (leash || p.dead || d > 60) { e.state = 'home'; e.hurtBy = false; }
      else {
        if (def.ranged) {
          if (d < def.ranged.range && e.cd <= 0 && SC.los(e.x, e.z, p.x, p.z) && (d > 3.2 || Math.random() < 0.3)) { e.atk = 0.55; e.atkKind = 'cast'; return; }
          if (d < def.reach + 0.4 && e.cd <= 0) { e.atk = 0.45; e.atkKind = 'melee'; return; }
          if (d < 5 && !e.boss) { SC.moveEnt(e, -dx / d * def.speed * 0.6 * dt * slow, -dz / d * def.speed * 0.6 * dt * slow, 0.4); e.frame = Math.floor(e.t * 5) % 2 ? 1 : 2; return; }
          if (d < def.ranged.range * 0.7 && SC.los(e.x, e.z, p.x, p.z)) { e.frame = 0; return; }
        } else if (d < def.reach + e.w * 0.3 && e.cd <= 0) { e.atk = def.boss ? 0.6 : 0.45; e.atkKind = 'melee'; return; }
        if (d > def.reach * 0.8) SC.chaseStep(e, p.x, p.z, def.speed * slow * dt);
        e.frame = Math.floor(e.t * 5) % 2 ? 1 : 2;
      }
      return;
    }
    if (e.state === 'home') {
      const hd = Math.hypot(e.hx - e.x, e.hz - e.z);
      if (hd < 1) { e.state = 'idle'; e.hp = e.max; return; }
      SC.chaseStep(e, e.hx, e.hz, def.speed * dt);
      e.frame = Math.floor(e.t * 5) % 2 ? 1 : 2;
      return;
    }
    // idle wandering
    if (Math.hypot(e.tx - e.x, e.tz - e.z) < 0.4 || e.t > 6) {
      e.t = Math.random() * 2;
      const a = Math.random() * Math.PI * 2, r = Math.random() * (G.scene.grid ? 3 : 8);
      e.tx = e.hx + Math.cos(a) * r; e.tz = e.hz + Math.sin(a) * r;
    }
    const wd = Math.hypot(e.tx - e.x, e.tz - e.z);
    if (wd > 0.4) { SC.moveEnt(e, (e.tx - e.x) / wd * def.speed * 0.3 * dt, (e.tz - e.z) / wd * def.speed * 0.3 * dt, 0.4); e.frame = Math.floor(e.t * 3) % 2 ? 1 : 2; }
    else e.frame = 0;
  };
  SC.chaseStep = function (e, tx, tz, step) {
    const s = G.scene;
    let gx = tx, gz = tz;
    if (s.grid && !D.los(s.L, e.x, e.z, tx, tz)) {
      e.path -= step;
      if (!e.next || e.path <= 0) { e.next = D.nextStep(s.L, e.x, e.z, tx, tz); e.path = 1.5; }
      if (e.next) { gx = e.next.x; gz = e.next.z; if (Math.hypot(gx - e.x, gz - e.z) < 0.4) e.next = null; }
    } else e.next = null;
    const d = Math.hypot(gx - e.x, gz - e.z) || 1;
    e.face = gx > e.x ? 1 : -1;
    SC.moveEnt(e, (gx - e.x) / d * step, (gz - e.z) / d * step, Math.min(0.6, e.w * 0.3));
  };

  // ======================= overworld spawns =======================
  SC.manageSpawns = function (night) {
    const s = G.scene, p = G.S.p, now = G.S.day * 1440 + G.S.time;
    s.spawnT = (s.spawnT || 0) + 1;
    if (s.spawnT % 30) return;
    // remove far-away or vanished monsters
    s.ents = s.ents.filter((e) => !(e.kind === 'mob' && (e.gone || (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) > 190) || (e.dead && Math.hypot(e.x - p.x, e.z - p.z) > 120))));
    const live = new Set(s.ents.filter((e) => e.spawnId).map((e) => e.spawnId));
    const groups = W.spawns.concat(W.dungeons.filter((d) => d.kind === 'ruin').map((d) => ({ id: 'r' + d.id, i: d.i, j: d.j, list: d.lvl > 4 ? ['skeleton', 'hollowed', 'bone_mage'] : ['skeleton', 'skeleton'], lvl: d.lvl, ruin: d })));
    groups.push({ id: 'watchtower', i: G.SITES.watchtower.x, j: G.SITES.watchtower.z, list: ['cultist', 'cultist', 'cultist'], boss: 'cult_zealot', lvl: 4, fixed: true });
    for (const g of groups) {
      const x = g.i * W.CS + 2, z = g.j * W.CS + 2;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d > 150 || live.has(g.id + ':0') || live.has(g.id + ':b')) continue;
      if (g.night && !night) continue;
      const k = G.S.ow.killed[g.id];
      if (k && now - k < 1440 * (g.fixed ? 9999 : 1)) continue;
      if (g.fixed && G.quests.isDone('mq2')) continue;
      if (d < 50) continue; // don't pop in right in front of the player
      g.list.forEach((cr, n) => { const a = n / g.list.length * Math.PI * 2; s.ents.push(SC.makeMob(G.CREATURES[cr], x + Math.cos(a) * 4, z + Math.sin(a) * 4, g.lvl, { spawnId: g.id + ':' + n, group: g.id })); });
      if (g.boss) s.ents.push(SC.makeMob(G.CREATURES[g.boss], x + 2, z + 2, g.lvl, { spawnId: g.id + ':b', group: g.id, boss: true }));
    }
  };
  // a group counts as cleared when all of its members are dead
  SC.groupCleared = function (gid) {
    return !G.scene.ents.some((e) => e.group === gid && !e.dead);
  };
})(window.G);
