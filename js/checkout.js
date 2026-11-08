/* Ödeme akışı: sipariş özeti + kart formu → POS cihazında kart okutma → slip.
   Hiçbir bilgi bir yere gönderilmez ya da saklanmaz; kart alanları işlem bitince temizlenir. */
(function () {
  'use strict';
  const BRANDS = {
    pizza: { name: 'HYDRO PİZZA', short: 'HYDRO PIZZA' },
    hamburger: { name: 'HYDRO BURGER', short: 'HYDRO BURGER' },
    doner: { name: 'HYDRO DÖNER', short: 'HYDRO DONER' }
  };
  const tl = n => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = s => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 60) : ms));
  const digits = s => String(s).replace(/\D/g, '');

  function network(d) {
    if (/^4/.test(d)) return 'visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard';
    if (/^9792/.test(d)) return 'troy';
    if (/^3[47]/.test(d)) return 'amex';
    return '';
  }
  const NET_LABEL = { visa: 'VISA', mastercard: 'mastercard', troy: 'troy', amex: 'AMEX' };

  /* ================= ÖDEME SAYFASI ================= */
  let modal, resolveFn, rejectFn;
  const state = { busy: false, last: null };

  function build() {
    modal = document.createElement('div');
    modal.className = 'co';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="co-back" data-close></div>
      <section class="co-panel" role="dialog" aria-modal="true" aria-labelledby="coTitle">
        <header class="co-head">
          <div><p class="co-brand" id="coBrand"></p><h2 id="coTitle">Ödeme</h2></div>
          <ol class="co-steps" aria-label="Adımlar"><li class="done">Sepet</li><li class="now">Bilgiler ve ödeme</li><li>Onay</li></ol>
          <button class="co-x" type="button" data-close aria-label="Kapat" data-press>×</button>
        </header>
        <div class="co-grid">
          <form class="co-form" id="coForm" novalidate autocomplete="off">
            <section class="co-sec">
              <h3><span>1</span> İletişim ve teslimat</h3>
              <div class="co-row">
                <label class="co-f"><span>Ad soyad</span><input id="coName" placeholder="Adın ve soyadın" autocomplete="off"></label>
                <label class="co-f"><span>Cep telefonu</span><input id="coPhone" placeholder="05xx xxx xx xx" inputmode="tel" maxlength="14" autocomplete="off"></label>
              </div>
              <label class="co-f" id="coAddrWrap"><span>Teslimat adresi</span><textarea id="coAddr" rows="2" placeholder="Mahalle, sokak, bina ve daire no" autocomplete="off"></textarea></label>
              <label class="co-f"><span>Sipariş notu <em>(isteğe bağlı)</em></span><input id="coNote" placeholder="Zili çalmayın, kapıya bırakın…" autocomplete="off"></label>
            </section>
            <section class="co-sec">
              <h3><span>2</span> Ödeme yöntemi</h3>
              <div class="co-methods" role="radiogroup" aria-label="Ödeme yöntemi">
                <label class="co-m" data-press><input type="radio" name="coPay" value="card" checked>
                  <i class="co-ico ic-card" aria-hidden="true"></i><b>Kredi / Banka kartı</b><small>Siparişi tamamlayınca POS cihazına okutulur</small>
                  <span class="co-nets" aria-hidden="true"><i>VISA</i><i>mastercard</i><i>troy</i></span></label>
                <label class="co-m" data-press><input type="radio" name="coPay" value="cash">
                  <i class="co-ico ic-cash" aria-hidden="true"></i><b>Kapıda nakit</b><small>Kuryeye nakit ödersin</small></label>
              </div>
              <div class="co-card" id="coCardArea">
                <label class="co-f co-num"><span>Kart numarası</span>
                  <span class="co-inwrap"><input id="coNum" placeholder="0000 0000 0000 0000" autocomplete="off"><i class="co-net" id="coNet"></i></span></label>
                <label class="co-f"><span>Kart üzerindeki isim</span><input id="coHolder" placeholder="Ad soyad" autocomplete="off"></label>
                <div class="co-row">
                  <label class="co-f"><span>Son kullanma tarihi</span><input id="coExp" placeholder="AA/YY" autocomplete="off"></label>
                  <label class="co-f"><span>CVV</span><input id="coCvc" placeholder="•••" autocomplete="off"></label>
                </div>
              </div>
            </section>
            <p class="co-err" id="coErr" role="alert"></p>
          </form>
          <aside class="co-sum">
            <h3>Sipariş özeti</h3>
            <div class="co-lines" id="coLines"></div>
            <div class="co-sub" id="coSub"></div>
            <div class="co-total"><span>Toplam</span><strong id="coTotal"></strong></div>
            <button class="co-pay" type="submit" form="coForm" id="coPay" data-press>Siparişi tamamla</button>
            <p class="co-fine" id="coFine"></p>
          </aside>
        </div>
      </section>`;
    document.body.appendChild(modal);
    const q = id => modal.querySelector('#' + id);

    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', cancel));
    addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden && !state.busy) cancel(); });
    q('coNum').addEventListener('input', e => {
      const n = network(digits(e.target.value));
      q('coNet').textContent = NET_LABEL[n] || '';
      q('coNet').className = 'co-net ' + n;
    });
    q('coPhone').addEventListener('input', e => {
      const d = digits(e.target.value).slice(0, 11);
      e.target.value = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(' ');
    });
    modal.querySelectorAll('input[name="coPay"]').forEach(r => r.addEventListener('change', setPay));
    modal.querySelectorAll('input, textarea').forEach(i => i.addEventListener('input', () => { const f = i.closest('.co-f'); if (f) f.classList.remove('bad'); }));
    q('coForm').addEventListener('submit', e => { e.preventDefault(); submit(); });
  }

  const payMethod = () => modal.querySelector('input[name="coPay"]:checked').value;
  function setPay() {
    const m = payMethod(), q = id => modal.querySelector('#' + id);
    q('coCardArea').hidden = m !== 'card';
    q('coPay').textContent = 'Siparişi tamamla · ' + state.totalText;
    q('coFine').textContent = m === 'card' ? 'Siparişi tamamlayınca kartını POS cihazına okutarak ödersin.' : 'Kuryeye nakit ödeme yapacaksın.';
  }

  function readReceipt(el) {
    const lines = [];
    el.querySelectorAll('.r-line').forEach(r => {
      if (r.classList.contains('r-total') || r.hidden || r.closest('[hidden]')) return;
      const s = r.querySelectorAll('span');
      if (s.length < 2) return;
      const label = s[0].textContent.trim(), price = s[s.length - 1].textContent.trim();
      if (/^0\s*₺$/.test(price)) return;
      lines.push({ label, price, extra: r.classList.contains('r-extra'), fee: /teslimat/i.test(label) });
    });
    const tot = el.querySelector('.r-total strong');
    const how = el.querySelector('input[type="radio"]:checked');
    return { lines, totalText: tot ? (tot.dataset.final || tot.textContent).trim() : '', delivery: !!how && how.value === 'delivery' };
  }

  function open(brand, receiptEl) {
    if (state.busy) return Promise.reject(new Error('busy'));
    if (!modal) build();
    const q = id => modal.querySelector('#' + id);
    const data = readReceipt(receiptEl);
    state.brand = brand; state.data = data; state.totalText = data.totalText;
    modal.dataset.brand = brand;
    q('coBrand').textContent = BRANDS[brand].name;
    const items = data.lines.filter(l => !l.fee), fee = data.lines.find(l => l.fee);
    q('coLines').innerHTML = items.map(l => `<div class="co-line${l.extra ? ' x' : ''}"><span>${esc(l.label)}</span><span>${esc(l.price)}</span></div>`).join('');
    const sub = items.reduce((a, l) => a + num(l.price), 0);
    q('coSub').innerHTML = `<div><span>Ara toplam</span><span>${tl(sub)} ₺</span></div><div><span>${data.delivery ? 'Teslimat ücreti' : 'Gel-al'}</span><span>${fee ? esc(fee.price) : 'Ücretsiz'}</span></div>`;
    q('coTotal').textContent = data.totalText;
    q('coAddrWrap').hidden = !data.delivery;
    q('coErr').textContent = '';
    modal.querySelectorAll('.bad').forEach(b => b.classList.remove('bad'));
    setPay();
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('on'));
    setTimeout(() => q('coName').focus({ preventScroll: true }), 80);
    return new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
  }
  function close() {
    modal.classList.remove('on');
    setTimeout(() => { modal.hidden = true; }, reduced ? 0 : 260);
  }
  function clearCard() { ['coNum', 'coHolder', 'coExp', 'coCvc'].forEach(id => { modal.querySelector('#' + id).value = ''; }); modal.querySelector('#coNet').textContent = ''; }
  function cancel() {
    if (state.busy) return;
    close();
    if (rejectFn) rejectFn(new Error('cancel'));
    resolveFn = rejectFn = null;
  }

  async function submit() {
    const q = id => modal.querySelector('#' + id), m = payMethod();
    let card = null;
    if (m === 'card') {
      const raw = q('coNum').value.trim(), d = digits(raw);
      card = { last4: (d || raw || '0000').slice(-4).padStart(4, '•'), net: network(d), holder: (q('coHolder').value.trim() || q('coName').value.trim() || 'KART SAHİBİ').toLocaleUpperCase('tr-TR') };
    }
    q('coErr').textContent = '';
    state.busy = true;
    const order = {
      brand: state.brand, lines: state.data.lines, totalText: state.totalText, delivery: state.data.delivery,
      method: m, card, name: q('coName').value.trim() || 'Misafir', no: 1000 + Math.floor(Math.random() * 9000)
    };
    // kart numarası, son kullanma ve CVV hiçbir yerde tutulmaz
    clearCard();
    close();
    state.last = order;
    await pos(order);
    state.busy = false;
    if (resolveFn) resolveFn(order);
    resolveFn = rejectFn = null;
  }

  /* ================= POS CİHAZI ================= */
  let P, beepCtx;
  function beep(freq = 1760, ms = 110, times = 1) {
    try {
      beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const o = beepCtx.createOscillator(), g = beepCtx.createGain(), t = beepCtx.currentTime + i * (ms + 70) / 1000;
        o.type = 'square'; o.frequency.value = freq; g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
        o.connect(g).connect(beepCtx.destination); o.start(t); o.stop(t + ms / 1000 + .02);
      }
    } catch (e) { /* ses yoksa sessiz devam */ }
  }
  function buildPos() {
    P = document.createElement('div');
    P.className = 'pos';
    P.hidden = true;
    P.innerHTML = `
      <div class="pos-back"></div>
      <div class="pos-stage">
        <div class="pos-wrap" id="posWrap">
          <img class="pos-img" id="posImg" alt="POS cihazı">
          <div class="pos-screen" id="posScreen" aria-live="polite"></div>
        </div>
        <div class="pos-cardfly" id="posCard" aria-hidden="true">
          <div class="pc-top"><i class="pc-chip"></i><i class="pc-wave"></i></div>
          <div class="pc-num" id="pcNum"></div>
          <div class="pc-bot"><span id="pcName"></span><b id="pcNet"></b></div>
        </div>
        <div class="cash" id="posCash" aria-live="polite">
          <div class="cash-tray" id="cashTray"></div>
          <div class="cash-info">
            <p class="cash-title" id="cashTitle">Nakit ödeme</p>
            <div class="cash-rows">
              <div><span>Tutar</span><b id="cashTotal"></b></div>
              <div><span>Verilen</span><b id="cashGiven">0 ₺</b></div>
              <div><span>Para üstü</span><b id="cashChange">—</b></div>
            </div>
          </div>
        </div>
        <p class="pos-hint" id="posHint"></p>
        <div class="pos-actions" id="posActions">
          <button type="button" id="posDone" class="primary" data-press>Siparişe dön</button>
        </div>
      </div>`;
    document.body.appendChild(P);
    addEventListener('resize', () => { if (!P.hidden) fitScreen(); });
  }
  function screen(html, cls = '') { const s = P.querySelector('#posScreen'); s.className = 'pos-screen ' + cls; s.innerHTML = html; }

  /* Ekranı cihazın perspektifine oturt: dikdörtgeni resimdeki dört köşeye eşleyen matrix3d */
  const SW = 320, SH = 258;
  function adj(m) { return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; }
  function mm(x, y) { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let t = 0; for (let k = 0; k < 3; k++) t += x[3 * i + k] * y[3 * k + j]; c.push(t); } return c; }
  function mv(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function basis(p) { const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1]; const v = mv(adj(m), [p[3][0], p[3][1], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
  let posArt = null;
  function fitScreen() {
    if (!posArt) return;
    const img = P.querySelector('#posImg'), w = img.clientWidth, h = img.clientHeight;
    if (!w) return;
    const dst = [posArt.tl, posArt.tr, posArt.bl, posArt.br].map(p => [p.x * w, p.y * h]);
    const src = [[0, 0], [SW, 0], [0, SH], [SW, SH]];
    const t = mm(basis(dst), adj(basis(src))).map(v => v / mm(basis(dst), adj(basis(src)))[8]);
    const el = P.querySelector('#posScreen');
    el.style.cssText = `left:0;top:0;width:${SW}px;height:${SH}px;transform-origin:0 0;transform:matrix3d(${[t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(',')})`;
  }

  /* Banknotlar: tutarı kapatacak şekilde yuvarlanır, para üstü gösterilir */
  const NOTES = [200, 100, 50, 20, 10, 5];
  function cashPlan(total) {
    const given = Math.ceil(total / 50) * 50 === total ? total : Math.ceil(total / 50) * 50;
    const notes = []; let left = given;
    NOTES.forEach(n => { while (left >= n) { notes.push(n); left -= n; } });
    return { given, notes, change: given - total };
  }
  function noteEl(n, i) {
    const d = document.createElement('div');
    d.className = 'tl-note n' + n;
    d.innerHTML = `<span class="tn-corner">${n}</span><span class="tn-mid"><i>₺</i><b>${n}</b><small>TÜRK LİRASI</small></span><span class="tn-corner r">${n}</span>`;
    const r = (Math.random() - .5) * 14;
    d.style.setProperty('--r', r + 'deg');
    d.style.setProperty('--x', (Math.random() - .5) * 26 + 'px');
    d.style.setProperty('--y', -i * 3 + 'px');
    return d;
  }

  async function pos(o) {
    if (!P) buildPos();
    const q = id => P.querySelector('#' + id);
    const totalN = num(o.totalText), total = tl(totalN);
    P.classList.remove('done', 'tap', 'cashmode');
    q('posHint').textContent = '';

    if (o.method === 'cash') {
      // kapıda nakit: kart yok, banknotlar sayılır
      P.classList.add('cashmode');
      const plan = cashPlan(totalN);
      q('cashTray').innerHTML = '';
      q('cashTitle').textContent = 'Kapıda nakit ödeme';
      q('cashTotal').textContent = total + ' ₺';
      q('cashGiven').textContent = '0 ₺';
      q('cashChange').textContent = '—';
      P.hidden = false;
      await new Promise(r => requestAnimationFrame(r));
      P.classList.add('on');
      await wait(500);
      let given = 0;
      for (let i = 0; i < plan.notes.length; i++) {
        q('cashTray').appendChild(noteEl(plan.notes[i], i));
        given += plan.notes[i];
        q('cashGiven').textContent = tl(given) + ' ₺';
        beep(900 + i * 60, 30);
        await wait(380);
      }
      q('cashChange').textContent = plan.change ? tl(plan.change) + ' ₺' : 'Yok';
      await wait(500);
      q('cashTitle').innerHTML = '<i class="cash-ok"></i> Ödeme alındı';
      beep(1760, 120);
    } else {
      posArt = window.HydroPosArt ? window.HydroPosArt() : null;
      if (posArt) q('posImg').src = posArt.url;
      if (o.card) {
        q('pcNum').textContent = '•••• •••• •••• ' + o.card.last4;
        q('pcName').textContent = o.card.holder;
        q('pcNet').textContent = NET_LABEL[o.card.net] || '';
        q('posCard').className = 'pos-cardfly ' + (o.card.net || '');
      }
      screen(`<p class="ps-brand">${esc(BRANDS[o.brand].short)}</p><p class="ps-big">SATIŞ</p><p class="ps-amt">${total} TL</p>`);
      q('posHint').textContent = 'Ödemeyi tamamlamak için kartını okut.';
      P.hidden = false;
      await new Promise(r => q('posImg').complete ? r() : q('posImg').addEventListener('load', r, { once: true }));
      await new Promise(r => requestAnimationFrame(r));
      fitScreen();
      P.classList.add('on');
      await wait(900);
      screen(`<p class="ps-amt">${total} TL</p><i class="ps-tap"></i><p class="ps-msg">KARTINIZI OKUTUNUZ</p>`, 'wait');
      beep(1320, 60);
      await wait(1300);
      P.classList.add('tap');
      await wait(900);
      beep(2093, 90);
      screen(`<p class="ps-amt">${total} TL</p><i class="ps-spin"></i><p class="ps-msg">İŞLEM YAPILIYOR<br>KARTI ÇEKMEYİNİZ</p>`, 'busy');
      await wait(1600);
      P.classList.remove('tap');
      screen(`<i class="ps-ok"></i><p class="ps-msg big">İŞLEMİNİZ<br>BAŞARILI OLMUŞTUR</p><p class="ps-amt sm">${total} TL</p>`, 'ok');
      beep(2093, 140, 2);
      q('posHint').textContent = '';
    }
    await wait(700);
    P.classList.add('done');
    q('posDone').focus({ preventScroll: true });
    await new Promise(res => q('posDone').addEventListener('click', res, { once: true }));
    P.classList.remove('on');
    await wait(320);
    P.hidden = true;
  }

  window.HydroCheckout = { open, get busy() { return state.busy || (modal && !modal.hidden); }, get last() { return state.last; } };
})();
