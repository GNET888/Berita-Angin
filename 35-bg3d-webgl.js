(window.requestIdleCallback||function(f){setTimeout(f,150)})(function(){/* LATAR 3D — "Visualizing Graphs in 3D with WebGL": graf jaringan aset (Kripto, Saham, Global) berbasis
   force-directed layout 3D yang dirender dengan WebGL murni (tanpa library): simpul bercahaya (point sprite),
   sisi bergradasi, denyut data yang mengalir di sepanjang sisi, kamera orbit + parallax kursor, label hub.
   Mendukung tema gelap/terang, berhenti saat tab tersembunyi, dan statis bila prefers-reduced-motion. */
(function () {
  'use strict';
  var cv = document.getElementById('bg3d'); if (!cv || window.__bg3d) return; window.__bg3d = true;
  var gl = cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true }) || cv.getContext('experimental-webgl');
  if (!gl) return;
  var lb = document.createElement('canvas'); lb.id = 'bg3d-lbl'; lb.setAttribute('aria-hidden', 'true');
  lb.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block';
  cv.style.zIndex = '-2'; cv.parentNode.insertBefore(lb, cv); var lx = lb.getContext('2d');
  var w = 0, h = 0, dpr = 1, tx = 0, ty = 0, mx = 0, my = 0, last = performance.now(), T = 0, frame = 0, i, j;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); }, clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var DKC = [[.22, .74, .97], [.2, .83, .6], [.51, .55, .97]], LTC = [[.01, .52, .78], [.02, .59, .41], [.31, .27, .9]], PUL = { d: [.98, .75, .14], l: [.71, .33, .04] };
  var NAMES = [['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA'], ['BBCA', 'BBRI', 'TLKM', 'ASII', 'NVDA', 'AAPL'], ['S&P 500', 'IHSG', 'NIKKEI', 'DAX', 'DXY', 'GOLD']];
  /* ---------- graf: 3 klaster, hub berderajat tinggi + lampiran preferensial ---------- */
  var NCL = 3, NPC = 46, N = NCL * NPC, E = [], cl = new Uint8Array(N), deg = new Float32Array(N), lab = [];
  var px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  function link(a, b) { if (a === b) return; for (var q = 0; q < E.length; q++) if ((E[q][0] === a && E[q][1] === b) || (E[q][0] === b && E[q][1] === a)) return; E.push([a, b]); deg[a]++; deg[b]++; }
  (function build() {
    var c, k, n, base, pick, tot, r, ang = [0, 2.094, 4.188];
    for (c = 0; c < NCL; c++) {
      base = c * NPC;
      for (n = 0; n < NPC; n++) { var id = base + n; cl[id] = c; px[id] = Math.cos(ang[c]) * 3.2 + rnd(-1.4, 1.4); py[id] = (c - 1) * 1.6 + rnd(-1.4, 1.4); pz[id] = Math.sin(ang[c]) * 3.2 + rnd(-1.4, 1.4); }
      for (k = 0; k < 6; k++) { link(base + k, base + (k + 1) % 6); link(base + k, base + (k + 2) % 6); lab[base + k] = NAMES[c][k]; }
      for (n = 6; n < NPC; n++) {
        for (k = 0; k < (n % 3 === 0 ? 2 : 1); k++) {
          tot = 0; for (j = 0; j < n; j++) tot += deg[base + j] + 1; r = Math.random() * tot; pick = 0;
          for (j = 0; j < n; j++) { r -= deg[base + j] + 1; if (r <= 0) { pick = j; break; } }
          link(base + n, base + pick);
        }
      }
    }
    for (k = 0; k < 16; k++) { var a = Math.floor(Math.random() * NCL), b = (a + 1 + Math.floor(Math.random() * 2)) % NCL; link(a * NPC + Math.floor(Math.random() * 8), b * NPC + Math.floor(Math.random() * 8)); }
    link(0, NPC); link(0, 2 * NPC); link(NPC, 2 * NPC);
  })();
  var NE = E.length;
  /* ---------- tata letak force-directed 3D ---------- */
  var REP = .75, SPR = .07, RL = 1.1, GRV = .03;
  function layout(n) {
    while (n-- > 0) {
      var a, b, dx, dy, dz, r2, f, e;
      for (a = 0; a < N; a++) for (b = a + 1; b < N; b++) {
        dx = px[a] - px[b]; dy = py[a] - py[b]; dz = pz[a] - pz[b]; r2 = dx * dx + dy * dy + dz * dz + .08; f = REP / (r2 * Math.sqrt(r2));
        vx[a] += dx * f; vy[a] += dy * f; vz[a] += dz * f; vx[b] -= dx * f; vy[b] -= dy * f; vz[b] -= dz * f;
      }
      for (e = 0; e < NE; e++) {
        a = E[e][0]; b = E[e][1]; dx = px[b] - px[a]; dy = py[b] - py[a]; dz = pz[b] - pz[a]; var L = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4; f = SPR * (L - RL) / L;
        vx[a] += dx * f; vy[a] += dy * f; vz[a] += dz * f; vx[b] -= dx * f; vy[b] -= dy * f; vz[b] -= dz * f;
      }
      for (a = 0; a < N; a++) {
        vx[a] = (vx[a] - px[a] * GRV) * .82; vy[a] = (vy[a] - py[a] * GRV) * .82; vz[a] = (vz[a] - pz[a] * GRV) * .82;
        var sp = Math.sqrt(vx[a] * vx[a] + vy[a] * vy[a] + vz[a] * vz[a]); if (sp > .35) { sp = .35 / sp; vx[a] *= sp; vy[a] *= sp; vz[a] *= sp; }
        px[a] += vx[a]; py[a] += vy[a]; pz[a] += vz[a];
      }
    }
  }
  layout(260);
  /* ---------- matriks ---------- */
  function persp(f, a, n, fr) { var t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0]; }
  function look(e, c, u) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    var xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) { var o = new Array(16), r, c, k, s; for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) { s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + c] * b[r * 4 + k]; o[r * 4 + c] = s; } return o; }
  /* ---------- WebGL ---------- */
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  function prog(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; }
  var FOG = 'float fog(float wv){return clamp(1.6-(wv-uD)/(uR*2.2),.22,1.);}';
  var pL = prog('attribute vec3 aP;attribute vec4 aC;uniform mat4 uM;uniform float uD,uR;varying vec4 vC;' + FOG + 'void main(){vec4 p=uM*vec4(aP,1.);gl_Position=p;vC=vec4(aC.rgb,aC.a*fog(p.w));}',
    'precision mediump float;varying vec4 vC;void main(){gl_FragColor=vec4(vC.rgb*vC.a,vC.a);}');
  var pP = prog('attribute vec3 aP;attribute vec4 aC;attribute float aS;uniform mat4 uM;uniform float uD,uR,uPx;varying vec4 vC;' + FOG + 'void main(){vec4 p=uM*vec4(aP,1.);gl_Position=p;gl_PointSize=aS*uPx/p.w;vC=vec4(aC.rgb,aC.a*fog(p.w));}',
    'precision mediump float;varying vec4 vC;uniform float uLt;void main(){vec2 q=gl_PointCoord-.5;float d=length(q)*2.;if(d>1.)discard;float core=1.-smoothstep(.0,.36,d),halo=pow(1.-d,2.4)*.6,a=clamp(core+halo,0.,1.)*vC.a;vec3 c=mix(vC.rgb,vec3(1.),core*.5*(1.-uLt));gl_FragColor=vec4(c*a,a);}');
  var bL = gl.createBuffer(), bN = gl.createBuffer(), NPU = 34, bU = gl.createBuffer();
  var LV = new Float32Array(NE * 2 * 7), NV = new Float32Array(N * 8), UV = new Float32Array(NPU * 8);
  var PU = []; for (i = 0; i < NPU; i++) PU.push({ e: Math.floor(Math.random() * NE), t: Math.random(), sp: rnd(.25, .6), d: Math.random() < .5 ? 1 : 0 });
  var uL = {}, uP = {};
  ['uM', 'uD', 'uR'].forEach(function (n) { uL[n] = gl.getUniformLocation(pL, n); });
  ['uM', 'uD', 'uR', 'uPx', 'uLt'].forEach(function (n) { uP[n] = gl.getUniformLocation(pP, n); });
  var aL = { p: gl.getAttribLocation(pL, 'aP'), c: gl.getAttribLocation(pL, 'aC') }, aP = { p: gl.getAttribLocation(pP, 'aP'), c: gl.getAttribLocation(pP, 'aC'), s: gl.getAttribLocation(pP, 'aS') };
  var cx = 0, cy = 0, cz = 0, rad = 5, M = null;
  function size() {
    w = window.innerWidth; h = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = lb.width = Math.floor(w * dpr); cv.height = lb.height = Math.floor(h * dpr); gl.viewport(0, 0, cv.width, cv.height); lx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (RM) draw(0);
  }
  window.addEventListener('resize', size);
  window.addEventListener('mousemove', function (e) { tx = e.clientX / w * 2 - 1; ty = e.clientY / h * 2 - 1; }, { passive: true });
  function draw(dt) {
    var lt = document.documentElement.classList.contains('light'), CC = lt ? LTC : DKC, PC = lt ? PUL.l : PUL.d, e, a, b, o;
    T += dt; frame++; mx += (tx - mx) * .04; my += (ty - my) * .04;
    layout(frame < 90 ? 2 : 1);
    for (a = 0; a < N; a++) { var th = T * .9 + a * 1.7; px[a] += Math.sin(th) * .0016; py[a] += Math.cos(th * 1.3) * .0016; pz[a] += Math.sin(th * .7) * .0016; }
    /* pusat & radius graf (dihaluskan; radius = persentil 92 agar pencilan tidak mengecilkan graf) */
    var sx = 0, sy = 0, sz = 0, ds = new Float32Array(N); for (a = 0; a < N; a++) { sx += px[a]; sy += py[a]; sz += pz[a]; }
    sx /= N; sy /= N; sz /= N; for (a = 0; a < N; a++) ds[a] = Math.hypot(px[a] - sx, py[a] - sy, pz[a] - sz); ds.sort();
    cx += (sx - cx) * .08; cy += (sy - cy) * .08; cz += (sz - cz) * .08; rad += (ds[Math.floor(N * .92)] * 1.1 - rad) * .05;
    /* skala seluruh layar: graf diregangkan mengikuti rasio layar agar memenuhi seluruh tampilan */
    var asp = w / h, fov = .9, th = Math.tan(fov / 2), kx = 1, ky = 1, D, yaw = T * .06 + mx * .45, pit = .28 + my * .18;
    if (asp >= 1) { kx = clamp(asp * .92, 1, 2.6); D = rad * 2.0; } else { ky = clamp(.92 / asp, 1, 2.4); D = rad * .95 / (th * asp); }
    var eye = [cx + D * Math.cos(pit) * Math.sin(yaw), cy + D * Math.sin(pit), cz + D * Math.cos(pit) * Math.cos(yaw)];
    M = mul(persp(fov, asp, .1, 300), mul([kx, 0, 0, 0, 0, ky, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], look(eye, [cx, cy, cz], [0, 1, 0])));
    /* sisi */
    for (e = 0; e < NE; e++) {
      a = E[e][0]; b = E[e][1]; var cross = cl[a] !== cl[b], al = (cross ? .4 : .26) * (lt ? 1.15 : 1);
      o = e * 14; LV[o] = px[a]; LV[o + 1] = py[a]; LV[o + 2] = pz[a]; LV[o + 3] = CC[cl[a]][0]; LV[o + 4] = CC[cl[a]][1]; LV[o + 5] = CC[cl[a]][2]; LV[o + 6] = al;
      LV[o + 7] = px[b]; LV[o + 8] = py[b]; LV[o + 9] = pz[b]; LV[o + 10] = CC[cl[b]][0]; LV[o + 11] = CC[cl[b]][1]; LV[o + 12] = CC[cl[b]][2]; LV[o + 13] = al;
    }
    /* simpul */
    for (a = 0; a < N; a++) { o = a * 8; NV[o] = px[a]; NV[o + 1] = py[a]; NV[o + 2] = pz[a]; NV[o + 3] = CC[cl[a]][0]; NV[o + 4] = CC[cl[a]][1]; NV[o + 5] = CC[cl[a]][2]; NV[o + 6] = .95; NV[o + 7] = lab[a] ? 2.1 : clamp(.8 + deg[a] * .1, .8, 1.6); }
    /* denyut data di sepanjang sisi */
    for (i = 0; i < NPU; i++) {
      var P = PU[i]; P.t += dt * P.sp; if (P.t > 1) { P.t = 0; P.e = Math.floor(Math.random() * NE); P.d = Math.random() < .5 ? 1 : 0; }
      a = E[P.e][P.d]; b = E[P.e][1 - P.d]; o = i * 8; var tt = P.t;
      UV[o] = px[a] + (px[b] - px[a]) * tt; UV[o + 1] = py[a] + (py[b] - py[a]) * tt; UV[o + 2] = pz[a] + (pz[b] - pz[a]) * tt; UV[o + 3] = PC[0]; UV[o + 4] = PC[1]; UV[o + 5] = PC[2]; UV[o + 6] = 1; UV[o + 7] = 1.15;
    }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(pL); gl.uniformMatrix4fv(uL.uM, false, new Float32Array(M)); gl.uniform1f(uL.uD, D); gl.uniform1f(uL.uR, rad);
    gl.bindBuffer(gl.ARRAY_BUFFER, bL); gl.bufferData(gl.ARRAY_BUFFER, LV, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aL.p); gl.vertexAttribPointer(aL.p, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(aL.c); gl.vertexAttribPointer(aL.c, 4, gl.FLOAT, false, 28, 12);
    gl.drawArrays(gl.LINES, 0, NE * 2);
    gl.useProgram(pP); gl.uniformMatrix4fv(uP.uM, false, new Float32Array(M)); gl.uniform1f(uP.uD, D); gl.uniform1f(uP.uR, rad); gl.uniform1f(uP.uPx, 11 * D * dpr * clamp(h / 900, .75, 1.3)); gl.uniform1f(uP.uLt, lt ? 1 : 0);
    if (!lt) gl.blendFunc(gl.ONE, gl.ONE);
    [[bN, NV, N], [bU, UV, NPU]].forEach(function (B) {
      gl.bindBuffer(gl.ARRAY_BUFFER, B[0]); gl.bufferData(gl.ARRAY_BUFFER, B[1], gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aP.p); gl.vertexAttribPointer(aP.p, 3, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(aP.c); gl.vertexAttribPointer(aP.c, 4, gl.FLOAT, false, 32, 12); gl.enableVertexAttribArray(aP.s); gl.vertexAttribPointer(aP.s, 1, gl.FLOAT, false, 32, 28);
      gl.drawArrays(gl.POINTS, 0, B[2]);
    });
    /* label hub (kanvas 2D di atas WebGL) */
    lx.clearRect(0, 0, w, h); lx.font = '600 11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'; lx.textBaseline = 'middle';
    for (a = 0; a < N; a++) {
      if (!lab[a]) continue;
      var X = M[0] * px[a] + M[4] * py[a] + M[8] * pz[a] + M[12], Y = M[1] * px[a] + M[5] * py[a] + M[9] * pz[a] + M[13], W = M[3] * px[a] + M[7] * py[a] + M[11] * pz[a] + M[15];
      if (W < .3) continue;
      var f = clamp(1.6 - (W - D) / (rad * 2.2), .22, 1), c = CC[cl[a]];
      lx.fillStyle = 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + (.9 * f).toFixed(3) + ')';
      lx.fillText(lab[a], (X / W * .5 + .5) * w + 9, (1 - (Y / W * .5 + .5)) * h - 9);
    }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000, .05); last = now;
    if (document.hidden || window.__BA_3D_OFF) return; draw(dt);
  }
  size(); if (!RM) requestAnimationFrame(loop);
})();
},{timeout:700});
