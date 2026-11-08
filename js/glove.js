/* Ortak eldiven imleç — pizza siyah, burger kırmızı */
window.Glove = (function () {
  'use strict';
  const A = window.HydroArt;
  const el = document.getElementById('glove');
  const ghost = document.getElementById('ghost');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const COLORS = {
    black: null,
    red: { '#3a3b40': '#f2494a', '#17181b': '#cf1a20', '#0b0b0d': '#8f0c13', '#101114': '#a80f16' }
  };
  let color = 'black', pose = '', px = 0, py = 0, gx = 0, gy = 0, rot = 0;
  let hover = false, down = false, holding = false, seen = false, rafOn = false;
  let poseFn = () => 'open';
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

  let images = null;
  function paint(p) {
    if (images) { el.innerHTML = `<img alt="" src="${images[color + '-' + p]}">`; return; }
    let svg = A.gloves[p].svg.replace(/gv/g, 'gv' + p);
    const map = COLORS[color];
    if (map) Object.keys(map).forEach(k => { svg = svg.split(k).join(map[k]); });
    el.innerHTML = svg;
  }
  function setPose(p) { if (p === pose) return; pose = p; paint(p); }
  function refresh() {
    if (holding) setPose('hold');
    else if (hover) setPose('point');
    else setPose(poseFn());
  }
  function frame() {
    rafOn = true;
    gx += (px - gx) * .5; gy += (py - gy) * .5;
    const vel = clampN((px - gx) * .4, -14, 14);
    rot += (vel - rot) * .2;
    const w = el.offsetWidth, h = el.offsetHeight, hot = A.gloves[pose || 'open'].hot;
    el.style.transform = `translate3d(${gx - w * hot[0]}px,${gy - h * hot[1]}px,0) rotate(${rot}deg) scale(${down ? .92 : 1})`;
    el.style.transformOrigin = `${hot[0] * 100}% ${hot[1] * 100}%`;
    if (holding) {
      const gs = ghost.offsetWidth;
      ghost.style.transform = `translate3d(${gx - gs / 2}px,${gy - gs * .42}px,0) rotate(${rot}deg)`;
    }
    requestAnimationFrame(frame);
  }

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !finePointer) return;
    px = e.clientX; py = e.clientY;
    if (!seen) { seen = true; gx = px; gy = py; document.documentElement.classList.add('glove-on'); refresh(); if (!rafOn) frame(); }
    const over = e.target && e.target.closest && e.target.closest('[data-press]');
    const was = hover;
    hover = !!over && !over.disabled;
    if (was !== hover) refresh();
  }, { passive: true });
  addEventListener('pointerdown', () => { down = true; });
  addEventListener('pointerup', () => { down = false; });
  document.documentElement.addEventListener('mouseleave', () => document.documentElement.classList.remove('glove-on'));
  document.documentElement.addEventListener('mouseenter', () => { if (seen) document.documentElement.classList.add('glove-on'); });

  return {
    useImages(u, hots) {
      images = u;
      if (hots) Object.keys(hots).forEach(p => { if (A.gloves[p]) A.gloves[p].hot = hots[p]; });
      if (pose) paint(pose);
    },
    paintGhost(url) {
      const i = new Image();
      i.onload = () => {
        ghost.width = ghost.height = 300;
        const x = ghost.getContext('2d'); x.clearRect(0, 0, 300, 300);
        const k = Math.min(300 / i.width, 300 / i.height);
        x.drawImage(i, (300 - i.width * k) / 2, (300 - i.height * k) / 2, i.width * k, i.height * k);
      };
      i.src = url;
    },
    setPoseFn(fn) { poseFn = fn; refresh(); },
    refresh,
    setColor(c) { if (c === color) return; color = c; if (pose) paint(pose); },
    /* Sürükleme başlar: hayalet görsel eldivenin altında gezer */
    startHold(x, y, isMouse) {
      holding = true;
      ghost.classList.add('on');
      if (!isMouse) { px = gx = x; py = gy = y; if (!rafOn) frame(); }
      refresh();
    },
    track(x, y) { px = x; py = y; },
    endHold() { holding = false; ghost.classList.remove('on'); refresh(); },
    ghost
  };
})();
