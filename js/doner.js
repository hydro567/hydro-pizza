/* Hydro Döner — sipariş akışı: hero → build → review → done */
window.HydroDoner = (function () {
  'use strict';

  /* ===== DÜKKÂN BİLGİLERİ — kendi değerlerinle değiştir ===== */
  const CONFIG = {
    lavash: 30,
    bread: { lavas: { name: 'Lavaş', extra: 0 }, ekmek: { name: 'Tam ekmek', extra: 10 } },
    deliveryFee: 40,
    deliveryMinutes: [25, 35],
    pickupMinutes: [10, 15],
    maxPerItem: 3, // 1 normal + 2 ekstra
    maxSides: 6,
    meats: {
      adana: { name: 'Adana kebap', price: 190, note: 'Acılı, zırh kıyması' },
      urfa: { name: 'Urfa kebap', price: 190, note: 'Acısız, közde' },
      et: { name: 'Et döner', price: 210, note: 'Yaprak yaprak' },
      tavuk: { name: 'Tavuk döner', price: 150, note: 'Tereyağlı marine' }
    },
    tops: {
      domates: { name: 'Domates', price: 10 },
      sogan: { name: 'Sumaklı soğan', price: 10 },
      maydanoz: { name: 'Maydanoz', price: 10 },
      marul: { name: 'Marul', price: 10 },
      tursu: { name: 'Turşu', price: 15 },
      biber: { name: 'Közlenmiş biber', price: 20 },
      patates: { name: 'Patates', price: 25 }
    },
    sauces: {
      aci: { name: 'Acı sos', price: 0 },
      sarimsak: { name: 'Sarımsaklı sos', price: 0 }
    },
    sides: {
      kola: { name: 'Kola', price: 45 },
      su: { name: 'Su', price: 15 },
      ayran: { name: 'Ayran', price: 35 },
      salgam: { name: 'Şalgam', price: 35 }
    }
  };

  const G = window.Glove;
  const $ = id => document.getElementById(id);
  const stage = $('dstage');
  const lira = n => n.toLocaleString('tr-TR') + ' ₺';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const allItems = () => Object.assign({}, CONFIG.meats, CONFIG.tops, CONFIG.sauces, CONFIG.sides);

  const S = { state: 'hero', hist: [], how: 'pickup', bread: 'lavas' };
  const breadPrice = () => CONFIG.lavash + CONFIG.bread[S.bread].extra;
  let view, toastTimer = 0;

  const count = id => S.hist.filter(h => h.id === id).length;
  const sideCount = () => S.hist.filter(h => h.kind === 'side').length;
  const hasMeat = () => S.hist.some(h => h.kind === 'meat');

  function renderReceipt() {
    const items = allItems(), box = $('dItems'), seen = [];
    box.innerHTML = '';
    const row = (a, b, extra) => {
      const d = document.createElement('div');
      d.className = 'r-line' + (extra ? ' r-extra' : '');
      const x = document.createElement('span'), y = document.createElement('span');
      x.textContent = a; y.textContent = b; d.append(x, y); box.appendChild(d);
    };
    row(CONFIG.bread[S.bread].name, lira(breadPrice()));
    S.hist.forEach(h => { if (!seen.includes(h.id)) seen.push(h.id); });
    seen.forEach(id => {
      const t = items[id], n = count(id), p = c => t.price ? lira(t.price * c) : 'İKRAM';
      row(t.name, p(1));
      if (n === 2) row('Ekstra ' + t.name, p(1), true);
      if (n > 2) row(`${n - 1}× Ekstra ${t.name}`, p(n - 1), true);
    });
    $('dFeeLine').hidden = S.how !== 'delivery';
    $('dFee').textContent = lira(CONFIG.deliveryFee);
    const total = breadPrice() + S.hist.reduce((s, h) => s + items[h.id].price, 0) + (S.how === 'delivery' ? CONFIG.deliveryFee : 0);
    $('dTotal').textContent = lira(total);
    $('dLive').textContent = lira(total);
  }
  function toast(msg) {
    const t = $('dToast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 1500);
  }
  function sync() {
    const items = allItems();
    Object.keys(items).forEach(id => {
      const b = stage.querySelector(`[data-item="${id}"]`);
      if (!b) return;
      const n = count(id), badge = b.querySelector('.b-count');
      badge.textContent = n ? n + '×' : ''; badge.hidden = n < 1;
      b.classList.toggle('used', n > 0);
      b.setAttribute('aria-label', `${items[id].name}, ${items[id].price ? lira(items[id].price) : 'ikram'}${n ? `, ${n} kez eklendi` : ''}`);
    });
    $('dRoll').classList.toggle('off', !hasMeat());
    $('dRoll').firstChild.textContent = S.bread === 'ekmek' ? 'Ekmeği kapat ' : 'Dürümü sar ';
    document.querySelectorAll('[data-bread]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bread === S.bread)));
    $('dUndo').disabled = S.hist.length === 0;
    renderReceipt();
  }

  function kindOf(id) {
    if (CONFIG.meats[id]) return 'meat';
    if (CONFIG.tops[id]) return 'top';
    if (CONFIG.sauces[id]) return 'sauce';
    return 'side';
  }
  function add(id) {
    const items = allItems(), kind = kindOf(id);
    if (S.state === 'review' ? kind !== 'side' : S.state !== 'build') return;
    if (kind === 'side' && S.state !== 'review') return;
    const n = count(id);
    if (kind !== 'side' && n >= CONFIG.maxPerItem) { toast(`Daha fazla ${items[id].name.toLocaleLowerCase('tr-TR')} sığmaz.`); return; }
    if (kind === 'side' && sideCount() >= CONFIG.maxSides) { toast('Tepsi doldu.'); return; }
    let e;
    if (kind === 'sauce') e = view.sauce(id);
    else if (kind === 'side') e = view.addSide(items[id].art || id);
    else e = view.add(id, n);
    S.hist.push({ id, kind, e });
    toast(n >= 1 ? `Ekstra ${items[id].name} eklendi.` : `${items[id].name} eklendi.`);
    sync();
  }
  function undo() {
    if (S.state !== 'build' && S.state !== 'review') return;
    let i = S.hist.length - 1;
    if (S.state === 'review') { while (i >= 0 && S.hist[i].kind !== 'side') i--; }
    if (i < 0) return;
    const h = S.hist.splice(i, 1)[0];
    view.remove(h.e);
    sync();
  }

  const panels = { hero: ['dHero'], build: ['dMeats', 'dTops', 'dStatus'], review: ['dReceipt', 'dSides', 'dStatus'], done: ['dDone'] };
  const ALL = ['dHero', 'dMeats', 'dTops', 'dSides', 'dStatus', 'dReceipt', 'dDone'];
  function setState(s) {
    S.state = s;
    stage.dataset.bstate = s;
    ALL.forEach(id => { $(id).inert = !panels[s].includes(id); });
    $('dStatusText').textContent = s === 'review' ? 'Sacda kızardı. Yanına içecek al ya da siparişi ver.' : 'Etini seç, içini doldur, sonra sar.';
    G.refresh();
  }
  const narrow = () => matchMedia('(max-width: 899px), (max-aspect-ratio: 1/1)').matches;
  function open() { if (S.state === 'hero') { setState('build'); sync(); window.scrollTo({ top: 0 }); } }
  function rollUp() {
    if (S.state !== 'build') return;
    if (!hasMeat()) { toast('Önce etini seç.'); return; }
    setState('review');
    view.roll(true);
    toast(S.bread === 'ekmek' ? 'Ekmeğin kapandı.' : 'Dürümün sarıldı.');
    if (narrow()) $('dReceipt').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }
  function back() {
    if (S.state !== 'review') return;
    view.roll(false);
    setState('build');
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
  function checkout() {
    if (S.state !== 'review' || window.HydroCheckout.busy) return;
    window.HydroCheckout.open('doner', $('dReceipt')).then(checkoutNow, () => {});
  }
  function checkoutNow() {
    if (S.state !== 'review') return;
    const no = (window.HydroCheckout.last || {}).no || 1000 + Math.floor(Math.random() * 9000), pickup = S.how === 'pickup';
    const range = pickup ? CONFIG.pickupMinutes : CONFIG.deliveryMinutes;
    const fmt = m => new Date(Date.now() + m * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const when = `${fmt(range[0])}–${fmt(range[1])}`;
    $('dSticker').innerHTML = `SİPARİŞ #${no}<b>${pickup ? 'HAZIRLANIYOR!' : 'YOLDA!'}</b>${pickup ? 'HAZIR' : 'VARIŞ'} ${when}`;
    $('dDoneLead').textContent = pickup ? 'Kağıdına sardık. Sıcak sıcak gel, al.' : 'Kağıdına sardık, soğumadan kapında.';
    $('dDoneNo').textContent = `SİPARİŞ #${no}`;
    $('dDoneArrive').textContent = `${pickup ? 'Hazır' : 'Varış'} ${when}`;
    view.wrap(true);
    setState('done');
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
  function reset() { S.hist = []; S.bread = 'lavas'; view.clear(); view.setBread('lavas'); sync(); setState('hero'); }

  /* ---------- kurulum ---------- */
  let ready = false;
  function bindDrag(el, id, url) {
    let drag = null, suppress = false;
    const overBox = (x, y) => { const b = $('dBox').getBoundingClientRect(); return x > b.left && x < b.right && y > b.top && y < b.bottom; };
    el.addEventListener('pointerdown', e => { suppress = false; if (e.button === 0) drag = { x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, type: e.pointerType }; });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.pid) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
      if (!drag.moved) {
        if (drag.type !== 'mouse' && getComputedStyle(el).touchAction !== 'none') { drag = null; return; }
        drag.moved = true;
        G.paintGhost(url);
        G.startHold(e.clientX, e.clientY, drag.type === 'mouse');
      }
      if (drag.type !== 'mouse') G.track(e.clientX, e.clientY);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag; drag = null;
      if (d.moved) {
        G.endHold();
        if (e.type === 'pointerup' && overBox(e.clientX, e.clientY)) add(id);
        suppress = true; setTimeout(() => { suppress = false; }, 40);
      }
    };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    el.addEventListener('click', () => { if (!suppress) add(id); });
  }
  function tile(id, t, url, cls, sub) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.dataset.item = id; b.dataset.press = '';
    b.innerHTML = `<img src="${url}" alt="" draggable="false"><span class="b-count" hidden></span><span class="b-tag">${t.name} <b>${t.price ? '+' + lira(t.price) : 'ikram'}</b></span>${sub ? `<small>${sub}</small>` : ''}`;
    bindDrag(b, id, url);
    return b;
  }
  function init(v) {
    if (ready) return;
    ready = true;
    view = v;
    /* ekmek seçimi */
    const bw = document.createElement('div');
    bw.className = 'd-bread';
    bw.innerHTML = '<p>Ne içinde olsun?</p>';
    Object.keys(CONFIG.bread).forEach(k => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.bread = k; b.dataset.press = '';
      b.innerHTML = '<img alt="" draggable="false" src="' + view.breadThumb(k) + '"><span>' + CONFIG.bread[k].name + (CONFIG.bread[k].extra ? ' <b>+' + lira(CONFIG.bread[k].extra) + '</b>' : '') + '</span>';
      b.addEventListener('click', () => {
        if (S.state !== 'build' || S.bread === k) return;
        if (S.hist.some(h => h.kind !== 'side')) { toast('Önce malzemeleri geri al, sonra ekmeği değiştir.'); return; }
        S.bread = k; view.setBread(k); toast(CONFIG.bread[k].name + ' seçildi.'); sync();
      });
      bw.appendChild(b);
    });
    $('dMeats').insertBefore(bw, $('dMeats').firstChild);
    Object.keys(CONFIG.meats).forEach(id => $('dMeatList').appendChild(tile(id, CONFIG.meats[id], view.thumb(id), 'd-tile d-meat', CONFIG.meats[id].note)));
    Object.keys(CONFIG.tops).forEach(id => $('dTopList').appendChild(tile(id, CONFIG.tops[id], view.thumb(id), 'd-tile')));
    Object.keys(CONFIG.sauces).forEach(id => $('dTopList').appendChild(tile(id, CONFIG.sauces[id], view.sauceThumb(id), 'd-tile d-sauce')));
    Object.keys(CONFIG.sides).forEach(id => $('dSideList').appendChild(tile(id, CONFIG.sides[id], view.sideThumb(CONFIG.sides[id].art || id), 'd-tile d-side')));
    $('dOpen').addEventListener('click', open);
    $('dRoll').addEventListener('click', rollUp);
    $('dUndo').addEventListener('click', undo);
    $('dCheckout').addEventListener('click', checkout);
    $('dBack').addEventListener('click', back);
    $('dAgain').addEventListener('click', reset);
    document.querySelectorAll('input[name="dhow"]').forEach(i => i.addEventListener('change', e => { S.how = e.target.value; renderReceipt(); }));
    sync();
    setState('hero');
  }
  return {
    init,
    enter() {
      G.setColor('black');
      G.setPoseFn(() => S.state === 'done' ? 'ok' : S.state === 'hero' ? 'point' : 'open');
      if (S.state !== 'hero') reset();
    }
  };
})();
