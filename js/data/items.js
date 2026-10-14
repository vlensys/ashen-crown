'use strict';
// Items. Inventory stacks are {id, n}. Equipment slots hold item ids.
(function (G) {
  const I = (G.ITEMS = {});
  const add = (id, o) => { o.id = id; o.value = o.value || 1; I[id] = o; return o; };
  G.item = (id) => { const d = I[id]; if (!d) throw new Error('unknown item ' + id); return d; };

  // ---------- weapons ----------
  const TIERS = (G.TIERS = [
    { k: 'rusty', n: 'Rusty', lvl: 1, m: 1, v: 1, c: '#7a5a40' },
    { k: 'iron', n: 'Iron', lvl: 3, m: 1.45, v: 3, c: '#8a8e94' },
    { k: 'steel', n: 'Steel', lvl: 6, m: 2.0, v: 8, c: '#b8bcc4' },
    { k: 'blackguard', n: 'Blackguard', lvl: 10, m: 2.7, v: 20, c: '#3a3a44' },
    { k: 'ebon', n: 'Ebon', lvl: 14, m: 3.5, v: 50, c: '#4a2a5a' },
  ]);
  const WEAPONS = (G.WEAPONS = {
    dagger: { n: 'Dagger', dmg: [3, 6], speed: 0.42, reach: 2.0, stam: 6, v: 10 },
    sword: { n: 'Sword', dmg: [5, 9], speed: 0.6, reach: 2.4, stam: 9, v: 25 },
    axe: { n: 'War Axe', dmg: [6, 11], speed: 0.72, reach: 2.4, stam: 11, v: 28 },
    mace: { n: 'Mace', dmg: [7, 12], speed: 0.8, reach: 2.3, stam: 12, v: 30, undead: 1.4 },
    greatsword: { n: 'Greatsword', dmg: [10, 17], speed: 1.0, reach: 2.9, stam: 18, v: 50, twoHand: true },
  });
  TIERS.forEach((t) => {
    for (const w in WEAPONS) {
      const b = WEAPONS[w];
      add(t.k + '_' + w, { name: t.n + ' ' + b.n, type: 'weapon', wtype: w, tier: t.lvl, dmg: [Math.round(b.dmg[0] * t.m), Math.round(b.dmg[1] * t.m)], speed: b.speed, reach: b.reach, stam: b.stam, undead: b.undead, twoHand: b.twoHand, value: Math.round(b.v * t.v), color: t.c });
    }
  });
  add('oak_staff', { name: 'Oak Staff', type: 'weapon', wtype: 'staff', tier: 1, dmg: [2, 5], speed: 0.7, reach: 2.5, stam: 7, spell: 0.15, value: 30, color: '#6a4a2a', twoHand: true });
  add('runed_staff', { name: 'Runed Staff', type: 'weapon', wtype: 'staff', tier: 6, dmg: [4, 8], speed: 0.7, reach: 2.5, stam: 7, spell: 0.4, value: 300, color: '#3a3a6a', twoHand: true });
  add('emberwood_staff', { name: 'Emberwood Staff', type: 'weapon', wtype: 'staff', tier: 12, dmg: [6, 11], speed: 0.7, reach: 2.5, stam: 7, spell: 0.75, value: 1600, color: '#8a2a10', twoHand: true });
  add('vosss_blade', { name: 'Watchman\'s Blade', type: 'weapon', wtype: 'sword', tier: 5, dmg: [10, 16], speed: 0.58, reach: 2.5, stam: 9, value: 400, color: '#c8ccd4', unique: true });
  add('ashbringer', { name: 'Ashbringer', type: 'weapon', wtype: 'greatsword', tier: 15, dmg: [32, 46], speed: 0.95, reach: 3.0, stam: 16, value: 5000, color: '#e07030', unique: true, twoHand: true, fire: 8 });
  add('kings_bane', { name: 'Kingsbane', type: 'weapon', wtype: 'sword', tier: 14, dmg: [24, 34], speed: 0.55, reach: 2.5, stam: 9, value: 4000, color: '#d0d8ff', unique: true, undead: 1.5 });

  // ---------- armour ----------
  const ARMOR_TIERS = [
    { k: 'leather', n: 'Leather', lvl: 1, a: 1, v: 1, c: '#5a3e24' },
    { k: 'iron', n: 'Iron', lvl: 4, a: 2, v: 3, c: '#7a7e84' },
    { k: 'steel', n: 'Steel', lvl: 8, a: 3, v: 8, c: '#a8acb4' },
    { k: 'blackguard', n: 'Blackguard', lvl: 12, a: 4.2, v: 20, c: '#34343c' },
    { k: 'ebon', n: 'Ebon', lvl: 16, a: 5.5, v: 50, c: '#40284e' },
  ];
  G.ARMOR_TIERS = ARMOR_TIERS;
  const SLOTS = { head: ['Helm', 2, 12], chest: ['Cuirass', 5, 30], hands: ['Gauntlets', 1, 8], feet: ['Boots', 1, 8], shield: ['Shield', 3, 18] };
  ARMOR_TIERS.forEach((t) => {
    for (const s in SLOTS) {
      const [n, a, v] = SLOTS[s];
      add(t.k + '_' + s, { name: t.n + ' ' + (t.k === 'leather' && s === 'chest' ? 'Jerkin' : t.k === 'leather' && s === 'head' ? 'Cap' : n), type: 'armor', slot: s, tier: t.lvl, armor: Math.round(a * t.a * 2), value: Math.round(v * t.v), color: t.c });
    }
  });
  add('ashen_plate', { name: 'Ashen Plate', type: 'armor', slot: 'chest', tier: 16, armor: 70, value: 4000, color: '#5a2a1a', unique: true });
  add('watch_tabard', { name: 'Watch Tabard', type: 'armor', slot: 'chest', tier: 4, armor: 18, value: 250, color: '#6a1616', unique: true });
  add('scholars_robe', { name: 'Archivist\'s Robe', type: 'armor', slot: 'chest', tier: 6, armor: 8, value: 600, color: '#2a2a5a', unique: true, mana: 40 });

  // ---------- consumables ----------
  add('potion_minor', { name: 'Minor Healing Draught', type: 'potion', heal: 30, value: 20, color: '#c02020' });
  add('potion_heal', { name: 'Healing Draught', type: 'potion', heal: 70, value: 55, color: '#e02a2a' });
  add('potion_greater', { name: 'Greater Healing Draught', type: 'potion', heal: 160, value: 140, color: '#ff4040' });
  add('potion_stamina', { name: 'Stamina Tonic', type: 'potion', stam: 80, value: 30, color: '#30a040' });
  add('potion_mana', { name: 'Mana Philtre', type: 'potion', mana: 70, value: 45, color: '#3050e0' });
  add('antidote', { name: 'Fen Antidote', type: 'potion', heal: 50, cure: true, value: 60, color: '#90c040' });
  add('bread', { name: 'Black Bread', type: 'food', heal: 12, value: 3, color: '#5a3a1a' });
  add('cheese', { name: 'Goat Cheese', type: 'food', heal: 18, value: 6, color: '#d8c060' });
  add('apple', { name: 'Shrivelled Apple', type: 'food', heal: 8, value: 2, color: '#8a2a1a' });
  add('ale', { name: 'Dark Ale', type: 'food', heal: 5, stam: 40, value: 5, color: '#6a4a1a' });
  add('venison', { name: 'Roast Venison', type: 'food', heal: 30, value: 12, color: '#7a3a2a' });

  // ---------- spell tomes ----------
  add('tome_firebolt', { name: 'Tome: Firebolt', type: 'tome', spell: 'firebolt', value: 120, color: '#c04010' });
  add('tome_frost', { name: 'Tome: Frost Lance', type: 'tome', spell: 'frost', value: 260, color: '#4080c0' });
  add('tome_ward', { name: 'Tome: Ashen Ward', type: 'tome', spell: 'ward', value: 300, color: '#a0a0a0' });
  add('tome_heal', { name: 'Tome: Mend', type: 'tome', spell: 'heal', value: 100, color: '#e0c040' });
  add('tome_drain', { name: 'Tome: Soul Drain', type: 'tome', spell: 'drain', value: 650, color: '#7a2aa0' });

  // ---------- valuables & materials ----------
  add('silver_ring', { name: 'Silver Ring', type: 'misc', value: 35, color: '#c0c0c8' });
  add('gold_chain', { name: 'Gold Chain', type: 'misc', value: 90, color: '#d0a030' });
  add('ruby', { name: 'Ruby', type: 'misc', value: 160, color: '#c01030' });
  add('sapphire', { name: 'Sapphire', type: 'misc', value: 140, color: '#2040c0' });
  add('old_coin', { name: 'Ancient Coin', type: 'misc', value: 25, color: '#a08040' });
  add('candlestick', { name: 'Silver Candlestick', type: 'misc', value: 18, color: '#b0b0b8' });
  add('idol', { name: 'Bone Idol', type: 'misc', value: 60, color: '#d8d0b0' });
  add('wolf_pelt', { name: 'Wolf Pelt', type: 'misc', value: 12, color: '#5a5a5c' });
  add('spider_silk', { name: 'Spider Silk', type: 'misc', value: 15, color: '#d8d8d8' });
  add('troll_fat', { name: 'Troll Fat', type: 'misc', value: 30, color: '#8a9a6a' });
  add('iron_ore', { name: 'Iron Ore', type: 'misc', value: 8, color: '#6a5a50' });
  add('nightshade', { name: 'Nightshade', type: 'misc', value: 6, color: '#6a2a9a' });
  add('marsh_lotus', { name: 'Marsh Lotus', type: 'misc', value: 9, color: '#d8b0c8' });
  add('bone_dust', { name: 'Bone Dust', type: 'misc', value: 5, color: '#c8c0a8' });
  add('lockpick', { name: 'Lockpick', type: 'misc', value: 4, color: '#8a8a8a' });

  // ---------- quest items ----------
  const q = (id, name, color) => add(id, { name, type: 'quest', value: 0, color });
  q('cult_sigil', 'Cinder Sigil', '#c04010');
  q('tome_cinders', 'Tome of Cinders', '#8a2a10');
  q('shard_dusk', 'Shard of Dusk', '#4060c0');
  q('shard_embers', 'Shard of Embers', '#e06020');
  q('shard_night', 'Shard of Night', '#5a2a8a');
  q('crown_reforged', 'The Unburnt Crown', '#e0c060');
  q('ledger', 'Ostrava\'s Ledger', '#6a4a2a');
  q('drowned_bell', 'Drowned Bell', '#4a6a6a');
  q('hermit_lantern', 'Hermit\'s Lantern', '#d0a040');
  q('sealed_letter', 'Sealed Letter', '#d8c8a0');
  q('blessed_ash', 'Urn of Blessed Ash', '#8a8a8a');
  q('bandit_badge', 'Red Hand Token', '#a02020');

  // ---------- spells ----------
  G.SPELLS = {
    firebolt: { name: 'Firebolt', mana: 12, dmg: [10, 16], proj: 'bolt_fire', color: [1.0, 0.5, 0.15], speed: 22 },
    frost: { name: 'Frost Lance', mana: 18, dmg: [14, 22], proj: 'bolt_frost', color: [0.4, 0.7, 1.0], speed: 28, slow: 3 },
    heal: { name: 'Mend', mana: 16, heal: 28, self: true },
    ward: { name: 'Ashen Ward', mana: 25, ward: 40, dur: 20, self: true },
    drain: { name: 'Soul Drain', mana: 22, dmg: [14, 20], proj: 'bolt_dark', color: [0.6, 0.2, 0.9], speed: 20, drain: 0.5 },
  };

  // ---------- loot tables ----------
  G.lootRoll = function (level, r, rich) {
    const out = [];
    const gold = r.int(2, 8) * (1 + level) * (rich ? 3 : 1);
    if (r.chance(0.75)) out.push(['gold', gold]);
    const n = rich ? r.int(2, 4) : r.int(0, 2);
    for (let i = 0; i < n; i++) {
      const k = r();
      if (k < 0.3) out.push([r.pick(['potion_minor', 'potion_minor', 'potion_heal', 'potion_stamina', 'potion_mana', level > 8 ? 'potion_greater' : 'potion_heal']), 1]);
      else if (k < 0.45) out.push([r.pick(['bread', 'cheese', 'apple', 'ale', 'venison']), 1]);
      else if (k < 0.65) out.push([r.pick(['silver_ring', 'old_coin', 'candlestick', 'idol', level > 5 ? 'gold_chain' : 'old_coin', level > 9 ? r.pick(['ruby', 'sapphire']) : 'silver_ring']), 1]);
      else if (k < 0.82) out.push([G.randomGear(level, r, 'weapon'), 1]);
      else if (k < 0.97) out.push([G.randomGear(level, r, 'armor'), 1]);
      else out.push([r.pick(['tome_firebolt', 'tome_frost', 'tome_ward', 'tome_heal', level > 10 ? 'tome_drain' : 'tome_frost']), 1]);
    }
    return out;
  };
  G.randomGear = function (level, r, kind) {
    const pool = Object.values(I).filter((d) => d.type === kind && !d.unique && d.tier <= level + 2 && d.tier >= Math.max(1, level - 7) && d.wtype !== 'staff');
    if (!pool.length) return kind === 'weapon' ? 'rusty_sword' : 'leather_chest';
    // favour higher tiers near the level
    pool.sort((a, b) => b.tier - a.tier);
    return pool[Math.min(pool.length - 1, Math.floor(r() * r() * pool.length))].id;
  };
})(window.G);
