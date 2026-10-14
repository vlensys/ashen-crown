'use strict';
// Per-frame rendering: atmosphere, lights, dynamic sprites and the first-person weapon.
(function (G) {
  const V = (G.view = {});
  const W = G.world;
  const mixc = (a, b, t) => [G.lerp(a[0], b[0], t), G.lerp(a[1], b[1], t), G.lerp(a[2], b[2], t)];
  const PAL = {
    day: { fog: [0.43, 0.44, 0.46], top: [0.28, 0.31, 0.36], sky: [1, 0.97, 0.92] },
    dusk: { fog: [0.46, 0.29, 0.24], top: [0.22, 0.14, 0.19], sky: [0.95, 0.68, 0.52] },
    night: { fog: [0.035, 0.045, 0.075], top: [0.01, 0.012, 0.03], sky: [0.2, 0.23, 0.36] },
  };
  V.env = function () {
    const s = G.scene, p = G.S.p;
    if (s.kind === 'interior') { const th = s.L.th; return { fog: th.fog, top: th.fog, sky: th.amb.map((v) => v * 2.2 + 0.05), fogD: 0.02, far: 60 }; }
    if (s.kind === 'dungeon') {
      const th = s.L.th;
      return { fog: th.fog, top: th.fog, sky: th.amb.map((v) => v * 1.9 + 0.02), fogD: 0.034, far: 75 };
    }
    const h = G.time.hour();
    let a, b, t;
    if (h < 5) { a = b = PAL.night; t = 0; }
    else if (h < 6.5) { a = PAL.night; b = PAL.dusk; t = (h - 5) / 1.5; }
    else if (h < 8) { a = PAL.dusk; b = PAL.day; t = (h - 6.5) / 1.5; }
    else if (h < 18.5) { a = b = PAL.day; t = 0; }
    else if (h < 20) { a = PAL.day; b = PAL.dusk; t = (h - 18.5) / 1.5; }
    else if (h < 21.5) { a = PAL.dusk; b = PAL.night; t = (h - 20) / 1.5; }
    else { a = b = PAL.night; t = 0; }
    let fog = mixc(a.fog, b.fog, t), top = mixc(a.top, b.top, t), sky = mixc(a.sky, b.sky, t);
    let fogD = G.time.isNight() ? 0.015 : 0.0105;
    const i = p.x / W.CS, j = p.z / W.CS;
    if (W.inWaste(i | 0, j | 0)) { fog = mixc(fog, [0.32, 0.12, 0.08], 0.55); top = mixc(top, [0.2, 0.05, 0.03], 0.5); sky = mixc(sky, [1, 0.65, 0.5], 0.4); fogD *= 1.3; }
    else if (W.inSwamp(i | 0, j | 0)) { fog = mixc(fog, [0.2, 0.26, 0.2], 0.5); fogD *= 1.6; }
    else if (j < 70) { fog = mixc(fog, [0.6, 0.64, 0.7], G.time.isNight() ? 0.05 : 0.35); }
    return { fog, top, sky, fogD, far: 175 };
  };
  V.lights = function (env) {
    const s = G.scene, p = G.S.p, t = performance.now() / 1000;
    const out = [];
    const night = G.time.isNight() || s.grid;
    if (s.kind === 'dungeon') out.push([p.x, p.y + 1.6, p.z, 13, 0.95, 0.78, 0.5]);
    else if (night && V.lantern) out.push([p.x, p.y + 1.6, p.z, 10, 0.75, 0.62, 0.42]);
    const cand = [];
    for (const l of s.lights) {
      if (l.night && !night && !s.grid) continue;
      const d = Math.hypot(l.x - p.x, l.z - p.z);
      if (d > 60) continue;
      const f = l.flicker ? 0.9 + Math.sin(t * 11 + l.x) * 0.06 + Math.sin(t * 17 + l.z) * 0.04 : 1;
      cand.push([d, [l.x, l.y, l.z, l.r * f, l.c[0], l.c[1], l.c[2]]]);
    }
    for (const q of s.projs) if (q.color) cand.push([Math.hypot(q.x - p.x, q.z - p.z) - 5, [q.x, q.y, q.z, 7, q.color[0], q.color[1], q.color[2]]]);
    cand.sort((a, b) => a[0] - b[0]);
    for (const c of cand) { if (out.length >= 8) break; out.push(c[1]); }
    return out;
  };

  // ---------- dynamic sprites ----------
  V.sprites = function (cam) {
    const s = G.scene, p = G.S.p, B = new G.gfx.Builder(), R = G.tex.r, t = performance.now() / 1000;
    const rx = Math.cos(cam.yaw), rz = Math.sin(cam.yaw);
    const near = (x, z, d) => Math.abs(x - p.x) < d && Math.abs(z - p.z) < d;
    for (const e of s.ents) {
      if (!near(e.x, e.z, 140)) continue;
      const spec = G.SPR[e.sprite] || {};
      const fr = e.frame || 0;
      let key = e.sprite + '_' + fr, flip = false;
      const camA = Math.atan2(cam.x - e.x, -(cam.z - e.z));
      const fy = e.fy == null ? camA : e.fy;
      const facingRight = Math.sin(fy) * rx - Math.cos(fy) * rz > 0;
      if ((!spec.beast || spec.beast === 'wraith') && fr < 4) {
        const rel = Math.abs(G.angDiff(fy, camA));
        if (rel > 2.35) key = e.sprite + '_b' + fr;
        else if (rel > 0.8) { key = e.sprite + '_s' + fr; flip = !facingRight; }
      } else if (e.def && e.def.flip) flip = !facingRight;
      const bob = e.def && e.def.float ? Math.sin(e.t * 2) * 0.15 + 0.3 : 0;
      const mode = e.hurt > 0 ? 5 : 0;
      B.sprite(e.x, e.y + bob, e.z, e.dead && e.def ? e.w * 1.3 : e.w, e.h, R(key), [1, 1, 1], mode, flip);
      if (e.npc) {
        const m = G.quests.marker(e.npc.id);
        if (m) B.sprite(e.x, e.y + e.h + 0.3 + Math.sin(t * 3) * 0.08, e.z, 0.32, 0.72, R('mark_' + m), [1, 1, 1], 2);
      }
    }
    for (const it of s.interact) {
      if (it.kind === 'chest') B.sprite(it.x, SC().groundAt(it.x, it.z), it.z, 1.1, 0.85, R(it.looted ? 'chest_open' : 'chest'), [1, 1, 1], 0);
      if (it.kind === 'ore' && !it.mined) B.sprite(it.x, 0, it.z, 1.1, 0.8, R('ore'), [1, 1, 1], 0);
      if (it.kind === 'plant') B.sprite(it.x, SC().groundAt(it.x, it.z), it.z, it.plant.kind === 'lotus' ? 0.8 : 0.7, it.plant.kind === 'lotus' ? 0.6 : 0.8, R(it.picked ? it.plant.kind + '_picked' : it.plant.kind), [1, 1, 1], 0);
      if (it.kind === 'sack') B.sprite(it.x, SC().groundAt(it.x, it.z), it.z, 0.7, 0.6, R('sack'), [1, 1, 1], 0);
    }
    if (s.kind === 'overworld') for (const it of s.interact) {
      if (it.kind !== 'house' || !it.building.inside || !near(it.x, it.z, 90)) continue;
      const m = G.quests.marker(it.building.inside);
      if (m) B.sprite(it.x, W.groundH(it.x, it.z) + 3 + Math.sin(t * 3) * 0.08, it.z, 0.4, 0.9, R('mark_' + m), [1, 1, 1], 2);
    }
    const anim = s.grid ? s.L.props : V.owAnim;
    for (const a of anim || []) {
      if (!a.anim || !near(a.x, a.z, 90)) continue;
      const f = Math.floor(t * 6 + a.x) % 2;
      B.sprite(a.x, (a.y || SC().groundAt(a.x, a.z)), a.z, a.w, a.h, R(a.anim + f), [1, 1, 1], 2);
    }
    for (const q of s.projs) { if (q.sprite === 'arrow_spr') B.sprite(q.x, q.y - 0.1, q.z, 0.8, 0.2, R(q.sprite), [1, 1, 1], 0); else B.sprite(q.x, q.y - 0.25, q.z, 0.5, 0.5, R(q.sprite), [1, 1, 1], 2); }
    for (const q of s.parts) B.sprite(q.x, q.y, q.z, 0.12, 0.12, R(q.sprite), [1, 1, 1], q.sprite === 'spark' ? 2 : 0);
    return B.d;
  };
  const SC = () => G.sc;
  V.init = function () {
    // animated fires in the overworld (towns and sites)
    V.owAnim = [];
    for (const p of W.siteProps) if (p.anim) V.owAnim.push(p);
    for (const L of W.towns) for (const p of L.props) if (p.kind === 'campfire') V.owAnim.push({ x: p.x, z: p.z, w: 1.4, h: 1.3, anim: 'campfire' });
  };

  // ---------- frame ----------
  V.frame = function (dt) {
    const p = G.S.p;
    const bob = Math.sin((p.bob || 0) * 1.0) * 0.05;
    const cam = { x: p.x, y: p.y + 1.62 + bob, z: p.z, yaw: p.yaw, pitch: p.pitch, fov: (G.settings.fov || 72) * Math.PI / 180 };
    if (p.dead) cam.y = p.y + 0.4;
    const env = V.env();
    env.lights = V.lights(env);
    env.time = performance.now() / 1000;
    G.gfx.draw(G.scene.meshes, V.sprites(cam), cam, env);
    V.weapon(dt);
  };

  // ---------- first-person weapon ----------
  V.weapon = function (dt) {
    const cv = V.overlay, g = cv.getContext('2d');
    const w = G.gfx.w, h = G.gfx.h;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    g.clearRect(0, 0, w, h);
    const p = G.S.p;
    if (p.dead || G.ui.modal) return;
    const st = G.player.stats(), wp = st.weapon;
    const u = h / 240;
    const bobX = Math.sin((p.bob || 0) * 0.5) * 6 * u, bobY = Math.abs(Math.cos((p.bob || 0) * 0.5)) * 5 * u;
    const sw = G.combat.swing;
    let k = 0;
    if (sw) k = Math.sin(Math.min(1, sw.t / sw.dur) * Math.PI);
    const block = G.combat.blocking;
    const night = G.scene.kind === 'dungeon' ? 0.55 : G.scene.kind === 'interior' ? 0.8 : G.time.isNight() ? 0.5 : 1;
    const shade = (hex, f) => { const c = G.tex.C(hex); f *= night; return 'rgb(' + Math.min(255, c[0] * f) + ',' + Math.min(255, c[1] * f) + ',' + Math.min(255, c[2] * f) + ')'; };
    // shield in the off hand
    if (p.equip.shield && !(wp.twoHand)) {
      const sd = G.item(p.equip.shield);
      const sx = w * 0.12 + bobX * 0.5 + (block ? 70 * u : 0), sy = h * 0.9 + bobY - (block ? 45 * u : 0);
      g.fillStyle = '#0c0a08'; g.fillRect(sx - 26 * u, sy - 3 * u, 52 * u, 70 * u);
      g.fillStyle = shade(sd.color, 0.85); g.fillRect(sx - 24 * u, sy - 1 * u, 48 * u, 66 * u);
      g.fillStyle = shade(sd.color, 1.15); g.fillRect(sx - 24 * u, sy - 1 * u, 6 * u, 66 * u);
      g.fillStyle = shade('#b09040', 0.9); g.fillRect(sx - 3 * u, sy + 14 * u, 6 * u, 24 * u);
    }
    // spell glow when casting
    if (G.ui.castT > 0) {
      const c = G.ui.castColor || [1, 0.6, 0.2];
      g.fillStyle = 'rgba(' + c.map((v) => Math.round(v * 255)).join(',') + ',' + (G.ui.castT * 1.5).toFixed(2) + ')';
      g.beginPath(); g.arc(w * 0.3, h * 0.78, 30 * u, 0, Math.PI * 2); g.fill();
    }
    if (wp.wtype === 'bow') {
      const drawK = sw && sw.t < sw.dur * 0.6 ? Math.min(1, sw.t / (sw.dur * 0.6)) : 0;
      const R = 72 * u, bx = w * 0.7 + bobX, by = h * 0.72 + bobY, cx0 = bx - R * 0.55;
      const arc = (col, lw) => { g.lineWidth = lw; g.strokeStyle = col; g.beginPath(); g.arc(cx0, by, R, -0.95, 0.95); g.stroke(); };
      arc('#0c0a08', Math.max(2, 5 * u)); arc(shade(wp.color || '#6a4a2a', 1), Math.max(1, 3 * u));
      const tx = cx0 + Math.cos(0.95) * R, ty1 = by - Math.sin(0.95) * R, ty2 = by + Math.sin(0.95) * R;
      const pull = drawK * 38 * u;
      g.lineWidth = 1; g.strokeStyle = shade('#d8d0b8', 1);
      g.beginPath(); g.moveTo(tx, ty1); g.lineTo(tx - 16 * u - pull, by); g.lineTo(tx, ty2); g.stroke();
      if (G.player.count('arrows') && (!sw || sw.t < sw.dur * 0.6)) { g.fillStyle = shade('#8a6a3a', 1); g.fillRect(tx - 16 * u - pull, by - 1.2 * u, 80 * u, 2.4 * u); g.fillStyle = shade('#a0a0a8', 1); g.fillRect(tx + 60 * u - pull, by - 3 * u, 7 * u, 6 * u); }
      g.fillStyle = '#0c0a08'; g.fillRect(tx - 9 * u, by - 9 * u, 18 * u, 18 * u);
      g.fillStyle = shade('#a07858', 1); g.fillRect(tx - 7 * u, by - 7 * u, 14 * u, 14 * u);
      return;
    }
    // the weapon
    const px = w * 0.72 + bobX - k * 90 * u + (block ? -50 * u : 0), py = h * 0.95 + bobY - k * 30 * u - (block ? 25 * u : 0);
    g.save();
    g.translate(px, py);
    g.rotate(-0.55 - k * 1.1 + (block ? -0.6 : 0));
    const L = { bow: 0, dagger: 55, sword: 95, axe: 90, mace: 85, greatsword: 130, staff: 150, fist: 0 }[wp.wtype] * u;
    const col = wp.color || '#9a9ea4';
    // hand
    g.fillStyle = '#0c0a08'; g.fillRect(-14 * u, -6 * u, 28 * u, 34 * u);
    g.fillStyle = shade('#a07858', 1); g.fillRect(-12 * u, -4 * u, 24 * u, 30 * u);
    if (wp.wtype === 'fist') { g.restore(); return; }
    g.fillStyle = '#0c0a08'; g.fillRect(-5 * u, -L - 4 * u, 10 * u, L + 8 * u);
    if (wp.wtype === 'staff') {
      g.fillStyle = shade('#5a3e22', 1); g.fillRect(-3 * u, -L, 6 * u, L);
      g.fillStyle = shade(col, 1.4); g.fillRect(-8 * u, -L - 12 * u, 16 * u, 14 * u);
    } else if (wp.wtype === 'axe') {
      g.fillStyle = shade('#5a3e22', 1); g.fillRect(-3 * u, -L, 6 * u, L);
      g.fillStyle = '#0c0a08'; g.fillRect(-2 * u, -L - 2 * u, 34 * u, 30 * u);
      g.fillStyle = shade(col, 1); g.fillRect(0, -L, 30 * u, 26 * u);
      g.fillStyle = shade(col, 1.35); g.fillRect(24 * u, -L, 6 * u, 26 * u);
    } else if (wp.wtype === 'mace') {
      g.fillStyle = shade('#5a3e22', 1); g.fillRect(-3 * u, -L, 6 * u, L);
      g.fillStyle = '#0c0a08'; g.fillRect(-13 * u, -L - 13 * u, 26 * u, 28 * u);
      g.fillStyle = shade(col, 1); g.fillRect(-11 * u, -L - 11 * u, 22 * u, 24 * u);
      g.fillStyle = shade(col, 1.4); g.fillRect(-11 * u, -L - 11 * u, 6 * u, 24 * u);
    } else {
      const bw = wp.wtype === 'greatsword' ? 9 : wp.wtype === 'dagger' ? 6 : 7;
      g.fillStyle = shade('#3a2a18', 1); g.fillRect(-3 * u, -14 * u, 6 * u, 14 * u);
      g.fillStyle = '#0c0a08'; g.fillRect(-16 * u, -20 * u, 32 * u, 8 * u);
      g.fillStyle = shade('#8a7040', 1); g.fillRect(-14 * u, -18 * u, 28 * u, 4 * u);
      g.fillStyle = '#0c0a08'; g.fillRect(-bw * u - 2 * u, -L - 8 * u, bw * 2 * u + 4 * u, L - 10 * u);
      g.fillStyle = shade(col, 1); g.fillRect(-bw * u, -L - 6 * u, bw * 2 * u, L - 14 * u);
      g.fillStyle = shade(col, 1.45); g.fillRect(-bw * u, -L - 6 * u, bw * 0.6 * u, L - 14 * u);
      if (wp.fire) { g.fillStyle = 'rgba(255,140,40,' + (0.25 + Math.sin(performance.now() / 90) * 0.15) + ')'; g.fillRect(-bw * u - 4 * u, -L - 10 * u, bw * 2 * u + 8 * u, L - 6 * u); }
    }
    g.restore();
  };
})(window.G);
