'use strict';
// Quest runtime: state, objectives, markers and the dialogue options NPCs offer.
// Marker rules:
//   grey !   - this person has a quest you can start
//   yellow ! - you've started their quest (or it ends with them) and it isn't finished yet
//   green !  - objectives done: come here for your reward
//   nothing  - nothing to do (you can still talk to them)
(function (G) {
  const QE = (G.quests = {});
  const st = (id) => G.S.quests[id];
  QE.st = st;
  QE.isDone = (id) => !!(st(id) && st(id).st === 'done');
  QE.isActive = (id) => !!(st(id) && st(id).st === 'active');
  QE.available = (id) => !st(id) && G.QUESTS[id].requires.every(QE.isDone);
  QE.objDone = function (q, i) {
    const o = q.obj[i], s = st(q.id);
    if (!s) return false;
    if (o.type === 'talk') return true;
    if (o.type === 'kill') return (s.prog[i] || 0) >= o.n;
    if (o.type === 'collect' || o.type === 'fetch') return G.player.count(o.item) >= (o.n || 1);
    if (o.type === 'boss') return !!s.boss;
    return false;
  };
  QE.ready = (id) => QE.isActive(id) && G.QUESTS[id].obj.every((o, i) => QE.objDone(G.QUESTS[id], i));
  QE.dungeonOf = (id) => G.world.questDungeon[id];

  QE.start = function (id) {
    const q = G.QUESTS[id];
    G.S.quests[id] = { st: 'active', prog: q.obj.map(() => 0), t: G.S.time + G.S.day * 1440 };
    (q.give || []).forEach(([it, n]) => G.player.give(it, n));
    const dId = QE.dungeonOf(id);
    if (dId) G.S.p.discovered[dId] = 1;
    G.ui.banner(q.main ? 'Main Quest' : 'Quest Started', q.title);
    QE.refresh();
  };
  QE.complete = function (id) {
    const q = G.QUESTS[id];
    q.obj.forEach((o) => { if (o.type === 'collect' || o.type === 'fetch') G.player.take(o.item, o.n || 1); });
    G.S.quests[id].st = 'done';
    const r = q.reward || {};
    if (r.gold) G.player.give('gold', r.gold);
    (r.items || []).forEach(([it, n]) => G.player.give(it, n));
    if (r.xp) G.player.addXp(r.xp);
    G.ui.banner('Quest Complete', q.title);
    G.audio && G.audio.play('quest');
    if (id === 'mq10') setTimeout(() => G.ui.ending(), 2500);
    QE.refresh();
    G.save.auto();
  };
  QE.onKill = function (m) {
    for (const id of G.QUEST_ORDER) {
      if (!QE.isActive(id)) continue;
      const q = G.QUESTS[id], s = st(id);
      q.obj.forEach((o, i) => {
        if (o.type === 'kill' && (o.id ? m.def.id === o.id : m.def.family === o.family) && (s.prog[i] || 0) < o.n) {
          s.prog[i] = (s.prog[i] || 0) + 1;
          G.ui.toast(q.title + ': ' + s.prog[i] + '/' + o.n);
          if (s.prog[i] === o.n) G.ui.toast('Objective complete - return to ' + G.NPCS[q.turnIn].name);
        }
        if (o.type === 'boss' && m.boss && G.scene.dungeonId === QE.dungeonOf(id)) { s.boss = true; G.ui.toast('Objective complete - return to ' + G.NPCS[q.turnIn].name); }
      });
    }
    QE.refresh();
  };
  // does the boss of the dungeon you're in carry a quest item right now?
  QE.bossDrop = function (dId) {
    for (const id of G.QUEST_ORDER) {
      if (!QE.isActive(id) || QE.dungeonOf(id) !== dId) continue;
      for (const o of G.QUESTS[id].obj) if (o.type === 'fetch' && !G.player.count(o.item)) return o.item;
    }
    return null;
  };
  QE.needsBoss = function (dId) {
    for (const id of G.QUEST_ORDER) {
      if (!QE.isActive(id) || QE.dungeonOf(id) !== dId) continue;
      for (const o of G.QUESTS[id].obj) if ((o.type === 'fetch' && !G.player.count(o.item)) || (o.type === 'boss' && !st(id).boss)) return true;
    }
    return false;
  };

  // ---------- markers ----------
  let cache = {};
  QE.refresh = () => { cache = {}; G.ui && G.ui.dirty && G.ui.dirty(); };
  QE.marker = function (npcId) {
    if (npcId in cache) return cache[npcId];
    let m = null;
    for (const id of G.QUEST_ORDER) {
      const q = G.QUESTS[id];
      if (q.turnIn === npcId && QE.ready(id)) { m = 'green'; break; }
    }
    if (!m) for (const id of G.QUEST_ORDER) {
      const q = G.QUESTS[id];
      if (!QE.isActive(id)) continue;
      if (q.turnIn === npcId || (q.giver === npcId && q.turnIn === npcId)) { m = 'yellow'; break; }
    }
    if (!m) for (const id of G.QUEST_ORDER) if (G.QUESTS[id].giver === npcId && QE.available(id)) { m = 'grey'; break; }
    return (cache[npcId] = m);
  };

  // ---------- where to go ----------
  QE.npcPos = function (npcId) {
    const ent = G.scene && G.scene.ents && G.scene.ents.find((e) => e.npc && e.npc.id === npcId);
    if (ent && G.scene.kind === 'overworld') return { x: ent.x, z: ent.z };
    const n = G.NPCS[npcId];
    const L = G.world.towns.find((t) => t.t.id === n.town);
    const p = L && L.posts[npcId];
    return p ? { x: p.x, z: p.z } : null;
  };
  QE.targets = function () {
    const out = [];
    for (const id of G.QUEST_ORDER) {
      if (!QE.isActive(id)) continue;
      const q = G.QUESTS[id];
      let tgt = null;
      if (QE.ready(id)) tgt = QE.npcPos(q.turnIn);
      else {
        const i = q.obj.findIndex((o, k) => !QE.objDone(q, k));
        const o = q.obj[i];
        if (o && o.site) { const s = G.SITES[o.site]; tgt = { x: s.x * G.world.CS + 2, z: s.z * G.world.CS + 2 }; }
        else if (o && (o.type === 'fetch' || o.type === 'boss')) { const d = G.world.dungeons.find((x) => x.id === QE.dungeonOf(id)); if (d) tgt = { x: d.x, z: d.z, dungeon: d.id }; }
        else if (o && o.type === 'talk') tgt = QE.npcPos(q.turnIn);
      }
      if (tgt) out.push(Object.assign(tgt, { id, title: q.title, main: !!q.main }));
    }
    return out;
  };
  QE.objectiveText = function (q) {
    const s = st(q.id);
    return q.obj.map((o, i) => {
      let t = o.text;
      if (o.type === 'kill') t += ' (' + Math.min(o.n, (s && s.prog[i]) || 0) + '/' + o.n + ')';
      if (o.type === 'collect' && (o.n || 1) > 1) t += ' (' + Math.min(o.n, G.player.count(o.item)) + '/' + o.n + ')';
      return { text: t, done: QE.objDone(q, i) };
    });
  };

  // ---------- dialogue ----------
  // returns [{label, kind, run}] where run() returns the next dialogue screen
  QE.options = function (npcId) {
    const opts = [];
    for (const id of G.QUEST_ORDER) {
      const q = G.QUESTS[id];
      if (q.turnIn === npcId && QE.ready(id)) opts.push({ label: q.title, kind: 'done', run: () => ({ lines: q.done, after: () => QE.complete(id) }) });
    }
    for (const id of G.QUEST_ORDER) {
      const q = G.QUESTS[id];
      if (QE.isActive(id) && !QE.ready(id) && (q.giver === npcId || q.turnIn === npcId) && q.progress) opts.push({ label: q.title, kind: 'progress', run: () => ({ lines: [q.progress] }) });
    }
    for (const id of G.QUEST_ORDER) {
      const q = G.QUESTS[id];
      if (q.giver === npcId && QE.available(id)) opts.push({ label: q.title, kind: 'offer', run: () => ({ lines: q.offer, choice: [{ label: 'I\'ll do it.', run: () => { QE.start(id); return { lines: [q.accept] }; } }, { label: 'Not now.', run: () => null }] }) });
    }
    return opts;
  };
})(window.G);
