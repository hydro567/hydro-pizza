/* Hydro Pizza — tüm görseller kodla üretilir; dış görsel dosyası yoktur. */
(function () {
  'use strict';

  /* ---------- yardımcılar ---------- */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const LAT = 256;
  const table = new Float32Array(LAT * LAT);
  (function () { const r = rng(77); for (let i = 0; i < table.length; i++) table[i] = r(); })();
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) * LAT, y1 = ((yi + 1) & 255) * LAT;
    const a = table[y0 + x0], b = table[y0 + x1], c = table[y1 + x0], d = table[y1 + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct) {
    let s = 0, a = .5, n = 0;
    for (let i = 0; i < oct; i++) { s += noise(x, y) * a; n += a; a *= .5; x = x * 2.03 + 17; y = y * 2.03 + 9; }
    return s / n;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function mix3(out, a, b, t) { out[0] = mix(a[0], b[0], t); out[1] = mix(a[1], b[1], t); out[2] = mix(a[2], b[2], t); }
  function make(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }

  /* ---------- tezgâh ---------- */
  function drawCounter(canvas) {
    const W = 1680, H = 1050;
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d');
    const r = rng(11);
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#74777b'); g.addColorStop(.35, '#a3a6a9'); g.addColorStop(.55, '#b6b8ba'); g.addColorStop(.8, '#8c8f93'); g.addColorStop(1, '#67696d');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // fırçalanmış çelik
    for (let i = 0; i < 12000; i++) {
      const px = r() * W, py = r() * H, len = 60 + r() * 420, a = -.12 + r() * .05;
      x.strokeStyle = r() > .5 ? `rgba(255,255,255,${.012 + r() * .04})` : `rgba(10,12,16,${.012 + r() * .045})`;
      x.lineWidth = .5 + r() * 1.1;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    // çizikler
    for (let i = 0; i < 520; i++) {
      const px = r() * W, py = r() * H, a = r() * Math.PI * 2, len = 30 + r() * 300;
      x.strokeStyle = r() > .55 ? `rgba(255,255,255,${.05 + r() * .12})` : `rgba(0,0,0,${.05 + r() * .1})`;
      x.lineWidth = .4 + r() * .7;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * len * .5 + r() * 14, py + Math.sin(a) * len * .5 + r() * 14, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    // un bulutları
    for (let i = 0; i < 240; i++) {
      const edge = r();
      const px = edge < .35 ? W * (.68 + r() * .34) : edge < .6 ? r() * W * .3 : r() * W;
      const py = edge < .35 ? r() * H * .35 : edge < .6 ? H * (.7 + r() * .3) : r() * H;
      const rad = 30 + r() * 130;
      const rg = x.createRadialGradient(px, py, 0, px, py, rad);
      rg.addColorStop(0, `rgba(255,255,255,${.03 + r() * .06})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = rg; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    // un tanecikleri
    for (let i = 0; i < 60000; i++) {
      const px = r() * W, py = r() * H;
      const d = fbm(px * .0052 + 3, py * .0052 + 8, 3);
      const corner = smooth(.3, 1, Math.hypot((px - W * .5) / (W * .5), (py - H * .5) / (H * .5))) * .2;
      if (d + corner < .6 + r() * .17) continue;
      const s = r() < .012 ? 1.1 + r() * 1.3 : .3 + r() * .55;
      x.fillStyle = `rgba(255,255,255,${.2 + r() * .55})`;
      x.beginPath(); x.arc(px, py, s, 0, 7); x.fill();
    }
    // vinyet
    const vg = x.createRadialGradient(W * .5, H * .46, H * .45, W * .5, H * .5, W * .68);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.3)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }

  /* ---------- kareli bez ---------- */
  function drawCloth(canvas) {
    const W = 650, H = 550;
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d');
    const im = x.createImageData(W, H), d = im.data;
    const red = [176, 22, 34], white = [240, 232, 226], mid = [205, 120, 124];
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      // sol-üst kenar köşegen ve dalgalı
      const edge = (px - W * .08) / W + (py - H * .16) / H - .52 + (fbm(px * .006, py * .006, 3) - .5) * .08;
      if (edge < 0) continue;
      const fold = Math.sin((px * .9 + py * .42) * .017 + fbm(px * .004, py * .004, 2) * 5) + .6 * Math.sin((px * .3 - py) * .023 + 2);
      const dfold = Math.cos((px * .9 + py * .42) * .017 + fbm(px * .004, py * .004, 2) * 5);
      const u = px * .88 + py * .34 + fold * 15, v = py * .9 - px * .32 + fold * 11;
      const cell = 36;
      const a = ((u / cell) % 2 + 2) % 2 < 1, b = ((v / cell) % 2 + 2) % 2 < 1;
      const c = a && b ? red : (a || b ? mid : white);
      const weave = .96 + .08 * noise(px * .85, py * .85);
      const shade = (1 + dfold * .19 + fold * .05) * weave;
      const i = (py * W + px) * 4;
      d[i] = clamp(c[0] * shade, 0, 255); d[i + 1] = clamp(c[1] * shade, 0, 255); d[i + 2] = clamp(c[2] * shade, 0, 255);
      d[i + 3] = 255 * smooth(0, .012, edge);
    }
    x.putImageData(im, 0, 0);
  }

  /* ---------- açık kutu ---------- */
  function drawBoxInside(canvas) {
    const S = 1000;
    canvas.width = canvas.height = S;
    const x = canvas.getContext('2d');
    const r = rng(5);
    const kraft = '#c69a62';
    x.fillStyle = kraft; x.fillRect(4, 4, S - 8, S - 8);
    function grain(alpha) {
      for (let i = 0; i < 7000; i++) {
        const px = r() * S, py = r() * S, len = 4 + r() * 22, a = r() * 7;
        x.strokeStyle = r() > .5 ? `rgba(90,55,20,${alpha * r()})` : `rgba(255,230,190,${alpha * r()})`;
        x.lineWidth = .7;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
      }
    }
    grain(.17);
    const I = 62, F = 90; // duvar içi, zemin
    function wall(points, c) { x.fillStyle = c; x.beginPath(); points.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); }
    wall([[I, I], [S - I, I], [S - F, F], [F, F]], '#7f5b30');
    wall([[I, I], [F, F], [F, S - F], [I, S - I]], '#a97f49');
    wall([[S - I, I], [S - I, S - I], [S - F, S - F], [S - F, F]], '#99703f');
    wall([[I, S - I], [S - F, S - F], [S - I, S - I]], '#d7ae76');
    wall([[I, S - I], [F, S - F], [S - F, S - F], [S - I, S - I]], '#d7ae76');
    x.strokeStyle = 'rgba(60,35,10,.5)'; x.lineWidth = 3; x.strokeRect(I, I, S - 2 * I, S - 2 * I);
    x.strokeStyle = 'rgba(255,235,200,.4)'; x.lineWidth = 2; x.strokeRect(I - 3, I - 3, S - 2 * I + 6, S - 2 * I + 6);

    // yağlı kâğıt
    const P = make(500);
    const pc = P.getContext('2d'), pim = pc.createImageData(500, 500), pd = pim.data;
    for (let j = 0; j < 500; j++) for (let i = 0; i < 500; i++) {
      const n = Math.abs(fbm(i * .012 + 40, j * .012 + 3, 4) - .5) * 2;
      const crease = smooth(.0, .09, n);
      const v = 228 + 20 * crease + 8 * (noise(i * .6, j * .6) - .5);
      const k = (j * 500 + i) * 4;
      pd[k] = clamp(v + 2, 0, 255); pd[k + 1] = clamp(v - 3, 0, 255); pd[k + 2] = clamp(v - 13, 0, 255); pd[k + 3] = 255;
    }
    pc.putImageData(pim, 0, 0);
    x.save();
    x.beginPath();
    x.moveTo(F + 5, F + 2); x.lineTo(S - F - 3, F - 2); x.lineTo(S - F - 1, S - F - 3); x.lineTo(F + 2, S - F + 1); x.closePath();
    x.clip();
    x.drawImage(P, F - 10, F - 10, S - 2 * F + 20, S - 2 * F + 20);
    // iç gölge
    const sh = x.createLinearGradient(0, F, 0, F + 120); sh.addColorStop(0, 'rgba(50,30,10,.42)'); sh.addColorStop(1, 'rgba(50,30,10,0)');
    x.fillStyle = sh; x.fillRect(0, F, S, 120);
    const sl = x.createLinearGradient(F, 0, F + 70, 0); sl.addColorStop(0, 'rgba(50,30,10,.28)'); sl.addColorStop(1, 'rgba(50,30,10,0)');
    x.fillStyle = sl; x.fillRect(F, 0, 70, S);
    const sr = x.createLinearGradient(S - F, 0, S - F - 50, 0); sr.addColorStop(0, 'rgba(50,30,10,.2)'); sr.addColorStop(1, 'rgba(50,30,10,0)');
    x.fillStyle = sr; x.fillRect(S - F - 50, 0, 50, S);
    x.restore();

    // yan yuvalar
    x.fillStyle = '#3f2a13';
    [[20, 225, 14, 120], [20, 660, 14, 120], [S - 34, 225, 14, 120], [S - 34, 660, 14, 120]].forEach(a => x.fillRect(a[0], a[1], a[2], a[3]));
    // ön dil
    x.fillStyle = '#c69a62'; x.beginPath(); x.moveTo(400, S - 66); x.lineTo(600, S - 66); x.lineTo(575, S - 22); x.lineTo(425, S - 22); x.closePath(); x.fill();
    x.strokeStyle = '#2b1b0b'; x.lineWidth = 9; x.lineCap = 'round';
    x.beginPath(); x.moveTo(462, S - 56); x.quadraticCurveTo(500, S - 22, 538, S - 56); x.stroke();
  }

  /* ---------- kutu kapağı dokusu ---------- */
  function lidGrain() {
    const c = make(320), x = c.getContext('2d');
    const im = x.createImageData(320, 320), d = im.data;
    for (let j = 0; j < 320; j++) for (let i = 0; i < 320; i++) {
      const v = 238 + 22 * (fbm(i * .03, j * .03, 3) - .5) + 14 * (noise(i * .9, j * .9) - .5);
      const k = (j * 320 + i) * 4;
      d[k] = clamp(v + 3, 0, 255); d[k + 1] = clamp(v, 0, 255); d[k + 2] = clamp(v - 6, 0, 255); d[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c.toDataURL('image/jpeg', .85);
  }

  /* ---------- pizza tabanı ---------- */
  function drawBase(canvas, baked) {
    const S = innerWidth < 900 ? 480 : 680; // telefonda daha hızlı açılsın
    canvas.width = canvas.height = S;
    const x = canvas.getContext('2d');
    const im = x.createImageData(S, S), d = im.data;
    const c = S / 2, R = S / 2;
    const H = new Float32Array(S * S);
    const REG = new Float32Array(S * S), RN = new Float32Array(S * S), SED = new Float32Array(S * S);
    const col = [0, 0, 0], c2 = [0, 0, 0];
    const doughA = hex('#e2c28c'), doughB = hex('#f4e3c0'), doughIn = hex('#e9bd7c');
    const goldA = hex('#a96624'), goldB = hex('#e6b168'), goldC = hex('#f0cd8e'), charC = hex('#2b160a');
    const sauceA = hex('#a21608'), sauceB = hex('#e13710'), sauceE = hex('#e8681c');
    const bsA = hex('#6e1508'), bsB = hex('#b5350f'), oil = hex('#dc7f1f');

    // yükseklik
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const nx = (px - c) / R, ny = (py - c) / R, r = Math.hypot(nx, ny);
      if (r > 1.03) continue;
      const th = Math.atan2(ny, nx);
      const wob = (fbm(Math.cos(th) * 1.6 + 5, Math.sin(th) * 1.6 + 5, 3) - .5) * .06;
      const rn = r / (.965 + wob);
      const rs = .775 + (fbm(nx * 3.5 + 21, ny * 3.5 + 4, 3) - .5) * .085;
      REG[py * S + px] = 1; RN[py * S + px] = rn; SED[py * S + px] = rs;
      const ring = Math.exp(-Math.pow((rn - (rs + .985) / 2) / .082, 2));
      let h = ring * (1 + (fbm(nx * 5 + 3, ny * 5, 3) - .5) * 1.1) + (fbm(nx * 15, ny * 15, 2) - .5) * .05 * ring;
      if (rn < rs) {
        const sw = Math.sin(th * 2 + rn * 30 + fbm(nx * 3, ny * 3, 2) * 7);
        h += .07 * sw + .22 * (fbm(nx * 9, ny * 9, 3) - .5);
      }
      if (baked) h += ring * .25 * smooth(.56, .7, fbm(nx * 11 + 3, ny * 11 + 7, 3));
      H[py * S + px] = h;
    }
    // renk
    for (let py = 1; py < S - 1; py++) for (let px = 1; px < S - 1; px++) {
      if (REG[py * S + px] === 0) continue;
      const nx = (px - c) / R, ny = (py - c) / R;
      const th = Math.atan2(ny, nx);
      const rn = RN[py * S + px], sEdge = SED[py * S + px];
      const dx = H[py * S + px + 1] - H[py * S + px - 1], dy = H[(py + 1) * S + px] - H[(py - 1) * S + px];
      const lit = (-dx * .62 - dy * .78) * 8 * S / 820;
      const shade = 1 + clamp(lit, -.3, .22);
      const sr = Math.pow(shade, .72), sb = Math.pow(shade, 1.35);
      const grit = 1 + (noise(px * .7, py * .7) - .5) * .09;
      const t = smooth(sEdge - .014, sEdge + .014, rn); // 0 sos, 1 kenar

      if (!baked) {
        const f = fbm(nx * 8, ny * 8, 3);
        mix3(col, doughA, doughB, smooth(.3, .7, f) * .75 + .25 * smooth(.2, .9, H[py * S + px]));
        mix3(col, doughIn, col, smooth(0, .07, rn - sEdge));
        const flour = noise(px * .55, py * .55) > .86 ? 12 : 0;
        col[0] += flour; col[1] += flour; col[2] += flour;
        const sw = .5 + .5 * Math.sin(th * 2 + rn * 30 + fbm(nx * 3, ny * 3, 2) * 7);
        mix3(c2, sauceA, sauceB, clamp(sw * .55 + (fbm(nx * 7, ny * 7, 3) - .28) * .95, 0, 1));
        mix3(c2, c2, sauceE, smooth(sEdge - .08, sEdge, rn) * .75);
        if (lit > .12) { const sp = smooth(.12, .4, lit) * .36; c2[0] += 95 * sp; c2[1] += 90 * sp; c2[2] += 75 * sp; }
      } else {
        const f = fbm(nx * 6 + 11, ny * 6 + 4, 4);
        const h = H[py * S + px];
        mix3(col, goldA, goldB, smooth(.28, .68, f));
        mix3(col, col, goldC, smooth(.72, 1.15, h) * .6);
        // leopar lekeleri
        const spots = fbm(nx * 13 + 3, ny * 13 + 7, 3);
        const fine = fbm(nx * 34 + 9, ny * 34 + 1, 2);
        const ch = Math.max(smooth(.585, .68, spots) * .95, smooth(.67, .74, fine) * .75) * smooth(.25, .75, h + .15);
        mix3(col, col, charC, ch);
        // alt kenar hafif koyu
        mix3(col, col, charC, smooth(.975, 1.0, rn) * .55);
        const s2 = .5 + .5 * Math.sin(th * 2 + rn * 30 + fbm(nx * 3, ny * 3, 2) * 7);
        mix3(c2, bsA, bsB, clamp(s2 * .4 + (fbm(nx * 7, ny * 7, 3) - .25) * 1, 0, 1));
        mix3(c2, c2, oil, smooth(.52, .7, fbm(nx * 10 + 40, ny * 10 + 2, 3)) * .62);
        const sch = smooth(.7, .78, fbm(nx * 24, ny * 24, 3));
        mix3(c2, c2, charC, sch * .7);
        mix3(c2, c2, charC, smooth(sEdge - .05, sEdge, rn) * .5);
      }
      const i = (py * S + px) * 4;
      d[i] = clamp(mix(c2[0], col[0], t) * sr * grit, 0, 255);
      d[i + 1] = clamp(mix(c2[1], col[1], t) * shade * grit, 0, 255);
      d[i + 2] = clamp(mix(c2[2], col[2], t) * sb * grit, 0, 255);
      d[i + 3] = 255 * (1 - smooth(.985, 1.005, rn));
    }
    x.putImageData(im, 0, 0);
  }

  /* ---------- malzeme çizimleri ---------- */
  const SP = 240;
  function blobPath(x, r, cx, cy, rad, wob, n) {
    const off = r() * 9;
    x.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2;
      const rr = rad * (1 + (noise(Math.cos(a) * 1.6 + off, Math.sin(a) * 1.6 + off) - .5) * wob);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath();
  }
  const painters = {
    mozzarella(x, r) {
      blobPath(x, r, 120, 120, 92, .42, 40);
      const g = x.createRadialGradient(100, 96, 8, 120, 120, 104);
      g.addColorStop(0, '#fffefa'); g.addColorStop(.7, '#fbf6e8'); g.addColorStop(1, '#e8dfc9');
      x.fillStyle = g; x.shadowColor = 'rgba(90,60,20,.4)'; x.shadowBlur = 8; x.shadowOffsetY = 3; x.fill();
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
      x.save(); x.clip();
      for (let i = 0; i < 9; i++) {
        const px = 40 + r() * 160, py = 40 + r() * 160, s = 12 + r() * 28;
        const m = x.createRadialGradient(px, py, 0, px, py, s);
        m.addColorStop(0, r() > .5 ? 'rgba(255,255,255,.8)' : 'rgba(205,190,155,.2)'); m.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = m; x.fillRect(px - s, py - s, s * 2, s * 2);
      }
      x.restore();
    },
    pepperoni(x, r) {
      const R = 98;
      x.shadowColor = 'rgba(70,10,0,.5)'; x.shadowBlur = 7; x.shadowOffsetY = 3;
      blobPath(x, r, 120, 120, R, .05, 48);
      const g = x.createRadialGradient(105, 100, 10, 120, 120, R + 6);
      g.addColorStop(0, '#d9472a'); g.addColorStop(.72, '#bb2e18'); g.addColorStop(.93, '#8f1c0d'); g.addColorStop(1, '#6d1408');
      x.fillStyle = g; x.fill();
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
      x.save(); x.clip();
      for (let i = 0; i < 75; i++) {
        const a = r() * 7, d = Math.sqrt(r()) * R * .92, s = 1.5 + r() * 5.5;
        x.fillStyle = r() > .55 ? `rgba(245,170,130,${.28 + r() * .42})` : `rgba(80,8,0,${.24 + r() * .36})`;
        x.beginPath(); x.ellipse(120 + Math.cos(a) * d, 120 + Math.sin(a) * d, s, s * (.6 + r() * .4), r() * 3, 0, 7); x.fill();
      }
      const sh = x.createRadialGradient(92, 84, 2, 92, 84, 62);
      sh.addColorStop(0, 'rgba(255,240,220,.3)'); sh.addColorStop(1, 'rgba(255,240,220,0)');
      x.fillStyle = sh; x.fillRect(0, 0, SP, SP);
      x.restore();
    },
    mushroom(x, r) {
      x.save(); x.translate(120, 118);
      x.shadowColor = 'rgba(60,35,15,.5)'; x.shadowBlur = 6; x.shadowOffsetY = 3;
      x.beginPath();
      x.moveTo(-88, 2); x.bezierCurveTo(-92, -82, 92, -82, 88, 2);
      x.bezierCurveTo(88, 22, 58, 26, 36, 18); x.lineTo(38, 74);
      x.bezierCurveTo(38, 94, -38, 94, -38, 74); x.lineTo(-36, 18);
      x.bezierCurveTo(-58, 26, -88, 22, -88, 2); x.closePath();
      const g = x.createLinearGradient(0, -70, 0, 90);
      g.addColorStop(0, '#f1e4cf'); g.addColorStop(.7, '#e8d8bd'); g.addColorStop(1, '#d9c4a2');
      x.fillStyle = g; x.fill();
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
      x.strokeStyle = '#7b5532'; x.lineWidth = 6; x.stroke();
      x.strokeStyle = '#8f6a44'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(-68, 4); x.bezierCurveTo(-66, -50, 66, -50, 68, 4); x.stroke();
      x.lineWidth = 1.6; x.strokeStyle = 'rgba(120,85,50,.45)';
      for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(i * 5, 12); x.quadraticCurveTo(i * 6.6, -12, i * 9.5, -36); x.stroke(); }
      for (let i = 0; i < 22; i++) { x.fillStyle = `rgba(110,75,40,${r() * .3})`; x.beginPath(); x.arc(-50 + r() * 100, -46 + r() * 130, 1 + r() * 2.2, 0, 7); x.fill(); }
      x.restore();
    },
    basil(x, r) {
      x.save(); x.translate(120, 124); x.rotate((r() - .5) * .3);
      x.shadowColor = 'rgba(10,30,5,.55)'; x.shadowBlur = 7; x.shadowOffsetY = 3;
      x.beginPath();
      x.moveTo(0, -108); x.bezierCurveTo(68, -74, 88, 8, 54, 64); x.bezierCurveTo(36, 90, 12, 102, 0, 108);
      x.bezierCurveTo(-12, 102, -36, 90, -54, 64); x.bezierCurveTo(-88, 8, -68, -74, 0, -108); x.closePath();
      const g = x.createLinearGradient(-60, -80, 60, 90);
      g.addColorStop(0, '#5aa83b'); g.addColorStop(.5, '#3a8a2a'); g.addColorStop(1, '#23661f');
      x.fillStyle = g; x.fill();
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
      x.save(); x.clip();
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, y = -66 + i * 24;
        const sh = x.createRadialGradient(side * 28, y + 12, 0, side * 28, y + 12, 34);
        sh.addColorStop(0, 'rgba(170,230,110,.28)'); sh.addColorStop(1, 'rgba(170,230,110,0)');
        x.fillStyle = sh; x.fillRect(-100, -120, 200, 240);
      }
      x.restore();
      x.strokeStyle = 'rgba(190,235,140,.72)'; x.lineWidth = 3.2; x.lineCap = 'round';
      x.beginPath(); x.moveTo(0, -94); x.lineTo(0, 106); x.stroke();
      x.lineWidth = 1.9;
      for (let i = 0; i < 6; i++) {
        const y = -58 + i * 26, l = 56 - Math.abs(i - 2.2) * 8;
        x.beginPath(); x.moveTo(0, y + 20); x.quadraticCurveTo(l * .55, y + 8, l, y - 12); x.stroke();
        x.beginPath(); x.moveTo(0, y + 20); x.quadraticCurveTo(-l * .55, y + 8, -l, y - 12); x.stroke();
      }
      x.restore();
    },
    olive(x) {
      x.save();
      x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 6; x.shadowOffsetY = 3;
      const g = x.createRadialGradient(92, 86, 8, 120, 120, 100);
      g.addColorStop(0, '#574d5e'); g.addColorStop(.5, '#231d29'); g.addColorStop(1, '#0a080c');
      x.fillStyle = g;
      x.beginPath(); x.arc(120, 120, 92, 0, 7); x.arc(120, 120, 38, 0, 7, true); x.fill('evenodd');
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
      x.strokeStyle = 'rgba(255,255,255,.34)'; x.lineWidth = 7; x.lineCap = 'round';
      x.beginPath(); x.arc(120, 120, 68, 3.5, 4.8); x.stroke();
      x.strokeStyle = 'rgba(100,80,110,.6)'; x.lineWidth = 3;
      x.beginPath(); x.arc(120, 120, 40, 0, 7); x.stroke();
      x.restore();
    },
    onion(x, r) {
      x.save(); x.translate(120, 120); x.rotate(r() * 6);
      x.scale(1, .86 + r() * .14);
      x.shadowColor = 'rgba(60,0,50,.4)'; x.shadowBlur = 5; x.shadowOffsetY = 2;
      x.lineCap = 'round';
      const gap = .3 + r() * .7;
      [[90, 14, '#8d1f7a'], [90, 6, '#f6dcef'], [66, 11, '#a22a8e'], [66, 4, '#fbe7f4'], [44, 8, '#b43a9e'], [44, 3, '#fde9f6']].forEach(a => {
        x.strokeStyle = a[2]; x.lineWidth = a[1];
        x.beginPath(); x.arc(0, 0, a[0], gap, gap + Math.PI * 2 - .1); x.stroke();
      });
      x.restore();
    }
  };

  const BAKE = {
    mozzarella: { tint: 'rgba(214,150,62,.34)', spots: 'rgba(120,62,16,.72)', n: 16, s: [3, 13] },
    pepperoni: { tint: 'rgba(55,6,0,.42)', spots: 'rgba(25,6,0,.78)', n: 16, s: [2, 7] },
    mushroom: { tint: 'rgba(102,58,20,.48)', spots: 'rgba(45,22,5,.6)', n: 12, s: [2, 7] },
    basil: { tint: 'rgba(8,22,6,.66)', spots: 'rgba(5,10,2,.75)', n: 14, s: [2, 8] },
    olive: { tint: 'rgba(0,0,0,.2)', spots: 'rgba(0,0,0,.4)', n: 4, s: [2, 5] },
    onion: { tint: 'rgba(72,18,12,.46)', spots: 'rgba(30,10,5,.7)', n: 10, s: [2, 6] }
  };
  function bakeSprite(src, type, r) {
    const c = make(SP), x = c.getContext('2d'), b = BAKE[type];
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = b.tint; x.fillRect(0, 0, SP, SP);
    for (let i = 0; i < b.n; i++) {
      const px = 20 + r() * 200, py = 20 + r() * 200, s = b.s[0] + r() * (b.s[1] - b.s[0]);
      const g = x.createRadialGradient(px, py, 0, px, py, s * 1.4);
      g.addColorStop(0, b.spots); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(px - s * 2, py - s * 2, s * 4, s * 4);
    }
    return c;
  }

  const sprites = {};
  function buildSprites() {
    Object.keys(painters).forEach((type, ti) => {
      const r = rng(100 + ti * 13);
      sprites[type] = [0, 1, 2].map(() => {
        const raw = make(SP); painters[type](raw.getContext('2d'), r);
        const baked = bakeSprite(raw, type, r);
        return { raw, baked, rawUrl: raw.toDataURL('image/png'), bakedUrl: baked.toDataURL('image/png') };
      });
    });
    return sprites;
  }

  /* ---------- malzeme tepsisi ---------- */
  function drawTile(canvas, type, seed) {
    const W = 336, H = 300;
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d');
    const r = rng(seed);
    function round(ax, ay, w, h, rad) { x.beginPath(); x.roundRect(ax, ay, w, h, rad); }
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#eef0f2'); g.addColorStop(.35, '#b7bbbf'); g.addColorStop(.6, '#e4e6e8'); g.addColorStop(1, '#8b8f94');
    round(6, 6, W - 12, H - 12, 34); x.fillStyle = g; x.fill();
    x.strokeStyle = 'rgba(40,44,50,.55)'; x.lineWidth = 2; x.stroke();
    const g2 = x.createLinearGradient(0, 18, 0, H - 18);
    g2.addColorStop(0, '#6f7378'); g2.addColorStop(.3, '#a3a6aa'); g2.addColorStop(1, '#c4c7ca');
    round(22, 22, W - 44, H - 44, 22); x.fillStyle = g2; x.fill();
    x.strokeStyle = 'rgba(25,28,32,.45)'; x.lineWidth = 2.5; x.stroke();

    x.save(); round(28, 28, W - 56, H - 56, 18); x.clip();
    const dark = x.createLinearGradient(0, 22, 0, 90); dark.addColorStop(0, 'rgba(0,0,0,.38)'); dark.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = dark; x.fillRect(0, 0, W, 90);
    const size = { mozzarella: 118, pepperoni: 112, mushroom: 104, basil: 128, olive: 64, onion: 108 }[type];
    const count = { mozzarella: 34, pepperoni: 34, mushroom: 34, basil: 30, olive: 80, onion: 36 }[type];
    const list = sprites[type];
    for (let i = 0; i < count; i++) {
      const s = list[i % 3].raw, px = 34 + r() * (W - 68), py = 34 + r() * (H - 68), rot = r() * 7, sc = size * (.86 + r() * .28);
      x.save(); x.translate(px, py); x.rotate(rot); x.drawImage(s, -sc / 2, -sc / 2, sc, sc); x.restore();
    }
    x.restore();
  }

  function drawHeap(canvas, type) {
    const S = 300; canvas.width = canvas.height = S;
    const x = canvas.getContext('2d');
    x.clearRect(0, 0, S, S);
    const r = rng(3 + type.length);
    const size = { mozzarella: 92, pepperoni: 84, mushroom: 88, basil: 100, olive: 52, onion: 84 }[type];
    const n = { mozzarella: 14, pepperoni: 13, mushroom: 12, basil: 10, olive: 26, onion: 12 }[type];
    for (let i = 0; i < n; i++) {
      const a = r() * 7, d = Math.sqrt(r()) * 86;
      x.save(); x.translate(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d); x.rotate(r() * 7);
      x.drawImage(sprites[type][i % 3].raw, -size / 2, -size / 2, size, size); x.restore();
    }
  }

  /* ---------- eldiven ---------- */
  function finger(x1, y1, x2, y2, w) {
    w = w || 19;
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ox = -dy / l * w * .22, oy = dx / l * w * .22;
    return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="url(#gv)" stroke-width="${w}" stroke-linecap="round"/>` +
      `<path d="M${x1 + ox} ${y1 + oy}L${x2 + ox} ${y2 + oy}" stroke="rgba(255,255,255,.2)" stroke-width="${w * .13}" stroke-linecap="round"/>`;
  }
  const defs = '<defs><linearGradient id="gv" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="170"><stop offset="0" stop-color="#3a3b40"/><stop offset=".5" stop-color="#17181b"/><stop offset="1" stop-color="#0b0b0d"/></linearGradient></defs>';
  const palm = (d) => `<path d="${d || 'M26 78C26 66 96 64 98 80L96 118C94 134 84 142 80 146H42C34 138 28 128 26 116Z'}" fill="url(#gv)"/>`;
  const cuff = '<path d="M42 138H80L84 164Q62 172 38 164Z" fill="#101114"/><path d="M38 160Q62 168 84 160" stroke="rgba(255,255,255,.28)" stroke-width="2.5" fill="none"/><path d="M36 92C38 110 40 124 46 132" stroke="rgba(255,255,255,.14)" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  const wrap = s => `<svg viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg">${defs}${s}</svg>`;
  const gloves = {
    point: {
      hot: [.45, .05],
      svg: wrap(palm() + cuff + finger(32, 88, 12, 72, 18) + finger(54, 78, 54, 16, 19) + finger(69, 82, 72, 72, 19) + finger(84, 86, 88, 80, 18) + '<path d="M76 72q11 -8 16 6M60 74q8 -6 16 2" stroke="#000" stroke-width="2" fill="none"/>' + finger(88, 94, 96, 90, 15))
    },
    open: {
      hot: [.47, .13],
      svg: wrap(palm() + cuff + finger(30, 96, 8, 66, 18) + finger(40, 72, 30, 22, 17) + finger(58, 70, 56, 12, 18) + finger(76, 72, 82, 18, 17) + finger(92, 80, 108, 40, 15))
    },
    hold: {
      hot: [.47, .3],
      svg: wrap(palm() + cuff + finger(30, 92, 16, 72, 18) + finger(40, 72, 34, 48, 17) + finger(58, 70, 57, 42, 18) + finger(75, 72, 79, 46, 17) + finger(92, 82, 100, 60, 15))
    },
    ok: {
      hot: [.5, .3],
      svg: wrap(palm() + cuff + '<path d="M36 80C14 66 24 34 46 42C58 46 60 62 50 74" fill="none" stroke="url(#gv)" stroke-width="16" stroke-linecap="round"/>' + finger(66, 72, 62, 18, 17) + finger(82, 74, 86, 22, 16) + finger(95, 84, 108, 44, 14))
    }
  };

  window.HydroArt = { rng, noise, fbm, clamp, smooth, mix, hex, make, drawCounter, drawCloth, drawBoxInside, lidGrain, drawBase, buildSprites, drawTile, drawHeap, gloves };
})();
