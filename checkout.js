/* Spetitos — Checkout (dono: agente de pagamento).
   API pública: window.Checkout = { open(), pixPayload(opts), validCPF(cpf), onlinePayment }
   Fluxo: 1 Seus dados → 2 Entrega → 3 Pagamento → Confirmação (status ao vivo + NFC-e).
   Depende de: Store, Cart, UI, Fiscal (contrato compartilhado). Visual em checkout.css. */
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
    // "1.234,56" → 1234.56 ; "50,5" → 50.5 ; "50.00" → 50
    const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    return Number(norm);
  }

  const rules = {
    name(v) {
      const t = v.trim().replace(/\s+/g, ' ');
      if (!t) return 'Digite seu nome completo.';
      if (t.split(' ').filter((p) => p.length >= 2).length < 2) return 'Digite nome e sobrenome.';
      if (/\d/.test(t)) return 'O nome não pode ter números.';
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
  /* Normaliza a chave PIX: e-mail em minúsculas, celular no formato +55DDDNUMERO, CPF/CNPJ só números,
     chave aleatória (EVP) como está. */
  function normalizePixKey(k) {
    const s = String(k || '').trim();
    if (!s) return '';
    if (s.includes('@')) return s.toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s.toLowerCase();
    const d = digits(s);
    if (s.startsWith('+')) return '+' + d;
    if (d.length === 14) return d;                       // CNPJ
    if (d.length === 11 && validCPF(d) && !/[()\s]/.test(s)) return d; // CPF (celular costuma vir com DDD entre parênteses)
    if (d.length === 10 || d.length === 11) return '+55' + d; // celular/fixo
    if (d.length === 13 && d.startsWith('55')) return '+' + d;
    return s;
  }
  function pixPayload({ key, name, city, amount, txid }) {
    const gui = tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizePixKey(key));
    const tx = (String(txid || '***').replace(/[^A-Za-z0-9]/g, '') || '***').slice(0, 25);
    let p = tlv('00', '01') +
      tlv('26', gui) +
      tlv('52', '0000') +
      tlv('53', '986') +
      (amount > 0 ? tlv('54', Number(amount).toFixed(2)) : '') +
      tlv('58', 'BR') +
      tlv('59', plain(name, 25) || 'SPETITOS LANCHES') +
      tlv('60', plain(city, 15) || 'SALVADOR') +
      tlv('62', tlv('05', tx)) +
      '6304';
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
    box.style.background = '#ffffff'; box.style.color = '#000000'; // zona de silêncio do QR (ver nota abaixo)
    loadQR().then((QRCode) => {
      box.textContent = '';
      /* Cores fixas de propósito: leitores de QR precisam de módulos escuros sobre fundo claro,
         nos dois temas. Não são cores de tema. */
      new QRCode(box, { text, width: 216, height: 216, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      const img = box.querySelector('img'); if (img) img.alt = 'QR Code PIX';
    }).catch(() => { box.textContent = 'Não deu para mostrar o QR Code agora. Use o código copia e cola abaixo.'; });
  }

  /* ---------------- Pagamento online (cartão via gateway) — PONTO DE INTEGRAÇÃO ----------------
     NÃO IMPLEMENTADO. Para cobrar cartão online (Mercado Pago Checkout Bricks / Pagar.me):
       1. Crie uma função serverless que guarda o access token do gateway (nunca no navegador).
       2. Ela cria a preferência/cobrança com o total do pedido e devolve um id ou URL de pagamento.
       3. Atribua aqui: Checkout.onlinePayment = async (order) => ({ status: 'aprovado'|'pendente'|'recusado', id, url })
       4. Adicione { id: 'online', ... } em METHODS abaixo. Quando onlinePayment existir, confirm() chama
          o gateway depois de Store.createOrder e grava o resultado com Store.updateOrder(order.id, { paymentResult }).
     Webhook do gateway → backend → Store.updateOrder (marcar pago) mantém o painel do dono em dia. */
  const Checkout = { onlinePayment: null };

  const METHODS = [
    { id: 'pix', title: 'PIX', desc: 'Mais rápido. Pague pelo app do banco com QR Code ou copia e cola.', badge: 'Mais rápido' },
    { id: 'cartao', title: 'Cartão na entrega', desc: 'Crédito ou débito na maquininha do entregador.' },
    { id: 'dinheiro', title: 'Dinheiro', desc: 'Pague ao entregador. Avise se precisar de troco.' }
  ];
  const STATUS = [
    { id: 'recebido', label: 'Pedido recebido' },
    { id: 'preparo', label: 'Em preparo' },
    { id: 'saiu', label: 'Saiu para entrega' },
    { id: 'entregue', label: 'Entregue' }
  ];
  const STEPS = ['Seus dados', 'Entrega', 'Pagamento'];

  /* ---------------- Componentes de formulário ---------------- */
  function field({ id, label, hint, optional, input }) {
    const err = h('p', { class: 'co-err', id: id + '-err', hidden: true });
    input.id = id;
    input.classList.add('input');
    const describedBy = [hint ? id + '-hint' : '', id + '-err'].filter(Boolean).join(' ');
    input.setAttribute('aria-describedby', describedBy);
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
      const back = h('button', { class: 'btn btn--primary co-wide', type: 'button' }, 'Voltar ao cardápio');
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
    const st = {
      step: 0,
      name: saved.name || '', cpf: saved.cpf || '', phone: saved.phone || '',
      geo: null, geoState: 'idle', geoMsg: '', manual: false,
      street: saved.street || '', number: saved.number || '', complement: saved.complement || '',
      district: saved.district || '', reference: saved.reference || '',
      method: info.pixKey ? 'pix' : (saved.method && saved.method !== 'pix' ? saved.method : 'cartao'),
      cardType: saved.cardType || 'credito', changeFor: '', noChange: false
    };
    if (st.method === 'pix' && !info.pixKey) st.method = 'cartao';
    const returning = !!(saved.name && saved.cpf && saved.phone);

    const stepper = h('ol', { class: 'co-steps', 'aria-label': 'Etapas do pedido' });
    const main = h('div', { class: 'co-main' });
    const summary = buildSummary(info);
    const layout = h('div', { class: 'co-layout' }, h('div', { class: 'co-col' }, stepper, main), summary.el);
    const backBtn = h('button', { class: 'btn btn--ghost co-back', type: 'button', id: 'co-back' }, 'Voltar');
    const nextBtn = h('button', { class: 'btn btn--primary co-next', type: 'submit', id: 'co-next' }, 'Continuar');
    const footer = h('div', { class: 'co-foot' }, backBtn, nextBtn);

    const sheet = UI.openSheet({
      title: 'Finalizar pedido', size: 'lg', className: 'co-sheet',
      content: layout, footer,
      onClose() { if (current && current.unsub) current.unsub(); current = null; }
    });
    current = { sheet, st, unsub: null };

    backBtn.addEventListener('click', () => { if (st.step > 0) { st.step--; render(); } });

    function renderStepper() {
      stepper.textContent = '';
      STEPS.forEach((label, i) => {
        const state = i < st.step ? 'done' : i === st.step ? 'current' : 'todo';
        const inner = i < st.step
          ? h('button', { type: 'button', class: 'co-step-btn', onclick: () => { st.step = i; render(); } }, h('span', { class: 'co-step-n', 'aria-hidden': 'true' }, '✓'), label)
          : h('span', { class: 'co-step-btn' }, h('span', { class: 'co-step-n', 'aria-hidden': 'true' }, String(i + 1)), label);
        stepper.append(h('li', { class: 'co-step is-' + state, 'aria-current': i === st.step ? 'step' : null }, inner));
      });
    }

    function render() {
      renderStepper();
      main.textContent = '';
      const form = h('form', { class: 'co-form stack', id: 'co-form-' + st.step, novalidate: true, autocomplete: 'on' });
      nextBtn.setAttribute('form', form.id);
      backBtn.hidden = st.step === 0;
      const builders = [stepData, stepDelivery, stepPayment];
      const { validate, label } = builders[st.step](form);
      nextBtn.textContent = label;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validate()) return;
        if (st.step < 2) { st.step++; render(); sheet.body.scrollTop = 0; }
        else confirm(nextBtn);
      });
      main.append(form);
      summary.update(st);
    }

    /* ---- Etapa 1: Seus dados ---- */
    function stepData(form) {
      const fName = field({ id: 'co-name', label: 'Nome completo',
        input: h('input', { type: 'text', autocomplete: 'name', autocapitalize: 'words', enterkeyhint: 'next', value: st.name, autofocus: !st.name }) });
      const fCpf = field({ id: 'co-cpf', label: 'CPF', hint: 'Vai na nota fiscal do pedido.',
        input: h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: '000.000.000-00', maxlength: '14', enterkeyhint: 'next', value: maskCPF(st.cpf) }) });
      const fPhone = field({ id: 'co-phone', label: 'Telefone ou WhatsApp', hint: 'Usamos só para falar sobre este pedido.',
        input: h('input', { type: 'tel', inputmode: 'numeric', autocomplete: 'tel-national', placeholder: '(00) 00000-0000', maxlength: '15', enterkeyhint: 'next', value: maskPhone(st.phone) }) });

      fCpf.input.addEventListener('input', () => { fCpf.input.value = maskCPF(fCpf.input.value); if (digits(fCpf.input.value).length === 11) check(fCpf, 'cpf'); });
      fPhone.input.addEventListener('input', () => { fPhone.input.value = maskPhone(fPhone.input.value); });
      const check = (f, k) => { const m = rules[k](f.input.value); setErr(f, m); return !m; };
      [[fName, 'name'], [fCpf, 'cpf'], [fPhone, 'phone']].forEach(([f, k]) => {
        f.input.addEventListener('blur', () => { if (f.input.value) check(f, k); });
        f.input.addEventListener('input', () => { if (f.wrap.classList.contains('is-invalid')) check(f, k); });
      });

      if (returning) form.append(h('p', { class: 'co-welcome' }, `Que bom te ver de novo, ${st.name.split(' ')[0]}! Seus dados já estão preenchidos.`));
      form.append(fName.wrap, fCpf.wrap, fPhone.wrap);

      return {
        label: 'Continuar para entrega',
        validate() {
          const list = [[fName, 'name'], [fCpf, 'cpf'], [fPhone, 'phone']];
          const bad = list.filter(([f, k]) => !check(f, k));
          st.name = fName.input.value.trim().replace(/\s+/g, ' ');
          st.cpf = maskCPF(fCpf.input.value);
          st.phone = maskPhone(fPhone.input.value);
          if (bad.length) { bad[0][0].input.focus(); return false; }
          return true;
        }
      };
    }

    /* ---- Etapa 2: Entrega ---- */
    function stepDelivery(form) {
      const status = h('div', { class: 'co-geo-status', 'aria-live': 'polite' });
      const gpsBtn = h('button', { type: 'button', class: 'btn btn--primary co-gps', id: 'co-gps' },
        h('span', { class: 'co-gps-ico', 'aria-hidden': 'true' }), 'Usar minha localização atual');
      const manualToggle = h('button', { type: 'button', class: 'btn btn--ghost btn--sm co-manual-toggle', id: 'co-manual-toggle' }, 'Prefiro digitar o endereço');
      const geoErr = h('p', { class: 'co-err', id: 'co-geo-err', hidden: true, role: 'alert' });

      const fStreet = field({ id: 'co-street', label: 'Rua', input: h('input', { type: 'text', autocomplete: 'address-line1', enterkeyhint: 'next', value: st.street }) });
      const fNumber = field({ id: 'co-number', label: 'Número', hint: 'Sem número? Escreva S/N.', input: h('input', { type: 'text', inputmode: 'text', autocomplete: 'address-line2', enterkeyhint: 'next', value: st.number }) });
      const fDistrict = field({ id: 'co-district', label: 'Bairro', input: h('input', { type: 'text', autocomplete: 'address-level3', enterkeyhint: 'next', value: st.district }) });
      const fCompl = field({ id: 'co-complement', label: 'Complemento', optional: true, input: h('input', { type: 'text', autocomplete: 'off', placeholder: 'Apto, bloco, casa', enterkeyhint: 'next', value: st.complement }) });
      const fRef = field({ id: 'co-reference', label: 'Ponto de referência', optional: true, input: h('input', { type: 'text', autocomplete: 'off', placeholder: 'Ex.: em frente à farmácia', enterkeyhint: 'done', value: st.reference }) });

      const manualBox = h('div', { class: 'co-manual stack' }, fStreet.wrap, h('div', { class: 'co-grid2' }, fNumber.wrap, fDistrict.wrap));
      const extraBox = h('div', { class: 'co-extra stack' }, fCompl.wrap, fRef.wrap);
      const numberSlot = h('div', { class: 'co-number-slot' });

      function paint() {
        status.textContent = '';
        status.className = 'co-geo-status is-' + st.geoState;
        if (st.geoState === 'loading') status.append(h('p', {}, 'Buscando sua localização… Pode levar alguns segundos.'));
        if (st.geoState === 'ok' && st.geo) {
          const { lat, lng, accuracy } = st.geo;
          const url = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
          status.append(h('div', { class: 'co-geo-card' },
            h('p', { class: 'co-geo-title' }, 'Localização encontrada'),
            h('p', { class: 'co-mono' }, `${lat.toFixed(6)}, ${lng.toFixed(6)}`),
            h('p', { class: 'co-muted' }, `Precisão de aproximadamente ${Math.round(accuracy)} m` + (accuracy > 150 ? '. Está um pouco imprecisa, então capriche no ponto de referência.' : '.')),
            h('a', { href: url, target: '_blank', rel: 'noopener', class: 'co-link' }, 'Conferir no Google Maps')));
        }
        if (st.geoState === 'error') status.append(h('div', { class: 'co-geo-note' }, h('p', {}, st.geoMsg), h('p', {}, 'Sem problema: digite o endereço abaixo.')));
        gpsBtn.textContent = '';
        gpsBtn.append(h('span', { class: 'co-gps-ico', 'aria-hidden': 'true' }), st.geoState === 'ok' ? 'Atualizar localização' : st.geoState === 'loading' ? 'Buscando…' : 'Usar minha localização atual');
        gpsBtn.disabled = st.geoState === 'loading';
        gpsBtn.classList.toggle('btn--ghost', st.geoState === 'ok');
        gpsBtn.classList.toggle('btn--primary', st.geoState !== 'ok');
        const showManual = st.manual || st.geoState === 'error';
        manualBox.hidden = !showManual;
        manualToggle.hidden = showManual || st.geoState === 'ok';
        // Com GPS, o número fica sozinho; com endereço manual, ele fica na grade rua/número/bairro
        if (!showManual && st.geoState === 'ok') { numberSlot.append(fNumber.wrap); numberSlot.hidden = false; }
        else { manualBox.querySelector('.co-grid2').prepend(fNumber.wrap); numberSlot.hidden = true; }
        extraBox.hidden = !(showManual || st.geoState === 'ok');
      }

      gpsBtn.addEventListener('click', () => {
        geoErr.hidden = true;
        if (!('geolocation' in navigator)) {
          st.geoState = 'error'; st.geoMsg = 'Este navegador não informa a localização.'; st.manual = true; paint(); fStreet.input.focus(); return;
        }
        st.geoState = 'loading'; paint();
        let done = false;
        const fail = (msg) => { if (done) return; done = true; st.geoState = 'error'; st.geoMsg = msg; st.manual = true; st.geo = null; paint(); fStreet.input.focus(); };
        const guard = setTimeout(() => fail('A localização demorou demais para responder.'), 12000);
        try {
          navigator.geolocation.getCurrentPosition((pos) => {
            if (done) return; done = true; clearTimeout(guard);
            st.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            st.geoState = 'ok'; paint(); fNumber.input.focus();
          }, (err) => {
            clearTimeout(guard);
            const msg = err && err.code === 1
              ? 'Não recebemos permissão para usar sua localização. Você pode liberar nas configurações do navegador, ou digitar o endereço.'
              : err && err.code === 3 ? 'A localização demorou demais para responder.'
              : 'Não foi possível descobrir sua localização agora.';
            fail(msg);
          }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
        } catch (e) { clearTimeout(guard); fail('Não foi possível descobrir sua localização agora.'); }
      });
      manualToggle.addEventListener('click', () => { st.manual = true; paint(); fStreet.input.focus(); });

      const eta = info.etaMin && info.etaMax ? h('p', { class: 'co-muted' }, `Entrega em ${info.etaMin}–${info.etaMax} min · taxa ${money(Number(info.deliveryFee) || 0)}`) : '';
      form.append(
        h('div', { class: 'co-geo stack' },
          h('p', { class: 'co-lead' }, 'Onde vamos entregar?'), eta, gpsBtn, status, manualToggle, geoErr),
        manualBox, numberSlot, extraBox);
      paint();

      const req = (f, msg) => { const ok = !!f.input.value.trim(); setErr(f, ok ? '' : msg); return ok; };
      [fStreet, fNumber, fDistrict].forEach((f) => f.input.addEventListener('input', () => { if (f.wrap.classList.contains('is-invalid')) setErr(f, f.input.value.trim() ? '' : f.err.textContent); }));

      return {
        label: 'Continuar para pagamento',
        validate() {
          st.street = fStreet.input.value.trim(); st.number = fNumber.input.value.trim();
          st.district = fDistrict.input.value.trim(); st.complement = fCompl.input.value.trim(); st.reference = fRef.input.value.trim();
          const manual = st.manual || st.geoState === 'error';
          if (st.geoState !== 'ok' && !manual) {
            geoErr.textContent = 'Toque em "Usar minha localização atual" ou digite o endereço.';
            geoErr.hidden = false; gpsBtn.focus(); return false;
          }
          geoErr.hidden = true;
          const checks = st.geoState === 'ok' && !manual
            ? [req(fNumber, 'Digite o número da casa ou S/N.')]
            : [req(fStreet, 'Digite o nome da rua.'), req(fNumber, 'Digite o número da casa ou S/N.'), req(fDistrict, 'Digite o bairro.')];
          if (checks.includes(false)) { const bad = form.querySelector('.is-invalid input'); bad && bad.focus(); return false; }
          return true;
        }
      };
    }

    /* ---- Etapa 3: Pagamento ---- */
    function stepPayment(form) {
      const total = totals().total;
      const list = h('div', { class: 'co-methods', role: 'radiogroup', 'aria-label': 'Forma de pagamento' });
      const detail = h('div', { class: 'co-method-detail' });
      const fChange = field({ id: 'co-change', label: 'Troco para quanto?', hint: `Total do pedido: ${money(total)}`,
        input: h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 50,00', value: st.changeFor }) });
      const noChange = h('input', { type: 'checkbox', id: 'co-nochange', class: 'co-check' });
      noChange.checked = st.noChange;
      const noChangeRow = h('label', { class: 'co-checkrow', for: 'co-nochange' }, noChange, h('span', {}, 'Não preciso de troco'));

      METHODS.forEach((m) => {
        const disabled = m.id === 'pix' && !info.pixKey;
        const radio = h('input', { type: 'radio', name: 'co-method', id: 'co-m-' + m.id, value: m.id, class: 'co-radio', disabled: disabled || null });
        radio.checked = st.method === m.id;
        radio.addEventListener('change', () => { st.method = m.id; paintDetail(); paintCards(); });
        list.append(h('label', { class: 'co-method' + (m.id === 'pix' ? ' co-method--pix' : '') + (disabled ? ' is-disabled' : ''), for: radio.id, 'data-method': m.id },
          radio,
          h('span', { class: 'co-method-body' },
            h('span', { class: 'co-method-title' }, m.title, m.badge && !disabled ? h('span', { class: 'badge co-badge' }, m.badge) : ''),
            h('span', { class: 'co-method-desc' }, disabled ? 'Indisponível: o restaurante ainda não cadastrou a chave PIX.' : m.desc))));
      });
      function paintCards() { list.querySelectorAll('.co-method').forEach((el) => el.classList.toggle('is-selected', el.dataset.method === st.method)); }

      function paintDetail() {
        detail.textContent = '';
        if (st.method === 'pix') {
          detail.append(h('p', { class: 'co-note' }, 'Ao confirmar, mostramos o QR Code e o código copia e cola com o valor exato. O restaurante confere o pagamento e começa o preparo.'));
        } else if (st.method === 'cartao') {
          const seg = h('div', { class: 'co-seg', role: 'radiogroup', 'aria-label': 'Tipo de cartão' });
          [['credito', 'Crédito'], ['debito', 'Débito']].forEach(([id, label]) => {
            const r = h('input', { type: 'radio', name: 'co-card', id: 'co-card-' + id, value: id, class: 'co-radio' });
            r.checked = st.cardType === id;
            r.addEventListener('change', () => { st.cardType = id; });
            seg.append(h('label', { for: r.id, class: 'co-seg-opt' }, r, h('span', {}, label)));
          });
          detail.append(h('p', { class: 'co-lead-sm' }, 'Qual cartão?'), seg, h('p', { class: 'co-note' }, 'O entregador leva a maquininha.'));
        } else {
          detail.append(fChange.wrap, noChangeRow);
          syncChange();
        }
      }
      function syncChange() {
        fChange.input.disabled = noChange.checked;
        fChange.wrap.classList.toggle('is-off', noChange.checked);
        if (noChange.checked) setErr(fChange, '');
      }
      noChange.addEventListener('change', () => { st.noChange = noChange.checked; syncChange(); if (!noChange.checked) fChange.input.focus(); });
      const checkChange = () => {
        if (noChange.checked) return true;
        const v = parseMoney(fChange.input.value);
        let msg = '';
        if (!fChange.input.value.trim()) msg = 'Diga para quanto é o troco ou marque "Não preciso de troco".';
        else if (!isFinite(v)) msg = 'Digite só o valor. Ex.: 50,00.';
        else if (v < total) msg = `O valor precisa ser igual ou maior que o total de ${money(total)}.`;
        setErr(fChange, msg); return !msg;
      };
      fChange.input.addEventListener('blur', () => { if (fChange.input.value) checkChange(); });
      fChange.input.addEventListener('input', () => { st.changeFor = fChange.input.value; if (fChange.wrap.classList.contains('is-invalid')) checkChange(); });

      const review = h('div', { class: 'co-review' },
        h('div', {}, h('span', { class: 'co-muted' }, 'Para'), h('span', {}, `${st.name} · ${st.phone}`)),
        h('div', {}, h('span', { class: 'co-muted' }, 'Entrega'), h('span', {}, addressLine(buildAddress()))));
      form.append(h('p', { class: 'co-lead' }, 'Como você quer pagar?'), list, detail, review);
      paintCards(); paintDetail();

      return {
        label: `Confirmar pedido · ${money(total)}`,
        validate() {
          if (st.method === 'pix' && !info.pixKey) st.method = 'cartao';
          if (st.method === 'dinheiro' && !checkChange()) { fChange.input.focus(); return false; }
          return true;
        }
      };
    }

    function buildAddress() {
      const manual = st.manual || st.geoState === 'error' || !st.geo;
      const a = {
        source: manual ? 'manual' : 'gps',
        lat: !manual ? st.geo.lat : null, lng: !manual ? st.geo.lng : null, accuracy: !manual ? Math.round(st.geo.accuracy) : null,
        number: st.number, complement: st.complement, district: manual ? st.district : '', reference: st.reference
      };
      const street = manual ? st.street : '';
      a.text = manual
        ? [street + (st.number ? ', ' + st.number : ''), st.complement, st.district].filter(Boolean).join(' · ')
        : `Localização GPS (${a.lat.toFixed(6)}, ${a.lng.toFixed(6)}) · nº ${st.number}` + (st.complement ? ' · ' + st.complement : '');
      a.street = street;
      return a;
    }

    function totals() {
      const sub = Cart.subtotal();
      const fee = Number(info.deliveryFee) || 0;
      return { sub, fee, total: Math.round((sub + fee) * 100) / 100 };
    }

    /* ---- Confirmar ---- */
    function confirm(btn) {
      btn.disabled = true; btn.textContent = 'Enviando pedido…';
      try {
        const address = buildAddress();
        const total = totals().total;
        const payment = { method: st.method, changeFor: null, cardType: null };
        if (st.method === 'dinheiro') payment.changeFor = st.noChange ? null : Math.round(parseMoney(st.changeFor) * 100) / 100;
        if (st.method === 'cartao') payment.cardType = st.cardType;
        const order = Store.createOrder({
          customer: { name: st.name, cpf: st.cpf, phone: st.phone },
          address,
          items: Cart.items().map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, unitPrice: it.unitPrice, options: it.options || [], removed: it.removed || [], note: it.note || '' })),
          payment,
          deliveryFee: Number(info.deliveryFee) || 0
        });
        saveCustomer({ name: st.name, cpf: st.cpf, phone: st.phone, street: st.street, number: st.number, complement: st.complement, district: st.district, reference: st.reference, method: st.method, cardType: st.cardType });
        Cart.clear();
        /* Hook de pagamento online (ver comentário em Checkout.onlinePayment). */
        if (typeof Checkout.onlinePayment === 'function' && st.method === 'online') {
          Promise.resolve(Checkout.onlinePayment(order)).then((r) => Store.updateOrder(order.id, { paymentResult: r })).catch(() => {});
        }
        Fiscal.emitir(order);
        showConfirmation(order.id, total);
      } catch (e) {
        console.error(e);
        btn.disabled = false; btn.textContent = 'Tentar de novo';
        UI.toast('Não conseguimos enviar o pedido. Confira sua conexão e tente de novo.', { tone: 'err', ms: 4000 });
      }
    }

    /* ---- Confirmação ---- */
    function showConfirmation(orderId) {
      stepper.remove();
      summary.el.remove();
      layout.classList.add('is-done');
      main.textContent = '';
      footer.textContent = '';
      const closeBtn = h('button', { class: 'btn btn--primary co-wide', type: 'button', id: 'co-done' }, 'Voltar ao cardápio');
      closeBtn.addEventListener('click', () => sheet.close());
      footer.append(closeBtn);
      const titleEl = sheet.el.querySelector('.sheet-title'); if (titleEl) titleEl.textContent = 'Pedido enviado';

      const getOrder = () => Store.orders().find((o) => o.id === orderId);
      const order = getOrder();
      const head = h('div', { class: 'co-done-head' },
        h('p', { class: 'co-done-kicker' }, 'Pedido'),
        h('p', { class: 'co-done-num' }, '#' + order.number),
        h('p', { class: 'co-muted' }, info.etaMin && info.etaMax ? `Previsão de entrega: ${info.etaMin}–${info.etaMax} min` : 'O restaurante já recebeu seu pedido.'));
      const timeline = h('ol', { class: 'co-timeline', 'aria-label': 'Andamento do pedido' });
      const pixBox = order.payment.method === 'pix' ? buildPix(order) : null;
      const payLine = h('p', { class: 'co-paid' }, paymentLine(order));
      const nfceBox = h('section', { class: 'co-nfce', 'aria-live': 'polite', 'aria-label': 'Nota fiscal' });
      const wa = buildWhatsApp(order);

      main.append(h('div', { class: 'co-done stack' }, head, timeline, pixBox, payLine, nfceBox, wa));
      sheet.body.scrollTop = 0;

      let lastNfce = '';
      function paint() {
        const o = getOrder(); if (!o) return;
        paintTimeline(timeline, o.status);
        const key = JSON.stringify(o.nfce || {});
        if (key !== lastNfce) { lastNfce = key; paintNfce(nfceBox, o); }
      }
      paint();
      current.unsub = Store.subscribe(paint);
    }

    function paymentLine(o) {
      const p = o.payment;
      if (p.method === 'pix') return `Pagamento: PIX de ${money(o.total)}`;
      if (p.method === 'cartao') return `Pagamento: cartão de ${p.cardType === 'debito' ? 'débito' : 'crédito'} na entrega · ${money(o.total)}`;
      return `Pagamento: dinheiro · ${money(o.total)}` + (p.changeFor ? ` · troco para ${money(p.changeFor)} (${money(p.changeFor - o.total)} de troco)` : ' · sem troco');
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

    function paintTimeline(el, status) {
      el.textContent = '';
      if (status === 'cancelado') {
        el.append(h('li', { class: 'co-tl is-cancel' }, h('span', { class: 'co-tl-dot' }), h('span', {}, 'Pedido cancelado. Fale com o restaurante pelo WhatsApp.')));
        return;
      }
      const idx = Math.max(0, STATUS.findIndex((s) => s.id === status));
      STATUS.forEach((s, i) => {
        el.append(h('li', { class: 'co-tl ' + (i < idx ? 'is-done' : i === idx ? 'is-now' : 'is-todo'), 'aria-current': i === idx ? 'step' : null },
          h('span', { class: 'co-tl-dot', 'aria-hidden': 'true' }), h('span', { class: 'co-tl-label' }, s.label)));
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
      const lines = [
        `*Pedido #${o.number}* · ${info.name || 'Spetitos Lanches'}`,
        ...o.items.map((it) => `${it.qty}x ${it.name}` + (it.options && it.options.length ? ` (+ ${it.options.map((x) => x.name).join(', ')})` : '') + (it.removed && it.removed.length ? ` (sem ${it.removed.join(', ')})` : '') + (it.note ? ` · obs: ${it.note}` : '') + ` — ${money(Store.linePrice(it))}`),
        `Entrega: ${money(o.deliveryFee)}`,
        `*Total: ${money(o.total)}*`,
        paymentLine(o),
        '',
        `Cliente: ${o.customer.name} · ${o.customer.phone}`,
        `Endereço: ${addressLine(o.address)}`,
        o.address.reference ? `Referência: ${o.address.reference}` : null,
        o.address.source === 'gps' ? `Mapa: https://www.google.com/maps?q=${o.address.lat},${o.address.lng}` : null
      ];
      const text = lines.filter((l) => l !== null && l !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');
      if (!num) return h('p', { class: 'co-muted co-wa-none' }, 'O restaurante ainda não cadastrou o WhatsApp. Guarde o número do pedido: #' + o.number + '.');
      const href = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
      return h('div', { class: 'co-wa stack' },
        h('a', { href, target: '_blank', rel: 'noopener', class: 'btn btn--ghost co-wide co-wa-btn', id: 'co-wa' }, 'Enviar resumo pelo WhatsApp'),
        h('p', { class: 'co-hint' }, 'Abre o WhatsApp com o resumo pronto. Envie para o restaurante: ' + maskPhone(digits(info.whatsapp).replace(/^55(?=\d{10,11}$)/, ''))));
    }

    render();
    return sheet;
  }

  function addressLine(a) {
    if (!a) return '';
    if (a.source === 'gps') return `Localização atual (GPS), nº ${a.number || 's/n'}` + (a.complement ? `, ${a.complement}` : '');
    return [a.street ? `${a.street}, ${a.number}` : a.text, a.complement, a.district].filter(Boolean).join(' · ');
  }

  /* ---------------- Resumo do pedido (sempre visível) ---------------- */
  function buildSummary(info) {
    const list = h('ul', { class: 'co-sum-items' });
    const rows = h('dl', { class: 'co-sum-totals' });
    const count = h('span', { class: 'co-sum-count' });
    const totalTop = h('span', { class: 'co-sum-total-top' });
    const det = h('details', { class: 'co-summary', id: 'co-summary' },
      h('summary', { class: 'co-sum-head' }, h('span', { class: 'co-sum-title' }, 'Seu pedido'), count, totalTop),
      list, rows);
    try { if (window.matchMedia('(min-width: 760px)').matches) det.open = true; } catch (e) {}
    function update() {
      const items = Cart.items();
      const sub = Cart.subtotal();
      const fee = Number(info.deliveryFee) || 0;
      list.textContent = '';
      items.forEach((it) => {
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
        h('div', {}, h('dt', {}, 'Subtotal'), h('dd', { class: 'co-num' }, money(sub))),
        h('div', {}, h('dt', {}, 'Entrega'), h('dd', { class: 'co-num' }, fee ? money(fee) : 'Grátis')),
        h('div', { class: 'co-sum-total' }, h('dt', {}, 'Total'), h('dd', { class: 'co-num' }, money(sub + fee))));
      const n = Cart.count();
      count.textContent = n + (n === 1 ? ' item' : ' itens');
      totalTop.textContent = money(sub + fee);
    }
    update();
    return { el: h('aside', { class: 'co-aside', 'aria-label': 'Resumo do pedido' }, det), update };
  }

  Checkout.open = open;
  Checkout.pixPayload = pixPayload;
  Checkout.validCPF = validCPF;
  window.Checkout = Checkout;
})();
