'use strict';
// Settlements, their people, and shops. Coordinates are in terrain cells (1 cell = 4 world units).
(function (G) {
  const H = (o) => Object.assign({ skin: '#b08868', hair: '#3a2a1e', hairStyle: 1, legs: '#2a2420' }, o);
  G.TOWNS = [
    { id: 'ravenhold', name: 'Ravenhold', major: true, x: 88, z: 132, r: 15, guard: 'guard', roof: 'slate', wall: 'brick', keep: true,
      desc: 'Seat of the old kingdom. Its walls still stand; its king does not.' },
    { id: 'emberfall', name: 'Emberfall', major: true, x: 132, z: 46, r: 12, guard: 'guard_ember', roof: 'slate', wall: 'brick_dark', snow: true,
      desc: 'A mountain hold of scholars and smiths, built around an undying forge.' },
    { id: 'duskport', name: 'Duskport', major: true, x: 200, z: 140, r: 13, guard: 'guard_dusk', roof: 'roof_red', wall: 'timber',
      desc: 'A grey harbour town on the Ashen Mere, smelling of tar and fish.' },
    { id: 'hollowbrook', name: 'Hollowbrook', major: false, x: 58, z: 200, r: 7, roof: 'thatch', wall: 'timber', desc: 'A quiet village of shepherds.' },
    { id: 'ashford', name: 'Ashford', major: false, x: 148, z: 104, r: 7, roof: 'thatch', wall: 'plaster', desc: 'A crossroads village where every road seems to meet.' },
    { id: 'mirefen', name: 'Mirefen', major: false, x: 182, z: 206, r: 7, roof: 'thatch', wall: 'planks_v', desc: 'Stilted huts above the sucking mud of the fens.' },
    { id: 'thornwick', name: 'Thornwick', major: false, x: 40, z: 66, r: 7, roof: 'slate', wall: 'timber', desc: 'A logging hamlet hemmed in by black pines.' },
  ];
  G.townById = (id) => G.TOWNS.find((t) => t.id === id);
  G.SITES = {
    watchtower: { name: 'Burned Watchtower', x: 112, z: 163 },
    spire: { name: 'The Ashen Spire', x: 226, z: 36 },
  };

  // Named people. role decides where they stand; shop decides what they trade.
  const N = (G.NPCS = {});
  const npc = (id, town, name, role, spec, extra) => { N[id] = Object.assign({ id, town, name, role, spec: 'npc_' + id }, extra || {}); G.SPR['npc_' + id] = spec; };
  // Hollowbrook
  npc('elder_maren', 'hollowbrook', 'Elder Maren', 'elder', H({ skin: '#c8a888', hair: '#d8d0c0', hairStyle: 2, robe: true, robeColor: '#3a3a4a', top: '#3a3a4a' }));
  npc('tam', 'hollowbrook', 'Shepherd Tam', 'farmer', H({ hat: 'cap', hoodColor: '#5a4a2a', top: '#4a5a3a', beard: '#6a4a2a' }));
  npc('brea', 'hollowbrook', 'Old Brea', 'shop', H({ hair: '#b0a090', hairStyle: 2, robe: true, robeColor: '#3a4a2a', top: '#3a4a2a', skin: '#c8a080' }), { shop: 'alchemist', title: 'Herbalist' });
  npc('doran', 'hollowbrook', 'Innkeep Doran', 'inn', H({ top: '#6a5a40', beard: '#4a3020', hairStyle: 0 }), { shop: 'inn', title: 'Innkeeper' });
  // Ravenhold
  npc('captain_voss', 'ravenhold', 'Captain Voss', 'captain', H({ armor: 'plate', armorColor: '#6a6e74', cape: '#6a1616', hair: '#2a2420', beard: '#2a2420', weapon: 'sword' }));
  npc('hale', 'ravenhold', 'Sergeant Hale', 'guardpost', H({ armor: 'chain', trim: '#6a1616', hat: 'helm', weapon: 'spear' }));
  npc('ostrava', 'ravenhold', 'Ostrava the Trader', 'shop', H({ top: '#5a3a5a', hair: '#1a1410', hairStyle: 2, robe: true, robeColor: '#5a3a5a', skin: '#c8a080' }), { shop: 'general', title: 'General Goods' });
  npc('pell', 'ravenhold', 'Courier Pell', 'wander', H({ top: '#6a5a2a', hat: 'cap', hoodColor: '#4a2a1a' }));
  npc('garrick', 'ravenhold', 'Garrick the Smith', 'shop', H({ top: '#3a2a20', beard: '#2a1e14', hairStyle: 0, skin: '#a07858', weapon: 'mace' }), { shop: 'smith', title: 'Blacksmith' });
  npc('aldous', 'ravenhold', 'Prior Aldous', 'temple', H({ robe: true, robeColor: '#c8c0a8', top: '#c8c0a8', hairStyle: 0 }), { shop: 'temple', title: 'Temple of the Pale Flame' });
  npc('mabel', 'ravenhold', 'Innkeep Mabel', 'inn', H({ robe: true, robeColor: '#6a3a2a', top: '#6a3a2a', hair: '#8a5a2a', hairStyle: 2 }), { shop: 'inn', title: 'The Crow\'s Rest' });
  // Emberfall
  npc('ilsa', 'emberfall', 'Archivist Ilsa', 'scholar', H({ robe: true, robeColor: '#2a2a5a', top: '#2a2a5a', hair: '#b04a2a', hairStyle: 2, skin: '#d0b098' }));
  npc('brund', 'emberfall', 'Brund Ironhand', 'shop', H({ top: '#3a3028', beard: '#b06030', hair: '#b06030', skin: '#c09070', weapon: 'axe' }), { shop: 'smith', title: 'Forgemaster' });
  npc('ylva', 'emberfall', 'Priestess Ylva', 'temple', H({ robe: true, robeColor: '#d8d8e0', top: '#d8d8e0', hair: '#e8e0c8', hairStyle: 2 }), { shop: 'temple', title: 'Shrine of Embers' });
  npc('coln', 'emberfall', 'Magister Coln', 'shop', H({ robe: true, robeColor: '#3a1a4a', top: '#3a1a4a', hat: 'wizard', hoodColor: '#3a1a4a', beard: '#c0c0c0', weapon: 'staff', orb: '#60a0ff' }), { shop: 'mage', title: 'Arcanist' });
  npc('sten', 'emberfall', 'Innkeep Sten', 'inn', H({ top: '#4a3a2a', beard: '#8a8a8a' }), { shop: 'inn', title: 'The Cold Hearth' });
  // Duskport
  npc('orrin', 'duskport', 'Harbormaster Orrin', 'harbor', H({ top: '#2a3a4a', hat: 'cap', hoodColor: '#1a2a3a', beard: '#8a8a8a', skin: '#a07858' }));
  npc('wenna', 'duskport', 'Wenna the Fisher', 'harbor', H({ top: '#4a5a4a', hair: '#5a3a1a', hairStyle: 2, skin: '#8a6448' }));
  npc('kesh', 'duskport', 'Captain Kesh', 'guardpost', H({ armor: 'leather', armorColor: '#2a3a3a', hat: 'helm', weapon: 'sword', skin: '#6a4a34' }));
  npc('selka', 'duskport', 'Selka the Fence', 'shop', H({ top: '#2a2a2a', hat: 'hood', hoodColor: '#1a1a1a', weapon: 'dagger' }), { shop: 'general', title: 'Curiosities' });
  npc('hugh', 'duskport', 'Hugh Tarhands', 'shop', H({ top: '#3a2a20', beard: '#1a1410', skin: '#8a6448' }), { shop: 'smith', title: 'Smithy' });
  npc('rosa', 'duskport', 'Innkeep Rosa', 'inn', H({ robe: true, robeColor: '#4a2a3a', top: '#4a2a3a', hair: '#1a1410', hairStyle: 2, skin: '#8a6448' }), { shop: 'inn', title: 'The Drowned Rat' });
  // villages
  npc('hollis', 'ashford', 'Reeve Hollis', 'elder', H({ top: '#5a4a2a', hat: 'cap', hoodColor: '#3a2a1a', beard: '#5a4a3a' }));
  npc('marta', 'ashford', 'Marta of the Crossroads', 'shop', H({ robe: true, robeColor: '#5a4a3a', top: '#5a4a3a', hair: '#6a4a2a', hairStyle: 2 }), { shop: 'general', title: 'Trader' });
  npc('agna', 'mirefen', 'Agna the Fen-Witch', 'elder', H({ robe: true, robeColor: '#2a3a2a', top: '#2a3a2a', hat: 'hood', hoodColor: '#1a2a1a', skin: '#8a9070', hairStyle: 2, hair: '#3a3a3a' }), { shop: 'alchemist', title: 'Fen-Witch' });
  npc('oswin', 'thornwick', 'Oswin the Hermit', 'elder', H({ robe: true, robeColor: '#4a3a2a', top: '#4a3a2a', beard: '#d8d0c0', hair: '#d8d0c0', hairStyle: 2 }));
  npc('thornwick_inn', 'thornwick', 'Innkeep Ruda', 'inn', H({ robe: true, robeColor: '#3a4a3a', top: '#3a4a3a', hair: '#8a6a3a', hairStyle: 2 }), { shop: 'inn', title: 'The Felled Pine' });

  G.SHOPS = {
    general: { name: 'General Goods', stock: ['bread', 'cheese', 'apple', 'ale', 'potion_minor', 'potion_stamina', 'lockpick', 'leather_chest', 'leather_head', 'leather_feet', 'leather_hands', 'iron_dagger', 'rusty_sword', 'hunting_bow', 'arrows'], buys: 'all' },
    smith: { name: 'Smithy', stock: ['iron_dagger', 'iron_sword', 'iron_axe', 'iron_mace', 'iron_greatsword', 'steel_sword', 'steel_axe', 'steel_mace', 'iron_head', 'iron_chest', 'iron_hands', 'iron_feet', 'iron_shield', 'steel_chest', 'steel_shield', 'steel_head', 'yew_longbow', 'recurve_bow', 'arrows'], buys: ['weapon', 'armor', 'ammo'] },
    alchemist: { name: 'Apothecary', stock: ['potion_minor', 'potion_heal', 'potion_stamina', 'potion_mana', 'antidote', 'potion_greater'], buys: ['potion', 'misc', 'food'] },
    temple: { name: 'Temple', stock: ['potion_heal', 'tome_heal', 'tome_ward', 'potion_mana'], buys: ['misc', 'tome'], heal: true },
    mage: { name: 'Arcanum', stock: ['tome_firebolt', 'tome_frost', 'tome_ward', 'tome_heal', 'tome_drain', 'oak_staff', 'runed_staff', 'potion_mana'], buys: ['tome', 'misc', 'weapon'] },
    inn: { name: 'Inn', stock: ['bread', 'cheese', 'ale', 'venison', 'apple'], buys: ['food'], rest: 10 },
  };

  // greetings by role, and rumours that point at the wider world
  G.GREET = {
    elder: ['The old ways are failing us. What brings you?', 'Speak, child. These are dark days.'],
    farmer: ['Mind the sheep.', 'Wolves get bolder every night.'],
    shop: ['Coin talks. What\'ll it be?', 'Browse, but don\'t bleed on anything.'],
    inn: ['A bed and a hot meal will see you right.', 'Sit by the fire, stranger.'],
    captain: ['Make it quick, I have a city to hold.', 'State your business.'],
    guardpost: ['Keep your blade sheathed inside the walls.', 'Trouble on the roads again.'],
    wander: ['Can\'t talk long, places to be.', 'Did you see the sky last night? Red as a wound.'],
    temple: ['May the Pale Flame keep you.', 'The dead do not rest as they used to.'],
    scholar: ['Careful with those boots, these floors are older than kingdoms.', 'Knowledge is the only light left to us.'],
    harbor: ['The Mere gives and the Mere takes.', 'Nothing good comes out of that water anymore.'],
    commoner: ['Leave me be.', 'The harvest failed again.', 'They say the dead walk in the barrows.', 'Stay off the roads after dark.', 'Have you seen my brother? He went north.', 'The crown burned, they say. Burned and broke.'],
    guard: ['Move along.', 'I used to be a farmer, before all this.', 'Seen any cultists? Report them to the Captain.', 'Ravenhold stands. For now.'],
  };
})(window.G);
