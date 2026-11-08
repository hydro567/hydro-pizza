/* Hydro Burger — sipariş akışı: hero → build → review → done */
window.HydroBurger = (function () {
  'use strict';

  /* ===== DÜKKÂN BİLGİLERİ — kendi değerlerinle değiştir ===== */
  const CONFIG = {
    deliveryFee: 40,
    deliveryMinutes: [30, 40],
    pickupMinutes: [12, 20],
    maxPerItem: 3, // 1 normal + 2 ekstra
    maxCups: 3,
    layers: {
      bun: { name: 'Brioche ekmek', price: 60, lift: 4.1, w: 100 },
      patty: { name: 'Smash köfte', price: 130, lift: 3.5, w: 96 },
      chicken: { name: 'Çıtır tavuk', price: 110, lift: 3.6, w: 96 },
      cheddar: { name: 'Cheddar', price: 35, lift: 1, w: 104 },
      lettuce: { name: 'Marul', price: 15, lift: 1.7, w: 110 },
      tomato: { name: 'Domates', price: 20, lift: 1.8, w: 94 },
      pickles: { name: 'Turşu', price: 15, lift: 1.3, w: 90 },
      onion: { name: 'Kırmızı soğan', price: 15, lift: 1.7, w: 92 }
    },
    sauces: {
      house: { name: 'Hydro sos', price: 0, body: '#e0a51c', cap: '#d6960f', label: '#fbd23f', stroke: '#e6a50f' },
      ketchup: { name: 'Ketçap', price: 0, body: '#b5121a', cap: '#c9161e', label: '#fbd23f', stroke: '#b5161a' },
      mayo: { name: 'Sarımsaklı mayo', price: 0, body: '#efe6cb', cap: '#2529b4', label: '#fbd23f', stroke: '#f6efd6' }
    },
    drinks: {
      kola: { name: 'Kola', price: 45 },
      limonata: { name: 'Limonata', price: 40 },
      ayran: { name: 'Ayran', price: 30 },
      su: { name: 'Su', price: 15 }
    },
    sides: {
      crinkle: { name: 'Tırtıklı patates', price: 80 },
      curly: { name: 'Kıvırcık patates', price: 90 },
      rings: { name: 'Soğan halkası', price: 100 }
    }
  };
  const TUB_COLS = [['bun', 'patty', 'chicken', 'lettuce'], ['tomato', 'cheddar', 'pickles', 'onion']];

  const G = window.Glove;
  const $ = id => document.getElementById(id);
  const stage = $('bstage');
  const lira = n => n.toLocaleString('tr-TR') + ' ₺';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const allItems = () => Object.assign({}, CONFIG.layers, CONFIG.sauces, CONFIG.sides, CONFIG.drinks);

  const S = { state: 'hero', hist: [], how: 'pickup', top: null };
  let view, toastTimer = 0;

  /* ---------- geçmiş ve fiş ---------- */
  const count = id => S.hist.filter(h => h.id === id).length;
  const cups = () => S.hist.filter(h => h.kind === 'side').length;
  const layerH = () => S.hist.reduce((s, h) => s + (h.kind === 'layer' ? CONFIG.layers[h.id].lift : h.kind === 'sauce' ? .25 : 0), 0);

  function lines() {
    const items = allItems(), seen = [];
    S.hist.forEach(h => { if (!seen.includes(h.id)) seen.push(h.id); });
    const rows = [];
    seen.forEach(id => {
      const t = items[id], n = count(id);
      if (CONFIG.drinks[id]) { rows.push([n > 1 ? n + '× ' + t.name : t.name, t.price * n, false]); return; }
      rows.push([t.name, t.price, false]);
      if (n === 2) rows.push(['Ekstra ' + t.name, t.price, true]);
      if (n > 2) rows.push([`${n - 1}× Ekstra ${t.name}`, t.price * (n - 1), true]);
    });
    return rows;
  }
  function total() {
    const items = allItems();
    return S.hist.reduce((s, h) => s + items[h.id].price, 0) + (S.how === 'delivery' ? CONFIG.deliveryFee : 0);
  }
  function renderReceipt() {
    const box = $('bItems');
    box.innerHTML = '';
    lines().forEach(row => {
      const d = document.createElement('div');
      d.className = 'r-line' + (row[2] ? ' r-extra' : '');
      const a = document.createElement('span'), b = document.createElement('span');
      a.textContent = row[0]; b.textContent = row[1] ? lira(row[1]) : 'İKRAM';
      d.append(a, b);
      box.appendChild(d);
    });
    $('bFeeLine').hidden = S.how !== 'delivery';
    $('bFee').textContent = lira(CONFIG.deliveryFee);
    $('bTotal').textContent = lira(total());
  }

  function toast(msg) {
    const t = $('bToast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 1500);
  }

  function syncButtons() {
    const items = allItems();
    Object.keys(items).forEach(id => {
      const b = stage.querySelector(`[data-item="${id}"]`);
      if (!b) return;
      const n = count(id);
      const badge = b.querySelector('.b-count');
      if (badge) { badge.textContent = n ? n + '×' : ''; badge.hidden = n < 1; }
      b.classList.toggle('used', n > 0);
      b.setAttribute('aria-label', `${items[id].name}, ${items[id].price ? lira(items[id].price) : 'ikram'}${n ? `, ${n} kez eklendi` : ''}`);
    });
    $('bTopOff').classList.toggle('off', !S.hist.some(h => h.kind === 'layer'));
    $('bUndo').disabled = S.hist.length === 0;
    $('bPlacard').hidden = cups() > 0;
    renderReceipt();
  }

  function add(kind, id) {
    const items = allItems();
    const sideOK = (kind === 'side' || kind === 'drink') && S.state === 'review';
    if (S.state !== 'build' && !sideOK) return;
    if (kind === 'drink') {
      if (count(id) >= 6) { toast('Bu kadar ' + items[id].name.toLocaleLowerCase('tr-TR') + ' yeter.'); return; }
      S.hist.push({ kind, id, e: view.addDrink(id) });
      toast(items[id].name + ' eklendi.');
      syncButtons();
      return;
    }
    if (count(id) >= CONFIG.maxPerItem) { toast(`Daha fazla ${items[id].name.toLocaleLowerCase('tr-TR')} sığmaz.`); return; }
    if (kind === 'side' && cups() >= CONFIG.maxCups) { toast('Kutuda yer kalmadı.'); return; }
    const hadLayer = S.hist.some(h => h.kind === 'layer');
    if (kind !== 'side' && !hadLayer && id !== 'bun') S.hist.push({ kind: 'layer', id: 'bun', e: view.addLayer('bun') });
    const n = count(id);
    const e = kind === 'layer' ? view.addLayer(id) : kind === 'sauce' ? view.squeeze(id) : view.addCup(id);
    S.hist.push({ kind, id, e });
    toast(n >= 1 ? `Ekstra ${items[id].name} eklendi.` : `${items[id].name} eklendi.`);
    syncButtons();
  }
  function undo() {
    if (S.state !== 'build' && S.state !== 'review') return;
    let i = S.hist.length - 1;
    if (S.state === 'review') { while (i >= 0 && S.hist[i].kind !== 'side' && S.hist[i].kind !== 'drink') i--; }
    if (i < 0) return;
    const h = S.hist.splice(i, 1)[0];
    view.remove(h.e);
    syncButtons();
  }

  /* ---------- durum ---------- */
  const panels = { hero: ['bHero'], build: ['bTubs', 'bBottles', 'bStatus'], review: ['bReceipt', 'bSides', 'bStatus'], done: ['bDone'] };
  const ALL = ['bHero', 'bTubs', 'bBottles', 'bSides', 'bStatus', 'bReceipt', 'bDone'];
  function setState(s) {
    S.state = s;
    stage.dataset.bstate = s;
    ALL.forEach(id => { $(id).inert = !panels[s].includes(id); });
    $('bLid').disabled = s !== 'hero';
    $('bStatusText').textContent = s === 'review' ? 'Güzel oldu. Patates ya da içecek ekle, sonra siparişi ver.' : 'Kat kat devam et. Bitince üstünü kapat.';
    G.refresh();
  }
  function open() { if (S.state === 'hero') { view.setLid(true); setState('build'); syncButtons(); window.scrollTo({ top: 0 }); } }
  function topOff() {
    if (S.state !== 'build') return;
    if (!S.hist.some(h => h.kind === 'layer')) { toast('Önce malzeme ekle.'); return; }
    S.top = true; view.topOn();
    setState('review');
    toast('İşte sana bir burger.');
    if (matchMedia('(max-width: 899px), (max-aspect-ratio: 1/1)').matches) $('bReceipt').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }
  function backToBuild() {
    if (S.state !== 'review') return;
    S.top = null; view.topOff();
    setState('build');
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
  function checkout() {
    if (S.state !== 'review' || window.HydroCheckout.busy) return;
    window.HydroCheckout.open('hamburger', $('bReceipt')).then(checkoutNow, () => {});
  }
  function checkoutNow() {
    if (S.state !== 'review') return;
    const no = (window.HydroCheckout.last || {}).no || 1000 + Math.floor(Math.random() * 9000);
    const pickup = S.how === 'pickup';
    const range = pickup ? CONFIG.pickupMinutes : CONFIG.deliveryMinutes;
    const fmt = m => new Date(Date.now() + m * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const when = `${fmt(range[0])}–${fmt(range[1])}`;
    $('bSticker').innerHTML = `SİPARİŞ #${no}<b>${pickup ? 'HAZIRLANIYOR!' : 'YOLDA!'}</b>${pickup ? 'HAZIR' : 'VARIŞ'} ${when}`;
    $('bDoneLead').textContent = pickup ? 'Izgarada. Sıcak sıcak gel, al.' : 'Izgaradan çıkınca doğruca kapına geliyor.';
    $('bDoneNo').textContent = `SİPARİŞ #${no}`;
    $('bDoneArrive').textContent = `${pickup ? 'Hazır' : 'Varış'} ${when}`;
    view.setLid(false);
    setState('done');
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
  function reset() {
    S.hist = []; S.top = null;
    view.clear();
    view.setLid(false);
    syncButtons();
    setState('hero');
  }

  /* ---------- kurulum ---------- */
  let ready = false;
  function bindDrag(el, kind, id, url) {
    let drag = null, suppress = false;
    const overBox = (x, y) => {
      const b = $('bBox').getBoundingClientRect();
      return x > b.left && x < b.right && y > b.top - b.height * .15 && y < b.bottom;
    };
    el.addEventListener('pointerdown', e => {
      suppress = false;
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, type: e.pointerType };
    });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.pid) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
      if (!drag.moved) {
        if (drag.type !== 'mouse' && getComputedStyle(el).touchAction !== 'none') { drag = null; return; }
        drag.moved = true;
        G.paintGhost(url);
        G.startHold(e.clientX, e.clientY, drag.type === 'mouse');
        stage.classList.add('b-dragging');
      }
      if (drag.type !== 'mouse') G.track(e.clientX, e.clientY);
      stage.classList.toggle('b-over', overBox(e.clientX, e.clientY));
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag;
      drag = null;
      if (d.moved) {
        G.endHold();
        stage.classList.remove('b-dragging', 'b-over');
        if (e.type === 'pointerup' && overBox(e.clientX, e.clientY)) add(kind, id);
        suppress = true;
        setTimeout(() => { suppress = false; }, 40);
      }
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    el.addEventListener('click', () => { if (!suppress) add(kind, id); });
  }

  function init(v) {
    if (ready) return;
    ready = true;
    view = v;

    /* kaplar */
    let seed = 300;
    TUB_COLS.forEach((col, ci) => {
      const colEl = document.createElement('div');
      colEl.className = 'b-tubcol b-tubcol' + ci;
      col.forEach(id => {
        const t = CONFIG.layers[id];
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'b-tub'; b.dataset.item = id; b.dataset.press = '';
        const url = view.tubThumb(id);
        b.innerHTML = `<img src="${url}" alt="" draggable="false"><span class="b-count" hidden></span><span class="b-tag">${t.name} <b>+${lira(t.price)}</b></span>`;
        colEl.appendChild(b);
        bindDrag(b, 'layer', id, url);
      });
      $('bTubsIn').appendChild(colEl);
    });

    /* şişeler */
    Object.keys(CONFIG.sauces).forEach(id => {
      const t = CONFIG.sauces[id];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'b-sauce-btn'; b.dataset.item = id; b.dataset.press = '';
      b.innerHTML = `<span class="b-bottle"><img src="${view.bottleThumb(id)}" alt="" draggable="false"></span><span class="b-count" hidden></span><span class="b-tag">${t.name}</span>`;
      b.addEventListener('click', () => add('sauce', id));
      $('bBottlesIn').appendChild(b);
    });

    /* yan ürünler */
    Object.keys(CONFIG.sides).forEach(id => {
      const t = CONFIG.sides[id];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'b-side'; b.dataset.item = id; b.dataset.press = '';
      const url = view.cupThumb(id);
      b.innerHTML = `<img src="${url}" alt="" draggable="false"><span class="b-count" hidden></span><span class="b-tag">${t.name} <b>+${lira(t.price)}</b></span>`;
      $('bSidesList').appendChild(b);
      bindDrag(b, 'side', id, url);
    });

    /* içecekler */
    const dh = document.createElement('h2'); dh.className = 'b-ribbon b-drinks-title'; dh.textContent = 'İçecek';
    const dl = document.createElement('div'); dl.className = 'b-drinks';
    $('bSides').append(dh, dl);
    Object.keys(CONFIG.drinks).forEach(id => {
      const t = CONFIG.drinks[id], b = document.createElement('button');
      b.type = 'button'; b.className = 'b-drink'; b.dataset.item = id; b.dataset.press = '';
      b.innerHTML = '<img src="' + view.drinkThumb(id) + '" alt="" draggable="false"><span class="b-count" hidden></span><span class="b-tag">' + t.name + ' <b>+' + lira(t.price) + '</b></span>';
      b.addEventListener('click', () => add('drink', id));
      dl.appendChild(b);
    });


    $('bLid').addEventListener('click', open);
    $('bOpenBtn').addEventListener('click', open);
    $('bTopOff').addEventListener('click', topOff);
    $('bUndo').addEventListener('click', undo);
    $('bCheckout').addEventListener('click', checkout);
    $('bBack').addEventListener('click', backToBuild);
    $('bAgain').addEventListener('click', reset);
    $('bHow').addEventListener('click', () => {
      const p = $('bHowPop');
      p.hidden = !p.hidden;
      $('bHow').setAttribute('aria-expanded', String(!p.hidden));
    });
    document.querySelectorAll('input[name="bhow"]').forEach(i => i.addEventListener('change', e => { S.how = e.target.value; renderReceipt(); }));

    syncButtons();
    setState('hero');
  }

  return {
    init,
    enter() {
      G.setColor('red');
      G.setPoseFn(() => S.state === 'done' ? 'ok' : S.state === 'hero' ? 'point' : 'open');
      if (S.state !== 'hero') reset();
    }
  };
})();
