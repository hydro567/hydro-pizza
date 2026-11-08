/* Hydro Burger — kodla çizilen malzeme, kap ve şişe görselleri */
window.HydroBurgerArt = (function () {
  'use strict';
  const A = window.HydroArt;
  const { rng, noise, fbm, clamp, smooth, mix, hex, make } = A;
  const W = 520;

  /* ---------- sıcak çelik tezgâh ---------- */
  function drawCounter(canvas) {
    const CW = 1680, CH = 1050;
    canvas.width = CW; canvas.height = CH;
    const x = canvas.getContext('2d');
    const r = rng(23);
    const g = x.createLinearGradient(0, 0, CW, 0);
    g.addColorStop(0, '#b98a58'); g.addColorStop(.3, '#a89b8d'); g.addColorStop(.55, '#8f8a86'); g.addColorStop(.8, '#6f6861'); g.addColorStop(1, '#4e4640');
    x.fillStyle = g; x.fillRect(0, 0, CW, CH);
    // dikey ışık yansımaları
    for (let i = 0; i < 26; i++) {
      const px = r() * CW, w = 30 + r() * 150;
      const lg = x.createLinearGradient(px - w, 0, px + w, 0);
      const warm = r() > .4;
      const c = warm ? '255,190,110' : '255,245,230';
      const a = .05 + r() * .17;
      lg.addColorStop(0, `rgba(${c},0)`); lg.addColorStop(.5, `rgba(${c},${a})`); lg.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = lg; x.fillRect(px - w, 0, w * 2, CH);
    }
    const vg = x.createLinearGradient(0, 0, 0, CH);
    vg.addColorStop(0, 'rgba(30,18,10,.5)'); vg.addColorStop(.3, 'rgba(30,18,10,0)'); vg.addColorStop(.8, 'rgba(30,18,10,0)'); vg.addColorStop(1, 'rgba(30,18,10,.45)');
    x.fillStyle = vg; x.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 12000; i++) {
      const px = r() * CW, py = r() * CH, len = 40 + r() * 340, a = -.08 + r() * .05;
      x.strokeStyle = r() > .5 ? `rgba(255,240,220,${.012 + r() * .045})` : `rgba(20,10,5,${.012 + r() * .05})`;
      x.lineWidth = .5 + r();
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    for (let i = 0; i < 620; i++) {
      const px = r() * CW, py = r() * CH, a = r() * 7, len = 20 + r() * 240;
      x.strokeStyle = r() > .5 ? `rgba(255,250,240,${.06 + r() * .14})` : `rgba(0,0,0,${.05 + r() * .12})`;
      x.lineWidth = .4 + r() * .7;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    // kırıntı ışıkları
    for (let i = 0; i < 14; i++) {
      const px = CW - r() * 90, py = 150 + r() * 180, s = 3 + r() * 7;
      x.fillStyle = `rgba(190,110,40,${.5 + r() * .4})`;
      x.beginPath(); x.arc(px, py, s, 0, 7); x.fill();
    }
  }

  /* ---------- disk biçimli katman (ekmek, köfte) ---------- */
  function disc(o) {
    const H = o.h, cx = W / 2, cy = H - o.ry - o.thick - 4;
    const c = make(W, H), x = c.getContext('2d');
    const im = x.createImageData(W, H), d = im.data, out = [0, 0, 0];
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const nx = (px - cx) / o.rx;
      if (Math.abs(nx) > 1.16) continue;
      const ny = (py - cy) / o.ry;
      const th = Math.atan2(ny, nx);
      const wob = 1 + (fbm(Math.cos(th) * 2.2 + 4, Math.sin(th) * 2.2 + 4, 3) - .5) * o.wob;
      const rr = Math.hypot(nx, ny) / wob;
      let a = 0;
      if (rr <= 1.0) { o.top(nx, ny, rr, out); a = 1 - smooth(.985, 1.0, rr); }
      if (rr > .985) {
        // yan yüz: dış çeper aşağı doğru iner
        const lim = wob * wob - nx * nx;
        if (lim > 0) {
          const edgeY = cy + Math.sqrt(lim) * o.ry;
          const t = (py - edgeY) / o.thick;
          if (t <= 1 && (py >= cy)) {
            if (rr > 1.0 || a < 1) {
              const sideOut = [0, 0, 0];
              o.side(nx, clamp(t, 0, 1), px, py, sideOut);
              const sa = 1 - smooth(.94, 1, t);
              if (a <= 0) { out[0] = sideOut[0]; out[1] = sideOut[1]; out[2] = sideOut[2]; a = sa; }
            }
          }
        }
      }
      if (a <= 0) continue;
      const i = (py * W + px) * 4;
      d[i] = clamp(out[0], 0, 255); d[i + 1] = clamp(out[1], 0, 255); d[i + 2] = clamp(out[2], 0, 255); d[i + 3] = 255 * a;
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  function col(out, a, b, t) { out[0] = mix(a[0], b[0], t); out[1] = mix(a[1], b[1], t); out[2] = mix(a[2], b[2], t); }

  function bunBottom() {
    const g1 = hex('#f0c46b'), g2 = hex('#c47f25'), g3 = hex('#8a4d13'), s1 = hex('#e8b45a'), s2 = hex('#a8681d');
    return disc({
      h: 330, rx: 238, ry: 148, thick: 44, wob: .05,
      top(nx, ny, r, o) {
        const n = fbm(nx * 5 + 3, ny * 5 + 9, 4);
        col(o, g1, g2, smooth(.32, .68, n) * smooth(.98, .35, r) + .15);
        col(o, o, g3, smooth(.6, .78, fbm(nx * 13 + 1, ny * 13 + 3, 3)) * .8 * smooth(1, .5, r));
        const l = 1 + (-nx * .1 - ny * .14);
        o[0] *= l; o[1] *= l; o[2] *= l;
      },
      side(nx, t, px, py, o) { col(o, s1, s2, t * .9 + .05); const l = 1 - Math.abs(nx) * .25; o[0] *= l; o[1] *= l; o[2] *= l; }
    });
  }
  function patty() {
    const d1 = hex('#21100a'), d2 = hex('#5c3016'), d3 = hex('#8c5324');
    return disc({
      h: 310, rx: 228, ry: 136, thick: 34, wob: .24,
      top(nx, ny, r, o) {
        const n = fbm(nx * 9 + 3, ny * 9 + 7, 4);
        col(o, d1, d2, smooth(.3, .6, n));
        col(o, o, d3, smooth(.62, .78, fbm(nx * 22 + 5, ny * 22, 3)) * .75);
        const cr = Math.abs(fbm(nx * 6 + 11, ny * 6 + 2, 3) - .5);
        if (cr < .018) { o[0] *= .55; o[1] *= .55; o[2] *= .55; }
        const l = 1 + (-nx * .2 - ny * .24);
        o[0] *= l; o[1] *= l; o[2] *= l;
      },
      side(nx, t, px, py, o) {
        const n = fbm(px * .06, py * .06, 3);
        col(o, d1, d2, smooth(.3, .68, n) * (1 - t * .7));
      }
    });
  }
  function bunTop() {
    const H = 400, c = make(W, H), x = c.getContext('2d');
    const im = x.createImageData(W, H), d = im.data, cx = W / 2, cy = 268, rx = 248, dome = 240, lip = 104;
    const deep = hex('#a24d10'), mid = hex('#d67e1d'), lite = hex('#f3bd5e'), pale = hex('#f7dc9d'), out = [0, 0, 0];
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const nx = (px - cx) / rx;
      if (Math.abs(nx) >= 1) continue;
      const s = Math.sqrt(1 - nx * nx);
      const topY = cy - dome * Math.pow(s, .72), botY = cy + lip * s;
      if (py < topY - 1 || py > botY + 1) continue;
      const v = (py - topY) / (botY - topY);
      const ny = v * 2 - 1;
      const n = fbm(px * .012 + 5, py * .012 + 3, 3);
      col(out, deep, mid, smooth(.0, .5, v + (n - .5) * .45));
      col(out, out, lite, smooth(.56, .86, v + (n - .5) * .2));
      col(out, out, pale, smooth(.84, 1, v));
      // parlaklık
      const sp = Math.exp(-(Math.pow(nx + .34, 2) / .05 + Math.pow(ny + .55, 2) / .06));
      out[0] += 80 * sp; out[1] += 66 * sp; out[2] += 46 * sp;
      const l = 1 - Math.abs(nx) * .3;
      const g = 1 + (noise(px * .7, py * .7) - .5) * .05;
      const i = (py * W + px) * 4;
      d[i] = clamp(out[0] * l * g, 0, 255); d[i + 1] = clamp(out[1] * l * g, 0, 255); d[i + 2] = clamp(out[2] * l * g, 0, 255);
      d[i + 3] = 255 * Math.min(smooth(0, 1.6, py - topY + 1), smooth(0, 1.6, botY - py + 1), smooth(0, .012, 1 - Math.abs(nx)));
    }
    x.putImageData(im, 0, 0);
    // susam
    const r = rng(8);
    for (let i = 0; i < 210; i++) {
      const nx = (r() * 2 - 1) * .92, s = Math.sqrt(1 - nx * nx);
      const topY = cy - dome * Math.pow(s, .72), botY = cy + lip * s;
      const v = .06 + r() * .62;
      const py = topY + (botY - topY) * v, px = cx + nx * rx;
      const sc = 1 - Math.abs(nx) * .5;
      x.save(); x.translate(px, py); x.rotate(r() * 3.14);
      x.fillStyle = 'rgba(90,40,5,.42)';
      x.beginPath(); x.ellipse(1.2, 1.8, 7 * sc, 4 * sc, 0, 0, 7); x.fill();
      x.fillStyle = r() > .3 ? '#fbf0d3' : '#f0d9a6';
      x.beginPath(); x.ellipse(0, 0, 7 * sc, 3.8 * sc, 0, 0, 7); x.fill();
      x.restore();
    }
    return c;
  }

  /* ---------- tek parça çizimleri ---------- */
  const P = 200;
  const pieces = {
    tomato(x, r) {
      x.translate(100, 100);
      x.fillStyle = '#b81f14'; x.beginPath(); x.arc(0, 0, 90, 0, 7); x.fill();
      x.fillStyle = '#e8452b'; x.beginPath(); x.arc(0, 0, 82, 0, 7); x.fill();
      const off = r() * 6;
      for (let i = 0; i < 5; i++) {
        const a = off + i / 5 * 6.283;
        x.save(); x.rotate(a);
        x.fillStyle = '#f57a4d';
        x.beginPath(); x.moveTo(14, -6); x.quadraticCurveTo(74, -38, 72, 0); x.quadraticCurveTo(74, 38, 14, 6); x.closePath(); x.fill();
        x.fillStyle = '#f8d28d';
        for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(36 + k * 8, -12 + k * 8, 4.5, 2.6, .6, 0, 7); x.fill(); }
        x.restore();
      }
      x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.ellipse(-28, -36, 28, 14, -.7, 0, 7); x.fill();
    },
    patty(x, r) {
      x.translate(100, 100);
      x.fillStyle = '#2b150b';
      x.beginPath();
      for (let i = 0; i <= 30; i++) { const a = i / 30 * 6.283, rr = 76 + r() * 16; i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      x.closePath(); x.fill();
      for (let i = 0; i < 180; i++) {
        const a = r() * 7, d = Math.sqrt(r()) * 78;
        x.fillStyle = r() > .5 ? `rgba(120,70,30,${.4 + r() * .4})` : `rgba(10,4,2,${.5 + r() * .4})`;
        x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * 5, 0, 7); x.fill();
      }
    },
    cheddar(x, r) {
      x.translate(100, 100); x.rotate(r() * 6);
      const g = x.createLinearGradient(-70, -70, 70, 70);
      g.addColorStop(0, '#fbbf3f'); g.addColorStop(1, '#ef8c17');
      x.fillStyle = g; x.beginPath(); x.roundRect(-70, -70, 140, 140, 10); x.fill();
      x.strokeStyle = 'rgba(160,80,0,.4)'; x.lineWidth = 3; x.stroke();
      x.fillStyle = 'rgba(255,240,180,.3)'; x.fillRect(-56, -60, 66, 18);
    },
    lettuce(x, r) {
      x.translate(100, 100);
      const off = r() * 9;
      for (let s = 0; s < 3; s++) {
        x.fillStyle = ['#4f9a2a', '#7dbb3c', '#a9d858'][s];
        x.beginPath();
        for (let i = 0; i <= 80; i++) {
          const a = i / 80 * 6.283, rr = (88 - s * 22) * (1 + .1 * Math.sin(a * 13 + off + s) + .07 * Math.sin(a * 5 + off));
          i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        x.closePath(); x.fill();
      }
      x.strokeStyle = 'rgba(235,250,190,.55)'; x.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + off; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 76, Math.sin(a) * 76); x.stroke(); }
    },
    pickles(x, r) {
      x.translate(100, 100);
      x.fillStyle = '#4f6b18'; x.beginPath(); x.arc(0, 0, 88, 0, 7); x.fill();
      x.fillStyle = '#8fa836'; x.beginPath(); x.arc(0, 0, 77, 0, 7); x.fill();
      x.fillStyle = '#b7c55a'; x.beginPath(); x.arc(0, 0, 48, 0, 7); x.fill();
      x.strokeStyle = 'rgba(70,90,20,.55)'; x.lineWidth = 3;
      for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * 62, Math.sin(a) * 62); x.lineTo(Math.cos(a) * 77, Math.sin(a) * 77); x.stroke(); }
      x.fillStyle = '#e6e3a0';
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + r(), d = 16 + r() * 22; x.beginPath(); x.ellipse(Math.cos(a) * d, Math.sin(a) * d, 6, 3.4, a, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.ellipse(-26, -36, 26, 11, -.7, 0, 7); x.fill();
    },
    onion(x) {
      x.translate(100, 100);
      [[86, 13, '#8d1f7a'], [86, 5, '#f6dcef'], [62, 10, '#a22a8e'], [62, 4, '#fbe7f4'], [40, 8, '#b43a9e'], [40, 3, '#fde9f6']].forEach(a => {
        x.strokeStyle = a[2]; x.lineWidth = a[1]; x.beginPath(); x.arc(0, 0, a[0], 0, 7); x.stroke();
      });
    },
    bun(x, r) {
      x.translate(100, 100);
      const g = x.createRadialGradient(-20, -24, 6, 0, 0, 92);
      g.addColorStop(0, '#f2c56c'); g.addColorStop(.7, '#d8922f'); g.addColorStop(1, '#a8661b');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 88, 0, 7); x.fill();
      x.fillStyle = 'rgba(130,70,15,.5)';
      for (let i = 0; i < 40; i++) { const a = r() * 7, d = Math.sqrt(r()) * 70; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 4, 0, 7); x.fill(); }
    }
  };
  const pieceSprites = {};
  function piecesOf(type) {
    if (pieceSprites[type]) return pieceSprites[type];
    const r = rng(type.length * 31 + 7);
    pieceSprites[type] = [0, 1, 2].map(() => { const c = make(P), x = c.getContext('2d'); pieces[type](x, r); return c; });
    return pieceSprites[type];
  }

  /* ---------- katman düzenleri ---------- */
  function sliced(type, spots, size, H, thick) {
    const c = make(W, H), x = c.getContext('2d'), list = piecesOf(type), squash = .64;
    spots.forEach((s, i) => {
      const px = W / 2 + s[0], py = H - size * squash / 2 - thick - 4 + s[1];
      x.save(); x.translate(px, py + thick); x.scale(1, squash);
      x.filter = 'brightness(.5)';
      x.drawImage(list[i % 3], -size / 2, -size / 2, size, size);
      x.restore();
      x.save(); x.translate(px, py); x.scale(1, squash);
      x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 8;
      x.drawImage(list[i % 3], -size / 2, -size / 2, size, size);
      x.restore();
    });
    return c;
  }
  function lettuceLayer() {
    const H = 300, c = make(W, H), x = c.getContext('2d'), r = rng(40);
    x.translate(W / 2, H / 2 + 4); x.scale(1, .62);
    const ruffle = (rad, amp, color, seed, dy) => {
      x.fillStyle = color; x.beginPath();
      for (let i = 0; i <= 150; i++) {
        const a = i / 150 * 6.283;
        const rr = rad * (1 + amp * Math.sin(a * 19 + seed) + amp * .7 * Math.sin(a * 31 + seed * 2) + (noise(Math.cos(a) * 2 + seed, Math.sin(a) * 2) - .5) * .12);
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr + dy;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fill();
    };
    ruffle(246, .04, '#3f7f1f', 2, 22);
    ruffle(240, .04, '#6cae31', 3, 6);
    ruffle(212, .05, '#8bc83f', 5, 0);
    ruffle(168, .06, '#a4d84e', 7, -4);
    ruffle(112, .07, '#bde468', 9, -6);
    x.strokeStyle = 'rgba(240,252,200,.55)'; x.lineWidth = 2.4;
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * 6.283 + r() * .2;
      x.beginPath(); x.moveTo(Math.cos(a) * 34, Math.sin(a) * 34); x.quadraticCurveTo(Math.cos(a + .1) * 120, Math.sin(a + .1) * 120, Math.cos(a) * 222, Math.sin(a) * 222); x.stroke();
    }
    return c;
  }
  function cheddarLayer() {
    const H = 300, c = make(W, H), x = c.getContext('2d');
    x.translate(W / 2, H / 2 - 16); x.scale(1, .62);
    const pts = [0, 1, 2, 3].map(i => { const a = .42 + i * Math.PI / 2; return [Math.cos(a) * 262, Math.sin(a) * 262]; });
    const path = dy => {
      x.beginPath();
      pts.forEach((p, i) => {
        const n = pts[(i + 1) % 4], mx = (p[0] + n[0]) / 2 * .9, my = (p[1] + n[1]) / 2 * .9 + dy;
        if (i === 0) x.moveTo((pts[3][0] + p[0]) / 2 * .9, (pts[3][1] + p[1]) / 2 * .9 + dy);
        x.quadraticCurveTo(p[0], p[1] + dy + (p[1] > 0 ? 34 : 0), mx, my);
      });
      x.closePath();
    };
    x.fillStyle = '#b85f0b'; path(24); x.fill();
    const g = x.createLinearGradient(-200, -200, 200, 200);
    g.addColorStop(0, '#ffc846'); g.addColorStop(.6, '#f7a31f'); g.addColorStop(1, '#eb8a14');
    x.fillStyle = g; path(0); x.fill();
    x.fillStyle = 'rgba(255,245,190,.35)'; x.beginPath(); x.ellipse(-70, -96, 112, 28, -.3, 0, 7); x.fill();
    return c;
  }

  /* ---------- plastik kap ---------- */
  function drawTub(canvas, type, seed) {
    const TW = 340, TH = 240;
    canvas.width = TW; canvas.height = TH;
    const x = canvas.getContext('2d'), r = rng(seed), list = piecesOf(type);
    const size = { tomato: 88, patty: 86, cheddar: 76, lettuce: 96, pickles: 62, onion: 90, bun: 92 }[type];
    const count = { tomato: 22, patty: 24, cheddar: 26, lettuce: 26, pickles: 42, onion: 26, bun: 18 }[type];
    x.fillStyle = 'rgba(25,15,8,.35)'; x.beginPath(); x.ellipse(TW / 2, TH - 26, 152, 24, 0, 0, 7); x.fill();
    const body = () => { x.beginPath(); x.moveTo(14, 40); x.lineTo(TW - 14, 40); x.lineTo(TW - 34, TH - 18); x.quadraticCurveTo(TW / 2, TH - 8, 34, TH - 18); x.closePath(); };
    body(); x.fillStyle = 'rgba(255,255,255,.2)'; x.fill();
    x.save(); body(); x.clip();
    for (let i = 0; i < count; i++) {
      const px = 36 + r() * (TW - 72), py = 74 + r() * (TH - 112), sc = size * (.85 + r() * .3);
      x.save(); x.translate(px, py); x.scale(1, .82); x.rotate(r() * 7);
      x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 5;
      x.drawImage(list[i % 3], -sc / 2, -sc / 2, sc, sc);
      x.restore();
    }
    const sh = x.createLinearGradient(0, 40, TW, TH);
    sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(.3, 'rgba(255,255,255,.03)'); sh.addColorStop(.7, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.16)');
    x.fillStyle = sh; x.fillRect(0, 0, TW, TH);
    x.restore();
    x.strokeStyle = 'rgba(255,255,255,.72)'; x.lineWidth = 3; body(); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(10, 40); x.lineTo(TW - 10, 40); x.stroke();
    x.strokeStyle = 'rgba(120,120,120,.45)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(14, 45); x.lineTo(TW - 14, 45); x.stroke();
  }

  /* ---------- yan ürün bardağı ---------- */
  function friesHeap(x, r, kind) {
    if (kind === 'crinkle') {
      for (let i = 0; i < 46; i++) {
        const px = 58 + r() * 148, base = 158, a = (px - 130) * .006 + (r() - .5) * .45, len = 70 + r() * 76;
        x.save(); x.translate(px, base); x.rotate(a);
        const g = x.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, '#d98a22'); g.addColorStop(.5, '#f8c04c'); g.addColorStop(1, '#c97a1c');
        x.strokeStyle = g; x.lineWidth = 15; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(0, 0);
        for (let k = 1; k <= 8; k++) x.lineTo(k % 2 ? 4 : -4, -len * k / 8);
        x.stroke(); x.restore();
      }
    } else if (kind === 'curly') {
      for (let i = 0; i < 24; i++) {
        const px = 58 + r() * 148, py = 40 + r() * 100, rad = 14 + r() * 18, off = r() * 7;
        x.strokeStyle = '#a65a14'; x.lineWidth = 13; x.lineCap = 'round';
        const draw = () => { x.beginPath(); for (let k = 0; k <= 40; k++) { const a = off + k * .35, rr = rad * (.3 + k / 40 * .9); const qx = px + Math.cos(a) * rr, qy = py + Math.sin(a) * rr * .85; k ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.stroke(); };
        draw(); x.strokeStyle = '#e8983a'; x.lineWidth = 9; draw();
        x.strokeStyle = 'rgba(255,215,130,.6)'; x.lineWidth = 3; draw();
      }
    } else {
      for (let i = 0; i < 13; i++) {
        const px = 62 + r() * 136, py = 44 + r() * 96, rad = 28 + r() * 14, sq = .6 + r() * .4, ang = r() * 3;
        x.save(); x.translate(px, py); x.rotate(ang); x.scale(1, sq);
        x.strokeStyle = '#8e4c10'; x.lineWidth = 22; x.beginPath(); x.arc(0, 0, rad, 0, 7); x.stroke();
        x.strokeStyle = '#d98a2c'; x.lineWidth = 17; x.beginPath(); x.arc(0, 0, rad, 0, 7); x.stroke();
        x.fillStyle = 'rgba(110,55,10,.55)';
        for (let k = 0; k < 36; k++) { const a = r() * 7, d = rad + (r() - .5) * 16; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 2.2, 0, 7); x.fill(); }
        x.fillStyle = 'rgba(255,215,140,.5)';
        for (let k = 0; k < 18; k++) { const a = r() * 7, d = rad + (r() - .5) * 12; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 1.8, 0, 7); x.fill(); }
        x.restore();
      }
    }
  }
  function drawCup(kind, seed) {
    const CW = 260, CH = 330, c = make(CW, CH), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = 'rgba(25,15,8,.34)'; x.beginPath(); x.ellipse(CW / 2, CH - 16, 92, 14, 0, 0, 7); x.fill();
    // arka kenar
    x.fillStyle = '#c98f12'; x.beginPath(); x.moveTo(34, 138); x.quadraticCurveTo(130, 96, 226, 138); x.lineTo(226, 160); x.lineTo(34, 160); x.closePath(); x.fill();
    friesHeap(x, r, kind);
    const body = () => { x.beginPath(); x.moveTo(30, 136); x.quadraticCurveTo(130, 172, 230, 136); x.lineTo(204, CH - 16); x.quadraticCurveTo(130, CH - 4, 56, CH - 16); x.closePath(); };
    const g = x.createLinearGradient(30, 0, 230, 0);
    g.addColorStop(0, '#e3a913'); g.addColorStop(.4, '#fbcf3a'); g.addColorStop(1, '#dea110');
    body(); x.fillStyle = g; x.fill();
    x.save(); body(); x.clip();
    x.textAlign = 'center'; x.fillStyle = '#2529b4';
    x.font = '46px "Bowlby One", Impact, sans-serif'; x.fillText('HYDRO', 130, 224);
    x.font = '25px Anton, Impact, sans-serif'; x.fillText('B U R G E R', 130, 256);
    x.strokeStyle = '#d9201f'; x.lineWidth = 4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(62, 278); x.lineTo(198, 278); x.stroke();
    x.restore();
    return c;
  }

  /* ---------- sos şişesi ---------- */
  function bottleSVG(id, body, cap, label) {
    return `<svg viewBox="0 0 120 300" aria-hidden="true"><defs>
      <linearGradient id="bg${id}" x1="0" x2="1"><stop offset="0" stop-color="rgba(0,0,0,.34)"/><stop offset=".22" stop-color="rgba(255,255,255,.3)"/><stop offset=".45" stop-color="rgba(255,255,255,0)"/><stop offset="1" stop-color="rgba(0,0,0,.36)"/></linearGradient>
    </defs>
    <path d="M60 2 L52 44 H68 Z" fill="${cap}"/>
    <path d="M42 58 Q42 44 52 44 H68 Q78 44 78 58 V72 H42Z" fill="${cap}"/>
    <path d="M42 58 Q42 44 52 44 H68 Q78 44 78 58 V72 H42Z" fill="url(#bg${id})"/>
    <path d="M42 72 H78 C80 92 106 92 106 124 V276 Q106 296 88 296 H32 Q14 296 14 276 V124 C14 92 40 92 42 72Z" fill="${body}"/>
    <rect x="14" y="146" width="92" height="104" fill="${label}"/>
    <text x="60" y="190" text-anchor="middle" font-family="'Bowlby One',Impact,sans-serif" font-size="22" fill="#2529b4">HYDRO</text>
    <text x="60" y="214" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="15" letter-spacing="2" fill="#2529b4">BURGER</text>
    <path d="M28 228H92" stroke="#d9201f" stroke-width="3" stroke-linecap="round"/>
    <path d="M42 72 H78 C80 92 106 92 106 124 V276 Q106 296 88 296 H32 Q14 296 14 276 V124 C14 92 40 92 42 72Z" fill="url(#bg${id})"/>
    </svg>`;
  }

  /* ---------- hepsini üret ---------- */
  function build() {
    const out = { layers: {}, urls: {}, cups: {}, bottleSVG, drawTub, drawCounter };
    out.layers.bun = bunBottom();
    out.layers.patty = patty();
    out.layers.lettuce = lettuceLayer();
    out.layers.cheddar = cheddarLayer();
    out.layers.tomato = sliced('tomato', [[-108, 8], [104, 2], [-6, -44], [6, 34]], 176, 270, 10);
    out.layers.pickles = sliced('pickles', [[-104, -2], [-14, -48], [96, -16], [32, 40], [-66, 42]], 118, 270, 6);
    out.layers.onion = sliced('onion', [[-92, 0], [84, -8], [0, -44], [14, 34]], 190, 280, 6);
    out.layers.topBun = bunTop();
    Object.keys(out.layers).forEach(k => { out.urls[k] = out.layers[k].toDataURL('image/png'); });
    ['crinkle', 'curly', 'rings'].forEach((k, i) => { out.cups[k] = drawCup(k, 60 + i * 9); out.urls['cup-' + k] = out.cups[k].toDataURL('image/png'); });
    return out;
  }
  return { build, drawCounter, pieceCanvas: t => piecesOf(t)[0] };
})();
