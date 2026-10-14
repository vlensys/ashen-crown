'use strict';
// The player: attributes, derived stats, inventory, equipment, levelling.
(function (G) {
  const P = (G.player = {});
  const SLOTS = (G.SLOTS = ['weapon', 'shield', 'head', 'chest', 'hands', 'feet']);
  G.CLASSES = {
    warrior: { name: 'Sellsword', desc: 'Strong arm, thick hide. Starts with sword and shield.', attr: { might: 6, finesse: 3, arcana: 1 },
      items: [['iron_sword', 1], ['iron_shield', 1], ['leather_chest', 1], ['leather_feet', 1], ['potion_minor', 3], ['bread', 2]], equip: ['iron_sword', 'iron_shield', 'leather_chest', 'leather_feet'], spells: ['heal'] },
    rogue: { name: 'Cutpurse', desc: 'Quick, precise, deadly crits. Starts with a dagger and full leathers.', attr: { might: 3, finesse: 7, arcana: 2 },
      items: [['iron_dagger', 1], ['leather_head', 1], ['leather_chest', 1], ['leather_hands', 1], ['leather_feet', 1], ['potion_minor', 3], ['potion_stamina', 1], ['apple', 3]], equip: ['iron_dagger', 'leather_head', 'leather_chest', 'leather_hands', 'leather_feet'], spells: ['heal'] },
    mage: { name: 'Hedge Mage', desc: 'Frail but deadly at range. Starts with a staff and Firebolt.', attr: { might: 1, finesse: 3, arcana: 7 },
      items: [['oak_staff', 1], ['leather_feet', 1], ['potion_mana', 2], ['potion_minor', 2], ['cheese', 2]], equip: ['oak_staff', 'leather_feet'], spells: ['firebolt', 'heal'] },
  };

  G.newState = function (name, cls, seed) {
    const c = G.CLASSES[cls];
    const S = {
      v: G.VERSION, seed, time: 7 * 60, day: 1,
      p: { name, cls, lvl: 1, xp: 0, attr: Object.assign({}, c.attr), pts: 0, hp: 1, stam: 1, mana: 1, gold: 30, inv: [], equip: {}, spells: c.spells.slice(), spell: c.spells[0],
        x: 0, y: 0, z: 0, yaw: 0, pitch: 0, scene: 'overworld', ret: null, discovered: {}, visitedTowns: {}, ward: 0, wardUntil: 0 },
      quests: {}, dstate: {}, ow: { killed: {}, plants: {}, chests: {}, sacks: [] }, stats: { kills: 0, deaths: 0, play: 0 },
    };
    G.S = S;
    c.items.forEach(([id, n]) => P.give(id, n, true));
    c.equip.forEach((id) => P.equip(id, true));
    const st = P.stats();
    S.p.hp = st.hpMax; S.p.stam = st.stamMax; S.p.mana = st.manaMax;
    return S;
  };

  // ---------- derived stats ----------
  P.stats = function () {
    const p = G.S.p, a = p.attr;
    let armor = 0, mana = 0, spell = 0;
    for (const s of SLOTS) { const id = p.equip[s]; if (!id) continue; const d = G.item(id); armor += d.armor || 0; mana += d.mana || 0; spell += d.spell || 0; }
    if (G.S.time < p.wardUntil) armor += p.ward;
    const w = p.equip.weapon ? G.item(p.equip.weapon) : null;
    return {
      hpMax: 80 + (p.lvl - 1) * 12 + a.might * 4,
      stamMax: 80 + (p.lvl - 1) * 5 + a.finesse * 5,
      manaMax: 30 + (p.lvl - 1) * 5 + a.arcana * 8 + mana,
      armor,
      melee: 1 + a.might * 0.045,
      spell: 1 + a.arcana * 0.07 + spell,
      crit: 0.03 + a.finesse * 0.012,
      haste: 1 + a.finesse * 0.015,
      weapon: w || { name: 'Fists', wtype: 'fist', dmg: [1, 3], speed: 0.45, reach: 1.8, stam: 4 },
    };
  };
  P.xpNext = (l) => 80 * l + 25 * l * l;
  P.addXp = function (n) {
    const p = G.S.p;
    p.xp += Math.round(n);
    G.ui.float('+' + Math.round(n) + ' XP', '#c8b070');
    while (p.xp >= P.xpNext(p.lvl)) {
      p.xp -= P.xpNext(p.lvl);
      p.lvl++;
      p.pts += 2;
      const st = P.stats();
      p.hp = st.hpMax; p.stam = st.stamMax; p.mana = st.manaMax;
      G.ui.banner('Level ' + p.lvl, 'You feel stronger. (2 attribute points - press C)');
      G.audio && G.audio.play('level');
    }
  };

  // ---------- inventory ----------
  P.count = (id) => { if (id === 'gold') return G.S.p.gold; const e = G.S.p.inv.find((s) => s.id === id); return e ? e.n : 0; };
  P.give = function (id, n, quiet) {
    n = n || 1;
    const p = G.S.p;
    if (id === 'gold') { p.gold += n; if (!quiet) G.ui.float('+' + n + ' gold', '#e0c050'); return; }
    G.item(id);
    const e = p.inv.find((s) => s.id === id);
    if (e) e.n += n; else p.inv.push({ id, n });
    if (!quiet) G.ui.float('+ ' + G.item(id).name + (n > 1 ? ' (' + n + ')' : ''), G.item(id).type === 'quest' ? '#80e080' : '#d8d0c0');
    G.quests && G.quests.refresh();
  };
  P.take = function (id, n) {
    const p = G.S.p;
    n = n || 1;
    if (id === 'gold') { p.gold = Math.max(0, p.gold - n); return; }
    const e = p.inv.find((s) => s.id === id);
    if (!e) return;
    e.n -= n;
    if (e.n <= 0) {
      p.inv.splice(p.inv.indexOf(e), 1);
      for (const s of SLOTS) if (p.equip[s] === id && !p.inv.some((x) => x.id === id)) delete p.equip[s];
    }
    G.quests && G.quests.refresh();
  };
  P.equipped = (id) => SLOTS.some((s) => G.S.p.equip[s] === id);
  P.equip = function (id, quiet) {
    const p = G.S.p, d = G.item(id);
    let slot = d.type === 'weapon' ? 'weapon' : d.slot;
    if (!slot) return;
    if (p.equip[slot] === id) { delete p.equip[slot]; return; }
    p.equip[slot] = id;
    if (slot === 'weapon' && d.twoHand) delete p.equip.shield;
    if (slot === 'shield' && p.equip.weapon && G.item(p.equip.weapon).twoHand) delete p.equip.weapon;
    if (!quiet) G.ui.toast('Equipped ' + d.name);
  };
  P.use = function (id) {
    const p = G.S.p, d = G.item(id), st = P.stats();
    if (d.type === 'weapon' || d.type === 'armor') return P.equip(id);
    if (d.type === 'potion' || d.type === 'food') {
      if (d.heal) p.hp = Math.min(st.hpMax, p.hp + d.heal);
      if (d.stam) p.stam = Math.min(st.stamMax, p.stam + d.stam);
      if (d.mana) p.mana = Math.min(st.manaMax, p.mana + d.mana);
      P.take(id, 1);
      G.ui.toast((d.type === 'food' ? 'Ate ' : 'Drank ') + d.name);
      G.audio && G.audio.play('drink');
      return;
    }
    if (d.type === 'tome') {
      if (p.spells.includes(d.spell)) { G.ui.toast('You already know ' + G.SPELLS[d.spell].name + '.'); return; }
      p.spells.push(d.spell);
      P.take(id, 1);
      G.ui.banner('Spell learned', G.SPELLS[d.spell].name);
      return;
    }
    G.ui.toast('You can\'t use that.');
  };
  P.quickHeal = function () {
    const order = ['potion_minor', 'potion_heal', 'potion_greater', 'venison', 'cheese', 'bread', 'apple'];
    const p = G.S.p, st = P.stats();
    const missing = st.hpMax - p.hp;
    if (missing <= 0) { G.ui.toast('You are unhurt.'); return; }
    let best = null;
    for (const id of order) if (P.count(id)) { if (!best || (G.item(id).heal <= missing && G.item(id).heal > G.item(best).heal)) best = id; }
    if (!best) { G.ui.toast('No healing items!'); return; }
    P.use(best);
  };
  P.raise = function (attr) {
    const p = G.S.p;
    if (p.pts <= 0) return;
    const before = P.stats();
    p.attr[attr]++; p.pts--;
    const after = P.stats();
    p.hp += after.hpMax - before.hpMax; p.stam += after.stamMax - before.stamMax; p.mana += after.manaMax - before.manaMax;
  };
  P.sellPrice = (id) => Math.max(1, Math.floor(G.item(id).value * 0.4));
  P.buyPrice = (id) => Math.max(1, Math.ceil(G.item(id).value * 1.1));
})(window.G);
