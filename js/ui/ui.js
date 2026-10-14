'use strict';
// HUD, menus, dialogue, shops, looting, map, journal, title screen.
(function (G) {
  const U = (G.ui = { modal: null, castT: 0 });
  const $ = (id) => document.getElementById(id);
  const esc = G.esc;
  const P = () => G.S.p;

  // ---------- small pixel icons for items ----------
  const iconCache = {};
  G.icon = function (id) {
    if (iconCache[id]) return iconCache[id];
    const d = id === 'gold' ? { type: 'gold', color: '#e0c050' } : G.item(id);
    const p = G.tex.Pix(16, 16), c = d.color || '#888';
    const L = (x, y, w, h, col) => p.rect(x, y, w, h, col || c);
    const t = d.type === 'weapon' ? d.wtype : d.type === 'armor' ? d.slot : d.type;
    switch (t) {
      case 'dagger': p.line(4, 12, 11, 5, c); p.line(5, 12, 12, 5, c); L(3, 12, 3, 2, '#6a4a2a'); break;
      case 'sword': case 'greatsword': p.line(3, 13, 13, 3, c); p.line(4, 13, 14, 3, c); L(2, 11, 4, 1, '#8a7040'); L(1, 13, 3, 2, '#6a4a2a'); break;
      case 'axe': p.line(4, 14, 11, 4, '#6a4a2a'); L(9, 2, 5, 5); break;
      case 'mace': p.line(4, 14, 10, 6, '#6a4a2a'); L(9, 2, 5, 5); break;
      case 'staff': p.line(3, 15, 12, 4, '#6a4a2a'); L(11, 1, 4, 4); break;
      case 'head': L(4, 4, 8, 7); L(4, 10, 8, 2, '#222'); break;
      case 'chest': L(3, 3, 10, 11); L(6, 3, 4, 2, '#222'); break;
      case 'hands': L(4, 4, 6, 8); L(10, 6, 2, 4); break;
      case 'feet': L(4, 4, 4, 8); L(4, 10, 8, 3); break;
      case 'shield': L(3, 2, 10, 9); L(5, 11, 6, 2); L(7, 13, 2, 1); break;
      case 'potion': L(6, 2, 4, 3, '#a0b0b8'); L(4, 5, 8, 9); L(5, 6, 2, 3, '#ffffff80'); break;
      case 'food': p.ell(8, 9, 6, 4, c); break;
      case 'tome': L(3, 3, 10, 11); L(4, 4, 1, 9, '#d8c890'); L(8, 7, 3, 3, '#e0c040'); break;
      case 'gold': p.ell(6, 10, 4, 3, c); p.ell(10, 8, 4, 3, '#f0d870'); break;
      case 'quest': L(4, 3, 8, 10); L(5, 4, 6, 8, '#ffffff40'); break;
      default: p.ell(8, 8, 4, 4, c);
    }
    p.outline('#000');
    const cv = document.createElement('canvas'); cv.width = cv.height = 16;
    cv.getContext('2d').putImageData(new ImageData(p.d, 16, 16), 0, 0);
    return (iconCache[id] = cv.toDataURL());
  };
  // portrait from a sprite frame
  U.portrait = function (spriteKey) {
    const [x, y, w, h] = G.tex.rects[spriteKey + '_0'];
    const [pw, ph] = G.tex.sizes[spriteKey + '_0'];
    const cv = document.createElement('canvas'); cv.width = pw; cv.height = Math.round(ph * 0.45);
    cv.getContext('2d').drawImage(G.tex.atlas, Math.round(x * 2048), Math.round(y * 2048), pw, Math.round(ph * 0.45), 0, 0, pw, Math.round(ph * 0.45));
    cv.className = 'portrait';
    return cv;
  };

  // ---------- HUD ----------
  U.init = function () {
    $('btn-resume') && ($('btn-resume').onclick = () => U.close());
  };
  let lastHud = 0;
  U.hud = function () {
    const p = P(), st = G.player.stats();
    const bar = (id, v, m) => { $(id).style.width = (G.clamp(v / m, 0, 1) * 100).toFixed(1) + '%'; };
    bar('hp-fill', p.hp, st.hpMax); bar('st-fill', p.stam, st.stamMax); bar('mp-fill', p.mana, st.manaMax);
    $('hp-txt').textContent = Math.ceil(p.hp) + ' / ' + st.hpMax;
    const now = performance.now();
    if (now - lastHud > 150) {
      lastHud = now;
      $('hud-info').innerHTML = esc(st.weapon.name) + ' &nbsp;·&nbsp; ' + (p.spell ? esc(G.SPELLS[p.spell].name) + ' (' + G.SPELLS[p.spell].mana + ')' : 'no spell') + ' &nbsp;·&nbsp; ' + G.time.str() + (p.pts ? ' &nbsp;·&nbsp; <b>' + p.pts + ' points to spend (C)</b>' : '');
      $('xp-fill').style.width = (p.xp / G.player.xpNext(p.lvl) * 100).toFixed(1) + '%';
      $('lvl').textContent = p.lvl;
      U.compass();
      U.prompt();
    }
    U.castT = Math.max(0, U.castT - 1 / 60);
    $('vignette').style.opacity = G.clamp(1 - p.hp / st.hpMax * 2.2, 0, 0.85).toFixed(2);
  };
  U.compass = function () {
    const p = P(), el = $('compass');
    const items = [];
    const add = (ang, html, cls) => {
      const d = G.angDiff(p.yaw, ang);
      if (Math.abs(d) > 1.6) return;
      items.push('<span class="' + (cls || '') + '" style="left:' + (50 + d / 1.6 * 50).toFixed(2) + '%">' + html + '</span>');
    };
    const dirs = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 };
    for (const k in dirs) add(dirs[k], k, 'dir');
    for (const k of [Math.PI / 4, 3 * Math.PI / 4, -Math.PI / 4, -3 * Math.PI / 4]) add(k, '·', 'dir small');
    const angTo = (x, z) => Math.atan2(x - p.x, -(z - p.z));
    if (G.scene.kind === 'overworld') {
      for (const d of G.world.dungeons) if (p.discovered[d.id] && Math.hypot(d.x - p.x, d.z - p.z) < 220) add(angTo(d.x, d.z), U.siteGlyph(d.kind), 'site');
      for (const L of G.world.towns) if (Math.hypot(L.cx - p.x, L.cz - p.z) > L.R) add(angTo(L.cx, L.cz), '⌂', 'site town');
    }
    for (const t of G.quests.targets()) {
      let x = t.x, z = t.z;
      if (G.scene.kind === 'dungeon') {
        if (t.dungeon !== G.scene.dungeonId) continue;
        x = G.scene.L.boss.x; z = G.scene.L.boss.z;
      }
      add(angTo(x, z), '◆', t.main ? 'quest main' : 'quest');
    }
    el.innerHTML = items.join('');
  };
  U.siteGlyph = (k) => ({ cave: '◗', fort: '♜', crypt: '✝', ruin: '⌘', spire: '♛' }[k] || '•');

  // ---------- interaction prompt ----------
  U.target = null;
  U.findTarget = function () {
    const p = P(), s = G.scene;
    const fx = Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let best = null, bs = 1e9;
    const consider = (o, x, z, r) => {
      const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
      if (d > (r || 2.6)) return;
      const dot = d > 0.4 ? (dx * fx + dz * fz) / d : 1;
      if (dot < 0.6) return;
      const sc = d - dot * 1.5;
      if (sc < bs) { bs = sc; best = o; }
    };
    for (const e of s.ents) {
      if (e.kind === 'npc') consider({ type: 'npc', e }, e.x, e.z, 3);
      else if (e.dead && e.loot && !e.looted) consider({ type: 'corpse', e }, e.x, e.z, 2.6);
    }
    for (const it of s.interact) {
      if (it.kind === 'chest' && it.looted) continue;
      if ((it.kind === 'ore' && it.mined) || (it.kind === 'plant' && it.picked)) continue;
      consider({ type: it.kind, it }, it.x, it.z, (it.r || 1.5) + 1.2);
    }
    return best;
  };
  U.prompt = function () {
    const t = (U.target = U.findTarget());
    const el = $('prompt');
    if (!t || U.modal) { el.hidden = true; return; }
    let txt = '';
    if (t.type === 'npc') { const n = t.e.npc; txt = 'Talk to <b>' + esc(n ? n.name : t.e.name) + '</b>' + (n && n.title ? ' <i>(' + esc(n.title) + ')</i>' : ''); }
    else if (t.type === 'corpse') txt = 'Search <b>' + esc(t.e.def.name) + '</b>';
    else if (t.type === 'chest') txt = 'Open <b>chest</b>';
    else if (t.type === 'door') { const d = G.world.dungeons.find((x) => x.id === t.it.dungeon); txt = 'Enter <b>' + esc(d.name) + '</b> <i>(level ' + d.lvl + ')</i>'; }
    else if (t.type === 'exit') txt = 'Leave';
    else if (t.type === 'ore') txt = 'Mine <b>iron vein</b>';
    else if (t.type === 'plant') txt = 'Pick <b>' + (t.it.plant.kind === 'lotus' ? 'marsh lotus' : 'nightshade') + '</b>';
    else if (t.type === 'sign') txt = 'Read <b>signpost</b>';
    else if (t.type === 'sack') txt = 'Search <b>sack</b>';
    el.innerHTML = '<kbd>E</kbd> ' + txt;
    el.hidden = false;
  };
  U.use = function () {
    const t = U.target;
    if (!t) return;
    const s = G.scene, S = G.S;
    if (t.type === 'npc') return U.talk(t.e);
    if (t.type === 'corpse') return U.loot(t.e.def.name, t.e.loot, () => { t.e.looted = true; });
    if (t.type === 'sack') return U.loot('Sack', t.it.items, () => { s.interact.splice(s.interact.indexOf(t.it), 1); S.ow.sacks = S.ow.sacks.filter((x) => x !== t.it.save); });
    if (t.type === 'door') return G.sc.enter(t.it.dungeon);
    if (t.type === 'exit') return G.sc.leave();
    if (t.type === 'sign') return U.open('sign', { title: t.it.text, text: t.it.desc });
    if (t.type === 'ore') { t.it.mined = true; S.dstate[s.dungeonId].ores[t.it.ore.id] = 1; G.player.give('iron_ore', 1); G.audio && G.audio.play('hit'); return; }
    if (t.type === 'plant') { t.it.picked = true; S.ow.plants[t.it.plant.id] = S.day * 1440 + S.time; G.player.give(t.it.plant.kind === 'lotus' ? 'marsh_lotus' : 'nightshade', 1); return; }
    if (t.type === 'chest') {
      const c = t.it.chest;
      if (!t.it.items) {
        t.it.items = G.lootRoll(c.lvl, G.rng(c.seed), c.rich);
        const dId = c.ruin || s.dungeonId;
        if (c.ruin || c.boss) { const qi = G.quests.bossDrop(dId); if (qi && c.ruin) t.it.items.unshift([qi, 1]); }
      }
      return U.loot('Chest', t.it.items, () => { t.it.looted = true; if (s.kind === 'dungeon') S.dstate[s.dungeonId].looted[c.id] = 1; else S.ow.chests[c.id] = 1; });
    }
  };

  // ---------- notifications ----------
  U.toast = function (msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.innerHTML = esc(msg);
    $('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 4000);
    while ($('toasts').children.length > 6) $('toasts').firstChild.remove();
  };
  U.float = function (msg, col) {
    const el = document.createElement('div');
    el.className = 'float'; el.textContent = msg; el.style.color = col || '#fff';
    $('floats').appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };
  U.banner = function (title, sub) {
    const el = $('banner');
    el.innerHTML = '<div class="bt">' + esc(title) + '</div>' + (sub ? '<div class="bs">' + esc(sub) + '</div>' : '');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  };
  U.hitNumber = function (e, dmg, crit) {
    const el = document.createElement('div');
    el.className = 'hitnum' + (crit ? ' crit' : '');
    el.textContent = dmg + (crit ? '!' : '');
    el.style.left = (50 + (Math.random() - 0.5) * 8) + '%';
    $('floats').appendChild(el);
    setTimeout(() => el.remove(), 900);
  };
  U.hurt = function () { const el = $('hurt'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); G.audio && G.audio.play('hurt'); };
  U.castFlash = function (sp) { U.castT = 0.4; U.castColor = sp.color || [1, 0.9, 0.5]; };
  U.bossBar = function (e) {
    const el = $('bossbar');
    if (!e || e.dead) { el.hidden = true; return; }
    el.hidden = false;
    el.querySelector('.bn').textContent = e.def.name;
    el.querySelector('.bf').style.width = (G.clamp(e.hp / e.max, 0, 1) * 100) + '%';
  };
  U.fade = function (mid) {
    const el = $('fade');
    el.classList.add('on');
    setTimeout(() => { mid && mid(); setTimeout(() => el.classList.remove('on'), 120); }, 380);
  };
  let lastLoc = null;
  U.locationCheck = function (force) {
    const p = P();
    if (G.scene.kind !== 'overworld') return;
    const L = G.world.towns.find((L) => Math.abs(p.x - L.cx) < L.R + 4 && Math.abs(p.z - L.cz) < L.R + 4);
    const name = L ? L.t.name : null;
    if (name !== lastLoc || force) { if (name && (name !== lastLoc)) { U.banner(name, L.t.desc); p.visitedTowns[L.t.id] = 1; } lastLoc = name; }
  };
  U.dirty = () => {};

  // ---------- modal framework ----------
  U.open = function (kind, data) {
    U.modal = { kind, data: data || {}, sel: 0, tab: data && data.tab };
    document.exitPointerLock && document.exitPointerLock();
    G.input.clear();
    U.render();
  };
  U.close = function () {
    const m = U.modal;
    U.modal = null;
    $('modal').hidden = true; $('modal').innerHTML = '';
    if (m && m.kind === 'dialog' && m.data.ent) m.data.ent.talking = false;
    if (m && m.onClose) m.onClose();
  };
  U.render = function () {
    const m = U.modal, el = $('modal');
    if (!m) return;
    el.hidden = false;
    el.className = 'modal m-' + m.kind;
    const fn = { dialog: U.rDialog, menu: U.rMenu, shop: U.rShop, loot: U.rLoot, pause: U.rPause, sign: U.rSign, death: U.rDeath, text: U.rText, ending: U.rEnding }[m.kind];
    el.innerHTML = fn(m);
    if (m.kind === 'dialog' && m.data.portrait) { const h = el.querySelector('.dhead'); if (h) h.appendChild(U.portrait(m.data.portrait)); }
    if (m.kind === 'menu' && m.tab === 'map') U.drawMap(el.querySelector('canvas'));
    const s = el.querySelector('.sel'); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' });
    el.onclick = (ev) => { const o = ev.target.closest('[data-i]'); if (o) { m.sel = +o.dataset.i; U.key({ key: 'Enter' }); } const tb = ev.target.closest('[data-tab]'); if (tb) { m.tab = tb.dataset.tab; m.sel = 0; U.render(); } };
  };
  U.key = function (e) {
    const m = U.modal;
    if (!m) return false;
    const k = e.key;
    const list = m.items || [];
    if (k === 'ArrowDown' || k === 's' || k === 'S') { m.sel = Math.min(list.length - 1, m.sel + 1); U.render(); return true; }
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { m.sel = Math.max(0, m.sel - 1); U.render(); return true; }
    if (/^[1-9]$/.test(k) && list.length && (m.kind === 'dialog' || m.kind === 'pause')) { const i = +k - 1; if (list[i]) { m.sel = i; list[i].run(); } return true; }
    if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') {
      if (m.kind === 'menu' && m.tab === 'char' && list[m.sel]) { list[m.sel].run(); return true; }
      if (m.kind === 'loot' && (k === 'e' || k === 'E')) { m.takeAll(); return true; }
      if (list[m.sel]) list[m.sel].run(); else if (m.next) m.next();
      return true;
    }
    if (m.keys && m.keys(e)) return true;
    if (k === 'Escape' || k === 'Tab') { if (m.kind !== 'death' && m.kind !== 'ending') U.close(); return true; }
    return true;
  };

  // ---------- dialogue ----------
  U.talk = function (e) {
    e.talking = true;
    const n = e.npc;
    if (!n) {
      const line = G.R.pick(G.GREET[e.guard ? 'guard' : 'commoner']);
      U.open('dialog', { name: e.name || 'Stranger', portrait: e.sprite, ent: e, screen: { lines: [line] } });
      return;
    }
    U.open('dialog', { name: n.name, title: n.title, portrait: n.spec, ent: e, npc: n, screen: U.npcRoot(n) });
  };
  U.npcRoot = function (n) {
    const opts = G.quests.options(n.id).map((o) => ({ label: (o.kind === 'done' ? '<span class="q-done">!</span> ' : o.kind === 'offer' ? '<span class="q-grey">!</span> ' : '<span class="q-yel">!</span> ') + esc(o.label), run: () => U.goto(o.run()) }));
    if (n.shop) opts.push({ label: n.shop === 'inn' ? 'Food and drink' : 'Trade', run: () => U.openShop(n) });
    if (n.shop === 'inn') opts.push({ label: 'Rent a bed until morning (' + G.SHOPS.inn.rest + ' gold)', run: () => U.rest(n) });
    if (n.shop === 'temple') opts.push({ label: 'Ask for healing', run: () => { const p = P(), st = G.player.stats(); p.hp = st.hpMax; p.mana = st.manaMax; U.goto({ lines: ['The Pale Flame mends what it can. Go in peace.'] }); } });
    opts.push({ label: 'Any rumours?', run: () => U.goto({ lines: [U.rumour(n)] }) });
    opts.push({ label: 'Farewell.', run: () => U.close() });
    return { lines: [G.R.pick(G.GREET[n.role] || G.GREET.commoner)], choice: opts, root: true };
  };
  U.goto = function (scr) {
    const m = U.modal;
    if (!scr) { m.data.screen = U.npcRoot(m.data.npc); m.sel = 0; U.render(); return; }
    m.data.screen = scr; m.data.line = 0; m.sel = 0;
    U.render();
  };
  U.rDialog = function (m) {
    const d = m.data, scr = d.screen;
    const li = d.line || 0;
    const lastLine = li >= scr.lines.length - 1;
    let opts = [];
    if (lastLine && scr.choice) opts = scr.choice;
    else opts = [{ label: lastLine ? (d.npc ? 'Continue' : 'Farewell.') : 'Continue', run: () => {
      if (!lastLine) { d.line = li + 1; U.render(); return; }
      if (scr.after) { const a = scr.after; scr.after = null; a(); }
      if (d.npc && U.modal) U.goto(null); else U.close();
    } }];
    m.items = opts;
    return '<div class="dbox"><div class="dhead"></div><div class="dbody"><div class="dname">' + esc(d.name) + (d.title ? ' <span>' + esc(d.title) + '</span>' : '') + '</div><div class="dtext">' + esc(scr.lines[li] || '') + '</div><div class="dopts">' +
      opts.map((o, i) => '<div class="opt ' + (i === m.sel ? 'sel' : '') + '" data-i="' + i + '"><kbd>' + (i + 1) + '</kbd> ' + o.label + '</div>').join('') + '</div></div></div>';
  };
  U.rumour = function (n) {
    const p = P();
    const hidden = G.world.dungeons.filter((d) => !p.discovered[d.id] && d.kind !== 'spire');
    if (hidden.length && G.R.chance(0.7)) {
      const d = hidden.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[Math.floor(Math.random() * Math.min(3, hidden.length))];
      p.discovered[d.id] = 1;
      const dir = U.dirName(Math.atan2(d.x - p.x, -(d.z - p.z)));
      return 'They say there\'s a place called ' + d.name + ', ' + dir + ' of here. ' + { cave: 'Something big lairs in it.', fort: 'Brigands use it now.', crypt: 'The dead there don\'t rest.', ruin: 'Old stones, old bones, and maybe old treasure.' }[d.kind] + ' (Marked on your map.)';
    }
    return G.R.pick(['The Cinder preach in the villages at night. Folk listen, more each week.', 'Gold buys good steel in Ravenhold, but the best smith is up in Emberfall.', 'Don\'t walk the north-east wastes. The ash there burns the lungs.', 'Inns will rent you a bed for a few coins. Sleep is worth more than gold.', 'The fens south-east of here are full of rats and worse.', 'Wolves don\'t come into towns. Yet.']);
  };
  U.dirName = (a) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  U.rest = function (n) {
    const p = P();
    if (p.gold < G.SHOPS.inn.rest) { U.goto({ lines: ['No coin, no bed.'] }); return; }
    p.gold -= G.SHOPS.inn.rest;
    U.close();
    U.fade(() => {
      const h = G.time.hour();
      G.time.pass(h < 7 ? 7 - h : 31 - h);
      const st = G.player.stats(); p.hp = st.hpMax; p.stam = st.stamMax; p.mana = st.manaMax;
      U.toast('You sleep soundly and wake refreshed.');
      G.save.auto();
    });
  };

  // ---------- shops ----------
  U.openShop = function (n) {
    U.close();
    U.open('shop', { npc: n, shop: G.SHOPS[n.shop], side: 0 });
    U.modal.keys = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') { U.modal.data.side ^= 1; U.modal.sel = 0; U.render(); return true; } return false; };
  };
  U.rShop = function (m) {
    const d = m.data, p = P(), sh = d.shop;
    const buy = sh.stock.map((id) => ({ id, price: G.player.buyPrice(id) }));
    const canSell = (id) => { const t = G.item(id).type; return t !== 'quest' && (sh.buys === 'all' || sh.buys.includes(t)); };
    const sell = p.inv.filter((s) => canSell(s.id)).map((s) => ({ id: s.id, n: s.n, price: G.player.sellPrice(s.id) }));
    const list = d.side === 0 ? buy : sell;
    m.sel = G.clamp(m.sel, 0, Math.max(0, list.length - 1));
    m.items = list.map((it) => ({ run: () => {
      if (d.side === 0) { if (p.gold < it.price) { U.toast('Not enough gold.'); return; } p.gold -= it.price; G.player.give(it.id, 1, true); U.toast('Bought ' + G.item(it.id).name); }
      else { if (G.player.equipped(it.id) && G.player.count(it.id) <= 1) { U.toast('Unequip it first.'); return; } p.gold += it.price; G.player.take(it.id, 1); U.toast('Sold ' + G.item(it.id).name); }
      U.render();
    } }));
    const row = (it, i) => '<div class="row ' + (i === m.sel ? 'sel' : '') + '" data-i="' + i + '"><img src="' + G.icon(it.id) + '"><span class="nm">' + esc(G.item(it.id).name) + (it.n > 1 ? ' (' + it.n + ')' : '') + (G.player.equipped(it.id) ? ' <i>(worn)</i>' : '') + '</span><span class="pr">' + it.price + 'g</span></div>';
    const sel = list[m.sel];
    return '<div class="panel"><div class="ptitle">' + esc(d.npc.name) + ' — ' + esc(sh.name) + '<span class="gold">' + p.gold + ' gold</span></div><div class="tabs2"><span class="' + (d.side === 0 ? 'on' : '') + '">Buy</span><span class="' + (d.side === 1 ? 'on' : '') + '">Sell</span></div>' +
      '<div class="list">' + (list.length ? list.map(row).join('') : '<div class="empty">Nothing here.</div>') + '</div>' + (sel ? '<div class="info">' + U.itemInfo(sel.id) + '</div>' : '') + '<div class="foot">←/→ buy or sell · ↑/↓ select · Enter: ' + (d.side ? 'sell' : 'buy') + ' · Esc: leave</div></div>';
  };
  U.itemInfo = function (id) {
    const d = G.item(id);
    const bits = [];
    if (d.type === 'weapon') bits.push('Damage ' + d.dmg[0] + '-' + d.dmg[1], 'Speed ' + (1 / d.speed).toFixed(1) + '/s', 'Reach ' + d.reach + (d.twoHand ? ' · two-handed' : ''), d.undead ? 'Smites undead' : '', d.spell ? '+' + Math.round(d.spell * 100) + '% spell power' : '', d.fire ? '+' + d.fire + ' fire' : '');
    if (d.type === 'armor') bits.push('Armour ' + d.armor, d.slot, d.mana ? '+' + d.mana + ' mana' : '');
    if (d.heal) bits.push('Restores ' + d.heal + ' health');
    if (d.stam && d.type !== 'weapon') bits.push('Restores ' + d.stam + ' stamina');
    if (d.type === 'weapon') bits.push(d.stam + ' stamina per swing');
    if (d.mana && d.type !== 'armor') bits.push('Restores ' + d.mana + ' mana');
    if (d.type === 'tome') bits.push('Teaches ' + G.SPELLS[d.spell].name);
    if (d.type === 'quest') bits.push('Quest item');
    bits.push('Value ' + d.value);
    return '<b>' + esc(d.name) + '</b> — ' + bits.filter(Boolean).join(' · ');
  };

  // ---------- loot ----------
  U.loot = function (title, items, onEmpty) {
    U.open('loot', { title, items, onEmpty });
    const m = U.modal;
    m.takeAll = () => { items.slice().forEach((it) => G.player.give(it[0], it[1])); items.length = 0; onEmpty(); U.close(); };
  };
  U.rLoot = function (m) {
    const d = m.data;
    m.items = d.items.map((it, i) => ({ run: () => { G.player.give(it[0], it[1]); d.items.splice(i, 1); if (!d.items.length) { d.onEmpty(); U.close(); } else U.render(); } }));
    if (!d.items.length) { m.items = []; }
    m.sel = G.clamp(m.sel, 0, Math.max(0, d.items.length - 1));
    return '<div class="panel small"><div class="ptitle">' + esc(d.title) + '</div><div class="list">' + (d.items.length ? d.items.map((it, i) => '<div class="row ' + (i === m.sel ? 'sel' : '') + '" data-i="' + i + '"><img src="' + G.icon(it[0]) + '"><span class="nm">' + (it[0] === 'gold' ? it[1] + ' gold' : esc(G.item(it[0]).name) + (it[1] > 1 ? ' (' + it[1] + ')' : '')) + '</span></div>').join('') : '<div class="empty">Empty.</div>') +
      '</div>' + (d.items[m.sel] && d.items[m.sel][0] !== 'gold' ? '<div class="info">' + U.itemInfo(d.items[m.sel][0]) + '</div>' : '') + '<div class="foot"><kbd>E</kbd> take all · Enter: take one · Esc: close</div></div>';
  };

  // ---------- menus: inventory / character / journal / map ----------
  U.menu = function (tab) { if (U.modal && U.modal.kind === 'menu') { if (U.modal.tab === tab) { U.close(); return; } U.modal.tab = tab; U.modal.sel = 0; U.render(); return; } U.open('menu', { tab }); U.modal.tab = tab; U.render(); };
  U.rMenu = function (m) {
    const tabs = [['inv', 'Inventory', 'I'], ['char', 'Character', 'C'], ['journal', 'Journal', 'J'], ['map', 'Map', 'M']];
    m.keys = (e) => {
      const k = e.key.toLowerCase();
      const t = { i: 'inv', c: 'char', j: 'journal', m: 'map' }[k];
      if (t) { if (t === m.tab) U.close(); else { m.tab = t; m.sel = 0; U.render(); } return true; }
      if (m.tab === 'inv' && (k === 'x' || k === 'delete')) { const s = P().inv[m.invOrder && m.invOrder[m.sel]]; if (s) U.drop(s.id); return true; }
      if (m.tab === 'map' && m.travel && (k === 'arrowleft' || k === 'arrowright' || k === 'a' || k === 'd')) { m.mapSel = ((m.mapSel || 0) + (k === 'arrowleft' || k === 'a' ? -1 : 1) + m.travel.length) % m.travel.length; U.render(); return true; }
      if (m.tab === 'map' && m.travel && k === 'f') { U.fastTravel(m.travel[m.mapSel || 0]); return true; }
      return false;
    };
    const body = { inv: U.rInv, char: U.rChar, journal: U.rJournal, map: U.rMap }[m.tab](m);
    return '<div class="panel big"><div class="mtabs">' + tabs.map(([k, n, key]) => '<span data-tab="' + k + '" class="' + (m.tab === k ? 'on' : '') + '">' + n + ' <kbd>' + key + '</kbd></span>').join('') + '</div>' + body + '</div>';
  };
  U.rInv = function (m) {
    const p = P();
    const order = { weapon: 0, armor: 1, potion: 2, food: 3, tome: 4, misc: 5, quest: 6 };
    const idx = p.inv.map((s, i) => i).sort((a, b) => order[G.item(p.inv[a].id).type] - order[G.item(p.inv[b].id).type] || G.item(p.inv[a].id).name.localeCompare(G.item(p.inv[b].id).name));
    m.invOrder = idx;
    m.sel = G.clamp(m.sel, 0, Math.max(0, idx.length - 1));
    m.items = idx.map((i) => ({ run: () => { G.player.use(p.inv[i].id); U.render(); } }));
    const st = G.player.stats();
    const sel = p.inv[idx[m.sel]];
    return '<div class="two"><div class="list tall">' + (idx.length ? idx.map((i, k) => { const s = p.inv[i], d = G.item(s.id); return '<div class="row ' + (k === m.sel ? 'sel' : '') + '" data-i="' + k + '"><img src="' + G.icon(s.id) + '"><span class="nm ' + d.type + '">' + esc(d.name) + (s.n > 1 ? ' (' + s.n + ')' : '') + (G.player.equipped(s.id) ? ' <i>(equipped)</i>' : '') + '</span><span class="pr">' + d.value + 'g</span></div>'; }).join('') : '<div class="empty">Your pack is empty.</div>') + '</div>' +
      '<div class="side"><div class="gold">' + p.gold + ' gold</div><div class="eq">' + G.SLOTS.map((s) => '<div><span>' + G.cap(s) + '</span>' + (p.equip[s] ? esc(G.item(p.equip[s]).name) : '<i>—</i>') + '</div>').join('') + '</div><div class="statline">Armour ' + st.armor + ' · Damage ' + Math.round(st.weapon.dmg[0] * st.melee) + '-' + Math.round(st.weapon.dmg[1] * st.melee) + '</div>' + (sel ? '<div class="info">' + U.itemInfo(sel.id) + '</div>' : '') + '</div></div><div class="foot">Enter: use / equip · X: drop · Esc: close</div>';
  };
  U.drop = function (id) {
    if (G.item(id).type === 'quest') { U.toast('You might need that.'); return; }
    const p = P(), n = G.player.count(id);
    G.player.take(id, n);
    const sack = { kind: 'sack', x: p.x + Math.sin(p.yaw) * 1.2, z: p.z - Math.cos(p.yaw) * 1.2, r: 1.2, items: [[id, n]] };
    if (G.scene.kind === 'overworld') { sack.save = { x: sack.x, z: sack.z, items: sack.items }; G.S.ow.sacks.push(sack.save); }
    G.scene.interact.push(sack);
    U.render();
  };
  U.rChar = function (m) {
    const p = P(), st = G.player.stats();
    const attrs = [['might', 'Might', '+4.5% melee damage, +4 health'], ['finesse', 'Finesse', '+1.2% crit, +1.5% attack speed, +5 stamina'], ['arcana', 'Arcana', '+7% spell power, +8 mana']];
    m.items = attrs.map(([k]) => ({ run: () => { G.player.raise(k); U.render(); } }));
    p.spells.forEach((sid) => m.items.push({ run: () => { p.spell = sid; U.render(); } }));
    const cls = G.CLASSES[p.cls];
    return '<div class="two"><div class="side wide"><div class="cname">' + esc(p.name) + '</div><div class="dim">' + cls.name + ' · Level ' + p.lvl + ' · ' + p.xp + ' / ' + G.player.xpNext(p.lvl) + ' XP</div>' +
      '<div class="attrs">' + attrs.map(([k, n, d], i) => '<div class="row ' + (m.sel === i ? 'sel' : '') + '" data-i="' + i + '"><span class="nm">' + n + '</span><b>' + p.attr[k] + '</b><span class="dim">' + d + '</span></div>').join('') + '</div>' +
      (p.pts ? '<div class="pts">' + p.pts + ' point' + (p.pts > 1 ? 's' : '') + ' to spend — select and press Enter</div>' : '') +
      '<div class="ptitle2">Spells <span class="dim">(select to ready it, cast with R)</span></div>' + p.spells.map((sid, i) => '<div class="row ' + (m.sel === i + 3 ? 'sel' : '') + '" data-i="' + (i + 3) + '"><span class="nm">' + (p.spell === sid ? '► ' : '') + esc(G.SPELLS[sid].name) + '</span><span class="dim">' + G.SPELLS[sid].mana + ' mana</span></div>').join('') +
      '</div><div class="side"><div class="eq"><div><span>Health</span>' + Math.ceil(p.hp) + ' / ' + st.hpMax + '</div><div><span>Stamina</span>' + Math.ceil(p.stam) + ' / ' + st.stamMax + '</div><div><span>Mana</span>' + Math.ceil(p.mana) + ' / ' + st.manaMax + '</div><div><span>Armour</span>' + st.armor + '</div><div><span>Crit chance</span>' + Math.round(st.crit * 100) + '%</div><div><span>Spell power</span>' + Math.round(st.spell * 100) + '%</div><div><span>Kills</span>' + G.S.stats.kills + '</div><div><span>Time played</span>' + Math.floor(G.S.stats.play / 60) + ' min</div></div></div></div><div class="foot">↑/↓ select · Enter: raise attribute / ready spell · Esc: close</div>';
  };
  U.rJournal = function (m) {
    const act = G.QUEST_ORDER.filter(G.quests.isActive), done = G.QUEST_ORDER.filter(G.quests.isDone);
    const all = act.concat(done);
    m.items = all.map(() => ({ run: () => {} }));
    m.sel = G.clamp(m.sel, 0, Math.max(0, all.length - 1));
    const q = all.length ? G.QUESTS[all[m.sel]] : null;
    let detail = '<div class="empty">No quests yet. Look for people marked with a grey <b class="q-grey">!</b></div>';
    if (q) {
      const isDone = G.quests.isDone(q.id);
      detail = '<div class="qt">' + (q.main ? '<span class="mainq">Main Quest</span> ' : '') + esc(q.title) + '</div><div class="qs">' + esc(q.summary) + '</div>' +
        (isDone ? '<div class="qok">Completed</div>' : G.quests.objectiveText(q).map((o) => '<div class="qo ' + (o.done ? 'ok' : '') + '">' + (o.done ? '✔ ' : '◇ ') + esc(o.text) + '</div>').join('') + (G.quests.ready(q.id) ? '<div class="qo ret">Return to ' + esc(G.NPCS[q.turnIn].name) + '</div>' : ''));
    }
    return '<div class="two"><div class="list tall">' + all.map((id, i) => '<div class="row ' + (i === m.sel ? 'sel' : '') + '" data-i="' + i + '"><span class="nm ' + (G.quests.isDone(id) ? 'done' : G.QUESTS[id].main ? 'main' : '') + '">' + esc(G.QUESTS[id].title) + '</span></div>').join('') + '</div><div class="side wide">' + detail + '</div></div><div class="foot">↑/↓ select · Esc: close</div>';
  };
  U.rMap = function (m) {
    const p = P();
    m.travel = G.world.towns.filter((L) => p.visitedTowns[L.t.id]).map((L) => L.t.id);
    m.items = [];
    const can = G.scene.kind === 'overworld' && !G.sc.inCombat();
    const ft = m.travel.length ? '←/→ choose a town you have visited · <kbd>F</kbd> fast travel to <b>' + esc(G.townById(m.travel[m.mapSel || 0]).name) + '</b>' + (can ? '' : ' <i>(not possible here)</i>') : 'Visit towns to fast travel between them';
    return '<div class="mapwrap"><canvas width="768" height="768"></canvas></div><div class="foot">' + ft + ' · Esc: close</div>';
  };
  U.mapImage = null;
  U.drawMap = function (cv) {
    const g = cv.getContext('2d'), p = P(), W = G.world, m = U.modal;
    g.imageSmoothingEnabled = false;
    if (G.scene.kind === 'dungeon') {
      const L = G.scene.L, set = (G.sc.seen && G.sc.seen[G.scene.dungeonId]) || new Set();
      const s = Math.floor(720 / L.w);
      g.fillStyle = '#0c0b0a'; g.fillRect(0, 0, 768, 768);
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { if (!set.has(y * L.w + x)) continue; g.fillStyle = L.at(x, y) ? '#5a5248' : '#1e1b18'; g.fillRect(24 + x * s, 24 + y * s, s, s); }
      const C = G.dungeon.CELL;
      g.fillStyle = '#d8c890'; g.fillRect(24 + L.exit.x / C * s - 4, 24 + L.exit.z / C * s - 4, 8, 8);
      U.arrow(g, 24 + p.x / C * s, 24 + p.z / C * s, p.yaw);
      g.fillStyle = '#c8b890'; g.font = 'bold 18px Georgia'; g.fillText(G.scene.site.name, 24, 20);
      return;
    }
    if (!U.mapImage) {
      const c = document.createElement('canvas'); c.width = c.height = W.N;
      const x = c.getContext('2d'), img = x.createImageData(W.N, W.N);
      const COL = { grass: [58, 72, 42], grass_dead: [78, 70, 48], forest: [34, 46, 28], dirt: [82, 66, 46], road: [120, 100, 70], cobble: [110, 106, 100], rock: [84, 80, 74], snow: [200, 204, 210], ash: [64, 58, 56], mud: [48, 54, 38], sand: [120, 108, 80], flagstone: [130, 124, 112] };
      for (let j = 0; j < W.N; j++) for (let i = 0; i < W.N; i++) {
        let c3 = COL[W.TEX[W.type[j * W.N + i]]];
        const h = (W.hAt(i, j) + W.hAt(i + 1, j + 1)) / 2;
        if (h < 0) c3 = [24, 40, 50];
        const sh = W.shadeAt(i, j) * 0.9 + 0.1;
        const k = (j * W.N + i) * 4;
        img.data[k] = c3[0] * sh; img.data[k + 1] = c3[1] * sh; img.data[k + 2] = c3[2] * sh; img.data[k + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      U.mapImage = c;
    }
    const S = 768 / W.SIZE;
    g.drawImage(U.mapImage, 0, 0, 768, 768);
    g.fillStyle = 'rgba(20,14,8,0.18)'; g.fillRect(0, 0, 768, 768);
    g.textAlign = 'center';
    for (const L of W.towns) {
      const x = L.cx * S, y = L.cz * S;
      g.fillStyle = '#1a120a'; g.fillRect(x - 6, y - 6, 12, 12); g.fillStyle = L.t.major ? '#e0c060' : '#c8b890'; g.fillRect(x - 4, y - 4, 8, 8);
      g.font = (L.t.major ? 'bold 17px' : '14px') + ' Georgia'; g.fillStyle = '#000'; g.fillText(L.t.name, x + 1, y - 9); g.fillStyle = L.t.major ? '#f0d890' : '#e8dcc0'; g.fillText(L.t.name, x, y - 10);
    }
    g.font = '15px serif';
    for (const d of W.dungeons) {
      if (!p.discovered[d.id]) continue;
      const x = d.x * S, y = d.z * S;
      g.fillStyle = '#000'; g.fillText(U.siteGlyph(d.kind), x + 1, y + 6); g.fillStyle = d.kind === 'spire' ? '#ff6030' : (G.S.dstate[d.id] && G.S.dstate[d.id].cleared ? '#7a8a6a' : '#e8d8c0'); g.fillText(U.siteGlyph(d.kind), x, y + 5);
      g.font = '11px Georgia'; g.fillStyle = '#d8c8a8'; g.fillText(d.name, x, y + 18); g.font = '15px serif';
    }
    const ws = G.SITES.watchtower; if (G.quests.isActive('mq2') || G.quests.isDone('mq2')) { g.fillStyle = '#e07030'; g.fillText('♜', (ws.x * 4 + 2) * S, (ws.z * 4 + 2) * S + 5); }
    for (const t of G.quests.targets()) { if (t.x == null) continue; const x = t.x * S, y = t.z * S; g.strokeStyle = t.main ? '#ffd040' : '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 10 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2); g.stroke(); }
    if (m && m.travel && m.travel.length) { const L = W.towns.find((L) => L.t.id === m.travel[m.mapSel || 0]); g.strokeStyle = '#80ff80'; g.lineWidth = 2; g.strokeRect(L.cx * S - 10, L.cz * S - 10, 20, 20); }
    U.arrow(g, p.x * S, p.z * S, p.yaw);
  };
  U.arrow = function (g, x, y, yaw) {
    g.save(); g.translate(x, y); g.rotate(yaw);
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.stroke(); g.fill();
    g.restore();
  };
  U.fastTravel = function (tid) {
    if (G.scene.kind !== 'overworld') { U.toast('You can only fast travel outdoors.'); return; }
    if (G.sc.inCombat()) { U.toast('Not while enemies are near.'); return; }
    const L = G.world.towns.find((L) => L.t.id === tid), p = P();
    const hours = Math.max(1, Math.round(Math.hypot(L.cx - p.x, L.cz - p.z) / 60));
    U.close();
    U.fade(() => {
      G.time.pass(hours);
      G.sc.loadOverworld(L.cx + 2, L.cz + 9, Math.PI);
      U.toast('You travel for ' + hours + ' hour' + (hours > 1 ? 's' : '') + '.');
      G.save.auto();
    });
  };

  // ---------- pause / save ----------
  U.pause = function () {
    U.open('pause');
  };
  U.rPause = function (m) {
    const items = [
      ['Resume', () => U.close()],
      ['Save game', () => { G.save.manual(); U.close(); U.toast('Game saved.'); }],
      ['Load last save', () => { U.close(); G.main.loadSaved(); }],
      ['Export save code', () => G.save.exportCode().then((c) => U.open('text', { title: 'Your save code', text: c, ro: true }))],
      ['Import save code', () => U.open('text', { title: 'Paste a save code', text: '', ro: false })],
      ['Mouse sensitivity: ' + G.settings.sens.toFixed(1) + '  (←/→)', () => {}],
      ['Pixel size: ' + G.settings.scale + '  (←/→ when selected)', () => {}],
      ['Controls', () => U.open('text', { title: 'Controls', html: U.CONTROLS })],
      ['Quit to title', () => { G.save.auto(); location.reload(); }],
    ];
    m.items = items.map(([, run]) => ({ run }));
    m.keys = (e) => {
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (!d) return false;
      if (m.sel === 5) G.settings.sens = G.clamp(G.settings.sens + d * 0.2, 0.2, 4);
      if (m.sel === 6) { G.settings.scale = G.clamp(G.settings.scale + d, 2, 6); G.gfx.resize(G.settings.scale); }
      G.saveSettings(); U.render(); return true;
    };
    return '<div class="panel small"><div class="ptitle">The Ashen Crown</div><div class="list">' + items.map(([n], i) => '<div class="row btn ' + (i === m.sel ? 'sel' : '') + '" data-i="' + i + '"><span class="nm">' + esc(n) + '</span></div>').join('') + '</div><div class="foot">' + esc(P().name) + ' · ' + G.time.str() + '</div></div>';
  };
  U.rText = function (m) {
    const d = m.data;
    m.items = [];
    if (!d.ro && !d.html) m.items = [{ run: () => {
      const v = document.getElementById('codebox').value.trim();
      G.save.importCode(v).then((S) => { U.close(); G.main.loadState(S); G.save.manual(); U.toast('Save imported.'); }).catch((err) => { document.getElementById('codeerr').textContent = err.message; });
    } }];
    setTimeout(() => { const t = document.getElementById('codebox'); if (t) { t.focus(); if (d.ro) t.select(); } }, 30);
    return '<div class="panel small"><div class="ptitle">' + esc(d.title) + '</div>' + (d.html ? '<div class="ctl">' + d.html + '</div>' : '<textarea id="codebox" ' + (d.ro ? 'readonly' : '') + '>' + esc(d.text) + '</textarea><div id="codeerr" class="err"></div>') +
      '<div class="foot">' + (d.ro ? 'Copy this code (Ctrl+C). Esc to close.' : d.html ? 'Esc to close' : 'Paste, then press the button. <button id="impbtn" data-i="0">Load</button>') + '</div></div>';
  };
  U.CONTROLS = '<table>' + [['Move', 'W A S D'], ['Look', 'Mouse (click the game to capture it) or ← → ↑ ↓'], ['Sprint / Jump', 'Shift / Space'], ['Attack', 'Left click or F'], ['Block', 'Right mouse (hold) or B'], ['Cast readied spell', 'R'], ['Ready spell 1-5', '1 - 5'], ['Use / talk / loot', 'E'], ['Quick heal', 'Q'], ['Inventory · Character · Journal · Map', 'I · C · J · M'], ['Lantern (night)', 'L'], ['Pause / save', 'Esc']].map(([a, b]) => '<tr><td>' + a + '</td><td><kbd>' + b + '</kbd></td></tr>').join('') + '</table>';
  U.rSign = (m) => { m.items = []; return '<div class="panel small"><div class="ptitle">' + esc(m.data.title) + '</div><div class="ctl">' + esc(m.data.text) + '</div><div class="foot">Esc to close</div></div>'; };
  U.death = function () {
    setTimeout(() => U.open('death'), 900);
  };
  U.rDeath = function (m) {
    m.items = [{ run: () => { U.close(); G.main.loadSaved(); } }];
    return '<div class="deathbox"><div class="dt">You have died</div><div class="ds">The ash takes another.</div><div class="row sel" data-i="0"><span class="nm">Load last save (Enter)</span></div></div>';
  };
  U.ending = function () { U.open('ending'); };
  U.rEnding = function (m) {
    m.items = [{ run: () => U.close() }];
    return '<div class="deathbox ending"><div class="dt">The Ashen King is no more</div><div class="ds">The skies over the old kingdom are clear for the first time in a generation. Your journey can continue - there are still dungeons unplundered and people in need.</div><div class="row sel" data-i="0"><span class="nm">Continue (Enter)</span></div></div>';
  };

  // ---------- title & character creation ----------
  U.title = function () {
    const el = $('screen');
    el.hidden = false;
    const has = G.save.has();
    let sel = 0;
    const opts = [];
    if (has) opts.push(['Continue', () => { el.hidden = true; G.main.loadSaved(); }]);
    opts.push(['New Game', () => U.create()]);
    opts.push(['Import Save Code', () => { el.hidden = true; G.main.importFromTitle(); }]);
    const draw = () => { el.innerHTML = '<div class="tbox"><div class="logo">The Ashen Crown</div><div class="sub">A dark fantasy role-playing game</div>' + opts.map((o, i) => '<button class="' + (i === sel ? 'sel' : '') + '" data-i="' + i + '">' + o[0] + '</button>').join('') + '<div class="tfoot">↑/↓ and Enter · runs entirely in your browser</div></div>'; };
    draw();
    el.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) opts[+b.dataset.i][1](); };
    U.screenKey = (e) => { if (e.key === 'ArrowUp') sel = (sel + opts.length - 1) % opts.length; else if (e.key === 'ArrowDown') sel = (sel + 1) % opts.length; else if (e.key === 'Enter') { opts[sel][1](); return; } draw(); };
  };
  U.create = function () {
    const el = $('screen');
    const cls = Object.keys(G.CLASSES);
    let ci = 0;
    const draw = () => {
      el.innerHTML = '<div class="tbox create"><div class="logo small">Who are you?</div><label>Name <input id="cname" maxlength="16" value="' + esc(U._name || 'Wanderer') + '"></label><div class="classes">' +
        cls.map((k, i) => { const c = G.CLASSES[k]; return '<div class="cls ' + (i === ci ? 'sel' : '') + '" data-c="' + i + '"><b>' + c.name + '</b><span>' + c.desc + '</span><em>Might ' + c.attr.might + ' · Finesse ' + c.attr.finesse + ' · Arcana ' + c.attr.arcana + '</em></div>'; }).join('') +
        '</div><button class="sel" id="cgo">Begin</button><div class="tfoot">Type a name · ←/→ choose a calling · Enter to begin</div></div>';
      const inp = el.querySelector('#cname');
      inp.oninput = () => (U._name = inp.value);
      setTimeout(() => inp.focus(), 20);
    };
    draw();
    const go = () => { const n = (U._name || 'Wanderer').replace(/[^\w \-']/g, '').trim().slice(0, 16) || 'Wanderer'; el.hidden = true; U.screenKey = null; G.main.newGame(n, cls[ci]); };
    el.onclick = (e) => { const c = e.target.closest('[data-c]'); if (c) { ci = +c.dataset.c; draw(); } if (e.target.id === 'cgo') go(); };
    U.screenKey = (e) => { if (e.key === 'ArrowLeft') { ci = (ci + cls.length - 1) % cls.length; draw(); } else if (e.key === 'ArrowRight') { ci = (ci + 1) % cls.length; draw(); } else if (e.key === 'Enter') go(); };
  };
})(window.G);
