'use strict';
// Boot, input, main loop.
(function (G) {
  const M = (G.main = {});
  const U = G.ui;
  G.settings = Object.assign({ sens: 1, scale: 3, fov: 72, mute: false, vol: 0.8, music: true }, (() => { try { return JSON.parse(localStorage.getItem('ashencrown_settings')) || {}; } catch (e) { return {}; } })());
  G.saveSettings = () => { try { localStorage.setItem('ashencrown_settings', JSON.stringify(G.settings)); } catch (e) { /* ignore */ } };

  // ---------------- input ----------------
  const IN = (G.input = { keys: {}, look: [0, 0] });
  IN.clear = () => { IN.keys = {}; G.combat.blocking = false; };
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
  window.addEventListener('keydown', (e) => {
    G.audio.unlock();
    if (!document.getElementById('screen').hidden && U.screenKey) {
      if (typing() && !['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault(); U.screenKey(e); return;
    }
    if (!G.S) return;
    if (U.modal) {
      if (typing() && e.key !== 'Escape') return;
      if (typing()) document.activeElement.blur();
      e.preventDefault(); U.key(e); return;
    }
    IN.keys[e.code] = true;
    const k = e.key.toLowerCase();
    if (['tab', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    const p = G.S.p;
    if (p.dead) return;
    switch (k) {
      case 'e': U.use(); break;
      case 'f': G.combat.attack(); break;
      case 'r': G.combat.cast(); break;
      case 'q': G.player.quickHeal(); break;
      case 'z': G.player.swapWeapon(); break;
      case 'b': G.combat.blocking = true; break;
      case 'i': U.menu('inv'); break;
      case 'c': U.menu('char'); break;
      case 'j': case 'tab': U.menu('journal'); break;
      case 'm': U.menu('map'); break;
      case 'l': G.view.lantern = !G.view.lantern; U.toast(G.view.lantern ? 'Lantern lit' : 'Lantern doused'); break;
      case 'escape': U.pause(); break;
      default:
        if (/^[1-5]$/.test(k) && p.spells[+k - 1]) { p.spell = p.spells[+k - 1]; U.toast('Readied ' + G.SPELLS[p.spell].name); }
    }
  });
  window.addEventListener('keyup', (e) => { IN.keys[e.code] = false; if (e.key.toLowerCase() === 'b') G.combat.blocking = false; });
  window.addEventListener('blur', IN.clear);
  const cv = () => document.getElementById('gl');
  document.addEventListener('mousedown', (e) => {
    G.audio.unlock();
    if (!G.S || U.modal || !document.getElementById('screen').hidden) return;
    if (document.pointerLockElement !== cv()) { cv().requestPointerLock && cv().requestPointerLock(); return; }
    if (e.button === 0) G.combat.attack();
    if (e.button === 2) G.combat.blocking = true;
  });
  document.addEventListener('mouseup', (e) => { if (e.button === 2) G.combat.blocking = false; });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('mousemove', (e) => {
    if (!G.S || document.pointerLockElement !== cv() || U.modal) return;
    const p = G.S.p, s = 0.0022 * G.settings.sens;
    p.yaw += e.movementX * s;
    p.pitch = G.clamp(p.pitch - e.movementY * s, -1.3, 1.3);
  });
  window.addEventListener('resize', () => G.gfx.resize(G.settings.scale));

  // ---------------- loop ----------------
  let last = performance.now(), saveT = 0, locT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      if (!G.S || !G.scene) return;
      const p = G.S.p;
      if (!U.modal && !p.dead) {
        const K = IN.keys;
        const turn = (K.ArrowLeft ? -1 : 0) + (K.ArrowRight ? 1 : 0), tilt = (K.ArrowUp ? 1 : 0) + (K.ArrowDown ? -1 : 0);
        p.yaw += turn * 2.3 * dt; p.pitch = G.clamp(p.pitch + tilt * 1.6 * dt, -1.3, 1.3);
        G.time.update(dt);
        G.sc.updatePlayer(dt, { fwd: K.KeyW, back: K.KeyS, left: K.KeyA, right: K.KeyD, sprint: K.ShiftLeft || K.ShiftRight, jump: K.Space });
        G.combat.update(dt);
        G.sc.update(dt);
        locT += dt; if (locT > 1) { locT = 0; U.locationCheck(); }
        saveT += dt; if (saveT > 120 && !G.sc.inCombat()) { saveT = 0; G.save.auto(); }
      }
      if (U.modal && U.modal.kind === 'menu' && U.modal.tab === 'map') { const c = document.querySelector('#modal canvas'); if (c) U.drawMap(c); }
      G.audio.update(U.modal ? 0 : dt, !U.modal && G.sc.moving, G.sc.speed || 0);
      G.gfx.resize(G.settings.scale);
      G.view.frame(dt);
      U.hud();
    } catch (err) { M.crash(err); }
  }
  M.crash = function (err) {
    console.error(err);
    const el = document.getElementById('crash');
    if (!el.hidden) return;
    el.hidden = false;
    el.textContent = 'Something went wrong:\n' + (err && err.stack || err) + '\n\nYour last save is safe - reload the page to continue.';
  };
  window.addEventListener('error', (e) => M.crash(e.error || e.message));

  // ---------------- game start ----------------
  M.prepareWorld = function (seed) {
    if (G.world.seed !== seed) {
      if (G.sc.owMeshes) G.sc.owMeshes.forEach((m) => m && m.dispose());
      G.sc.owMeshes = null;
      G.ui.mapImage = null;
      G.world.gen(seed);
      G.sc.owMeshes = G.world.buildMeshes();
      G.view.init();
    }
  };
  M.enterState = function () {
    const p = G.S.p;
    if (typeof p.scene === 'string' && p.scene.startsWith('in:')) { const [, town, bi] = p.scene.split(':'); try { G.sc.loadInterior(town, +bi); } catch (e) { G.sc.loadOverworld(p.ret ? p.ret.x : p.x, p.ret ? p.ret.z : p.z, 0); } }
    else if (p.scene !== 'overworld' && G.world.dungeons.some((d) => d.id === p.scene)) G.sc.loadDungeon(p.scene);
    else G.sc.loadOverworld(p.x, p.z, p.yaw);
    G.view.lantern = true;
    G.quests.refresh();
    document.getElementById('hud').hidden = false;
  };
  M.newGame = function (name, cls) {
    const seed = (Math.random() * 1e9) | 0;
    G.newState(name, cls, seed);
    M.prepareWorld(seed);
    const L = G.world.towns.find((t) => t.t.id === 'hollowbrook');
    const post = L.posts.elder_maren;
    const p = G.S.p;
    p.x = post.x; p.z = post.z + 5; p.yaw = 0;
    p.visitedTowns.hollowbrook = 1;
    M.enterState();
    U.banner('Hollowbrook', 'Ash still falls from a red sky. Speak with Elder Maren (marked with a grey !).');
    setTimeout(() => U.toast('WASD to move · click to look with the mouse · E to talk · Esc for menu'), 1500);
    G.save.write();
  };
  M.loadState = function (S) {
    G.S = S;
    M.prepareWorld(S.seed);
    M.enterState();
    U.toast('Welcome back, ' + S.p.name + '.');
  };
  M.loadSaved = function () {
    const S = G.save.read();
    if (!S) { U.title(); return; }
    M.loadState(S);
  };
  M.importFromTitle = function () {
    G.S = G.S || null;
    U.open('text', { title: 'Paste a save code', text: '', ro: false });
    U.modal.onClose = () => { if (!G.scene) U.title(); };
  };

  M.boot = function () {
    G.tex.build(G.SPR);
    G.gfx.init(document.getElementById('gl'));
    G.gfx.setAtlas(G.tex.atlas);
    G.gfx.resize(G.settings.scale);
    G.view.overlay = document.getElementById('overlay');
    U.init();
    requestAnimationFrame(frame);
    const q = new URLSearchParams(location.search);
    if (q.has('demo')) {
      G.demo = true;
      M.newGame('Demo', q.get('cls') || 'warrior');
      const at = (q.get('demo') || '').split(',').map(Number);
      const p = G.S.p;
      if (q.get('dungeon')) { const d = G.world.dungeons.find((d) => d.kind === q.get('dungeon')) || G.world.dungeons[0]; G.sc.loadDungeon(d.id); }
      else if (at.length === 2 && at.every((n) => !isNaN(n))) { p.x = at[0]; p.z = at[1]; G.sc.loadOverworld(p.x, p.z, 0); }
      if (q.has('yaw')) p.yaw = +q.get('yaw');
      if (q.has('pitch')) p.pitch = +q.get('pitch');
      if (q.has('time')) G.S.time = +q.get('time') * 60;
      const ui = q.get('ui');
      if (ui === 'talk') { const e = G.scene.ents.find((e) => e.npc && e.npc.id === 'elder_maren'); U.talk(e); }
      else if (ui === 'house') { const L = G.world.towns.find((t) => t.t.id === (q.get('town') || 'ravenhold')); const bi = L.buildings.findIndex((b) => b.role === (q.get('role') || 'inn')); G.sc.loadInterior(L.t.id, Math.max(0, bi)); }
      else if (ui) U.menu(ui);
      return;
    }
    U.title();
  };
  window.addEventListener('DOMContentLoaded', () => { try { M.boot(); } catch (err) { M.crash(err); } });
})(window.G);
