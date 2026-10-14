'use strict';
// Combat: melee swings, blocking, spells, projectiles, damage, deaths and loot. Also the clock.
(function (G) {
  const CB = (G.combat = { swing: null, blocking: false, castCd: 0 });
  const SC = () => G.sc;

  // ---------- time ----------
  G.time = {
    update(dt) { const S = G.S; S.time += dt; if (S.time >= 1440) { S.time -= 1440; S.day++; } S.stats.play += dt; },
    hour: () => G.S.time / 60,
    isNight() { const h = G.time.hour(); return h >= 20.5 || h < 5.5; },
    str() { const m = Math.floor(G.S.time); const h = Math.floor(m / 60), mm = m % 60; return 'Day ' + G.S.day + ', ' + String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); },
    pass(hours) { G.S.time += hours * 60; while (G.S.time >= 1440) { G.S.time -= 1440; G.S.day++; } },
  };

  CB.swinging = () => !!CB.swing;
  CB.attack = function () {
    const p = G.S.p;
    if (CB.swing || p.dead) return;
    const st = G.player.stats(), w = st.weapon;
    if (w.wtype === 'bow' && !G.player.count('arrows')) { G.ui.toast('You have no arrows.'); return; }
    if (p.stam < w.stam * 0.5) { G.ui.toast('Too tired to swing!'); return; }
    p.stam = Math.max(0, p.stam - w.stam);
    CB.swing = { t: 0, dur: w.speed / st.haste, hit: false, w };
    G.audio && G.audio.play(w.wtype === 'bow' ? 'draw' : 'swing');
  };
  CB.update = function (dt) {
    const p = G.S.p;
    CB.castCd -= dt;
    if (!CB.swing) return;
    const s = CB.swing;
    s.t += dt;
    if (!s.hit && s.t >= s.dur * (s.w.wtype === 'bow' ? 0.6 : 0.45)) { s.hit = true; if (s.w.wtype === 'bow') CB.shoot(s.w); else CB.meleeHit(s.w); }
    if (s.t >= s.dur) CB.swing = null;
    void p;
  };
  CB.shoot = function (w) {
    const p = G.S.p, st = G.player.stats();
    if (!G.player.count('arrows')) return;
    G.player.take('arrows', 1);
    const fx = Math.sin(p.yaw) * Math.cos(p.pitch), fy = Math.sin(p.pitch), fz = -Math.cos(p.yaw) * Math.cos(p.pitch);
    let dmg = G.R.int(w.dmg[0], w.dmg[1]) * (1 + p.attr.finesse * 0.05);
    const crit = G.R.chance(st.crit);
    if (crit) dmg *= 1.8;
    const sp = 40;
    CB.projectile({ x: p.x + fx * 0.6, y: p.y + 1.45, z: p.z + fz * 0.6, vx: fx * sp, vy: fy * sp + 1, vz: fz * sp, dmg, crit, from: 'player', sprite: 'arrow_spr', grav: 6 });
    G.audio && G.audio.play('bow');
  };
  CB.meleeHit = function (w) {
    const p = G.S.p, st = G.player.stats();
    const fx = Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let hitAny = false;
    for (const e of G.scene.ents) {
      if (e.kind !== 'mob' || e.dead) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d > w.reach + e.w * 0.4) continue;
      if (d > 0.6 && (dx * fx + dz * fz) / d < 0.55) continue;
      if (Math.abs((e.y + e.h * 0.5) - (p.y + 1.2)) > 2.6) continue;
      let dmg = G.R.int(w.dmg[0], w.dmg[1]) * st.melee;
      if (e.def.undead && w.undead) dmg *= w.undead;
      if (w.fire) dmg += w.fire;
      const crit = G.R.chance(st.crit);
      if (crit) dmg *= 1.8;
      CB.damageMob(e, dmg, crit, fx, fz);
      hitAny = true;
      if (w.wtype !== 'greatsword') break;
    }
    if (hitAny) G.audio && G.audio.play('hit');
  };
  CB.damageMob = function (e, dmg, crit, kx, kz) {
    dmg = Math.max(1, Math.round(dmg - (e.def.armor || 0) * 0.5));
    e.hp -= dmg;
    e.hurt = 0.18;
    e.state = 'chase'; e.hurtBy = true;
    if (kx != null && !e.def.boss && !e.def.big) SC().moveEnt(e, kx * 0.35, kz * 0.35, 0.4);
    G.ui.hitNumber(e, dmg, crit);
    for (let i = 0; i < 6; i++) G.scene.parts.push({ x: e.x, y: e.y + e.h * 0.55, z: e.z, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.5, sprite: e.def.undead ? 'spark' : 'blood' });
    if (e.boss) G.ui.bossBar(e);
    if (e.hp <= 0) CB.killMob(e);
  };
  CB.killMob = function (e) {
    e.dead = true; e.hp = 0; e.deathT = 0; e.frame = 4;
    const s = G.scene, S = G.S;
    G.S.stats.kills++;
    G.player.addXp(e.def.xp * (1 + (e.lvl - e.def.lvl) * 0.1));
    // loot carried by the corpse
    const r = G.R;
    e.loot = [];
    if (e.def.gold || e.boss) e.loot.push(['gold', r.int(3, 12) * e.lvl * (e.boss ? 6 : 1)]);
    (e.def.loot || []).forEach(([id, p]) => { if (r.chance(p)) e.loot.push([id, 1]); });
    if (e.boss || r.chance(0.18)) G.lootRoll(e.lvl, r, e.boss).forEach((l) => e.loot.push(l));
    if (s.kind === 'dungeon') {
      const ds = S.dstate[s.dungeonId];
      ds.killed[e.spawnId] = 1;
      if (e.boss) {
        const qi = G.quests.bossDrop(s.dungeonId);
        if (qi) e.loot.unshift([qi, 1]);
        ds.cleared = 1;
        G.ui.banner(e.def.name + ' falls', 'The way is clear.');
        G.ui.bossBar(null);
      }
    } else {
      if (e.boss && e.group === 'watchtower' && G.quests.isActive('mq2') && !G.player.count('cult_sigil')) e.loot.unshift(['cult_sigil', 1]);
      if (e.boss) G.ui.bossBar(null);
      if (e.group && SC().groupCleared(e.group)) S.ow.killed[e.group] = S.day * 1440 + S.time;
    }
    G.quests.onKill(e);
    if (!e.loot.length) e.looted = true;
    G.audio && G.audio.play('die');
  };
  CB.hitPlayer = function (dmg, src, kind) {
    const p = G.S.p, st = G.player.stats();
    if (p.dead) return;
    let d = dmg * 55 / (55 + st.armor);
    if (CB.blocking && kind !== 'spell') {
      const fx = Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      const dx = src.x - p.x, dz = src.z - p.z, l = Math.hypot(dx, dz) || 1;
      if ((dx * fx + dz * fz) / l > 0.3 && p.stam > 0) {
        const red = p.equip.shield ? 0.75 : 0.45;
        p.stam = Math.max(0, p.stam - d * 0.8);
        d *= 1 - red;
        G.audio && G.audio.play('block');
      }
    }
    d = Math.max(1, Math.round(d));
    p.hp -= d;
    G.ui.hurt(d);
    if (p.hp <= 0) { p.hp = 0; p.dead = true; G.S.stats.deaths++; G.ui.death(); }
  };

  // ---------- spells ----------
  CB.cast = function () {
    const p = G.S.p;
    if (p.dead || CB.castCd > 0) return;
    const sp = G.SPELLS[p.spell];
    if (!sp) return;
    if (p.mana < sp.mana) { G.ui.toast('Not enough mana.'); return; }
    p.mana -= sp.mana;
    CB.castCd = 0.7;
    const st = G.player.stats();
    G.ui.castFlash(sp);
    if (sp.heal) { p.hp = Math.min(st.hpMax, p.hp + sp.heal * st.spell); G.ui.toast(sp.name + ': healed'); G.audio && G.audio.play('heal'); return; }
    if (sp.ward) { p.ward = Math.round(sp.ward * st.spell); p.wardUntil = G.S.time + sp.dur; G.ui.toast(sp.name + ' surrounds you'); return; }
    const fx = Math.sin(p.yaw) * Math.cos(p.pitch), fy = Math.sin(p.pitch), fz = -Math.cos(p.yaw) * Math.cos(p.pitch);
    CB.projectile({ x: p.x + fx * 0.6, y: p.y + 1.45, z: p.z + fz * 0.6, vx: fx * sp.speed, vy: fy * sp.speed, vz: fz * sp.speed, dmg: G.R.int(sp.dmg[0], sp.dmg[1]) * st.spell, from: 'player', sprite: sp.proj, color: sp.color, slow: sp.slow, drain: sp.drain });
    G.audio && G.audio.play('cast');
  };
  CB.mobCast = function (e) {
    const p = G.S.p, rg = e.def.ranged;
    const dx = p.x - e.x, dy = (p.y + 1.2) - (e.y + e.h * 0.6), dz = p.z - e.z, d = Math.hypot(dx, dy, dz) || 1;
    const sp = 15;
    const scale = G.scaleCreature(e.def, e.lvl).k;
    const spd = rg.phys ? 30 : sp;
    CB.projectile({ x: e.x + dx / d * 0.6, y: e.y + e.h * 0.6, z: e.z + dz / d * 0.6, vx: dx / d * spd, vy: dy / d * spd + (rg.phys ? d * 0.1 : 0), vz: dz / d * spd, dmg: G.R.int(rg.dmg[0], rg.dmg[1]) * scale, from: 'mob', src: e, sprite: rg.proj, color: rg.phys ? null : rg.color || [1, 0.5, 0.2], grav: rg.phys ? 6 : 0 });
    if (rg.phys) G.audio && G.audio.play('bow');
  };
  CB.projectile = function (o) { o.life = 3; G.scene.projs.push(o); };
  CB.updateProjectiles = function (dt) {
    const s = G.scene, p = G.S.p;
    for (const q of s.projs) {
      q.life -= dt;
      const steps = 3;
      for (let i = 0; i < steps && q.life > 0; i++) {
        if (q.grav) q.vy -= q.grav * dt / steps;
        q.x += q.vx * dt / steps; q.y += q.vy * dt / steps; q.z += q.vz * dt / steps;
        const g = SC().groundAt(q.x, q.z);
        const wall = s.grid ? (G.dungeon.solid(s.L, q.x, q.z) || q.y > s.L.th.h) : G.world.collidersNear(q.x, q.z).some((c) => (c.r ? Math.hypot(q.x - c.x, q.z - c.z) < c.r : q.x > c.x0 && q.x < c.x1 && q.z > c.z0 && q.z < c.z1));
        if (q.y < g || wall) { q.life = 0; break; }
        if (q.from === 'player') {
          for (const e of s.ents) {
            if (e.kind !== 'mob' || e.dead) continue;
            if (Math.hypot(e.x - q.x, e.z - q.z) < e.w * 0.45 + 0.3 && q.y > e.y && q.y < e.y + e.h + 0.3) {
              CB.damageMob(e, q.dmg, !!q.crit);
              if (q.slow) e.slow = q.slow;
              if (q.drain) p.hp = Math.min(G.player.stats().hpMax, p.hp + q.dmg * q.drain);
              q.life = 0; break;
            }
          }
        } else if (Math.hypot(p.x - q.x, p.z - q.z) < 0.6 && q.y > p.y && q.y < p.y + 1.9) { CB.hitPlayer(q.dmg, q.src, q.grav ? 'arrow' : 'spell'); q.life = 0; }
      }
      if (q.life <= 0 && q.color) for (let i = 0; i < 8; i++) s.parts.push({ x: q.x, y: q.y, z: q.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.4, sprite: 'spark' });
    }
    s.projs = s.projs.filter((q) => q.life > 0);
  };
})(window.G);
