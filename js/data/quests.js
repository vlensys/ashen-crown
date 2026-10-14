'use strict';
// Quest definitions. Objective types:
//   talk   - satisfied as soon as you speak to the turn-in NPC
//   kill   - kill n creatures of a family/id (optionally only at night)
//   collect- have n of an item (taken on turn-in)
//   fetch  - an item guarded by the boss of a reserved dungeon {kind, near}
//   boss   - kill the boss of a reserved dungeon
(function (G) {
  const Q = (G.QUESTS = {});
  G.QUEST_ORDER = [];
  const quest = (id, o) => { o.id = id; o.turnIn = o.turnIn || o.giver; o.requires = o.requires || []; Q[id] = o; G.QUEST_ORDER.push(id); };

  // ===================== MAIN QUEST =====================
  quest('mq1', { main: true, title: 'Ashes at Dawn', giver: 'elder_maren', turnIn: 'captain_voss',
    summary: 'The sky burned red over Hollowbrook and ash fell like snow. Elder Maren asked me to carry word to Captain Voss in Ravenhold, north along the road.',
    obj: [{ type: 'talk', text: 'Speak with Captain Voss in Ravenhold' }],
    offer: ['You\'re awake. Good. Half the village is still too frightened to open their shutters.', 'Last night the sky split open and rained ash. The old songs say that happened once before - the night the Ashen King took the throne.', 'Ravenhold must know. Go north along the road and find Captain Voss. Tell him Hollowbrook saw the Burning.'],
    accept: 'Take the road north. Stay off it after dark if you can.',
    done: ['Hollowbrook too? Then it wasn\'t only our sky.', 'Ash on the wind, and cultists on the roads crying that the King returns. I hoped they were madmen.'],
    reward: { xp: 60, gold: 25 } });
  quest('mq2', { main: true, title: 'Embers in the Watchtower', giver: 'captain_voss', requires: ['mq1'],
    summary: 'Cultists of the Cinder have seized the burned watchtower south-east of Ravenhold. Captain Voss wants their leader dead and his sigil brought back.',
    obj: [{ type: 'collect', item: 'cult_sigil', n: 1, text: 'Take the Cinder Sigil from Zealot Brannoc at the Burned Watchtower', site: 'watchtower' }],
    offer: ['My scouts found cultists squatting in the old watchtower, south-east of here. They call themselves the Cinder.', 'Their leader, a zealot named Brannoc, carries a sigil. I want to know what it means. I can\'t spare soldiers - can you?'],
    accept: 'The tower is off the road toward Ashford. Bring me that sigil.',
    progress: 'The watchtower lies south-east of the city. Bring me Brannoc\'s sigil.',
    done: ['A crown wreathed in flame... This isn\'t a cult symbol, it\'s a royal seal. The old king\'s.', 'Take this blade. It served me well before I took to desks and dispatches.'],
    reward: { xp: 180, gold: 80, items: [['vosss_blade', 1]] } });
  quest('mq3', { main: true, title: 'The Archivist', giver: 'captain_voss', turnIn: 'ilsa', requires: ['mq2'],
    summary: 'The sigil bears the seal of the Ashen King. Captain Voss sent me to Archivist Ilsa in Emberfall, high in the northern mountains.',
    obj: [{ type: 'talk', text: 'Bring the sigil to Archivist Ilsa in Emberfall' }],
    offer: ['There is one person who might read this seal. Archivist Ilsa, in Emberfall - up in the northern mountains.', 'Go to her. Show her the sigil.'],
    accept: 'Follow the mountain road north from Ashford.',
    done: ['Voss sent you? With *this*? Sit. Don\'t touch anything.', 'This is the seal of King Aldric the Ashen. The one who burned. If the Cinder carry it, they mean to bring him back.'],
    reward: { xp: 100, gold: 0 } });
  quest('mq4', { main: true, title: 'Tome of Cinders', giver: 'ilsa', requires: ['mq3'],
    summary: 'Ilsa needs the Tome of Cinders, buried with a barrow lord in a crypt near Emberfall, to learn how the Ashen King was first destroyed.',
    obj: [{ type: 'fetch', item: 'tome_cinders', dungeon: { kind: 'crypt', near: 'emberfall' }, boss: 'barrow_lord', text: 'Recover the Tome of Cinders from the crypt' }],
    offer: ['The histories say the King was not killed. He was unmade - his crown broken into three shards and scattered.', 'How it was done is written in the Tome of Cinders, buried with one of his lords in a barrow near here. I\'ve marked it on your map.'],
    accept: 'The dead in that barrow will not welcome you. Go armed.',
    progress: 'The Tome lies with the barrow lord. It\'s marked on your map.',
    done: ['You found it. Gods, the binding is still warm.', 'Take this robe - it was meant for an archivist, but you\'ve earned it more than I.'],
    reward: { xp: 320, gold: 100, items: [['scholars_robe', 1], ['tome_frost', 1]] } });
  quest('mq5', { main: true, title: 'The Harbormaster', giver: 'ilsa', turnIn: 'orrin', requires: ['mq4'],
    summary: 'The Tome says one shard of the crown, the Shard of Dusk, was sunk in the Ashen Mere. Harbormaster Orrin of Duskport may know where.',
    obj: [{ type: 'talk', text: 'Ask Harbormaster Orrin in Duskport about the Shard of Dusk' }],
    offer: ['Three shards: Dusk, Embers and Night. If the Cinder gather them, the King returns whole.', 'We must find them first. The Shard of Dusk was sunk near the Ashen Mere. Ask Harbormaster Orrin in Duskport - nothing moves on that water without him knowing.'],
    accept: 'Duskport lies far to the east, on the shore of the Mere.',
    done: ['A shard of a crown? Sunk in the Mere?', '...There\'s a drowned crypt on the shore. My men won\'t go near it. Say there\'s a knight down there who never stopped guarding something.'],
    reward: { xp: 80 } });
  quest('mq6', { main: true, title: 'Shard of Dusk', giver: 'orrin', requires: ['mq5'],
    summary: 'Orrin believes the Shard of Dusk is guarded by a drowned knight in a crypt near Duskport.',
    obj: [{ type: 'fetch', item: 'shard_dusk', dungeon: { kind: 'crypt', near: 'duskport' }, boss: 'drowned_knight', text: 'Take the Shard of Dusk from the Drowned Knight' }],
    offer: ['If you mean to go down there, I won\'t stop you. I\'ll mark it on your map.'],
    accept: 'May the Mere spit you back out.',
    progress: 'The drowned crypt is marked on your map.',
    done: ['You came back. Few do. Keep that thing away from my boats.'],
    reward: { xp: 450, gold: 200 } });
  quest('mq7', { main: true, title: 'Shard of Embers', giver: 'ilsa', requires: ['mq4'],
    summary: 'The Shard of Embers was fed to a troll king in the mountain caves near Emberfall. It must be cut out of him.',
    obj: [{ type: 'fetch', item: 'shard_embers', dungeon: { kind: 'cave', near: 'emberfall' }, boss: 'troll_king', text: 'Take the Shard of Embers from Gorrak the Troll King' }],
    offer: ['The Tome is grotesque about the second shard. It was fed to a troll - and trolls live a very, very long time.', 'Gorrak still rules a cave near Emberfall. The shard is inside him.'],
    accept: 'Trolls hate fire. I\'m told.',
    progress: 'Gorrak\'s cave is marked on your map.',
    done: ['It\'s still hot. Don\'t tell me how you got it.'],
    reward: { xp: 500, gold: 150, items: [['emberwood_staff', 1]] } });
  quest('mq8', { main: true, title: 'Shard of Night', giver: 'captain_voss', requires: ['mq4'],
    summary: 'Voss\'s spies say the Cinder hold the Shard of Night in a fort near Ravenhold, guarded by their high priestess.',
    obj: [{ type: 'fetch', item: 'shard_night', dungeon: { kind: 'fort', near: 'ravenhold' }, boss: 'cult_lieutenant', text: 'Take the Shard of Night from Ashwife Seraphine' }],
    offer: ['Ilsa\'s letter reached me. My spies say the Cinder already hold one shard - the Shard of Night.', 'Their high priestess, the Ashwife, keeps it in a ruined fort near the city. End her.'],
    accept: 'I\'ve marked the fort on your map. The Watch is with you, if only in spirit.',
    progress: 'The Ashwife\'s fort is marked on your map.',
    done: ['The Ashwife is dead? Then the Cinder are a body without a head.', 'Take this tabard of the Watch. You\'ve earned it.'],
    reward: { xp: 500, gold: 250, items: [['watch_tabard', 1]] } });
  quest('mq9', { main: true, title: 'The Unburnt Crown', giver: 'ilsa', requires: ['mq6', 'mq7', 'mq8'],
    summary: 'With all three shards, Ilsa can reforge the crown - not as the King\'s, but as a weapon against him.',
    obj: [{ type: 'collect', item: 'shard_dusk', n: 1, text: 'Bring the Shard of Dusk' }, { type: 'collect', item: 'shard_embers', n: 1, text: 'Bring the Shard of Embers' }, { type: 'collect', item: 'shard_night', n: 1, text: 'Bring the Shard of Night' }],
    offer: ['All three... Do you understand what you carry? Bring them to me. The forge below Emberfall has never gone out. It can unmake what was made.'],
    accept: 'Bring me all three shards.',
    progress: 'I need all three shards: Dusk, Embers and Night.',
    done: ['...It is done. The Unburnt Crown. It will not make anyone king - but it can find him, and it can wound him.', 'The forge gave up one more thing. A blade, quenched in the King\'s own fire. Ashbringer. Take it.'],
    reward: { xp: 800, gold: 300, items: [['crown_reforged', 1], ['ashbringer', 1]] } });
  quest('mq10', { main: true, title: 'The Ashen Spire', giver: 'ilsa', turnIn: 'elder_maren', requires: ['mq9'],
    summary: 'The Ashen King is rising in his Spire in the burned north-east. Ilsa says there will be no other chance.',
    obj: [{ type: 'boss', dungeon: { kind: 'spire' }, boss: 'ashen_king', text: 'Destroy the Ashen King in the Ashen Spire' }],
    offer: ['The crown hums when I face north-east. He is there - in the Spire, in the wasteland where nothing grows.', 'He is not whole yet. If you go now, you face a king without his crown. Go now.'],
    accept: 'Return to where this began when it is done. Someone should tell them it\'s over.',
    progress: 'The Ashen Spire waits in the north-east wastes.',
    done: ['You\'ve come home. And the sky... the sky has been clear for days.', 'The songs will be about you now, child. I hope you can live with that.', 'Rest. The world will still need you tomorrow - but tonight, rest.'],
    reward: { xp: 2000, gold: 1000, items: [['kings_bane', 1], ['ashen_plate', 1]] } });

  // ===================== SIDE QUESTS =====================
  quest('sq_wolves', { title: 'Wolves at the Fold', giver: 'tam',
    summary: 'Wolves are killing Shepherd Tam\'s flock. He wants five of them dead.',
    obj: [{ type: 'kill', family: 'wolf', n: 5, text: 'Kill wolves' }],
    offer: ['Wolves. Every night, more of them. I\'ve lost a dozen ewes this month.', 'Kill five of the beasts and I\'ll pay what I can.'],
    accept: 'They hunt in the woods all around. Mind yourself.', progress: 'Still hearing them howl at night.',
    done: ['Quiet at last. Here, it\'s not much.'], reward: { xp: 90, gold: 60, items: [['leather_feet', 1]] } });
  quest('sq_nightshade', { title: 'Grandmother\'s Remedy', giver: 'brea',
    summary: 'Old Brea needs nightshade for her remedies. It grows in the dark woods.',
    obj: [{ type: 'collect', item: 'nightshade', n: 4, text: 'Gather nightshade' }],
    offer: ['My joints won\'t take me into the woods anymore. Bring me four sprigs of nightshade - the purple flower, deadly in the wrong hands.'],
    accept: 'Look in the forests. Purple flowers, low to the ground.', progress: 'Four sprigs, dear.',
    done: ['Lovely. Take these, they\'ll keep you breathing.'], reward: { xp: 70, gold: 20, items: [['potion_minor', 3]] } });
  quest('sq_bounty', { title: 'The Red Hand', giver: 'hale',
    summary: 'Sergeant Hale has a bounty on the chieftain of the Red Hand bandits, holed up in a fort near Ravenhold.',
    obj: [{ type: 'fetch', item: 'bandit_badge', dungeon: { kind: 'fort', near: 'ravenhold' }, boss: 'bandit_chief', text: 'Bring the Red Hand token from the bandit chieftain' }],
    offer: ['The Red Hand robs every caravan that leaves the gate. Their chieftain hides in an old fort near here.', 'Bring me his token and the bounty is yours.'],
    accept: 'I\'ve marked the fort.', progress: 'The Red Hand still bleeds us.',
    done: ['That\'s his token alright. Here\'s your bounty.'], reward: { xp: 300, gold: 300 } });
  quest('sq_ledger', { title: 'The Lost Ledger', giver: 'ostrava',
    summary: 'Ostrava\'s caravan was ambushed and the ledger carried off into a cave near Ravenhold.',
    obj: [{ type: 'fetch', item: 'ledger', dungeon: { kind: 'cave', near: 'ravenhold' }, text: 'Recover Ostrava\'s ledger from the cave' }],
    offer: ['Thieves took my ledger. Every debt owed to me in this city is in that book.', 'They hid in a cave nearby. Bring it back and I\'ll make it worth your while.'],
    accept: 'I\'ve marked the cave.', progress: 'My ledger, please. I\'m losing money by the hour.',
    done: ['My beautiful ledger! Here, as promised.'], reward: { xp: 200, gold: 220 } });
  quest('sq_letter', { title: 'Letters to Duskport', giver: 'pell', turnIn: 'orrin',
    summary: 'Courier Pell asked me to deliver a sealed letter to Harbormaster Orrin in Duskport.',
    obj: [{ type: 'collect', item: 'sealed_letter', n: 1, text: 'Deliver the sealed letter to Harbormaster Orrin' }],
    offer: ['You look like someone who travels. I have a letter for the Harbormaster of Duskport, and my legs are done for.'],
    accept: 'Don\'t open it. Seriously.', give: [['sealed_letter', 1]],
    done: ['A letter from the capital? About time. Here, for your trouble.'], reward: { xp: 120, gold: 90 } });
  quest('sq_ore', { title: 'Cold Iron', giver: 'brund',
    summary: 'Brund Ironhand needs iron ore, mined from veins found deep in caves.',
    obj: [{ type: 'collect', item: 'iron_ore', n: 5, text: 'Mine iron ore in caves' }],
    offer: ['The mines up here flooded years ago. I need ore - five chunks. You\'ll find veins in the caves if you\'re brave enough.'],
    accept: 'Look for rust-red veins in the rock.', progress: 'Five chunks of ore.',
    done: ['Good iron. Here, I made this with the last batch.'], reward: { xp: 180, gold: 50, items: [['steel_sword', 1]] } });
  quest('sq_barrow', { title: 'The Restless Barrow', giver: 'ylva',
    summary: 'Priestess Ylva says the dead are stirring in a barrow near Emberfall. Its master must be put down.',
    obj: [{ type: 'boss', dungeon: { kind: 'crypt', near: 'emberfall' }, text: 'Put the barrow\'s master to rest' }],
    offer: ['The dead in the barrow below the pass will not lie still. Their master calls them.', 'End it, and the Shrine will teach you its ward.'],
    accept: 'I\'ve marked the barrow.', progress: 'The barrow still stirs.',
    done: ['I felt them settle. Thank you. Take this tome.'], reward: { xp: 300, gold: 80, items: [['tome_ward', 1]] } });
  quest('sq_bell', { title: 'The Drowned Bell', giver: 'wenna',
    summary: 'Wenna wants the old harbour bell back - smugglers dragged it into a cave near Duskport.',
    obj: [{ type: 'fetch', item: 'drowned_bell', dungeon: { kind: 'cave', near: 'duskport' }, text: 'Recover the Drowned Bell' }],
    offer: ['The harbour bell rang for the dead for two hundred years. Then smugglers stole it.', 'They took it to a cave on the shore. Bring it home.'],
    accept: 'I\'ve marked the cave.', progress: 'The bell, stranger.',
    done: ['You found it! Listen to that tone... Here.'], reward: { xp: 220, gold: 200 } });
  quest('sq_smugglers', { title: 'Smuggler\'s Due', giver: 'kesh',
    summary: 'Captain Kesh wants bandits culled from the eastern roads.',
    obj: [{ type: 'kill', family: 'bandit', n: 6, text: 'Kill bandits' }],
    offer: ['Bandits are strangling the trade roads. Kill six of them and the town will pay.'],
    accept: 'They camp along the roads.', progress: 'Six bandits.',
    done: ['Good work. Here\'s the town\'s thanks.'], reward: { xp: 200, gold: 150, items: [['iron_shield', 1]] } });
  quest('sq_ghouls', { title: 'Ghouls at Night', giver: 'hollis',
    summary: 'Reeve Hollis says ghouls stalk Ashford\'s fields after dark.',
    obj: [{ type: 'kill', family: 'undead', id: 'ghoul', n: 4, text: 'Kill ghouls (they hunt at night)' }],
    offer: ['Things come out of the old graves when the sun goes down. Ghouls. Kill four and I\'ll pay.'],
    accept: 'They only walk at night.', progress: 'Four ghouls. Night is when they come.',
    done: ['We\'ll sleep easier. Thank you.'], reward: { xp: 180, gold: 120 } });
  quest('sq_lotus', { title: 'Fen Fever', giver: 'agna',
    summary: 'Agna the Fen-Witch needs marsh lotus to brew a cure for the fever spreading through Mirefen.',
    obj: [{ type: 'collect', item: 'marsh_lotus', n: 3, text: 'Gather marsh lotus in the fens' }],
    offer: ['The fever takes another child every week. I can brew a cure, with marsh lotus. Three blooms.'],
    accept: 'They float in the shallow pools of the fen.', progress: 'Three blooms.',
    done: ['These will do. Take this - it is old magic, use it sparingly.'], reward: { xp: 180, gold: 40, items: [['antidote', 2], ['tome_drain', 1]] } });
  quest('sq_lantern', { title: 'The Hermit\'s Lantern', giver: 'oswin',
    summary: 'Oswin lost his lantern fleeing a ruin near Thornwick.',
    obj: [{ type: 'fetch', item: 'hermit_lantern', dungeon: { kind: 'ruin', near: 'thornwick' }, text: 'Find Oswin\'s lantern in the ruin' }],
    offer: ['I went poking in the ruins and the bones got up. I ran. Left my lantern behind.', 'It\'s been in my family a long time. Fetch it?'],
    accept: 'I\'ve marked the ruin.', progress: 'My lantern...',
    done: ['My lantern! Here, take my old staff, I won\'t be needing it.'], reward: { xp: 150, gold: 30, items: [['runed_staff', 1]] } });
})(window.G);
