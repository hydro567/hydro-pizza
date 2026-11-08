/* Hydro Pizza — sipariş akışı: hero → build → bake → done */
window.HydroPizza = (function () {
  'use strict';

  /* ===== DÜKKÂN BİLGİLERİ — kendi değerlerinle değiştir ===== */
  const CONFIG = {
    hours: '12–22',
    basePrice: 280,
    deliveryFee: 40,
    deliveryMinutes: [35, 45],
    pickupMinutes: [15, 25],
    bakeSeconds: 5,
    maxPerTopping: 3, // 1 normal + 2 ekstra
    dough: { ince: { name: 'İnce Hamur', price: 0 }, normal: { name: 'Normal Hamur', price: 0 }, kalin: { name: 'Kalın Hamur', price: 25 } },
    doneness: { az: { name: 'Az pişmiş', secs: 4 }, orta: { name: 'Orta pişmiş', secs: 5 }, cok: { name: 'Çok pişmiş', secs: 7 } },
    toppings: [
      { id: 'kasar', name: 'Rendelenmiş kaşar', price: 50, count: 26, size: 22, reach: .7, seed: 6.1 },
      { id: 'mozzarella', name: 'Mozzarella', price: 60, count: 16, size: 24, reach: .68, seed: 0.4 },
      { id: 'pepperoni', name: 'Sucuk', price: 70, count: 18, size: 19, reach: .7, seed: 1.7 },
      { id: 'mushroom', name: 'Mantar', price: 45, count: 18, size: 15, reach: .7, seed: 3.1 },
      { id: 'onion', name: 'Kırmızı soğan', price: 30, count: 16, size: 15, reach: .7, seed: 4.2 },
      { id: 'olive', name: 'Siyah zeytin', price: 40, count: 28, size: 7.5, reach: .72, seed: 5.3 },
      { id: 'basil', name: 'Fesleğen', price: 35, count: 12, size: 18, reach: .66, seed: 2.2 }
    ]
  };
  // Tepsilerdeki görünüm sırası (fişteki sıra ilk eklenme sırasıdır)
  const TILE_ORDER = ['kasar', 'mozzarella', 'pepperoni', 'mushroom', 'basil', 'olive', 'onion'];

  const A = window.HydroArt, G = window.Glove;
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const lira = n => n.toLocaleString('tr-TR') + ' ₺';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const byId = Object.fromEntries(CONFIG.toppings.map(t => [t.id, t]));

  const S = { state: 'hero', order: [], counts: {}, drinks: [], how: 'delivery', dough: 'normal', done: 'orta', timerId: 0 };
  /* İçecekler (fiyatlar örnek) */
  const DRINKS = { kola: { name: 'Kola', price: 45 }, limonata: { name: 'Limonata', price: 40 }, ayran: { name: 'Ayran', price: 30 }, su: { name: 'Su', price: 15 } };
  const dcount = id => S.drinks.filter(d => d.id === id).length;
  let view, tileEls = {}, thumbs = {}, stripTimer = 0;

  /* ---------- pizza katmanları ---------- */
  function positions(t, level) {
    const r = A.rng(Math.round(t.seed * 1000) + level * 311);
    const n = level === 0 ? t.count : Math.round(t.count * .85);
    const out = [], pts = [];
    for (let i = 0; i < n; i++) {
      let best = null, bd = -1;
      for (let k = 0; k < 16; k++) {
        const rad = t.reach * Math.sqrt(r()), ang = r() * Math.PI * 2, x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
        let d = Infinity; pts.forEach(p => { d = Math.min(d, Math.hypot(p[0] - x, p[1] - y)); });
        if (d > bd) { bd = d; best = [x, y]; }
      }
      pts.push(best);
      out.push({ x: 50 + best[0] * 50, y: 50 + best[1] * 50, rot: r() * 360, v: i % 3, s: t.size * (.9 + r() * .2), d: i * .025 + r() * .03 });
    }
    return out;
  }
  function addPieces(t, level) { view.addLevel(t.id, level, positions(t, level)); }
  function removeLevel(id, level) { view.removeLevel(id, level); }

  /* ---------- fiş ---------- */
  const totalCount = () => S.order.reduce((s, id) => s + S.counts[id], 0);
  function total() {
    return CONFIG.basePrice + CONFIG.dough[S.dough].price + S.order.reduce((s, id) => s + byId[id].price * S.counts[id], 0) + S.drinks.reduce((s, d) => s + DRINKS[d.id].price, 0) + (S.how === 'delivery' ? CONFIG.deliveryFee : 0);
  }
  let shownTotal = 0, totalRaf = 0;
  function animateTotal(to) {
    cancelAnimationFrame(totalRaf);
    $('total').dataset.final = lira(to);
    if (reduced) { shownTotal = to; $('total').textContent = lira(to); return; }
    const from = shownTotal, t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / 320), e = 1 - Math.pow(1 - k, 3);
      shownTotal = Math.round(from + (to - from) * e);
      $('total').textContent = lira(shownTotal);
      if (k < 1) totalRaf = requestAnimationFrame(step);
    })(t0);
  }
  function receiptRow(label, price, extra) {
    const row = document.createElement('div');
    row.className = 'r-line' + (extra ? ' r-extra' : '');
    const a = document.createElement('span'), b = document.createElement('span');
    a.textContent = label; b.textContent = lira(price);
    row.append(a, b);
    return row;
  }
  function renderReceipt() {
    $('baseName').textContent = '30 cm ' + CONFIG.dough[S.dough].name + ' · ' + CONFIG.doneness[S.done].name;
    $('basePrice').textContent = lira(CONFIG.basePrice + CONFIG.dough[S.dough].price);
    const box = $('rItems');
    box.innerHTML = '';
    S.order.forEach(id => {
      const t = byId[id], n = S.counts[id];
      box.appendChild(receiptRow(t.name, t.price));
      if (n === 2) box.appendChild(receiptRow('Ekstra ' + t.name, t.price, true));
      if (n > 2) box.appendChild(receiptRow(`${n - 1}× Ekstra ${t.name}`, t.price * (n - 1), true));
    });
    [...new Set(S.drinks.map(d => d.id))].forEach(id => {
      const n = dcount(id), t = DRINKS[id];
      box.appendChild(receiptRow(n > 1 ? n + '× ' + t.name : t.name, t.price * n));
    });
    document.querySelectorAll('[data-drink]').forEach(b => { const n = dcount(b.dataset.drink); const c = b.querySelector('.b-count'); c.hidden = !n; c.textContent = n + '×'; });
    $('rEmpty').hidden = S.order.length > 0 || S.drinks.length > 0;
    $('feePrice').textContent = S.how === 'delivery' ? lira(CONFIG.deliveryFee) : '0 ₺';
    document.querySelector('.r-fee span').textContent = S.how === 'delivery' ? 'Teslimat' : 'Gel-al';
    setStrip();
    animateTotal(total());
  }
  function setStrip(msg) {
    clearTimeout(stripTimer);
    const n = totalCount();
    if (msg) { $('stripText').textContent = msg; stripTimer = setTimeout(setStrip, 1800); return; }
    $('stripText').textContent = n === 0 ? 'Pizza senin, kural senin.' : `${n} malzeme. ${n >= 5 ? 'İşte buna pizza derim.' : 'Tadı sende.'}`;
  }

  function syncTile(id) {
    const n = S.counts[id] || 0, wrap = tileEls[id], t = byId[id];
    const tile = wrap.querySelector('.tile');
    tile.setAttribute('aria-pressed', String(n > 0));
    tile.querySelector('.badge').textContent = n === 0 ? '+' : n === 1 ? '✓' : n + '×';
    tile.setAttribute('aria-label', `${t.name}, ${lira(t.price)}${n ? `, ${n} porsiyon eklendi, bir daha eklemek için bas` : ''}`);
    wrap.querySelector('.tile-minus').hidden = n === 0;
  }
  function addTopping(id) {
    if (S.state !== 'build' || S.step === 'drinks') return;
    const n = S.counts[id] || 0;
    if (n >= CONFIG.maxPerTopping) { setStrip(`Daha fazla ${byId[id].name.toLocaleLowerCase('tr-TR')} sığmaz.`); return; }
    if (!n) S.order.push(id);
    S.counts[id] = n + 1;
    addPieces(byId[id], n);
    syncTile(id);
    renderReceipt();
    if (n >= 1) setStrip(`Ekstra ${byId[id].name} eklendi.`);
  }
  function removeTopping(id) {
    if (S.state !== 'build') return;
    const n = S.counts[id] || 0;
    if (!n) return;
    removeLevel(id, n - 1);
    S.counts[id] = n - 1;
    if (n === 1) { delete S.counts[id]; S.order = S.order.filter(x => x !== id); }
    syncTile(id);
    renderReceipt();
  }

  /* ---------- durum makinesi ---------- */
  const topLabels = { hero: 'Siparişe başla ↗', build: 'Pizzan ↗', bake: 'Fırında…', done: 'Yeni pizza ↺' };
  const panels = { hero: ['heroCard'], build: ['tray', 'receipt', 'strip'], bake: ['receipt', 'timer'], done: ['doneCard'] };
  function setState(s) {
    S.state = s;
    stage.dataset.state = s;
    $('topNote').textContent = topLabels[s];
    ['heroCard', 'tray', 'receipt', 'strip', 'timer', 'doneCard'].forEach(id => { $(id).inert = !panels[s].includes(id); });
    $('lid').disabled = s !== 'hero';
    G.refresh();
  }
  function start() { if (S.state === 'hero') { view.setLid(true); setState('build'); window.scrollTo({ top: 0 }); } }
  const isNarrow = () => matchMedia('(max-width: 899px), (max-aspect-ratio: 1/1)').matches;

  // build içinde iki adım: önce malzemeler, en son içecek
  function setStep(st) {
    S.step = st; stage.dataset.step = st;
    $('trayTitle').textContent = st === 'drinks' ? 'Yanına içecek?' : 'Kendine göre yap.';
    $('placeText').textContent = st === 'drinks' ? 'Siparişi ver' : 'Malzemeler tamam';
    if (st === 'drinks') setStrip('Bir içecek ekle ya da siparişi ver.');
  }
  function placeOrder() {
    if (S.state !== 'build' || window.HydroCheckout.busy) return;
    if (S.step !== 'drinks') { setStep('drinks'); return; }
    window.HydroCheckout.open('pizza', $('receipt')).then(bakeNow, () => {});
  }
  function bakeNow() {
    if (S.state !== 'build') return;
    setState('bake');
    if (isNarrow()) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    $('placeText').textContent = 'Fırına giriyor…';
    view.bake(true, false, S.done);
    const secs = reduced ? 1 : CONFIG.doneness[S.done].secs;
    const dial = $('timerDial');
    const t0 = performance.now();
    const fmt = s => '00:' + String(s).padStart(2, '0');
    $('timerText').textContent = fmt(secs);
    cancelAnimationFrame(S.timerId);
    (function tick(now) {
      const left = Math.max(0, secs - (now - t0) / 1000);
      dial.setAttribute('transform', `rotate(${left / secs * 300} 120 118)`);
      $('timerText').textContent = fmt(Math.ceil(left));
      if (left > 0) S.timerId = requestAnimationFrame(tick);
      else finish();
    })(t0);
  }
  function finish() {
    if (S.state !== 'bake') return;
    const no = (window.HydroCheckout.last || {}).no || 1000 + Math.floor(Math.random() * 9000);
    const range = S.how === 'delivery' ? CONFIG.deliveryMinutes : CONFIG.pickupMinutes;
    const fmt = m => new Date(Date.now() + m * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const when = `${fmt(range[0])}–${fmt(range[1])}`;
    const pickup = S.how === 'pickup';
    $('sticker').innerHTML = `SİPARİŞ #${no}<b>${pickup ? 'HAZIRLANIYOR!' : 'YOLDA!'}</b>${pickup ? 'HAZIR' : 'VARIŞ'} ${when}`;
    $('doneLead').textContent = pickup ? 'Pizzan hazırlanıyor. Sıcak sıcak gel, al.' : 'Pizzan yola çıktı. Sen sofrayı kur, gerisi bizde.';
    $('doneNo').textContent = `SİPARİŞ #${no}`;
    $('doneArrive').textContent = `${pickup ? 'Hazır' : 'Varış'} ${when}`;
    view.stopOven();
    view.setLid(false);
    setState('done');
    $('againBtn').focus({ preventScroll: true });
  }
  function reset() {
    cancelAnimationFrame(S.timerId);
    view.clear();
    const was = S.order.slice();
    S.order = []; S.counts = {}; S.drinks = [];
    was.forEach(syncTile);
    setStep('tops');
    renderReceipt();
  }
  function newPizza() { reset(); view.setLid(false); setState('hero'); $('startBtn').focus({ preventScroll: true }); }

  /* ---------- kurulum (ilk seçimde bir kez çalışır) ---------- */
  let ready = false;
  function init(v) {
    if (ready) return;
    ready = true;
    view = v;

    $('hoursText').textContent = CONFIG.hours;
    $('basePrice').textContent = lira(CONFIG.basePrice);
    const r = A.rng(42);
    let bars = '';
    for (let i = 0; i < 46; i++) bars += `<i style="width:${r() > .7 ? 3 : r() > .5 ? 2 : 1}px"></i>`;
    $('barcode').innerHTML = bars;
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0, a = i * 6 * Math.PI / 180, r1 = major ? 66 : 71, r2 = 77;
      ticks += `<line x1="${(120 + Math.sin(a) * r1).toFixed(1)}" y1="${(118 - Math.cos(a) * r1).toFixed(1)}" x2="${(120 + Math.sin(a) * r2).toFixed(1)}" y2="${(118 - Math.cos(a) * r2).toFixed(1)}" stroke-width="${major ? 2.6 : 1}"/>`;
    }
    $('timerTicks').innerHTML = ticks;

    const tilesEl = $('tiles');
    TILE_ORDER.forEach((id, i) => {
      const t = byId[id];
      const wrap = document.createElement('div');
      wrap.className = 'tile-wrap';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile'; b.dataset.id = id; b.dataset.press = '';
      thumbs[id] = view.thumb(id);
      b.innerHTML = `<img src="${thumbs[id]}" alt="" draggable="false"><span class="badge" aria-hidden="true">+</span>`;
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${t.name} <b>+ ${lira(t.price)}</b>`;
      b.appendChild(tag);
      const minus = document.createElement('button');
      minus.type = 'button'; minus.className = 'tile-minus'; minus.textContent = '−'; minus.hidden = true;
      minus.dataset.press = '';
      minus.setAttribute('aria-label', `${t.name} azalt`);
      minus.addEventListener('click', () => removeTopping(id));
      wrap.append(b, minus);
      tilesEl.appendChild(wrap);
      tileEls[id] = wrap;
      syncTile(id);
    });

    /* içecek rafı */
    const dr = document.createElement('div');
    dr.className = 'drinks';
    dr.innerHTML = '<div class="drink-row"></div><button type="button" class="drinks-back">← Malzemelere dön</button>';
    $('tray').appendChild(dr);
    dr.querySelector('.drinks-back').addEventListener('click', () => setStep('tops'));
    Object.keys(DRINKS).forEach(id => {
      const t = DRINKS[id], b = document.createElement('button');
      b.type = 'button'; b.className = 'drink'; b.dataset.drink = id; b.dataset.press = '';
      b.setAttribute('aria-label', t.name + ', ' + lira(t.price) + ' ekle');
      b.innerHTML = '<img alt="" draggable="false" src="' + view.drinkThumb(id) + '"><span class="b-count" hidden></span><span class="dn">' + t.name + '</span><b>' + lira(t.price) + '</b>';
      b.addEventListener('click', () => {
        if (S.state !== 'build' || S.step !== 'drinks') return;
        if (dcount(id) >= 6) { setStrip('Bu kadar ' + t.name.toLocaleLowerCase('tr-TR') + ' yeter.'); return; }
        S.drinks.push({ id, obj: view.addDrink(id) });
        setStrip(t.name + ' eklendi.');
        renderReceipt();
      });
      b.addEventListener('contextmenu', e => {
        e.preventDefault();
        const i = S.drinks.map(d => d.id).lastIndexOf(id);
        if (i < 0) return;
        view.removeDrink(S.drinks.splice(i, 1)[0].obj);
        renderReceipt();
      });
      dr.querySelector('.drink-row').appendChild(b);
    });

    $('startBtn').addEventListener('click', start);
    $('lid').addEventListener('click', start);
    $('placeBtn').addEventListener('click', placeOrder);
    $('againBtn').addEventListener('click', newPizza);
    $('restart').addEventListener('click', reset);
    $('topNote').addEventListener('click', () => {
      if (S.state === 'hero') start();
      else if (S.state === 'done') newPizza();
      else if (S.state === 'build') {
        if (isNarrow()) $('receipt').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        const rc = $('receipt');
        rc.classList.remove('nudge'); void rc.offsetWidth; rc.classList.add('nudge');
      }
    });
    document.querySelectorAll('input[name="how"]').forEach(i => i.addEventListener('change', e => { S.how = e.target.value; renderReceipt(); }));
    document.querySelectorAll('input[name="dough"]').forEach(i => i.addEventListener('change', e => { S.dough = e.target.value; view.setDough(S.dough); renderReceipt(); }));
    document.querySelectorAll('input[name="done"]').forEach(i => i.addEventListener('change', e => { S.done = e.target.value; renderReceipt(); }));

    /* sürükle bırak */
    let drag = null, suppressClick = false;
    const pizzaEl = $('pizza');
    const overPizza = (x, y) => {
      const b = pizzaEl.getBoundingClientRect();
      return Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2)) < b.width * .52;
    };
    tilesEl.addEventListener('pointerdown', e => {
      suppressClick = false;
      const tile = e.target.closest('.tile');
      if (!tile || e.button !== 0 || S.state !== 'build' || S.step === 'drinks') return;
      drag = { id: tile.dataset.id, tile, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, type: e.pointerType };
    });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.pid) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
      if (!drag.moved) {
        if (drag.type !== 'mouse' && getComputedStyle(drag.tile).touchAction !== 'none') { drag = null; return; }
        drag.moved = true;
        G.paintGhost(thumbs[drag.id]);
        stage.classList.add('dragging');
        G.startHold(e.clientX, e.clientY, drag.type === 'mouse');
      }
      if (drag.type !== 'mouse') G.track(e.clientX, e.clientY);
      stage.classList.toggle('over', overPizza(e.clientX, e.clientY));
    });
    function endDrag(e) {
      if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.pid)) return;
      const d = drag;
      drag = null;
      if (d.moved) {
        G.endHold();
        stage.classList.remove('dragging', 'over');
        if (e.type === 'pointerup' && overPizza(e.clientX, e.clientY)) addTopping(d.id);
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 40);
      }
    }
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);
    tilesEl.addEventListener('click', e => {
      const tile = e.target.closest('.tile');
      if (!tile || suppressClick) return;
      addTopping(tile.dataset.id);
    });

    renderReceipt();
    setStep('tops');
    setState('hero');
  }

  return {
    init,
    enter() {
      G.setColor('black');
      G.setPoseFn(() => S.state === 'done' ? 'ok' : S.state === 'hero' ? 'point' : 'open');
      if (S.state !== 'hero') newPizza();
    }
  };
})();
