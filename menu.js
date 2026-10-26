/* Spetitos — cardápio do cliente (menu.js)
   Renderiza em <main id="app"> e <footer id="site-footer">.
   API pública: window.Menu = { render, openProduct(id), openCart(), status(), isOpen(), art(kind|product) }
   Depende de: Store, Cart, UI (store.js, cart.js, ui.js). */
(function () {
  const { h } = UI;
  const money = (v) => Store.money(v);
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  /* ------------------------------------------------------------------
     Horário de funcionamento
     store.hours aceita: "18:00–23:30" | "18h às 23h30" | "Fechado"
       ou objeto por dia { dom|0: "18:00-23:30", seg|1: "...", ... }
     Sobrescritas manuais (painel do dono): store.open === true/false,
       store.closed === true ou store.forceClosed === true.
     ------------------------------------------------------------------ */
  const DAY_KEYS = [['0', 'dom', 'domingo', 'sun'], ['1', 'seg', 'segunda', 'mon'], ['2', 'ter', 'terca', 'tue'],
    ['3', 'qua', 'quarta', 'wed'], ['4', 'qui', 'quinta', 'thu'], ['5', 'sex', 'sexta', 'fri'], ['6', 'sab', 'sabado', 'sat']];

  function hoursFor(hours, day) {
    if (!hours) return null;
    if (typeof hours === 'string') return hours;
    if (typeof hours === 'object') {
      const keys = Object.keys(hours);
      const k = keys.find((key) => DAY_KEYS[day].includes(norm(key).replace(/[^a-z0-9]/g, '')));
      return k ? String(hours[k] || '') : null;
    }
    return null;
  }
  function parseRange(str) {
    if (!str) return null;
    if (/fechad/i.test(str)) return { closed: true };
    const re = /(\d{1,2})\s*(?:[:h]\s*(\d{2})?)/gi;
    const t = []; let m;
    while ((m = re.exec(str)) && t.length < 2) t.push(Number(m[1]) * 60 + Number(m[2] || 0));
    if (t.length < 2) return null;
    return { open: t[0], close: t[1] };
  }
  const fmt = (min) => { min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };

  function status(now = new Date()) {
    const s = Store.info() || {};
    if (s.forceClosed === true || s.closed === true || s.open === false) return { open: false, known: true, label: 'Fechado agora', sub: 'Pausamos os pedidos por um momento' };
    if (s.open === true) return { open: true, known: true, label: 'Aberto agora', sub: '' };
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const today = parseRange(hoursFor(s.hours, day));
    const yest = parseRange(hoursFor(s.hours, (day + 6) % 7));
    if (!today && !yest) return { open: true, known: false, label: 'Aberto', sub: '' };
    // turno de ontem que passa da meia-noite
    if (yest && !yest.closed && yest.close <= yest.open && mins < yest.close) return { open: true, known: true, label: 'Aberto agora', sub: 'até ' + fmt(yest.close) };
    if (today && !today.closed) {
      const overnight = today.close <= today.open;
      if (mins >= today.open && (overnight || mins < today.close)) return { open: true, known: true, label: 'Aberto agora', sub: 'até ' + fmt(today.close) };
      if (mins < today.open) return { open: false, known: true, label: 'Fechado agora', sub: 'abre hoje às ' + fmt(today.open) };
    }
    for (let i = 1; i <= 7; i++) {
      const r = parseRange(hoursFor(s.hours, (day + i) % 7));
      if (r && !r.closed) return { open: false, known: true, label: 'Fechado agora', sub: 'abre ' + (i === 1 ? 'amanhã' : ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][(day + i) % 7]) + ' às ' + fmt(r.open) };
    }
    return { open: false, known: true, label: 'Fechado agora', sub: '' };
  }
  function hoursText(hours) {
    if (!hours) return '';
    if (typeof hours === 'string') return hours;
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return names.map((n, d) => { const v = hoursFor(hours, d); return v ? n + ' ' + v : ''; }).filter(Boolean).join('\n');
  }

  /* ------------------------------------------------------------------
     Ilustrações de reserva (quando o produto não tem foto ou ela falha)
     ------------------------------------------------------------------ */
  const KINDS = [
    ['espeto', /espet|churrasc|kafta|coracao|linguica|medalh|queijo coalho|frango no|pao de alho/],
    ['bebida', /bebid|refri|suco|agua|cervej|coca|guarana|fanta|sprite|drink|lata|litro|\b\d+\s?ml\b|\b\d+(,\d)?\s?l\b|vitamina|milk/],
    ['porcao', /porc|batata|frita|fritas|aipim|mandioca|macaxeira|polenta|petisc|onion|calabresa acebol|isca/],
    ['doce', /doce|sobremes|acai|sorvete|pudim|brigadeir|bolo|torta|chocolate|mousse|pave/],
    ['lanche', /lanche|x-|x |burg|hamb|sanduich|misto|bauru|cachorro|hot ?dog|beirute|artesana|smash/],
    ['combo', /combo|kit|promo|famil|casal/]
  ];
  function kindOf(p) {
    const cat = p && Store.categories().find((c) => c.id === p.catId);
    const cn = norm(cat && cat.name);
    for (const [k, re] of KINDS) if (re.test(cn)) return k;
    const pn = norm((p && p.name) + ' ' + (p && p.desc));
    for (const [k, re] of KINDS) if (re.test(pn)) return k;
    return 'brasa';
  }
  const ART = {
    espeto: '<g transform="rotate(-32 60 60)"><rect class="ink" x="4" y="58" width="112" height="4" rx="2"/><path class="ink" d="M116 56l10 4-10 4z"/>' +
      '<rect class="a1" x="18" y="45" width="20" height="30" rx="7"/><rect class="a2" x="42" y="48" width="12" height="24" rx="5"/>' +
      '<rect class="a1" x="58" y="44" width="21" height="32" rx="8"/><rect class="hl" x="83" y="48" width="12" height="24" rx="5"/>' +
      '<path class="sear" d="M22 52h12M22 60h12M22 68h12M62 52h13M62 60h13M62 68h13"/></g>',
    lanche: '<path class="a2" d="M20 56c0-18 18-30 40-30s40 12 40 30z"/><circle class="seed" cx="44" cy="40" r="2"/><circle class="seed" cx="60" cy="35" r="2"/><circle class="seed" cx="74" cy="42" r="2"/>' +
      '<path class="hl" d="M16 60c6 5 10-3 16 2s10-3 16 2 10-3 16 2 10-3 16 2 10-3 16 2v4H16z"/>' +
      '<path class="cheese" d="M20 66h80l-12 10-10-6-14 9-12-9-14 8z"/><rect class="a1" x="18" y="70" width="84" height="14" rx="7"/>' +
      '<path class="a2" d="M20 88h80c0 8-8 12-16 12H36c-8 0-16-4-16-12z"/>',
    bebida: '<path class="ink" d="M70 14l-6 34" stroke-width="4"/><path class="glass" d="M36 40h48l-6 62a6 6 0 0 1-6 5H48a6 6 0 0 1-6-5z"/>' +
      '<path class="a1" d="M39 62h42l-3.6 39a5 5 0 0 1-5 4.5H47.6a5 5 0 0 1-5-4.5z"/><circle class="bubble" cx="52" cy="80" r="3"/><circle class="bubble" cx="66" cy="92" r="2.4"/><circle class="bubble" cx="62" cy="72" r="2"/>' +
      '<rect class="a2" x="32" y="36" width="56" height="7" rx="3.5"/>',
    porcao: '<g class="a2"><rect x="34" y="22" width="8" height="48" rx="3" transform="rotate(-10 38 46)"/><rect x="46" y="16" width="8" height="54" rx="3"/><rect x="58" y="20" width="8" height="50" rx="3" transform="rotate(6 62 45)"/><rect x="70" y="18" width="8" height="52" rx="3" transform="rotate(14 74 44)"/><rect x="80" y="28" width="8" height="42" rx="3" transform="rotate(22 84 49)"/></g>' +
      '<path class="a1" d="M28 54h64l-8 50H36z"/><path class="ink2" d="M40 70c6 6 34 6 40 0" />',
    doce: '<path class="a2" d="M42 56l18 50 18-50z"/><path class="ink2" d="M48 64l22 20M54 82l14-12"/><circle class="a1" cx="50" cy="48" r="14"/><circle class="hl2" cx="70" cy="46" r="14"/><circle class="a1" cx="60" cy="32" r="13"/>',
    combo: '<rect class="a1" x="22" y="58" width="44" height="12" rx="6"/><path class="a2" d="M22 54c0-12 10-20 22-20s22 8 22 20z"/><path class="a2" d="M22 74h44c0 6-5 9-10 9H32c-5 0-10-3-10-9z"/>' +
      '<path class="glass" d="M74 44h28l-4 52a4 4 0 0 1-4 4H82a4 4 0 0 1-4-4z"/><path class="a1" d="M76 64h24l-2.6 31a3 3 0 0 1-3 3H81.6a3 3 0 0 1-3-3z"/>',
    brasa: '<path class="a1" d="M60 14c6 16 26 26 26 50a26 26 0 0 1-52 0c0-12 6-20 12-26 0 8 4 14 10 16-2-16 0-28 4-40z"/><path class="a2" d="M60 52c4 8 12 12 12 22a12 12 0 0 1-24 0c0-6 4-10 6-12 1 4 3 6 6 7-1-6-1-11 0-17z"/>' +
      '<rect class="ink" x="20" y="100" width="80" height="5" rx="2.5"/>'
  };
  function art(kindOrProduct) {
    const k = typeof kindOrProduct === 'string' ? kindOrProduct : kindOf(kindOrProduct);
    const wrap = h('span', { class: 'art art--' + k, 'aria-hidden': 'true' });
    wrap.innerHTML = '<svg viewBox="0 0 120 120" focusable="false">' + (ART[k] || ART.brasa) + '</svg>';
    return wrap;
  }
  /* Foto com reserva: nunca mostra imagem quebrada */
  function photo(p, cls) {
    const box = h('span', { class: 'ph ' + (cls || '') });
    if (p.img) {
      const img = h('img', { src: p.img, alt: '', loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', () => { img.remove(); box.classList.add('ph--art'); box.prepend(art(p)); });
      img.addEventListener('load', () => box.classList.add('is-loaded'));
      box.append(img);
    } else { box.classList.add('ph--art'); box.append(art(p)); }
    return box;
  }

  /* ------------------------------------------------------------------
     Preço exibido (produtos com preço 0 e opções obrigatórias: "a partir de")
     ------------------------------------------------------------------ */
  function displayPrice(p) {
    const base = Number(p.price) || 0;
    let extra = 0;
    (p.optionGroups || []).forEach((g) => {
      const min = Number(g.min) || 0;
      if (min > 0 && g.options && g.options.length) {
        const prices = g.options.map((o) => Number(o.price) || 0).sort((a, b) => a - b);
        extra += prices.slice(0, min).reduce((s, v) => s + v, 0);
      }
    });
    const varies = (p.optionGroups || []).some((g) => (Number(g.min) || 0) > 0 && new Set((g.options || []).map((o) => Number(o.price) || 0)).size > 1);
    return { value: base + extra, from: varies || (base === 0 && extra > 0) };
  }

  /* ------------------------------------------------------------------
     Estrutura da página
     ------------------------------------------------------------------ */
  const app = document.getElementById('app');
  const footer = document.getElementById('site-footer');
  let query = '';
  let spy = null;
  let activeCat = null;

  const heroEl = h('header', { class: 'hero' });
  const searchInput = h('input', { class: 'input search-input', id: 'menu-search', type: 'search', placeholder: 'Buscar no cardápio', autocomplete: 'off', 'aria-label': 'Buscar no cardápio' });
  const searchClear = h('button', { class: 'search-clear', type: 'button', 'aria-label': 'Limpar busca', hidden: true }, '×');
  const tools = h('div', { class: 'tools' }, h('div', { class: 'tools-in' },
    h('label', { class: 'search' }, h('span', { class: 'search-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>' }), searchInput, searchClear)));
  const navEl = h('nav', { class: 'espeto', 'aria-label': 'Categorias' });
  const listEl = h('div', { class: 'menu', id: 'menu-list' });
  const cartBar = h('button', { class: 'cartbar', type: 'button', hidden: true, 'aria-live': 'polite' });
  app.append(heroEl, tools, navEl, listEl, cartBar);

  searchInput.addEventListener('input', () => { query = searchInput.value; searchClear.hidden = !query; renderList(); });
  searchClear.addEventListener('click', () => { searchInput.value = ''; query = ''; searchClear.hidden = true; renderList(); searchInput.focus(); });
  cartBar.addEventListener('click', openCart);

  /* ---------- hero ---------- */
  function renderHero() {
    const s = Store.info() || {};
    const st = status();
    heroEl.innerHTML = '';
    heroEl.classList.toggle('is-closed', !st.open);
    const bg = h('div', { class: 'hero-bg', 'aria-hidden': 'true' });
    if (s.cover) {
      const img = h('img', { class: 'hero-cover', src: s.cover, alt: '' });
      img.addEventListener('error', () => img.remove());
      bg.append(img);
    }
    bg.append(h('span', { class: 'hero-coals' }));
    const embers = h('span', { class: 'embers' });
    for (let i = 0; i < 16; i++) {
      embers.append(h('i', { style: `--x:${(i * 61) % 100}%;--d:${5 + (i * 7) % 6}s;--delay:${-((i * 13) % 9)}s;--s:${2 + (i % 3)}px;--drift:${((i % 5) - 2) * 14}px` }));
    }
    bg.append(embers);

    const name = String(s.name || 'Spetitos Lanches').trim();
    const words = name.split(/\s+/);
    const logo = s.logo
      ? (() => { const box = h('span', { class: 'hero-logo' }); const im = h('img', { src: s.logo, alt: 'Logo ' + name }); im.addEventListener('error', () => { im.remove(); box.textContent = name[0]; box.classList.add('is-mono'); }); box.append(im); return box; })()
      : h('span', { class: 'hero-logo is-mono', 'aria-hidden': 'true' }, name[0]);

    const facts = [];
    if (s.etaMin || s.etaMax) facts.push(['Entrega', (s.etaMin && s.etaMax ? s.etaMin + '–' + s.etaMax : (s.etaMin || s.etaMax)) + ' min']);
    if (s.deliveryFee !== undefined && s.deliveryFee !== '') facts.push(['Taxa', Number(s.deliveryFee) > 0 ? money(s.deliveryFee) : 'Grátis']);
    if (Number(s.minOrder) > 0) facts.push(['Mínimo', money(s.minOrder)]);

    heroEl.append(bg, h('div', { class: 'hero-in' },
      h('div', { class: 'hero-top' }, logo,
        h('span', { class: 'status ' + (st.open ? 'is-open' : 'is-shut') },
          h('span', { class: 'status-dot', 'aria-hidden': 'true' }), h('strong', {}, st.label), st.sub ? h('span', {}, st.sub) : '')),
      h('h1', { class: 'hero-name' }, words.map((w, i) => h('span', { class: 'hero-word' + (i === 0 ? ' is-first' : '') }, w))),
      s.slogan ? h('p', { class: 'hero-slogan' }, s.slogan) : '',
      facts.length ? h('dl', { class: 'hero-facts' }, facts.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', { class: 'num' }, v)))) : ''
    ));
  }

  /* ---------- grupos de categoria ---------- */
  function groups() {
    const cats = Store.categories();
    const prods = Store.products();
    const q = norm(query.trim());
    const match = (p) => !q || norm(p.name + ' ' + (p.desc || '') + ' ' + (p.tag || '')).includes(q);
    const out = cats.map((c) => ({ cat: c, items: prods.filter((p) => p.catId === c.id && match(p)) }));
    const known = new Set(cats.map((c) => c.id));
    const orphans = prods.filter((p) => !known.has(p.catId) && match(p));
    if (orphans.length) out.push({ cat: { id: '_outros', name: 'Outros' }, items: orphans });
    return out.filter((g) => g.items.length);
  }

  function dishCard(p) {
    const avail = Store.available(p);
    const dp = displayPrice(p);
    const lowStock = avail && p.stock !== null && p.stock !== undefined && p.stock <= Math.min(p.minStock || 5, 5);
    const card = h('button', { class: 'dish' + (avail ? '' : ' is-out') + (p.img ? '' : ' no-img'), type: 'button', 'data-id': p.id,
      'aria-label': p.name + (avail ? ', ' + money(dp.value) : ', esgotado') },
      h('span', { class: 'dish-text' },
        h('span', { class: 'dish-name' }, p.name),
        p.desc ? h('span', { class: 'dish-desc' }, p.desc) : '',
        h('span', { class: 'dish-meta' },
          avail
            ? h('span', { class: 'dish-price num' }, dp.from ? h('small', {}, 'a partir de ') : '', money(dp.value))
            : h('span', { class: 'badge badge--err' }, 'Esgotado'),
          p.tag ? h('span', { class: 'badge badge--accent' }, p.tag) : '',
          lowStock ? h('span', { class: 'badge badge--warn' }, 'Últimas ' + p.stock) : '')),
      photo(p, 'dish-ph'),
      avail ? h('span', { class: 'dish-add', 'aria-hidden': 'true' }, '+') : '');
    card.addEventListener('click', () => {
      if (!Store.available(p)) { UI.toast(p.name + ' está esgotado no momento', { tone: 'warn' }); return; }
      openProduct(p.id, card);
    });
    return card;
  }

  function renderList() {
    const gs = groups();
    listEl.innerHTML = '';
    navEl.innerHTML = '';
    const track = h('div', { class: 'espeto-track' });
    navEl.append(h('div', { class: 'espeto-in' }, track, h('span', { class: 'espeto-tip', 'aria-hidden': 'true' })));
    if (!gs.length) {
      const anyProducts = Store.products().length > 0;
      listEl.append(h('div', { class: 'empty' }, art('brasa'),
        h('h2', {}, anyProducts ? 'Nada com “' + query.trim() + '”' : 'Cardápio em preparo'),
        h('p', { class: 'muted' }, anyProducts ? 'Tente outro nome, como “carne”, “x-salada” ou “refri”.' : 'O dono ainda está cadastrando os produtos. Volte daqui a pouco.'),
        anyProducts ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => searchClear.click() }, 'Limpar busca') : ''));
      navEl.hidden = true;
      return;
    }
    navEl.hidden = false;
    gs.forEach(({ cat, items }) => {
      const sid = 'cat-' + cat.id;
      const chip = h('a', { class: 'espeto-chunk', href: '#' + sid, 'data-cat': cat.id }, h('span', {}, cat.name), h('small', { class: 'num' }, items.length));
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const t = document.getElementById(sid);
        if (t) t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        setActive(cat.id);
      });
      track.append(chip);
      listEl.append(h('section', { class: 'cat', id: sid, 'aria-labelledby': sid + '-t' },
        h('h2', { class: 'cat-title', id: sid + '-t' }, h('span', {}, cat.name), h('small', { class: 'num' }, plural(items.length, 'item', 'itens'))),
        h('div', { class: 'dishes' }, items.map(dishCard))));
    });
    setupSpy(gs.map((g) => g.cat.id));
  }

  function setActive(id) {
    if (activeCat === id && navEl.querySelector('.espeto-chunk.is-active')) return;
    activeCat = id;
    navEl.querySelectorAll('.espeto-chunk').forEach((c) => {
      const on = c.dataset.cat === id;
      c.classList.toggle('is-active', on);
      if (on) {
        c.setAttribute('aria-current', 'true');
        const track = c.parentElement;
        const left = c.offsetLeft - track.clientWidth / 2 + c.clientWidth / 2;
        track.scrollTo({ left, behavior: reduceMotion() ? 'auto' : 'smooth' });
      } else c.removeAttribute('aria-current');
    });
  }
  function setupSpy(ids) {
    if (spy) spy.disconnect();
    if (!('IntersectionObserver' in window)) { if (ids[0]) setActive(ids[0]); return; }
    const visible = new Map();
    spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id.slice(4), e.isIntersecting));
      const first = ids.find((id) => visible.get(id));
      if (first) setActive(first);
    }, { rootMargin: '-130px 0px -55% 0px' });
    ids.forEach((id) => { const el = document.getElementById('cat-' + id); if (el) spy.observe(el); });
    setActive(ids.includes(activeCat) ? activeCat : ids[0]);
  }

  /* ---------- barra da comanda ---------- */
  function renderCartBar() {
    const n = Cart.count();
    cartBar.hidden = n === 0;
    document.body.classList.toggle('has-cartbar', n > 0);
    cartBar.innerHTML = '';
    cartBar.append(
      h('span', { class: 'cartbar-count num', 'aria-hidden': 'true' }, n),
      h('span', { class: 'cartbar-label' }, 'Ver comanda', h('small', {}, plural(n, 'item', 'itens'))),
      h('span', { class: 'cartbar-total num' }, money(Cart.subtotal())));
    cartBar.setAttribute('aria-label', 'Ver comanda, ' + plural(n, 'item', 'itens') + ', ' + money(Cart.subtotal()));
  }
  function bumpCart() {
    if (reduceMotion()) return;
    cartBar.classList.remove('is-bump'); void cartBar.offsetWidth; cartBar.classList.add('is-bump');
  }
  function flyToCart(fromEl) {
    if (reduceMotion() || !fromEl || !fromEl.getBoundingClientRect) { bumpCart(); return; }
    const a = fromEl.getBoundingClientRect();
    requestAnimationFrame(() => {
      const b = cartBar.getBoundingClientRect();
      if (!b.width) return;
      const dot = h('span', { class: 'fly', 'aria-hidden': 'true' });
      document.body.append(dot);
      const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
      const x1 = b.left + 34, y1 = b.top + b.height / 2;
      const midY = Math.min(y0, y1) - 90;
      const anim = dot.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
        { transform: `translate(${(x0 + x1) / 2}px, ${midY}px) scale(1.25)`, opacity: 1, offset: .45 },
        { transform: `translate(${x1}px, ${y1}px) scale(.45)`, opacity: .9 }
      ], { duration: 620, easing: 'cubic-bezier(.45,0,.3,1)' });
      anim.onfinish = () => { dot.remove(); bumpCart(); };
    });
  }

  /* ------------------------------------------------------------------
     Folha do produto
     ------------------------------------------------------------------ */
  function groupMode(g) {
    const max = Number(g.max) || 0;
    const n = (g.options || []).length;
    if (max === 1) return 'radio';
    if (g.repeat === true || (max > n && n > 0)) return 'stepper';
    return 'check';
  }
  function groupRule(g) {
    const min = Number(g.min) || 0, max = Number(g.max) || 0;
    if (min > 0 && max === min) return min === 1 ? 'Escolha 1' : 'Escolha ' + min;
    if (min > 0 && max > min) return 'Escolha de ' + min + ' a ' + max;
    if (min > 0) return 'Escolha pelo menos ' + min;
    if (max > 0) return 'Até ' + max;
    return 'Opcional';
  }

  function openProduct(id, originEl) {
    const p = Store.product(id);
    if (!p) return;
    const groupsP = (p.optionGroups || []).filter((g) => g.options && g.options.length);
    const removable = (p.ingredients || []).filter((i) => i && i.removable);
    const sel = {};            // groupId -> { optionId: qty }
    groupsP.forEach((g) => { sel[g.id] = {}; });
    const removed = new Set();
    let qty = 1;

    const count = (g) => Object.values(sel[g.id]).reduce((s, v) => s + v, 0);
    const maxOf = (g) => Number(g.max) || Infinity;
    const valid = (g) => count(g) >= (Number(g.min) || 0) && count(g) <= maxOf(g);
    const optTotal = () => groupsP.reduce((s, g) => s + g.options.reduce((t, o) => t + (Number(o.price) || 0) * (sel[g.id][o.id] || 0), 0), 0);
    const unit = () => (Number(p.price) || 0) + optTotal();

    const body = h('div', { class: 'pd' });
    const qtyOut = h('output', { class: 'qty-val num', 'aria-live': 'polite' }, '1');
    const priceOut = h('span', { class: 'num' });
    const addBtn = h('button', { class: 'btn btn--primary pd-add', type: 'button' }, h('span', {}, 'Adicionar'), priceOut);
    const hint = h('p', { class: 'pd-hint', 'aria-live': 'polite' });
    const groupEls = {};

    // cabeçalho visual
    body.append(photo(p, 'pd-ph'),
      h('div', { class: 'pd-head' },
        h('h3', { class: 'pd-name' }, p.name),
        p.desc ? h('p', { class: 'pd-desc' }, p.desc) : '',
        h('div', { class: 'row' },
          h('span', { class: 'pd-base num' }, Number(p.price) > 0 ? money(p.price) : 'Monte o seu'),
          p.tag ? h('span', { class: 'badge badge--accent' }, p.tag) : '')));

    // grupos de opções
    groupsP.forEach((g) => {
      const mode = groupMode(g);
      const req = (Number(g.min) || 0) > 0;
      const counter = h('span', { class: 'og-count num' });
      const list = h('div', { class: 'og-list', role: mode === 'radio' ? 'radiogroup' : 'group', 'aria-label': g.name });
      const sec = h('fieldset', { class: 'og' },
        h('legend', { class: 'og-head' },
          h('span', { class: 'og-name' }, g.name),
          h('span', { class: 'og-rule' }, groupRule(g)),
          req ? h('span', { class: 'badge badge--accent og-req' }, 'Obrigatório') : h('span', { class: 'og-opt' }, 'Opcional'),
          counter),
        list);
      groupEls[g.id] = { sec, counter, list, g, mode };

      g.options.forEach((o) => {
        const price = Number(o.price) || 0;
        const priceTxt = price > 0 ? '+ ' + money(price) : (mode === 'radio' ? '' : 'grátis');
        const inputId = 'opt-' + p.id + '-' + g.id + '-' + o.id;
        if (mode === 'stepper') {
          const val = h('output', { class: 'num' }, '0');
          const minus = h('button', { class: 'step', type: 'button', 'aria-label': 'Menos ' + o.name }, '−');
          const plus = h('button', { class: 'step', type: 'button', 'aria-label': 'Mais ' + o.name }, '+');
          const row = h('div', { class: 'opt opt--step' },
            h('span', { class: 'opt-name' }, o.name, priceTxt ? h('small', { class: 'num' }, priceTxt) : ''),
            h('span', { class: 'stepper stepper--sm' }, minus, val, plus));
          minus.addEventListener('click', () => { const v = sel[g.id][o.id] || 0; if (v > 0) { sel[g.id][o.id] = v - 1; update(); } });
          plus.addEventListener('click', () => {
            if (count(g) >= maxOf(g)) { nudge(g, 'Máximo de ' + g.max + ' em ' + g.name); return; }
            sel[g.id][o.id] = (sel[g.id][o.id] || 0) + 1; update();
          });
          row._sync = () => { const v = sel[g.id][o.id] || 0; val.textContent = v; row.classList.toggle('is-on', v > 0); minus.disabled = v === 0; plus.disabled = count(g) >= maxOf(g); };
          list.append(row);
        } else {
          const input = h('input', { type: mode === 'radio' ? 'radio' : 'checkbox', id: inputId, name: 'g-' + p.id + '-' + g.id, value: o.id, class: 'opt-input' });
          const row = h('label', { class: 'opt opt--' + mode, for: inputId }, input,
            h('span', { class: 'opt-mark', 'aria-hidden': 'true' }),
            h('span', { class: 'opt-name' }, o.name),
            priceTxt ? h('span', { class: 'opt-price num' }, priceTxt) : '');
          input.addEventListener('change', () => {
            if (mode === 'radio') { sel[g.id] = {}; sel[g.id][o.id] = 1; }
            else if (input.checked) {
              if (count(g) >= maxOf(g)) { input.checked = false; nudge(g, 'Máximo de ' + g.max + ' em ' + g.name); return; }
              sel[g.id][o.id] = 1;
            } else delete sel[g.id][o.id];
            update();
          });
          row._sync = () => { const on = !!sel[g.id][o.id]; input.checked = on; row.classList.toggle('is-on', on);
            if (mode === 'check') { const full = !on && count(g) >= maxOf(g); row.classList.toggle('is-full', full); } };
          list.append(row);
        }
      });
      body.append(sec);
    });

    // retirar ingredientes
    if (removable.length) {
      const list = h('div', { class: 'ing-list' });
      removable.forEach((ing) => {
        const b = h('button', { class: 'ing', type: 'button', 'aria-pressed': 'false' }, h('span', {}, ing.name));
        b.addEventListener('click', () => {
          if (removed.has(ing.name)) removed.delete(ing.name); else removed.add(ing.name);
          const on = removed.has(ing.name);
          b.setAttribute('aria-pressed', String(on));
          b.firstChild.textContent = on ? 'Sem ' + ing.name.toLowerCase() : ing.name;
        });
        list.append(b);
      });
      body.append(h('fieldset', { class: 'og og--ing' },
        h('legend', { class: 'og-head' }, h('span', { class: 'og-name' }, 'Retirar ingredientes'), h('span', { class: 'og-rule' }, 'Toque no que você não quer')),
        list));
    }

    // observação
    const noteId = 'note-' + p.id;
    const note = h('textarea', { class: 'input', id: noteId, rows: '2', maxlength: '140', placeholder: 'Ex.: carne bem passada, molho à parte' });
    body.append(h('label', { class: 'field pd-note', for: noteId }, h('span', {}, 'Alguma observação?'), note));

    // rodapé: quantidade + adicionar
    const minus = h('button', { class: 'step', type: 'button', 'aria-label': 'Diminuir quantidade' }, '−');
    const plus = h('button', { class: 'step', type: 'button', 'aria-label': 'Aumentar quantidade' }, '+');
    minus.addEventListener('click', () => { if (qty > 1) { qty--; update(); } });
    plus.addEventListener('click', () => {
      if (p.stock !== null && p.stock !== undefined && qty >= p.stock) { UI.toast('Só temos ' + p.stock + ' em estoque', { tone: 'warn' }); return; }
      qty++; update();
    });
    const foot = h('div', { class: 'pd-foot' }, hint, h('div', { class: 'pd-foot-row' }, h('span', { class: 'stepper' }, minus, qtyOut, plus), addBtn));

    function nudge(g, msg) {
      const ge = groupEls[g.id];
      if (msg) UI.toast(msg, { tone: 'warn', ms: 1800 });
      if (!ge || reduceMotion()) return;
      ge.sec.classList.remove('is-nudge'); void ge.sec.offsetWidth; ge.sec.classList.add('is-nudge');
    }
    function update() {
      const missing = groupsP.filter((g) => !valid(g));
      Object.values(groupEls).forEach(({ list, counter, g }) => {
        [...list.children].forEach((r) => r._sync && r._sync());
        const c = count(g), max = Number(g.max) || 0;
        counter.textContent = max > 0 ? c + '/' + max : (c ? String(c) : '');
        groupEls[g.id].sec.classList.toggle('is-done', valid(g) && (Number(g.min) || 0) > 0);
      });
      qtyOut.textContent = qty;
      minus.disabled = qty <= 1;
      priceOut.textContent = money(unit() * qty);
      addBtn.setAttribute('aria-disabled', missing.length ? 'true' : 'false');
      hint.textContent = missing.length ? 'Falta escolher: ' + missing.map((g) => g.name).join(', ') : '';
      hint.hidden = !missing.length;
    }

    addBtn.addEventListener('click', () => {
      const missing = groupsP.filter((g) => !valid(g));
      if (missing.length) {
        const ge = groupEls[missing[0].id];
        ge.sec.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
        nudge(missing[0]);
        return;
      }
      const options = [];
      groupsP.forEach((g) => g.options.forEach((o) => {
        const q = sel[g.id][o.id] || 0;
        if (q > 0) options.push({ group: g.name, name: o.name, price: Number(o.price) || 0, qty: q });
      }));
      Cart.add({ productId: p.id, name: p.name, img: p.img || '', qty, unitPrice: Number(p.price) || 0, options, removed: [...removed], note: note.value.trim() });
      const rect = addBtn.getBoundingClientRect();
      const ghost = { getBoundingClientRect: () => rect };
      sheet.close();
      flyToCart(ghost);
      UI.toast(plural(qty, 'item adicionado', 'itens adicionados') + ' à comanda');
    });

    const sheet = UI.openSheet({ title: '', content: body, footer: foot, size: 'md', className: 'sheet--product' });
    sheet.el.setAttribute('aria-label', p.name);
    update();
    return sheet;
  }

  /* ------------------------------------------------------------------
     Comanda (carrinho)
     ------------------------------------------------------------------ */
  let cartSheet = null;
  function openCart() {
    if (cartSheet) return cartSheet;
    const body = h('div', { class: 'comanda' });
    const foot = h('div', { class: 'comanda-foot' });
    cartSheet = UI.openSheet({ title: 'Sua comanda', content: body, footer: foot, size: 'md', className: 'sheet--cart',
      onClose: () => { unsub(); cartSheet = null; } });
    const draw = () => drawCart(body, foot);
    const unsub = Cart.subscribe(draw);
    draw();
    return cartSheet;
  }

  function drawCart(body, foot) {
    const s = Store.info() || {};
    const items = Cart.items();
    const sub = Cart.subtotal();
    const fee = Number(s.deliveryFee) || 0;
    const min = Number(s.minOrder) || 0;
    const st = status();
    body.innerHTML = ''; foot.innerHTML = '';

    if (!items.length) {
      body.append(h('div', { class: 'empty empty--cart' }, art('espeto'),
        h('h3', {}, 'Comanda vazia'),
        h('p', { class: 'muted' }, 'Escolha um espetinho ou um lanche para começar.')));
      foot.append(h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => cartSheet && cartSheet.close() }, 'Ver cardápio'));
      return;
    }

    const now = new Date();
    body.append(h('div', { class: 'comanda-head', 'aria-hidden': 'true' },
      h('span', {}, (s.name || 'Spetitos')), h('span', { class: 'num' }, now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))));

    const list = h('ul', { class: 'comanda-list' });
    items.forEach((it) => {
      const details = [];
      (it.options || []).forEach((o) => details.push((o.qty > 1 ? o.qty + '× ' : '') + o.name + (o.price ? ' (+' + money(o.price * (o.qty || 1)) + ')' : '')));
      (it.removed || []).forEach((r) => details.push('sem ' + String(r).toLowerCase()));
      const p = Store.product(it.productId);
      const out = p && !Store.available(p);
      const minus = h('button', { class: 'step', type: 'button', 'aria-label': it.qty > 1 ? 'Diminuir ' + it.name : 'Remover ' + it.name }, it.qty > 1 ? '−' : h('span', { class: 'trash', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>' }));
      const plus = h('button', { class: 'step', type: 'button', 'aria-label': 'Aumentar ' + it.name }, '+');
      minus.addEventListener('click', () => Cart.setQty(it.key, it.qty - 1));
      plus.addEventListener('click', () => {
        if (p && p.stock !== null && p.stock !== undefined && it.qty >= p.stock) { UI.toast('Só temos ' + p.stock + ' em estoque', { tone: 'warn' }); return; }
        Cart.setQty(it.key, it.qty + 1);
      });
      list.append(h('li', { class: 'cl' + (out ? ' is-out' : '') },
        h('div', { class: 'cl-main' },
          h('span', { class: 'cl-qty num' }, it.qty + '×'),
          h('div', { class: 'cl-text' },
            h('strong', { class: 'cl-name' }, it.name),
            details.length ? h('span', { class: 'cl-det' }, details.join(', ')) : '',
            it.note ? h('span', { class: 'cl-note' }, 'Obs.: ' + it.note) : '',
            out ? h('span', { class: 'badge badge--err' }, 'Esgotou, remova para continuar') : ''),
          h('span', { class: 'cl-price num' }, money(Store.linePrice(it)))),
        h('div', { class: 'cl-actions' },
          h('span', { class: 'stepper stepper--sm' }, minus, h('output', { class: 'num' }, it.qty), plus),
          h('button', { class: 'cl-remove', type: 'button', onclick: () => { Cart.remove(it.key); UI.toast(it.name + ' removido', { tone: 'warn', ms: 1800 }); } }, 'Remover'))));
    });
    body.append(list);

    const totals = h('dl', { class: 'comanda-totals' },
      h('div', {}, h('dt', {}, 'Subtotal'), h('dd', { class: 'num' }, money(sub))),
      h('div', {}, h('dt', {}, 'Entrega'), h('dd', { class: 'num' }, fee > 0 ? money(fee) : 'Grátis')),
      h('div', { class: 'is-total' }, h('dt', {}, 'Total'), h('dd', { class: 'num' }, money(sub + fee))));
    body.append(totals);

    const below = min > 0 && sub < min;
    const hasOut = items.some((it) => { const p = Store.product(it.productId); return p && !Store.available(p); });
    if (below) {
      const pct = Math.max(4, Math.min(100, (sub / min) * 100));
      body.append(h('div', { class: 'notice notice--warn' },
        h('p', {}, 'Faltam ', h('strong', { class: 'num' }, money(min - sub)), ' para o pedido mínimo de ', h('span', { class: 'num' }, money(min)), '.'),
        h('span', { class: 'meter', 'aria-hidden': 'true' }, h('i', { style: 'width:' + pct + '%' }))));
    }
    if (!st.open && st.known) {
      body.append(h('div', { class: 'notice' }, h('p', {}, 'Estamos fechados agora.' + (st.sub && /^abre /.test(st.sub) ? ' Abrimos ' + st.sub.slice(5) + ', e seu pedido entra na fila para esse horário.' : ' Seu pedido entra na fila para quando a brasa acender.'))));
    }

    const go = h('button', { class: 'btn btn--primary', type: 'button', disabled: below || hasOut },
      h('span', {}, 'Finalizar pedido'), h('span', { class: 'num' }, money(sub + fee)));
    go.addEventListener('click', () => {
      if (!window.Checkout || typeof window.Checkout.open !== 'function') { UI.toast('O pagamento ainda não está disponível. Tente de novo em instantes.', { tone: 'err' }); return; }
      if (cartSheet) cartSheet.close();
      setTimeout(() => window.Checkout.open(), 120);
    });
    foot.append(h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => cartSheet && cartSheet.close() }, 'Continuar escolhendo'), go);
  }

  /* ------------------------------------------------------------------
     Rodapé
     ------------------------------------------------------------------ */
  function renderFooter() {
    if (!footer) return;
    const s = Store.info() || {};
    footer.innerHTML = '';
    const digits = (v) => String(v || '').replace(/\D/g, '');
    const rows = [];
    const copyRow = (label, value, extra) => h('div', { class: 'ft-row' },
      h('dt', {}, label),
      h('dd', {}, h('span', { class: 'ft-val num' }, value),
        h('span', { class: 'ft-acts' },
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => UI.copy(value) }, 'Copiar'),
          extra || '')));
    if (s.address) rows.push(copyRow('Endereço', s.address));
    if (s.phone) rows.push(copyRow('Telefone', s.phone));
    if (s.whatsapp) {
      let d = digits(s.whatsapp); if (d.length <= 11) d = '55' + d;
      rows.push(copyRow('WhatsApp', s.whatsapp, h('a', { class: 'btn btn--ghost btn--sm', href: 'https://wa.me/' + d, target: '_blank', rel: 'noopener' }, 'Abrir conversa')));
    }
    const ht = hoursText(s.hours);
    if (ht) rows.push(h('div', { class: 'ft-row' }, h('dt', {}, 'Horário'), h('dd', {}, h('span', { class: 'ft-val ft-hours num' }, ht))));
    const st = status();
    footer.append(h('div', { class: 'ft-in' },
      h('div', { class: 'ft-brand' },
        h('p', { class: 'ft-name' }, s.name || 'Spetitos Lanches'),
        s.slogan ? h('p', { class: 'muted' }, s.slogan) : '',
        h('p', { class: 'ft-status ' + (st.open ? 'is-open' : 'is-shut') }, st.label + (st.sub ? ', ' + st.sub : ''))),
      rows.length ? h('dl', { class: 'ft-info' }, rows) : '',
      h('div', { class: 'ft-base' },
        h('span', { class: 'muted' }, '© ' + new Date().getFullYear() + ' ' + (s.name || 'Spetitos Lanches')),
        h('button', { class: 'ft-owner', type: 'button', onclick: () => { if (window.Admin && typeof window.Admin.open === 'function') window.Admin.open(); else UI.toast('Painel indisponível no momento', { tone: 'warn' }); } }, 'Painel do dono'))));
  }

  /* ------------------------------------------------------------------ */
  function render() { renderHero(); renderList(); renderCartBar(); renderFooter(); }

  let raf = 0;
  Store.subscribe(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { renderHero(); renderList(); renderCartBar(); renderFooter(); }); });
  Cart.subscribe(renderCartBar);
  setInterval(() => { renderHero(); renderFooter(); }, 60000);

  render();
  window.Menu = { render, openProduct, openCart, status, isOpen: () => status().open, art, kindOf };
})();
