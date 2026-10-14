# The Ashen Crown

A dark fantasy, first-person RPG in the style of the old Elder Scrolls games: a real 3D world
drawn at low resolution with crisp pixels, billboard sprites for people, monsters and trees,
fog, and torchlight. Open `index.html` in a browser to play. There is no server or install,
and it works offline. Everything, including the art and the sound, is generated in code.

## Controls

| | |
|---|---|
| Move · sprint · jump | WASD · Shift · Space |
| Look | Mouse (click the game to capture it) or arrow keys |
| Attack · block | Left click or F · hold right click or B |
| Cast the readied spell · ready spell 1–5 | R · 1–5 |
| Talk / open / loot / enter | E |
| Quick heal | Q |
| Inventory · Character · Journal · Map | I · C · J · M |
| Lantern (at night) | L |
| Pause, save, export/import a save code | Esc |

## The world

- **Towns:** three major walled towns (Ravenhold, Emberfall, Duskport) and four villages
  (Hollowbrook, Ashford, Mirefen, Thornwick), each with merchants, smiths, inns, temples,
  guards and townsfolk.
- **Dungeons:** caves, forts and crypts are placed and generated from a random seed for every
  new game, along with surface ruins and bandit camps. Inside are monsters, a boss, chests, and
  in caves, iron veins. Each dungeon remembers what you looted and killed.
- **Main questline:** 10 parts, *The Ashen Crown*, from Hollowbrook to the Ashen Spire.
- **Side quests:** 12 more.
- **Quest markers:**
  - A grey **!** means the person has a quest for you.
  - A yellow **!** means you've started it and it isn't finished.
  - A green **!** means the objectives are done and your reward is waiting.
  - No marker means there's nothing to do, though you can still talk to them.
- **Other systems:** three classes, levelling with attribute points, five spells, tiered
  weapons and armour, shops, inns (rest until morning), a day/night cycle, fast travel between
  towns you've visited, a journal, and a world map with an automap inside dungeons.

## Saves

The game autosaves in your browser. **Esc → Export save code** gives a text code
(`AC1.z.<base64>.<checksum>`: compressed JSON plus a checksum). Paste it into **Import save code**
on any device. Codes that are damaged are rejected.

## Project layout

```
js/core.js            math, RNG, noise
js/gfx/gl.js          WebGL2 renderer: atlas, per-vertex light, 8 point lights, fog, GPU billboards
js/gfx/textures.js    procedural pixel textures and sprites (people, monsters, trees, props)
js/data/              items, creatures, towns & NPCs, quests and dialogue
js/world/             terrain/biomes/roads, town and site builder, dungeon generator
js/game/              player, quests & markers, scene/AI/physics, combat, view, saving, sound
js/ui/ui.js           HUD, compass, dialogue, menus, shops, looting, map, title screen
```

`index.html?demo` starts a throwaway character that is never saved. Add `&dungeon=cave|fort|crypt`
to start inside a dungeon, or `&time=22` to start at night.
