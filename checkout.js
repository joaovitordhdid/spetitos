/* Spetitos — Checkout (dono: agente de pagamento).
   API pública: window.Checkout = { open(), pixPayload(opts), validCPF(cpf), onlinePayment }
   Fluxo: uma tela só, em seções que se fecham ao completar:
     Entrega ou Retirada → 1 Seus dados → 2 Endereço (só entrega) / Retirada → 3 Pagamento
   Barra fixa embaixo com progresso, total e o botão principal. Depois: Confirmação
   (status ao vivo, QR PIX, NFC-e). Depende de: Store, Cart, UI, Fiscal. Visual em checkout.css. */
(function () {
  const h = (...a) => UI.h(...a);
  const money = (v) => Store.money(v);
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const CUSTOMER_KEY = 'spetitos:customer';
  const QR_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

  /* ---------------- Dados lembrados do cliente ---------------- */
  function loadCustomer() { try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null') || {}; } catch (e) { return {}; } }
  function saveCustomer(d) { try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------------- Máscaras e validações ---------------- */
  function maskCPF(v) {
    const d = digits(v).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  function maskPhone(v) {
    const d = digits(v).slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  function validCPF(v) {
    const d = digits(v);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const dv = (len) => {
      let s = 0;
      for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
      const r = (s * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  function parseMoney(v) {
    const s = String(v || '').replace(/[^\d,.]/g, '');
    if (!s) return NaN;
    const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s; // "1.234,56" → 1234.56
    return Number(norm);
  }

  const rules = {
    name(v) {
      const t = v.trim().replace(/\s+/g, ' ');
      if (!t) return 'Digite seu nome completo.';
      if (/\d/.test(t)) return 'O nome não pode ter números.';
      if (t.split(' ').filter((p) => p.length >= 2).length < 2) return 'Digite nome e sobrenome.';
      return '';
    },
    cpf(v) {
      const d = digits(v);
      if (!d) return 'Digite seu CPF. Ele vai na nota fiscal.';
      if (d.length < 11) return 'O CPF tem 11 números. Confira o que falta.';
      if (!validCPF(d)) return 'Esse CPF não existe. Confira os números.';
      return '';
    },
    phone(v) {
      const d = digits(v);
      if (!d) return 'Digite um telefone ou WhatsApp para contato.';
      if (d.length < 10) return 'Digite o DDD e o número. Ex.: (71) 98765-4321.';
      if (Number(d.slice(0, 2)) < 11) return 'Esse DDD não existe. Confira os dois primeiros números.';
      return '';
    }
  };

  /* ---------------- PIX "copia e cola" (BR Code estático, padrão EMV do Banco Central) ---------------- */
  const tlv = (id, val) => id + String(val.length).padStart(2, '0') + val;
  function crc16(str) { // CRC16-CCITT-FALSE: polinômio 0x1021, valor inicial 0xFFFF
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  const plain = (s, max) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  /* Chave PIX: e-mail em minúsculas, celular +55DDDNUMERO, CPF/CNPJ só números, chave aleatória como está. */
  function normalizePixKey(k) {
    const s = String(k || '').trim();
    if (!s) return '';
    if (s.includes('@')) return s.toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s.toLowerCase();
    const d = digits(s);
    if (s.startsWith('+')) return '+' + d;
    if (d.length === 14) return d;                                       // CNPJ
    if (d.length === 11 && validCPF(d) && !/[()\s]/.test(s)) return d;   // CPF (celular costuma vir com DDD entre parênteses)
    if (d.length === 10 || d.length === 11) return '+55' + d;            // celular/fixo
    if (d.length === 13 && d.startsWith('55')) return '+' + d;
    return s;
  }
  function pixPayload({ key, name, city, amount, txid }) {
    const gui = tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizePixKey(key));
    const tx = (String(txid || '***').replace(/[^A-Za-z0-9]/g, '') || '***').slice(0, 25);
    const p = tlv('00', '01') + tlv('26', gui) + tlv('52', '0000') + tlv('53', '986') +
      (amount > 0 ? tlv('54', Number(amount).toFixed(2)) : '') +
      tlv('58', 'BR') + tlv('59', plain(name, 25) || 'SPETITOS LANCHES') + tlv('60', plain(city, 15) || 'SALVADOR') +
      tlv('62', tlv('05', tx)) + '6304';
    return p + crc16(p);
  }

  let qrPromise = null;
  function loadQR() {
    if (window.QRCode) return Promise.resolve(window.QRCode);
    if (qrPromise) return qrPromise;
    qrPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = QR_SRC; s.async = true;
      s.onload = () => (window.QRCode ? resolve(window.QRCode) : reject(new Error('QR indisponível')));
      s.onerror = () => { qrPromise = null; reject(new Error('QR indisponível')); };
      document.head.append(s);
    });
    return qrPromise;
  }
  function renderQR(box, text) {
    box.textContent = 'Gerando QR Code…';
    /* Cores fixas de propósito: leitores de QR precisam de módulos escuros sobre fundo claro
       (com zona de silêncio clara) nos dois temas. Não são cores de tema. */
    box.style.background = '#ffffff'; box.style.color = '#000000';
    loadQR().then((QRCode) => {
      box.textContent = '';
      new QRCode(box, { text, width: 216, height: 216, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      const img = box.querySelector('img'); if (img) img.alt = 'QR Code PIX';
    }).catch(() => { box.textContent = 'Não deu para mostrar o QR Code agora. Use o código copia e cola abaixo.'; });
  }

  /* ---------------- Pagamento online (cartão via gateway) — PONTO DE INTEGRAÇÃO ----------------
     NÃO IMPLEMENTADO. Para cobrar cartão online (Mercado Pago Checkout Bricks / Pagar.me):
       1. Crie uma função serverless que guarda o access token do gateway (nunca no navegador).
       2. Ela cria a preferência/cobrança com o total do pedido e devolve um id ou URL de pagamento.
       3. Atribua: Checkout.onlinePayment = async (order) => ({ status: 'aprovado'|'pendente'|'recusado', id, url })
       4. Adicione um bloco { id: 'online', method: 'online', ... } em TILES. Quando onlinePayment existir,
          confirm() chama o gateway depois de Store.createOrder e grava Store.updateOrder(order.id, { paymentResult }).
     Webhook do gateway → backend → Store.updateOrder (marcar pago) mantém o painel do dono em dia. */
  const Checkout = { onlinePayment: null };

  /* ---------------- Ícones (traço em currentColor) ---------------- */
  const svg = (paths, vb = '0 0 24 24') => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', vb); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'co-ico');
    s.innerHTML = paths; return s;
  };
  const ICONS = {
    entrega: '<circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><path d="M8.6 17h6.8M4 13.5 7 9h5l2 4.5M14 13.5l1.5-6H19"/><path d="M2.5 9h5"/>',
    retirada: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    pix: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M8 12h8"/>',
    credito: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 9.5h19M6 15h4"/>',
    debito: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M6 10h3v3H6zM13 15h5"/>',
    dinheiro: '<rect x="2.5" y="6.5" width="19" height="11" rx="1.8"/><circle cx="12" cy="12" r="2.6"/><path d="M5.5 9.5v5M18.5 9.5v5"/>',
    pin: '<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>'
  };
  const icon = (k) => svg(ICONS[k]);

  const TILES = [
    { id: 'pix', method: 'pix', title: 'PIX', badge: 'Mais rápido', desc: () => 'QR Code ou copia e cola após confirmar' },
    { id: 'credito', method: 'cartao', cardType: 'credito', title: 'Crédito', desc: (m) => m === 'retirada' ? 'Na maquininha, no balcão' : 'Na maquininha, na entrega' },
    { id: 'debito', method: 'cartao', cardType: 'debito', title: 'Débito', desc: (m) => m === 'retirada' ? 'Na maquininha, no balcão' : 'Na maquininha, na entrega' },
    { id: 'dinheiro', method: 'dinheiro', title: 'Dinheiro', desc: (m) => m === 'retirada' ? 'Pague no balcão' : 'Pague ao entregador' }
  ];
  const STATUS = {
    entrega: [['recebido', 'Pedido recebido'], ['preparo', 'Em preparo'], ['saiu', 'Saiu para entrega'], ['entregue', 'Entregue']],
    retirada: [['recebido', 'Pedido recebido'], ['preparo', 'Em preparo'], ['saiu', 'Pronto para retirar'], ['entregue', 'Retirado']]
  };

  /* Tempo de retirada: usa pickupMin/pickupMax da loja se existirem; senão, um pouco menos que a entrega */
  function pickupEta(info) {
    const a = Number(info.pickupMin) || Math.max(10, (Number(info.etaMin) || 30) - 15);
    const b = Number(info.pickupMax) || Math.max(a + 5, (Number(info.etaMax) || 50) - 20);
    return [a, b];
  }

  /* ---------------- Componentes de formulário ---------------- */
  function field({ id, label, hint, optional, input }) {
    const err = h('p', { class: 'co-err', id: id + '-err', hidden: true });
    input.id = id;
    input.classList.add('input');
    input.setAttribute('aria-describedby', [hint ? id + '-hint' : '', id + '-err'].filter(Boolean).join(' '));
    const wrap = h('div', { class: 'field co-field' },
      h('label', { for: id, class: 'co-label' }, label, optional ? h('span', { class: 'co-opt' }, ' (opcional)') : ''),
      input,
      hint ? h('p', { class: 'co-hint', id: id + '-hint' }, hint) : '',
      err);
    return { wrap, input, err };
  }
  function setErr(f, msg) {
    f.err.textContent = msg || '';
    f.err.hidden = !msg;
    f.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    f.wrap.classList.toggle('is-invalid', !!msg);
  }

  /* ---------------- Abrir checkout ---------------- */
  let current = null;

  function open() {
    if (current) { try { current.sheet.close(); } catch (e) {} }
    const info = Store.info() || {};
    const items = Cart.items();
    const subtotal = Cart.subtotal();
    const minOrder = Number(info.minOrder) || 0;

    if (!items.length || subtotal < minOrder) {
      const empty = !items.length;
      const back = h('button', { class: 'btn btn--primary co-wide', type: 'button', id: 'co-back-menu' }, 'Voltar ao cardápio');
      const s = UI.openSheet({
        title: empty ? 'Sua sacola está vazia' : 'Falta pouco para o pedido mínimo',
        size: 'sm', className: 'co-sheet',
        content: h('div', { class: 'co-block-msg stack' },
          h('p', {}, empty
            ? 'Escolha seus espetinhos e lanches no cardápio para fazer o pedido.'
            : `O pedido mínimo é ${money(minOrder)}. Sua sacola está em ${money(subtotal)}. Adicione mais ${money(minOrder - subtotal)} para continuar.`)),
        footer: back
      });
      back.addEventListener('click', s.close);
      return s;
    }

    const saved = loadCustomer();
    const savedTile = saved.tile || (saved.method === 'cartao' ? (saved.cardType === 'debito' ? 'debito' : 'credito') : saved.method);
    const st = {
      mode: saved.fulfillment === 'retirada' ? 'retirada' : 'entrega',
      name: saved.name || '', cpf: saved.cpf || '', phone: saved.phone || '',
      geo: null, geoState: 'idle', geoMsg: '', manual: saved.addrSource === 'manual',
      street: saved.street || '', number: saved.number || '', complement: saved.complement || '',
      district: saved.district || '', reference: saved.reference || '',
      tile: info.pixKey ? 'pix' : (savedTile && savedTile !== 'pix' ? savedTile : 'credito'),
      changeFor: '', noChange: false,
      open: 'data', done: { data: false, addr: false, pay: false }
    };
    if (savedTile && savedTile !== 'pix' && TILES.some((t) => t.id === savedTile)) st.tile = savedTile;
    const returning = !!(saved.name && saved.cpf && saved.phone);

    const fee = () => (st.mode === 'retirada' ? 0 : Number(info.deliveryFee) || 0);
    const totals = () => { const sub = Cart.subtotal(); const f = fee(); return { sub, fee: f, total: Math.round((sub + f) * 100) / 100 }; };

    /* ---- estrutura ---- */
    const form = h('form', { class: 'co-form', id: 'co-form', novalidate: true, autocomplete: 'on' });
    const summary = buildSummary(info, totals);
    const layout = h('div', { class: 'co-layout' }, h('div', { class: 'co-col' }, form), summary.el);

    const progress = h('div', { class: 'co-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '3', 'aria-label': 'Etapas concluídas' },
      h('span', { class: 'co-progress-seg' }), h('span', { class: 'co-progress-seg' }), h('span', { class: 'co-progress-seg' }));
    const barTotalLbl = h('span', { class: 'co-bar-lbl' });
    const barTotal = h('span', { class: 'co-bar-total' });
    const mainBtn = h('button', { class: 'btn btn--primary co-main', type: 'submit', form: 'co-form', id: 'co-next' }, 'Continuar');
    const footer = h('div', { class: 'co-bar' },
      progress,
      h('div', { class: 'co-bar-row' }, h('div', { class: 'co-bar-sum' }, barTotalLbl, barTotal), mainBtn));

    const sheet = UI.openSheet({
      title: 'Finalizar pedido', size: 'lg', className: 'co-sheet',
      content: layout, footer,
      onClose() { if (current && current.unsub) current.unsub(); current = null; }
    });
    current = { sheet, st, unsub: null };

    /* ---- Entrega ou retirada ---- */
    const modeSeg = h('div', { class: 'co-mode', role: 'radiogroup', 'aria-label': 'Como você quer receber?' });
    [['entrega', 'Entrega', () => `${money(Number(info.deliveryFee) || 0)} · ${info.etaMin || 30}–${info.etaMax || 50} min`],
     ['retirada', 'Retirada no balcão', () => { const [a, b] = pickupEta(info); return `Grátis · pronto em ${a}–${b} min`; }]].forEach(([id, label, sub]) => {
      const r = h('input', { type: 'radio', name: 'co-mode', id: 'co-mode-' + id, value: id, class: 'co-sr' });
      r.checked = st.mode === id;
      r.addEventListener('change', () => { st.mode = id; onModeChange(); });
      modeSeg.append(h('label', { class: 'co-mode-opt', for: r.id }, r, icon(id),
        h('span', { class: 'co-mode-txt' }, h('span', { class: 'co-mode-title' }, label), h('span', { class: 'co-mode-sub' }, sub()))));
    });
    form.append(h('div', { class: 'co-mode-wrap' }, h('p', { class: 'co-lead', id: 'co-mode-lbl' }, 'Como você quer receber?'), modeSeg));

    /* ---- seções ---- */
    const sections = {};
    function section(id, n, title) {
      const marker = h('span', { class: 'co-sec-n', 'aria-hidden': 'true' }, String(n));
      const titleEl = h('span', { class: 'co-sec-title' }, title);
      const sumEl = h('span', { class: 'co-sec-sum' });
      const edit = h('span', { class: 'co-sec-edit' }, 'Alterar');
      const head = h('button', { type: 'button', class: 'co-sec-head', id: 'co-sec-' + id + '-head', 'aria-controls': 'co-sec-' + id + '-body' },
        marker, h('span', { class: 'co-sec-txt' }, titleEl, sumEl), edit);
      const body = h('div', { class: 'co-sec-body stack', id: 'co-sec-' + id + '-body' });
      const el = h('section', { class: 'co-sec', id: 'co-sec-' + id, 'aria-labelledby': head.id }, head, body);
      head.addEventListener('click', () => { if (st.open !== id) openSection(id, true); });
      sections[id] = { id, el, head, body, marker, titleEl, sumEl };
      form.append(el);
      return sections[id];
    }

    const sData = section('data', 1, 'Seus dados');
    const sAddr = section('addr', 2, 'Endereço de entrega');
    const sPay = section('pay', 3, 'Pagamento');
    const ORDER = ['data', 'addr', 'pay'];

    const data = buildData(sData.body);
    const addr = buildAddr(sAddr.body);
    const pay = buildPay(sPay.body);
    const api = { data, addr, pay };

    function openSection(id, focus) {
      st.open = id;
      paint();
      const s = sections[id];
      if (focus) {
        try { s.el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } catch (e) {}
        const first = [...s.body.querySelectorAll('input:not([disabled]):not([type=hidden]):not(.co-sr), button.co-gps')].find((i) => i.type === 'radio' ? false : !i.value || i.tagName === 'BUTTON');
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 220);
      }
    }
    function nextOpen() { return ORDER.find((k) => !st.done[k]) || 'pay'; }

    function paint() {
      ORDER.forEach((k, i) => {
        const s = sections[k];
        const isOpen = st.open === k;
        s.el.classList.toggle('is-open', isOpen);
        s.el.classList.toggle('is-done', st.done[k] && !isOpen);
        s.body.hidden = !isOpen;
        s.head.setAttribute('aria-expanded', String(isOpen));
        s.marker.textContent = st.done[k] && !isOpen ? '✓' : String(i + 1);
        s.sumEl.textContent = isOpen ? '' : (st.done[k] ? api[k].summary() : 'Falta preencher');
      });
      sAddr.titleEl.textContent = st.mode === 'retirada' ? 'Retirada no balcão' : 'Endereço de entrega';
      const n = ORDER.filter((k) => st.done[k]).length;
      progress.setAttribute('aria-valuenow', String(n));
      progress.querySelectorAll('.co-progress-seg').forEach((seg, i) => seg.classList.toggle('is-on', i < n));
      const t = totals();
      barTotalLbl.textContent = st.mode === 'retirada' ? 'Total · retirada' : 'Total com entrega';
      barTotal.textContent = money(t.total);
      const lastStep = ORDER.every((k) => k === st.open || st.done[k]);
      mainBtn.textContent = lastStep ? 'Confirmar pedido' : 'Continuar';
      mainBtn.classList.toggle('is-final', lastStep);
      summary.update(st);
    }

    function onModeChange() {
      addr.onMode();
      pay.onMode();
      st.done.addr = addr.check(true);
      if (st.open === 'addr' && st.done.addr && st.mode === 'retirada') st.open = nextOpen();
      paint();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = st.open;
      if (!api[cur].check(false)) { st.done[cur] = false; paint(); api[cur].focusErr(); return; }
      st.done[cur] = true;
      const pending = ORDER.find((k) => !st.done[k] || (k !== cur && !api[k].check(true)));
      if (pending) { st.done[pending] = false; openSection(pending, true); return; }
      confirm();
    });

    /* ---- 1. Seus dados ---- */
    function buildData(body) {
      const fName = field({ id: 'co-name', label: 'Nome completo',
        input: h('input', { type: 'text', autocomplete: 'name', autocapitalize: 'words', enterkeyhint: 'next', value: st.name }) });
      const fCpf = field({ id: 'co-cpf', label: 'CPF', hint: 'Vai na nota fiscal do pedido.',
        input: h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: '000.000.000-00', maxlength: '14', enterkeyhint: 'next', value: maskCPF(st.cpf) }) });
      const fPhone = field({ id: 'co-phone', label: 'Telefone ou WhatsApp', hint: 'Só para falar sobre este pedido.',
        input: h('input', { type: 'tel', inputmode: 'numeric', autocomplete: 'tel-national', placeholder: '(00) 00000-0000', maxlength: '15', enterkeyhint: 'next', value: maskPhone(st.phone) }) });
      const list = [[fName, 'name'], [fCpf, 'cpf'], [fPhone, 'phone']];
      const one = (f, k, silent) => { const m = rules[k](f.input.value); if (!silent) setErr(f, m); return !m; };

      fCpf.input.addEventListener('input', () => { fCpf.input.value = maskCPF(fCpf.input.value); if (digits(fCpf.input.value).length === 11) one(fCpf, 'cpf'); });
      fPhone.input.addEventListener('input', () => { fPhone.input.value = maskPhone(fPhone.input.value); });
      list.forEach(([f, k]) => {
        f.input.addEventListener('blur', () => { if (f.input.value) one(f, k); });
        f.input.addEventListener('input', () => { if (f.wrap.classList.contains('is-invalid')) one(f, k); });
      });
      // "Enter" no último campo avança; nos outros, vai para o próximo campo
      [fName, fCpf].forEach((f, i) => f.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); list[i + 1][0].input.focus(); }
      }));

      if (returning) body.append(h('p', { class: 'co-welcome' }, `Que bom te ver de novo, ${st.name.split(' ')[0]}! Seus dados já estão preenchidos.`));
      body.append(fName.wrap, h('div', { class: 'co-grid2 co-grid2--even' }, fCpf.wrap, fPhone.wrap));

      return {
        check(silent) {
          const ok = list.map(([f, k]) => one(f, k, silent)).every(Boolean);
          st.name = fName.input.value.trim().replace(/\s+/g, ' ');
          st.cpf = maskCPF(fCpf.input.value);
          st.phone = maskPhone(fPhone.input.value);
          return ok;
        },
        focusErr() { const f = list.find(([f]) => f.wrap.classList.contains('is-invalid')); if (f) f[0].input.focus(); },
        summary: () => `${st.name.split(' ')[0]} · ${st.phone}`,
        onMode() {}
      };
    }

    /* ---- 2. Endereço (entrega) ou balcão (retirada) ---- */
    function buildAddr(body) {
      const status = h('div', { class: 'co-geo-status', 'aria-live': 'polite' });
      const gpsBtn = h('button', { type: 'button', class: 'btn btn--primary co-gps', id: 'co-gps' });
      const manualToggle = h('button', { type: 'button', class: 'btn btn--ghost btn--sm co-manual-toggle', id: 'co-manual-toggle' }, 'Prefiro digitar o endereço');
      const geoErr = h('p', { class: 'co-err', id: 'co-geo-err', hidden: true, role: 'alert' });

      const fStreet = field({ id: 'co-street', label: 'Rua', input: h('input', { type: 'text', autocomplete: 'address-line1', enterkeyhint: 'next', value: st.street }) });
      const fNumber = field({ id: 'co-number', label: 'Número', hint: 'Sem número? Escreva S/N.', input: h('input', { type: 'text', autocomplete: 'off', enterkeyhint: 'next', value: st.number }) });
      const fDistrict = field({ id: 'co-district', label: 'Bairro', input: h('input', { type: 'text', autocomplete: 'address-level3', enterkeyhint: 'next', value: st.district }) });
      const fCompl = field({ id: 'co-complement', label: 'Complemento', optional: true, input: h('input', { type: 'text', autocomplete: 'off', placeholder: 'Apto, bloco, casa', enterkeyhint: 'next', value: st.complement }) });
      const fRef = field({ id: 'co-reference', label: 'Ponto de referência', optional: true, input: h('input', { type: 'text', autocomplete: 'off', placeholder: 'Ex.: em frente à farmácia', enterkeyhint: 'done', value: st.reference }) });

      const grid = h('div', { class: 'co-grid2' }, fNumber.wrap, fDistrict.wrap);
      const manualBox = h('div', { class: 'co-manual stack' }, fStreet.wrap, grid);
      const numberSlot = h('div', { class: 'co-number-slot' });
      const extraBox = h('div', { class: 'co-grid2 co-grid2--even' }, fCompl.wrap, fRef.wrap);
      const deliveryBox = h('div', { class: 'stack co-delivery' }, gpsBtn, status, manualToggle, geoErr, manualBox, numberSlot, extraBox);

      const [pa, pb] = pickupEta(info);
      const storeAddr = (info.address || '').trim();
      const pickupBox = h('div', { class: 'co-pickup' },
        h('div', { class: 'co-pickup-row' }, icon('pin'),
          h('div', { class: 'co-pickup-txt' },
            h('p', { class: 'co-lead-sm' }, info.name || 'Spetitos Lanches'),
            h('p', {}, storeAddr || 'O restaurante confirma o endereço do balcão pelo WhatsApp.'),
            storeAddr ? h('a', { href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(storeAddr), target: '_blank', rel: 'noopener', class: 'co-link' }, 'Ver no Google Maps') : '')),
        h('div', { class: 'co-pickup-eta' },
          h('span', { class: 'co-pickup-eta-n' }, `${pa}–${pb}`), h('span', {}, 'min para ficar pronto')),
        h('p', { class: 'co-note' }, 'Avisamos aqui quando o pedido estiver pronto. Diga o número do pedido no balcão.' + (info.hours ? ` Horário: ${info.hours}.` : '')));
      body.append(deliveryBox, pickupBox);

      const isManual = () => st.manual || st.geoState === 'error';
      function paintGeo() {
        status.textContent = '';
        status.className = 'co-geo-status is-' + st.geoState;
        if (st.geoState === 'loading') status.append(h('p', {}, 'Buscando sua localização… Pode levar alguns segundos.'));
        if (st.geoState === 'ok' && st.geo) {
          const { lat, lng, accuracy } = st.geo;
          status.append(h('div', { class: 'co-geo-card' },
            h('p', { class: 'co-geo-title' }, 'Localização encontrada'),
            h('p', { class: 'co-mono' }, `${lat.toFixed(6)}, ${lng.toFixed(6)}`),
            h('p', { class: 'co-muted' }, `Precisão de aproximadamente ${Math.round(accuracy)} m` + (accuracy > 150 ? '. Está imprecisa, então capriche no ponto de referência.' : '.')),
            h('a', { href: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`, target: '_blank', rel: 'noopener', class: 'co-link' }, 'Conferir no Google Maps')));
        }
        if (st.geoState === 'error') status.append(h('div', { class: 'co-geo-note' }, h('p', {}, st.geoMsg), h('p', {}, 'Sem problema: digite o endereço abaixo.')));
        gpsBtn.textContent = '';
        gpsBtn.append(icon('pin'), st.geoState === 'ok' ? 'Atualizar localização' : st.geoState === 'loading' ? 'Buscando…' : 'Usar minha localização atual');
        gpsBtn.disabled = st.geoState === 'loading';
        gpsBtn.classList.toggle('btn--ghost', st.geoState === 'ok' || isManual());
        gpsBtn.classList.toggle('btn--primary', !(st.geoState === 'ok' || isManual()));
        manualBox.hidden = !isManual();
        manualToggle.hidden = isManual() || st.geoState === 'ok';
        if (!isManual() && st.geoState === 'ok') { numberSlot.append(fNumber.wrap); numberSlot.hidden = false; }
        else { grid.prepend(fNumber.wrap); numberSlot.hidden = true; }
        extraBox.hidden = !(isManual() || st.geoState === 'ok');
      }
      function onMode() {
        deliveryBox.hidden = st.mode === 'retirada';
        pickupBox.hidden = st.mode !== 'retirada';
      }

      gpsBtn.addEventListener('click', () => {
        geoErr.hidden = true;
        const fail = (msg) => { if (done) return; done = true; st.geoState = 'error'; st.geoMsg = msg; st.geo = null; paintGeo(); paint(); fStreet.input.focus(); };
        let done = false;
        if (!('geolocation' in navigator)) { fail('Este navegador não informa a localização.'); return; }
        st.geoState = 'loading'; paintGeo();
        const guard = setTimeout(() => fail('A localização demorou demais para responder.'), 12000);
        try {
          navigator.geolocation.getCurrentPosition((pos) => {
            if (done) return; done = true; clearTimeout(guard);
            st.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            st.geoState = 'ok'; st.manual = false; paintGeo(); fNumber.input.focus();
          }, (err) => {
            clearTimeout(guard);
            fail(err && err.code === 1
              ? 'Não recebemos permissão para usar sua localização. Libere nas configurações do navegador ou digite o endereço.'
              : err && err.code === 3 ? 'A localização demorou demais para responder.'
              : 'Não foi possível descobrir sua localização agora.');
          }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
        } catch (e) { clearTimeout(guard); fail('Não foi possível descobrir sua localização agora.'); }
      });
      manualToggle.addEventListener('click', () => { st.manual = true; paintGeo(); fStreet.input.focus(); });

      const req = (f, msg, silent) => { const ok = !!f.input.value.trim(); if (!silent) setErr(f, ok ? '' : msg); return ok; };
      [fStreet, fNumber, fDistrict].forEach((f) => f.input.addEventListener('input', () => { if (f.wrap.classList.contains('is-invalid') && f.input.value.trim()) setErr(f, ''); }));
      paintGeo(); onMode();

      return {
        check(silent) {
          st.street = fStreet.input.value.trim(); st.number = fNumber.input.value.trim();
          st.district = fDistrict.input.value.trim(); st.complement = fCompl.input.value.trim(); st.reference = fRef.input.value.trim();
          if (st.mode === 'retirada') return true;
          if (st.geoState !== 'ok' && !isManual()) {
            if (!silent) { geoErr.textContent = 'Toque em "Usar minha localização atual" ou digite o endereço.'; geoErr.hidden = false; }
            return false;
          }
          geoErr.hidden = true;
          const checks = st.geoState === 'ok' && !isManual()
            ? [req(fNumber, 'Digite o número da casa ou S/N.', silent)]
            : [req(fStreet, 'Digite o nome da rua.', silent), req(fNumber, 'Digite o número da casa ou S/N.', silent), req(fDistrict, 'Digite o bairro.', silent)];
          return !checks.includes(false);
        },
        focusErr() { const bad = body.querySelector('.is-invalid input'); if (bad) bad.focus(); else gpsBtn.focus(); },
        summary() {
          if (st.mode === 'retirada') return `Pronto em ${pa}–${pb} min${storeAddr ? ' · ' + storeAddr : ''}`;
          return addressLine(buildAddress());
        },
        onMode
      };
    }

    /* ---- 3. Pagamento ---- */
    function buildPay(body) {
      const grid = h('div', { class: 'co-tiles', role: 'radiogroup', 'aria-label': 'Forma de pagamento' });
      const detail = h('div', { class: 'co-method-detail' });
      const fChange = field({ id: 'co-change', label: 'Troco para quanto?', hint: '',
        input: h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 50,00', value: st.changeFor }) });
      const hintEl = h('p', { class: 'co-hint', id: 'co-change-hint' });
      fChange.wrap.insertBefore(hintEl, fChange.err);
      fChange.input.setAttribute('aria-describedby', 'co-change-hint co-change-err');
      const noChange = h('input', { type: 'checkbox', id: 'co-nochange', class: 'co-check' });
      noChange.checked = st.noChange;
      const noChangeRow = h('label', { class: 'co-checkrow', for: 'co-nochange' }, noChange, h('span', {}, 'Não preciso de troco'));
      const descs = {};

      TILES.forEach((t) => {
        const disabled = t.id === 'pix' && !info.pixKey;
        const r = h('input', { type: 'radio', name: 'co-pay', id: 'co-pay-' + t.id, value: t.id, class: 'co-sr', disabled: disabled || null });
        r.checked = st.tile === t.id;
        r.addEventListener('change', () => { st.tile = t.id; paintTiles(); paintDetail(); st.done.pay = false; paint(); });
        descs[t.id] = h('span', { class: 'co-tile-desc' });
        grid.append(h('label', { class: 'co-tile co-tile--' + t.id + (disabled ? ' is-disabled' : ''), for: r.id, 'data-tile': t.id },
          r, icon(t.id),
          h('span', { class: 'co-tile-title' }, t.title),
          t.badge && !disabled ? h('span', { class: 'badge co-badge' }, t.badge) : '',
          descs[t.id]));
      });
      if (!info.pixKey) body.append(h('p', { class: 'co-note co-pix-off' }, 'PIX indisponível: o restaurante ainda não cadastrou a chave PIX.'));
      body.append(grid, detail);

      function paintTiles() {
        grid.querySelectorAll('.co-tile').forEach((el) => el.classList.toggle('is-selected', el.dataset.tile === st.tile));
        TILES.forEach((t) => { descs[t.id].textContent = t.id === 'pix' && !info.pixKey ? 'Indisponível' : t.desc(st.mode); });
      }
      function paintDetail() {
        detail.textContent = '';
        hintEl.textContent = `Total do pedido: ${money(totals().total)}`;
        if (st.tile === 'pix') detail.append(h('p', { class: 'co-note' }, 'Ao confirmar, mostramos o QR Code e o código copia e cola com o valor exato.'));
        else if (st.tile === 'credito' || st.tile === 'debito') detail.append(h('p', { class: 'co-note' },
          st.mode === 'retirada' ? 'Você paga na maquininha quando retirar o pedido.' : 'O entregador leva a maquininha. Você paga na entrega.'));
        else { detail.append(fChange.wrap, noChangeRow); syncChange(); }
      }
      function syncChange() {
        fChange.input.disabled = noChange.checked;
        fChange.wrap.classList.toggle('is-off', noChange.checked);
        if (noChange.checked) setErr(fChange, '');
      }
      noChange.addEventListener('change', () => { st.noChange = noChange.checked; syncChange(); if (!noChange.checked) fChange.input.focus(); });
      const checkChange = (silent) => {
        if (noChange.checked) return true;
        const total = totals().total;
        const v = parseMoney(fChange.input.value);
        let msg = '';
        if (!fChange.input.value.trim()) msg = 'Diga para quanto é o troco ou marque "Não preciso de troco".';
        else if (!isFinite(v)) msg = 'Digite só o valor. Ex.: 50,00.';
        else if (v < total) msg = `O valor precisa ser igual ou maior que o total de ${money(total)}.`;
        if (!silent) setErr(fChange, msg);
        return !msg;
      };
      fChange.input.addEventListener('blur', () => { if (fChange.input.value) checkChange(); });
      fChange.input.addEventListener('input', () => { st.changeFor = fChange.input.value; if (fChange.wrap.classList.contains('is-invalid')) checkChange(); });
      paintTiles(); paintDetail();

      return {
        check(silent) {
          if (st.tile === 'pix' && !info.pixKey) st.tile = 'credito';
          if (st.tile === 'dinheiro') return checkChange(silent);
          return true;
        },
        focusErr() { fChange.input.focus(); },
        summary() {
          const t = TILES.find((x) => x.id === st.tile);
          if (st.tile === 'dinheiro') return st.noChange ? 'Dinheiro · sem troco' : `Dinheiro · troco para ${money(parseMoney(st.changeFor))}`;
          return t.id === 'pix' ? 'PIX' : `${t.title} na maquininha`;
        },
        onMode() { paintTiles(); paintDetail(); }
      };
    }

    function buildAddress() {
      if (st.mode === 'retirada') {
        return { source: 'retirada', text: 'Retirada no balcão', lat: null, lng: null, accuracy: null, number: '', complement: '', district: '', reference: '', street: '' };
      }
      const manual = st.manual || st.geoState === 'error' || !st.geo;
      return {
        source: manual ? 'manual' : 'gps',
        text: manual ? st.street : 'Localização atual (GPS)',
        street: manual ? st.street : '',
        lat: manual ? null : st.geo.lat, lng: manual ? null : st.geo.lng, accuracy: manual ? null : Math.round(st.geo.accuracy),
        number: st.number, complement: st.complement, district: manual ? st.district : '', reference: st.reference
      };
    }

    /* ---- estado inicial: cliente que volta pula o que já está válido ---- */
    st.done.data = data.check(true);
    st.done.addr = addr.check(true);
    st.open = nextOpen();
    paint();
    if (!st.done.data) { const f = sData.body.querySelector('input'); if (f && !f.value) setTimeout(() => f.focus({ preventScroll: true }), 80); }

    /* ---- Confirmar ---- */
    function confirm() {
      mainBtn.disabled = true; mainBtn.textContent = 'Enviando pedido…';
      try {
        const address = buildAddress();
        const tile = TILES.find((t) => t.id === st.tile) || TILES[1];
        const payment = { method: tile.method, changeFor: null, cardType: tile.cardType || null };
        if (tile.method === 'dinheiro' && !st.noChange) payment.changeFor = Math.round(parseMoney(st.changeFor) * 100) / 100;
        const order = Store.createOrder({
          fulfillment: st.mode,
          customer: { name: st.name, cpf: st.cpf, phone: st.phone },
          address,
          items: Cart.items().map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, unitPrice: it.unitPrice, options: it.options || [], removed: it.removed || [], note: it.note || '' })),
          payment,
          deliveryFee: fee()
        });
        saveCustomer({
          name: st.name, cpf: st.cpf, phone: st.phone, fulfillment: st.mode,
          addrSource: st.mode === 'entrega' ? address.source : (saved.addrSource || ''),
          street: st.street, number: st.number, complement: st.complement, district: st.district, reference: st.reference,
          tile: st.tile, method: tile.method, cardType: tile.cardType || ''
        });
        Cart.clear();
        /* Hook de pagamento online (ver comentário em Checkout.onlinePayment). */
        if (typeof Checkout.onlinePayment === 'function' && tile.method === 'online') {
          Promise.resolve(Checkout.onlinePayment(order)).then((r) => Store.updateOrder(order.id, { paymentResult: r })).catch(() => {});
        }
        Fiscal.emitir(order);
        showConfirmation(order.id);
      } catch (e) {
        console.error(e);
        mainBtn.disabled = false; mainBtn.textContent = 'Tentar de novo';
        UI.toast('Não conseguimos enviar o pedido. Confira sua conexão e tente de novo.', { tone: 'err', ms: 4000 });
      }
    }

    /* ---- Confirmação ---- */
    function showConfirmation(orderId) {
      summary.el.remove();
      layout.classList.add('is-done');
      layout.firstChild.textContent = '';
      footer.textContent = '';
      const closeBtn = h('button', { class: 'btn btn--primary co-main co-wide', type: 'button', id: 'co-done' }, 'Voltar ao cardápio');
      closeBtn.addEventListener('click', () => sheet.close());
      footer.append(closeBtn);
      const titleEl = sheet.el.querySelector('.sheet-title'); if (titleEl) titleEl.textContent = 'Pedido enviado';

      const getOrder = () => Store.orders().find((o) => o.id === orderId);
      const order = getOrder();
      const pickup = order.fulfillment === 'retirada';
      const [pa, pb] = pickupEta(info);
      const head = h('div', { class: 'co-done-head' },
        h('span', { class: 'badge co-done-mode' }, icon(pickup ? 'retirada' : 'entrega'), pickup ? 'Retirada no balcão' : 'Entrega'),
        h('p', { class: 'co-done-kicker' }, 'Pedido'),
        h('p', { class: 'co-done-num' }, '#' + order.number),
        h('p', { class: 'co-muted' }, pickup
          ? `Fica pronto em ${pa}–${pb} min. Diga o número no balcão.`
          : info.etaMin && info.etaMax ? `Previsão de entrega: ${info.etaMin}–${info.etaMax} min` : 'O restaurante já recebeu seu pedido.'));
      const where = h('div', { class: 'co-review' },
        h('div', {}, h('span', { class: 'co-muted' }, pickup ? 'Retirar em' : 'Entregar em'),
          h('span', {}, pickup ? ((info.address || '').trim() || 'Balcão da loja') : addressLine(order.address))),
        h('div', {}, h('span', { class: 'co-muted' }, 'Pagamento'), h('span', {}, paymentLine(order))));
      const timeline = h('ol', { class: 'co-timeline', 'aria-label': 'Andamento do pedido' });
      const pixBox = order.payment.method === 'pix' ? buildPix(order) : null;
      const nfceBox = h('section', { class: 'co-nfce', 'aria-live': 'polite', 'aria-label': 'Nota fiscal' });
      const wa = buildWhatsApp(order);

      layout.firstChild.append(h('div', { class: 'co-done stack' }, head, timeline, pixBox, where, nfceBox, wa));
      sheet.body.scrollTop = 0;

      let lastNfce = '';
      function paintDone() {
        const o = getOrder(); if (!o) return;
        paintTimeline(timeline, o);
        const key = JSON.stringify(o.nfce || {});
        if (key !== lastNfce) { lastNfce = key; paintNfce(nfceBox, o); }
      }
      paintDone();
      current.unsub = Store.subscribe(paintDone);
    }

    function paymentLine(o) {
      const p = o.payment;
      if (p.method === 'pix') return `PIX · ${money(o.total)}`;
      const where = o.fulfillment === 'retirada' ? 'no balcão' : 'na entrega';
      if (p.method === 'cartao') return `${p.cardType === 'debito' ? 'Débito' : 'Crédito'} na maquininha, ${where} · ${money(o.total)}`;
      return `Dinheiro, ${where} · ${money(o.total)}` + (p.changeFor ? ` · troco para ${money(p.changeFor)} (${money(p.changeFor - o.total)} de troco)` : ' · sem troco');
    }

    function buildPix(o) {
      const code = pixPayload({ key: info.pixKey, name: info.pixName || info.name || 'Spetitos Lanches', city: info.pixCity || 'SALVADOR', amount: o.total, txid: 'SPT' + o.number });
      const qr = h('div', { class: 'co-qr', id: 'co-qr' });
      const ta = h('textarea', { class: 'input co-pix-code', id: 'co-pix-code', readonly: true, rows: '3', 'aria-label': 'Código PIX copia e cola' });
      ta.value = code;
      const copyBtn = h('button', { type: 'button', class: 'btn btn--primary co-wide', id: 'co-pix-copy' }, 'Copiar código PIX');
      copyBtn.addEventListener('click', async () => { const ok = await UI.copy(code); if (!ok) { ta.focus(); ta.select(); } else copyBtn.textContent = 'Código copiado'; });
      renderQR(qr, code);
      return h('section', { class: 'co-pix stack', 'aria-label': 'Pagamento PIX' },
        h('div', { class: 'co-pix-head' }, h('p', { class: 'co-lead' }, 'Pague com PIX'), h('p', { class: 'co-pix-amount' }, money(o.total))),
        h('p', { class: 'co-muted' }, 'Abra o app do banco, escolha PIX e leia o QR Code ou cole o código.'),
        qr, ta, copyBtn,
        h('p', { class: 'co-hint' }, `Recebedor: ${plain(info.pixName || info.name, 25)} · identificador SPT${o.number}`));
    }

    function paintTimeline(el, o) {
      el.textContent = '';
      if (o.status === 'cancelado') {
        el.append(h('li', { class: 'co-tl is-cancel' }, h('span', { class: 'co-tl-dot' }), h('span', {}, 'Pedido cancelado. Fale com o restaurante pelo WhatsApp.')));
        return;
      }
      const steps = STATUS[o.fulfillment === 'retirada' ? 'retirada' : 'entrega'];
      const idx = Math.max(0, steps.findIndex(([id]) => id === o.status));
      steps.forEach(([, label], i) => {
        el.append(h('li', { class: 'co-tl ' + (i < idx ? 'is-done' : i === idx ? 'is-now' : 'is-todo'), 'aria-current': i === idx ? 'step' : null },
          h('span', { class: 'co-tl-dot', 'aria-hidden': 'true' }), h('span', { class: 'co-tl-label' }, label)));
      });
    }

    function paintNfce(box, o) {
      box.textContent = '';
      const n = o.nfce || {};
      if (n.status === 'autorizada') {
        const rows = o.items.map((it) => h('tr', {},
          h('td', {}, `${it.qty}× ${it.name}` + (it.options && it.options.length ? ' + ' + it.options.map((x) => x.name).join(', ') : '')),
          h('td', { class: 'co-num' }, money(Store.linePrice(it)))));
        box.append(h('div', { class: 'co-danfe' },
          h('p', { class: 'co-danfe-title' }, 'NFC-e · Documento auxiliar da nota fiscal de consumidor eletrônica'),
          h('p', { class: 'co-danfe-store' }, info.name || 'Spetitos Lanches'),
          h('table', { class: 'co-danfe-items' }, h('tbody', {}, rows,
            o.deliveryFee ? h('tr', {}, h('td', {}, 'Taxa de entrega'), h('td', { class: 'co-num' }, money(o.deliveryFee))) : '',
            h('tr', { class: 'co-danfe-total' }, h('td', {}, 'Total'), h('td', { class: 'co-num' }, money(o.total))))),
          h('dl', { class: 'co-danfe-meta' },
            h('dt', {}, 'NFC-e nº'), h('dd', {}, String(n.numero ?? '—')),
            h('dt', {}, 'Série'), h('dd', {}, String(n.serie ?? '—')),
            h('dt', {}, 'Protocolo'), h('dd', {}, n.protocolo || '—'),
            h('dt', {}, 'CPF do consumidor'), h('dd', {}, o.customer.cpf)),
          h('p', { class: 'co-danfe-label' }, 'Chave de acesso'),
          h('p', { class: 'co-danfe-chave' }, Fiscal.formatChave(n.chave)),
          n.urlDanfe ? h('a', { href: n.urlDanfe, target: '_blank', rel: 'noopener', class: 'co-link' }, 'Abrir DANFE completo') : '',
          n.aviso ? h('p', { class: 'co-danfe-aviso' }, n.aviso) : ''));
      } else if (n.status === 'erro') {
        box.append(h('div', { class: 'co-nfce-err' },
          h('p', { class: 'co-lead-sm' }, 'A nota fiscal não saiu agora'),
          h('p', {}, n.erro || 'O serviço de notas fiscais não respondeu.'),
          h('p', { class: 'co-muted' }, 'Seu pedido está confirmado. O restaurante emite a nota e envia para você depois.')));
      } else {
        box.append(h('p', { class: 'co-nfce-wait' }, h('span', { class: 'co-spin', 'aria-hidden': 'true' }), 'Emitindo nota fiscal…'));
      }
    }

    function buildWhatsApp(o) {
      let num = digits(info.whatsapp);
      if (num && (num.length === 10 || num.length === 11)) num = '55' + num;
      const pickup = o.fulfillment === 'retirada';
      const lines = [
        `*Pedido #${o.number}* · ${info.name || 'Spetitos Lanches'}`,
        pickup ? '*Retirada no balcão*' : '*Entrega*',
        ...o.items.map((it) => `${it.qty}x ${it.name}` + (it.options && it.options.length ? ` (+ ${it.options.map((x) => x.name).join(', ')})` : '') + (it.removed && it.removed.length ? ` (sem ${it.removed.join(', ')})` : '') + (it.note ? ` · obs: ${it.note}` : '') + ` — ${money(Store.linePrice(it))}`),
        pickup ? null : `Entrega: ${money(o.deliveryFee)}`,
        `*Total: ${money(o.total)}*`,
        'Pagamento: ' + paymentLine(o),
        '',
        `Cliente: ${o.customer.name} · ${o.customer.phone}`,
        pickup ? null : `Endereço: ${addressLine(o.address)}`,
        !pickup && o.address.reference ? `Referência: ${o.address.reference}` : null,
        !pickup && o.address.source === 'gps' ? `Mapa: https://www.google.com/maps?q=${o.address.lat},${o.address.lng}` : null
      ];
      const text = lines.filter((l) => l !== null && l !== undefined).join('\n');
      if (!num) return h('p', { class: 'co-muted co-wa-none' }, 'O restaurante ainda não cadastrou o WhatsApp. Guarde o número do pedido: #' + o.number + '.');
      return h('div', { class: 'co-wa stack' },
        h('a', { href: `https://wa.me/${num}?text=${encodeURIComponent(text)}`, target: '_blank', rel: 'noopener', class: 'btn btn--ghost co-wide co-wa-btn', id: 'co-wa' }, 'Enviar resumo pelo WhatsApp'),
        h('p', { class: 'co-hint' }, 'Abre o WhatsApp com o resumo pronto para o restaurante: ' + maskPhone(digits(info.whatsapp).replace(/^55(?=\d{10,11}$)/, ''))));
    }

    return sheet;
  }

  function addressLine(a) {
    if (!a) return '';
    if (a.source === 'retirada') return 'Retirada no balcão';
    if (a.source === 'gps') return `Localização atual (GPS), nº ${a.number || 's/n'}` + (a.complement ? `, ${a.complement}` : '');
    return [a.street ? `${a.street}, ${a.number}` : a.text, a.complement, a.district].filter(Boolean).join(' · ');
  }

  /* ---------------- Resumo do pedido (sempre visível) ---------------- */
  function buildSummary(info, totals) {
    const list = h('ul', { class: 'co-sum-items' });
    const rows = h('dl', { class: 'co-sum-totals' });
    const count = h('span', { class: 'co-sum-count' });
    const det = h('details', { class: 'co-summary', id: 'co-summary' },
      h('summary', { class: 'co-sum-head' }, h('span', { class: 'co-sum-title' }, 'Seu pedido'), count, h('span', { class: 'co-sum-more' }, 'ver itens')),
      list, rows);
    try { if (window.matchMedia('(min-width: 760px)').matches) det.open = true; } catch (e) {}
    function update(st) {
      const t = totals();
      list.textContent = '';
      Cart.items().forEach((it) => {
        const extras = [
          (it.options || []).map((o) => (o.qty > 1 ? o.qty + '× ' : '') + o.name).join(', '),
          (it.removed || []).length ? 'sem ' + it.removed.join(', ') : '',
          it.note ? 'obs: ' + it.note : ''
        ].filter(Boolean).join(' · ');
        list.append(h('li', { class: 'co-sum-item' },
          h('span', { class: 'co-sum-qty' }, it.qty + '×'),
          h('span', { class: 'co-sum-name' }, it.name, extras ? h('small', {}, extras) : ''),
          h('span', { class: 'co-num' }, money(Store.linePrice(it)))));
      });
      rows.textContent = '';
      rows.append(
        h('div', {}, h('dt', {}, 'Subtotal'), h('dd', { class: 'co-num' }, money(t.sub))),
        h('div', {}, h('dt', {}, st && st.mode === 'retirada' ? 'Retirada' : 'Entrega'), h('dd', { class: 'co-num' }, t.fee ? money(t.fee) : 'Grátis')),
        h('div', { class: 'co-sum-total' }, h('dt', {}, 'Total'), h('dd', { class: 'co-num' }, money(t.total))));
      const n = Cart.count();
      count.textContent = n + (n === 1 ? ' item' : ' itens') + ' · ' + money(t.sub);
    }
    return { el: h('aside', { class: 'co-aside', 'aria-label': 'Resumo do pedido' }, det), update };
  }

  Checkout.open = open;
  Checkout.pixPayload = pixPayload;
  Checkout.validCPF = validCPF;
  window.Checkout = Checkout;
})();
