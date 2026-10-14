'use strict';
// Creatures, and the sprite specs every person/creature is drawn from.
(function (G) {
  const SPR = (G.SPR = {}); // sprite key -> spec for textures.js
  const CR = (G.CREATURES = {});
  const cr = (id, o, spec) => {
    o.id = id; o.sprite = o.sprite || id;
    o.w = o.w || (o.big ? 1.9 : 1.15); o.h = o.h || (o.big ? 2.7 : 1.75);
    o.reach = o.reach || 1.7; o.atk = o.atk || 1.1; o.speed = o.speed || 3; o.aggro = o.aggro || 14; o.armor = o.armor || 0;
    CR[id] = o;
    if (spec) SPR[o.sprite] = spec;
    return o;
  };
  // animals & beasts
  cr('wolf', { name: 'Grey Wolf', lvl: 1, hp: 30, dmg: [3, 7], speed: 4.6, atk: 0.9, xp: 15, w: 1.7, h: 1.05, flip: true, loot: [['wolf_pelt', 0.5]], family: 'wolf' }, { beast: 'wolf', c: '#5a5a5e' });
  cr('dire_wolf', { name: 'Dire Wolf', lvl: 6, hp: 80, dmg: [8, 14], speed: 5, atk: 0.9, xp: 45, w: 2.0, h: 1.25, flip: true, loot: [['wolf_pelt', 0.8]], family: 'wolf' }, { beast: 'wolf', c: '#26262a', eye: '#e03020' });
  cr('rat', { name: 'Plague Rat', lvl: 1, hp: 12, dmg: [2, 4], speed: 4, atk: 0.8, xp: 6, w: 0.9, h: 0.5, flip: true, reach: 1.3 }, { beast: 'rat' });
  cr('spider', { name: 'Cave Spider', lvl: 3, hp: 40, dmg: [4, 8], speed: 4.2, xp: 22, w: 1.8, h: 1.1, flip: false, loot: [['spider_silk', 0.5]], family: 'spider' }, { beast: 'spider' });
  cr('broodmother', { name: 'Broodmother', lvl: 8, hp: 320, dmg: [12, 20], speed: 3.8, xp: 260, w: 3.6, h: 2.2, boss: true, loot: [['spider_silk', 1]], family: 'spider', armor: 6 }, { beast: 'spider', c: '#2a1414', mark: '#e0c020' });
  cr('troll', { name: 'Cave Troll', lvl: 8, hp: 200, dmg: [14, 22], speed: 2.8, atk: 1.6, reach: 2.4, xp: 140, big: true, w: 2.4, h: 3.2, loot: [['troll_fat', 0.8]], armor: 8, family: 'troll' }, { beast: 'troll' });
  cr('troll_king', { name: 'Gorrak the Troll King', lvl: 12, hp: 560, dmg: [20, 30], speed: 3, atk: 1.5, reach: 2.6, xp: 600, big: true, w: 2.9, h: 3.8, boss: true, loot: [['troll_fat', 1]], armor: 12, family: 'troll' }, { beast: 'troll', c: '#3a4436', crown: true });
  // people
  const H = (o) => Object.assign({ skin: '#a88060', hair: '#3a2a1e', hairStyle: 1 }, o);
  cr('bandit', { name: 'Bandit', lvl: 2, hp: 45, dmg: [4, 8], speed: 3.4, xp: 25, family: 'bandit', gold: true }, H({ armor: 'leather', armorColor: '#3a2a1c', legs: '#2a2420', hat: 'hood', hoodColor: '#2e2a26', weapon: 'dagger' }));
  cr('bandit_brute', { name: 'Bandit Brute', lvl: 5, hp: 85, dmg: [8, 13], speed: 3.1, atk: 1.3, xp: 50, armor: 6, family: 'bandit', gold: true }, H({ armor: 'chain', legs: '#2a2420', hat: 'helm', weapon: 'axe', beard: '#3a2a1e' }));
  cr('bandit_chief', { name: 'Red Hand Chieftain', lvl: 7, hp: 280, dmg: [12, 18], speed: 3.4, atk: 1.1, xp: 300, armor: 10, boss: true, family: 'bandit', gold: true }, H({ armor: 'plate', armorColor: '#5a2420', cape: '#6a1616', hat: 'helm', weapon: 'sword', shield: '#4a1a1a' }));
  cr('cultist', { name: 'Cinder Cultist', lvl: 4, hp: 45, dmg: [3, 6], speed: 3, xp: 35, ranged: { proj: 'bolt_fire', dmg: [7, 11], range: 18, cd: 2.6, color: [1, 0.5, 0.15] }, family: 'cult', gold: true }, H({ robe: true, robeColor: '#5a1410', top: '#5a1410', hat: 'hood', hoodColor: '#3a0c08', weapon: 'staff', orb: '#f07020' }));
  cr('cult_zealot', { name: 'Zealot Brannoc', lvl: 5, hp: 170, dmg: [8, 13], speed: 3.2, xp: 200, boss: true, ranged: { proj: 'bolt_fire', dmg: [9, 14], range: 18, cd: 3 }, family: 'cult', gold: true, armor: 4 }, H({ robe: true, robeColor: '#7a1a10', top: '#7a1a10', hat: 'hood', hoodColor: '#1a0806', weapon: 'staff', orb: '#ffb020', cape: '#2a0a06' }));
  cr('cult_lieutenant', { name: 'Ashwife Seraphine', lvl: 11, hp: 420, dmg: [14, 20], speed: 3.3, xp: 650, boss: true, ranged: { proj: 'bolt_dark', dmg: [16, 24], range: 20, cd: 2.2, color: [0.6, 0.2, 0.9] }, family: 'cult', gold: true, armor: 10 }, H({ armor: 'plate', armorColor: '#2a2028', cape: '#5a1410', hat: 'crown', hair: '#d8d8d8', hairStyle: 2, weapon: 'staff', orb: '#a040e0', skin: '#c0a090' }));
  cr('skeleton', { name: 'Skeleton', lvl: 3, hp: 38, dmg: [4, 8], speed: 2.9, xp: 25, undead: true, loot: [['bone_dust', 0.5]], family: 'undead' }, { undead: 'skel', skin: '#d8d0b8', legs: '#00000000', weapon: 'sword', weaponColor: '#7a6a5a', shield: '#4a3a2a' });
  cr('bone_mage', { name: 'Bone Mage', lvl: 6, hp: 50, dmg: [4, 7], speed: 2.8, xp: 50, undead: true, ranged: { proj: 'bolt_green', dmg: [9, 14], range: 18, cd: 2.4, color: [0.4, 0.9, 0.3] }, loot: [['bone_dust', 0.8]], family: 'undead' }, { undead: 'skel', skin: '#d8d0b8', robe: true, robeColor: '#1e2a1a', top: '#1e2a1a', hat: 'hood', hoodColor: '#141e12', weapon: 'staff', orb: '#60e040', eyes: '#60e040' });
  cr('hollowed', { name: 'Hollowed', lvl: 6, hp: 80, dmg: [9, 14], speed: 2.9, atk: 1.3, xp: 55, undead: true, armor: 5, family: 'undead' }, { undead: 'draugr', skin: '#6a7478', top: '#2a2826', legs: '#22201e', hat: 'helm', helmColor: '#4a3e32', weapon: 'axe', weaponColor: '#5a5048', eyes: '#60c0ff', beard: '#3a3e40' });
  cr('barrow_lord', { name: 'The Barrow Lord', lvl: 9, hp: 360, dmg: [14, 22], speed: 3, atk: 1.3, xp: 420, undead: true, armor: 12, boss: true, family: 'undead' }, { undead: 'draugr', skin: '#5a646a', armor: 'plate', armorColor: '#3a3632', cape: '#2a3a3a', hat: 'crown', weapon: 'sword', weaponColor: '#8ac0d0', eyes: '#60c0ff', beard: '#6a7478' });
  cr('drowned_knight', { name: 'The Drowned Knight', lvl: 10, hp: 420, dmg: [16, 24], speed: 2.9, atk: 1.3, xp: 520, undead: true, armor: 14, boss: true, family: 'undead' }, { undead: 'draugr', skin: '#4a6a6a', armor: 'plate', armorColor: '#3a4a4a', hat: 'greathelm', helmColor: '#3a4a4a', weapon: 'sword', weaponColor: '#7aa0a0', shield: '#2a3a3a', eyes: '#40e0c0' });
  cr('wraith', { name: 'Wraith', lvl: 9, hp: 90, dmg: [10, 16], speed: 3.4, xp: 90, undead: true, ranged: { proj: 'bolt_frost', dmg: [12, 18], range: 16, cd: 2.8, color: [0.4, 0.7, 1] }, family: 'undead', float: true }, { beast: 'wraith' });
  cr('ghoul', { name: 'Ghoul', lvl: 4, hp: 55, dmg: [6, 10], speed: 3.8, atk: 0.9, xp: 35, undead: true, family: 'undead', night: true }, { undead: 'draugr', skin: '#7a8070', top: '#2a2420', legs: '#2a2420', hairStyle: 0, eyes: '#e0e040' });
  cr('ashen_knight', { name: 'Ashen Knight', lvl: 14, hp: 220, dmg: [18, 26], speed: 3.2, atk: 1.2, xp: 220, armor: 16, family: 'ashen' }, { armor: 'plate', armorColor: '#2a2422', skin: '#3a2a22', cape: '#5a1a0a', hat: 'greathelm', helmColor: '#2a2422', weapon: 'sword', weaponColor: '#e07030', shield: '#2a1a14', undead: true, eyes: '#ff8020' });
  cr('ashen_king', { name: 'The Ashen King', lvl: 18, hp: 1500, dmg: [26, 38], speed: 3.4, atk: 1.25, reach: 3, xp: 3000, armor: 20, boss: true, final: true, big: true, w: 2.4, h: 3.6, ranged: { proj: 'bolt_fire', dmg: [22, 32], range: 22, cd: 3.2, color: [1, 0.45, 0.1] }, family: 'ashen' }, { big: true, armor: 'plate', armorColor: '#1e1a1a', skin: '#2a1a14', cape: '#7a1a08', hat: 'crown', weapon: 'sword', weaponColor: '#ff7020', undead: true, eyes: '#ffa020', shield: '#1a1414' });

  // which creatures appear where
  G.THEMES = {
    cave: { normal: ['spider', 'spider', 'wolf', 'dire_wolf', 'troll', 'rat', 'bandit'], boss: ['broodmother', 'troll_king'] },
    fort: { normal: ['bandit', 'bandit', 'bandit_brute', 'cultist', 'bandit_brute'], boss: ['bandit_chief', 'cult_lieutenant'] },
    crypt: { normal: ['skeleton', 'skeleton', 'bone_mage', 'hollowed', 'wraith', 'rat'], boss: ['barrow_lord', 'drowned_knight'] },
    spire: { normal: ['ashen_knight', 'wraith', 'hollowed', 'bone_mage', 'cultist'], boss: ['ashen_king'] },
  };
  G.scaleCreature = function (def, level) {
    // dungeon creatures scale gently with the dungeon's level
    const k = def.boss || def.final ? 1 : Math.max(1, 1 + (level - def.lvl) * 0.12);
    return { hp: Math.round(def.hp * k), dmg: [Math.round(def.dmg[0] * k), Math.round(def.dmg[1] * k)], k };
  };

  // ---------- generic townsfolk looks ----------
  const SK = ['#c8a080', '#b08868', '#8a6448', '#6a4a34', '#d8b898'];
  const HA = ['#1a1410', '#3a2a1e', '#6a4a2a', '#8a6a3a', '#b0a090', '#5a2a1a', '#d8d0c0'];
  const CL = ['#4a3a2a', '#3a4030', '#2e3440', '#5a4a30', '#4a2a2a', '#3a3a3a', '#5a5040', '#2a3a3a'];
  G.commonerSpec = function (seed) {
    const r = G.rng(seed);
    const female = r.chance(0.5);
    return { skin: r.pick(SK), hair: r.pick(HA), hairStyle: female ? 2 : r.pick([0, 1, 1]), top: r.pick(CL), legs: r.pick(['#2a2420', '#3a3028', '#2a2a2e']), robe: female && r.chance(0.6), robeColor: r.pick(CL), beard: !female && r.chance(0.35) ? r.pick(HA) : null, hat: r.chance(0.2) ? 'cap' : r.chance(0.15) ? 'hood' : null, hoodColor: r.pick(CL) };
  };
  for (let i = 0; i < 14; i++) SPR['commoner' + i] = G.commonerSpec(1000 + i * 17);
  SPR.guard = { skin: '#b08868', armor: 'chain', legs: '#2a2420', hat: 'helm', weapon: 'spear', trim: '#6a1616', shield: '#6a1616', cape: '#5a1414' };
  SPR.guard_ember = { skin: '#c8a080', armor: 'plate', armorColor: '#5a5a62', legs: '#2a2420', hat: 'greathelm', weapon: 'spear', cape: '#2a3a5a' };
  SPR.guard_dusk = { skin: '#8a6448', armor: 'leather', armorColor: '#2a3a3a', legs: '#2a2a2e', hat: 'helm', weapon: 'spear', shield: '#2a4a4a' };
})(window.G);
