'use strict';
// Saves: localStorage plus portable codes  AC1.<z|p>.<base64>.<checksum>
(function (G) {
  const SV = (G.save = {});
  const KEY = 'ashencrown_save_v1';
  SV.snapshot = function () {
    const S = JSON.parse(JSON.stringify(G.S));
    S.p.dead = false;
    delete S.p.vy; delete S.p.bob; delete S.p.onGround;
    return S;
  };
  SV.write = function () {
    if (!G.S || G.S.p.dead || G.demo) return false;
    try { localStorage.setItem(KEY, JSON.stringify(SV.snapshot())); return true; } catch (e) { return false; }
  };
  SV.auto = SV.write;
  SV.manual = SV.write;
  SV.has = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  SV.read = function () { try { return SV.validate(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return null; } };
  SV.validate = function (S) {
    if (!S || !S.p || typeof S.seed !== 'number' || !Array.isArray(S.p.inv)) throw new Error('not an Ashen Crown save');
    S.p.inv = S.p.inv.filter((s) => s && G.ITEMS[s.id] && s.n > 0);
    for (const k in S.p.equip) if (!G.ITEMS[S.p.equip[k]] || !S.p.inv.some((s) => s.id === S.p.equip[k])) delete S.p.equip[k];
    for (const k in S.quests) if (!G.QUESTS[k]) delete S.quests[k];
    S.p.spells = (S.p.spells || []).filter((s) => G.SPELLS[s]);
    if (!G.SPELLS[S.p.spell]) S.p.spell = S.p.spells[0] || null;
    S.dstate = S.dstate || {}; S.ow = Object.assign({ killed: {}, plants: {}, chests: {}, sacks: [] }, S.ow || {});
    S.stats = Object.assign({ kills: 0, deaths: 0, play: 0 }, S.stats || {});
    S.p.discovered = S.p.discovered || {}; S.p.visitedTowns = S.p.visitedTowns || {};
    return S;
  };
  const toB64 = (b) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = (s) => { const t = atob(s), o = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) o[i] = t.charCodeAt(i); return o; };
  const sum = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
  SV.exportCode = async function () {
    const raw = new TextEncoder().encode(JSON.stringify(SV.snapshot()));
    let mode = 'p', bytes = raw;
    if (typeof CompressionStream !== 'undefined') { try { bytes = await pipe(raw, new CompressionStream('deflate-raw')); mode = 'z'; } catch (e) { /* plain */ } }
    const b = toB64(bytes);
    return 'AC1.' + mode + '.' + b + '.' + sum(b);
  };
  SV.importCode = async function (code) {
    const parts = (code || '').replace(/\s+/g, '').split('.');
    if (parts.length !== 4 || parts[0] !== 'AC1') throw new Error('That is not an Ashen Crown save code.');
    if (sum(parts[2]) !== parts[3]) throw new Error('The code is damaged or incomplete.');
    let bytes = fromB64(parts[2]);
    if (parts[1] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    return SV.validate(JSON.parse(new TextDecoder().decode(bytes)));
  };
})(window.G);
