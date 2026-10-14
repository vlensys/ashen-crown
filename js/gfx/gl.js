'use strict';
// Tiny WebGL2 renderer: textured triangles from one atlas, per-vertex light, point lights, fog,
// GPU-side cylindrical billboards. Rendered at low resolution and scaled up with crisp pixels.
(function (G) {
  const FL = 15; // floats per vertex: pos3 off2 uv2 rect4 col4
  const VS = `#version 300 es
  in vec3 aPos; in vec2 aOff; in vec2 aUV; in vec4 aRect; in vec4 aCol;
  uniform mat4 uVP; uniform vec3 uRight; uniform vec3 uCam;
  out vec2 vUV; out vec4 vRect; out vec4 vCol; out float vDist; out vec3 vW;
  void main() {
    vec3 p = aPos + uRight * aOff.x + vec3(0.0, aOff.y, 0.0);
    vW = p; vUV = aUV; vRect = aRect; vCol = aCol;
    vDist = length(p - uCam);
    gl_Position = uVP * vec4(p, 1.0);
  }`;
  const FS = `#version 300 es
  precision mediump float;
  uniform sampler2D uTex; uniform vec3 uFog; uniform float uFogD; uniform vec3 uSky; uniform float uTime;
  uniform vec4 uLP[8]; uniform vec3 uLC[8]; uniform int uNL; uniform float uHit;
  in vec2 vUV; in vec4 vRect; in vec4 vCol; in float vDist; in vec3 vW;
  out vec4 o;
  void main() {
    float m = vCol.a;
    vec2 f = vUV;
    if (m > 2.5 && m < 3.5) f += vec2(uTime * 0.03, uTime * 0.017);
    vec4 t = texture(uTex, vRect.xy + fract(f) * vRect.zw);
    if (t.a < 0.5) discard;
    vec3 l;
    if (m > 1.5 && m < 2.5) l = vec3(1.0);
    else {
      l = (m < 0.5 || m > 2.5) ? vCol.rgb * uSky : vCol.rgb;
      for (int i = 0; i < 8; i++) {
        if (i >= uNL) break;
        float a = clamp(1.0 - length(uLP[i].xyz - vW) / uLP[i].w, 0.0, 1.0);
        l += uLC[i] * a * a;
      }
      l = floor(l * 20.0 + 0.5) / 20.0;
    }
    vec3 c = t.rgb * l;
    if (m > 4.5) c = mix(c, vec3(1.0, 0.25, 0.2), 0.6); // hurt flash
    float fd = vDist * uFogD;
    o = vec4(mix(c, uFog, clamp(1.0 - exp(-fd * fd), 0.0, 1.0)), 1.0);
  }`;
  const SKY_VS = `#version 300 es
  const vec2 P[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
  void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }`;
  const SKY_FS = `#version 300 es
  precision mediump float;
  uniform vec3 uFog; uniform vec3 uTop; uniform float uPitch; uniform float uH; uniform float uFov;
  out vec4 o;
  void main() {
    float y = gl_FragCoord.y / uH * 2.0 - 1.0;
    float e = uPitch + y * uFov * 0.5;
    o = vec4(mix(uFog, uTop, clamp(e * 1.6, 0.0, 1.0)), 1.0);
  }`;

  const X = (G.gfx = { FL });
  let gl, prog, sky, loc = {}, sloc = {};
  function compile(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    return p;
  }
  X.init = function (canvas) {
    X.canvas = canvas;
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    X.gl = gl;
    prog = compile(VS, FS);
    ['aPos', 'aOff', 'aUV', 'aRect', 'aCol'].forEach((n) => (loc[n] = gl.getAttribLocation(prog, n)));
    ['uVP', 'uRight', 'uCam', 'uTex', 'uFog', 'uFogD', 'uSky', 'uTime', 'uLP', 'uLC', 'uNL', 'uHit'].forEach((n) => (loc[n] = gl.getUniformLocation(prog, n)));
    sky = compile(SKY_VS, SKY_FS);
    ['uFog', 'uTop', 'uPitch', 'uH', 'uFov'].forEach((n) => (sloc[n] = gl.getUniformLocation(sky, n)));
    X.dyn = new Mesh(null, true);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  };
  X.setAtlas = function (canvas) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    X.tex = t;
  };
  X.resize = function (scale) {
    const w = Math.max(160, Math.floor(window.innerWidth / scale)), h = Math.max(100, Math.floor(window.innerHeight / scale));
    if (X.canvas.width !== w || X.canvas.height !== h) { X.canvas.width = w; X.canvas.height = h; }
    X.w = w; X.h = h;
  };

  // ---------- meshes ----------
  class Mesh {
    constructor(data, dynamic) {
      this.vao = gl.createVertexArray();
      this.buf = gl.createBuffer();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      const S = FL * 4;
      const at = (n, size, off) => { gl.enableVertexAttribArray(loc[n]); gl.vertexAttribPointer(loc[n], size, gl.FLOAT, false, S, off * 4); };
      at('aPos', 3, 0); at('aOff', 2, 3); at('aUV', 2, 5); at('aRect', 4, 7); at('aCol', 4, 11);
      gl.bindVertexArray(null);
      this.count = 0;
      if (data) this.set(data, dynamic);
    }
    set(data, dynamic) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      this.count = data.length / FL;
      // bounds for culling
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (let i = 0; i < data.length; i += FL) { const x = data[i], z = data[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
      this.cx = (x0 + x1) / 2; this.cz = (z0 + z1) / 2; this.r = Math.hypot(x1 - x0, z1 - z0) / 2 + 4;
    }
    dispose() { gl.deleteBuffer(this.buf); gl.deleteVertexArray(this.vao); }
  }
  X.Mesh = Mesh;

  // Builder collects vertices; colours are [r,g,b] light, mode: 0 outdoor (scaled by sky), 1 indoor, 2 fullbright, 3 water, 5 hurt flash
  class Builder {
    constructor() { this.d = []; }
    v(x, y, z, ox, oy, u, v, r, c, m) { this.d.push(x, y, z, ox, oy, u, v, r[0], r[1], r[2], r[3], c[0], c[1], c[2], m); }
    // p: four corners [x,y,z] in order; uv: four [u,v]; c: light colour (one or four)
    quad(p, rect, uv, c, m) {
      const cc = Array.isArray(c[0]) ? c : [c, c, c, c];
      const idx = [0, 1, 2, 0, 2, 3];
      for (const i of idx) this.v(p[i][0], p[i][1], p[i][2], 0, 0, uv[i][0], uv[i][1], rect, cc[i], m || 0);
    }
    // camera-facing sprite standing on (x,y,z)
    sprite(x, y, z, w, h, rect, c, m, flip) {
      const a = 0.002, b = 0.998;
      const u0 = flip ? b : a, u1 = flip ? a : b;
      const C = [[-w / 2, 0, u0, b], [w / 2, 0, u1, b], [w / 2, h, u1, a], [-w / 2, h, u0, a]];
      for (const i of [0, 1, 2, 0, 2, 3]) this.v(x, y, z, C[i][0], C[i][1], C[i][2], C[i][3], rect, c, m || 0);
    }
    // axis aligned box. tex: {top, side, bottom} rects; tile = world units per texture repeat
    box(x0, y0, z0, x1, y1, z1, tex, c, m, tile) {
      tile = tile || 2;
      const sh = (k) => [c[0] * k, c[1] * k, c[2] * k];
      const T = tex.top === null ? null : tex.top || tex.side, S = tex.side, B = tex.bottom || tex.side;
      const w = (x1 - x0) / tile, h = (y1 - y0) / tile, d = (z1 - z0) / tile;
      if (T) this.quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], T, [[0, 0], [w, 0], [w, d], [0, d]], sh(1), m);
      if (B && tex.bottom !== null) this.quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], B, [[0, 0], [w, 0], [w, d], [0, d]], sh(0.5), m);
      this.quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], S, [[0, h], [w, h], [w, 0], [0, 0]], sh(0.85), m);
      this.quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], S, [[0, h], [w, h], [w, 0], [0, 0]], sh(0.6), m);
      this.quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], S, [[0, h], [d, h], [d, 0], [0, 0]], sh(0.75), m);
      this.quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], S, [[0, h], [d, h], [d, 0], [0, 0]], sh(0.7), m);
    }
    build(dynamic) { return this.d.length ? new Mesh(new Float32Array(this.d), dynamic) : null; }
    get length() { return this.d.length; }
  }
  X.Builder = Builder;

  // ---------- frame ----------
  // cam: {x,y,z,yaw,pitch,fov}; env: {fog:[r,g,b], top:[..], fogD, sky:[r,g,b], lights:[[x,y,z,r, cr,cg,cb]], time}
  X.draw = function (meshes, dynData, cam, env) {
    gl.viewport(0, 0, X.w, X.h);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // sky gradient
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(sky);
    gl.uniform3fv(sloc.uFog, env.fog); gl.uniform3fv(sloc.uTop, env.top);
    gl.uniform1f(sloc.uPitch, cam.pitch); gl.uniform1f(sloc.uH, X.h); gl.uniform1f(sloc.uFov, cam.fov);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(prog);
    const proj = G.m4.persp(cam.fov, X.w / X.h, 0.08, env.far || 400);
    const vp = G.m4.mul(proj, G.m4.view([cam.x, cam.y, cam.z], cam.yaw, cam.pitch));
    gl.uniformMatrix4fv(loc.uVP, false, vp);
    gl.uniform3f(loc.uRight, Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    gl.uniform3f(loc.uCam, cam.x, cam.y, cam.z);
    gl.uniform3fv(loc.uFog, env.fog); gl.uniform1f(loc.uFogD, env.fogD); gl.uniform3fv(loc.uSky, env.sky);
    gl.uniform1f(loc.uTime, env.time);
    const L = env.lights.slice(0, 8);
    const lp = new Float32Array(32), lc = new Float32Array(24);
    L.forEach((l, i) => { lp.set([l[0], l[1], l[2], l[3]], i * 4); lc.set([l[4], l[5], l[6]], i * 3); });
    gl.uniform4fv(loc.uLP, lp); gl.uniform3fv(loc.uLC, lc); gl.uniform1i(loc.uNL, L.length);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, X.tex); gl.uniform1i(loc.uTex, 0);
    const fx = Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
    const far = env.far || 400;
    let drawn = 0;
    for (const m of meshes) {
      if (!m || !m.count) continue;
      const dx = m.cx - cam.x, dz = m.cz - cam.z, d = Math.hypot(dx, dz);
      if (d - m.r > far) continue;
      if (d > m.r && (dx * fx + dz * fz) / d < -0.35 - m.r / d) continue;
      gl.bindVertexArray(m.vao);
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
      drawn++;
    }
    if (dynData && dynData.length) {
      X.dyn.set(new Float32Array(dynData), true);
      gl.bindVertexArray(X.dyn.vao);
      gl.drawArrays(gl.TRIANGLES, 0, X.dyn.count);
    }
    gl.bindVertexArray(null);
    X.drawn = drawn;
  };
})(window.G);
