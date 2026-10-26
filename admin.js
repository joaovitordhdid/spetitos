/* Spetitos — Painel do dono (admin.js + admin.css).
   API pública: window.Admin = { open(), close() }. O botão "Painel do dono" do rodapé chama Admin.open().
   Também abre sozinho quando a página é carregada com o endereço terminado em #painel.

   Renderiza em #admin-root como uma tela cheia por cima do cardápio. Edições de produto
   usam UI.openSheet (as folhas ficam acima do painel: z-index 900 > 800).
   Usa SOMENTE a API de Store / Fiscal / UI. Toda mudança passa por Store, que emite e
   atualiza o cardápio do cliente ao vivo.

   SEGURANÇA — LEIA: este login é só uma porta de protótipo. O hash da senha fica no
   localStorage do próprio navegador, e qualquer pessoa com acesso ao aparelho (ou ao
   DevTools) consegue ler ou trocar os dados. Proteção de verdade exige autenticação
   no servidor (ex.: Supabase Auth com Row Level Security nas tabelas de produtos,
   pedidos e configurações), e o painel só deve receber dados depois que o servidor
   confirmar a sessão. */
(function () {
  'use strict';
  const h = (...a) => UI.h(...a);
  const money = (v) => Store.money(v);

  /* ---------- estado local do painel ---------- */
  const TABS = [
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'cardapio', label: 'Cardápio' },
    { id: 'estoque', label: 'Estoque' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'config', label: 'Configurações' }
  ];
  const ui = {
    tab: lsGet('spetitos:admin-tab') || 'pedidos',
    orderFilter: 'andamento',
    showExamples: false,
    orderLimit: 30,
    confirmCancel: null,     // id do pedido aguardando confirmação de cancelamento
    menuSearch: '',
    renamingCat: null,
    confirmDelCat: null,
    stockFilter: 'todos',
    stockSearch: '',
    enablingStock: null,     // id do produto com formulário "estoque inicial" aberto
    period: 7,
    includeExamples: true,
    confirmReset: false,
    emitting: new Set()
  };
  let root = null, overlay = null, panelEl = null, unsub = null, pending = false, isOpenFlag = false;
  let knownOrders = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- utilidades ---------- */
  const STATUS = {
    recebido: { label: 'Recebido', tone: 'accent' },
    preparo: { label: 'Em preparo', tone: 'warn' },
    saiu: { label: 'Saiu para entrega', tone: 'info' },
    entregue: { label: 'Entregue', tone: 'ok' },
    cancelado: { label: 'Cancelado', tone: 'err' }
  };
  const NEXT = {
    recebido: { to: 'preparo', label: 'Iniciar preparo' },
    preparo: { to: 'saiu', label: 'Saiu para entrega' },
    saiu: { to: 'entregue', label: 'Marcar entregue' }
  };
  const PAY = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };
  const NFCE = {
    pendente: { label: 'NFC-e pendente', tone: 'warn' },
    emitindo: { label: 'Emitindo NFC-e…', tone: 'info' },
    processando: { label: 'NFC-e em processamento', tone: 'info' },
    autorizada: { label: 'NFC-e autorizada', tone: 'ok' },
    erro: { label: 'Erro na NFC-e', tone: 'err' }
  };

  function parseNum(v) {
    let s = String(v ?? '').trim().replace(/[^\d,.-]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const fmtNum = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
  const fmtInt = (v) => (Number(v) || 0).toLocaleString('pt-BR');
  const fmtDateTime = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const digits = (s) => String(s || '').replace(/\D/g, '');
  function ago(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return 'há ' + m + ' min';
    const hh = Math.floor(m / 60);
    if (hh < 24) return 'há ' + hh + ' h ' + (m % 60 ? (m % 60) + ' min' : '');
    return 'há ' + Math.floor(hh / 24) + ' d';
  }
  function compactMoney(v) {
    if (v >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  }
  function catName(id) { const c = Store.categories().find((x) => x.id === id); return c ? c.name : 'Sem categoria'; }
  const statusBadge = (map, key) => {
    const s = map[key] || { label: key || '—', tone: 'muted' };
    return h('span', { class: 'adm-pill adm-pill--' + s.tone }, s.label);
  };

  /* Reduz a imagem para no máximo `max` px no lado maior e devolve JPEG em data URI. */
  function resizeImage(file, max = 800, quality = 0.78) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida ou corrompida.'));
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * s));
          c.height = Math.max(1, Math.round(img.height * s));
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff'; // fundo branco para PNG transparente virar JPEG limpo
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* O Store grava em localStorage e engole erro de cota. Fotos em data URI podem estourar
     o limite (~5 MB). Depois de salvar algo pesado, conferimos se a gravação aconteceu. */
  function checkPersisted() {
    try {
      const raw = localStorage.getItem('spetitos:v1');
      if (!raw || raw.length !== JSON.stringify(Store.get()).length) {
        UI.toast('O armazenamento do navegador está cheio. A alteração vale só até recarregar: use fotos por URL ou menores.', { tone: 'err', ms: 6000 });
        return false;
      }
    } catch (e) { /* sem acesso ao storage: nada a conferir */ }
    return true;
  }

  /* ---------- abrir / fechar / renderizar ---------- */
  function open() {
    root = document.getElementById('admin-root');
    if (!root) { root = h('div', { id: 'admin-root' }); document.body.append(root); }
    isOpenFlag = true;
    document.documentElement.classList.add('admin-open');
    if (!unsub) unsub = Store.subscribe(onStore);
    knownOrders = new Set(Store.orders().map((o) => o.id));
    render();
  }
  function close() {
    isOpenFlag = false;
    document.documentElement.classList.remove('admin-open');
    if (root) root.innerHTML = '';
    overlay = panelEl = null;
    if (location.hash === '#painel') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  }

  function onStore() {
    if (!isOpenFlag) return;
    // aviso de pedido novo enquanto o painel está aberto
    if (knownOrders && Store.isOwner()) {
      Store.orders().forEach((o) => {
        if (!knownOrders.has(o.id)) { knownOrders.add(o.id); if (!o.example) UI.toast('Novo pedido #' + o.number + ' de ' + (o.customer?.name || 'cliente')); }
      });
    }
    schedule();
  }
  /* Não redesenha enquanto o dono digita num campo do painel; espera ele sair do campo. */
  function schedule() {
    if (!overlay) return;
    const a = document.activeElement;
    if (a && overlay.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { pending = true; return; }
    pending = false;
    if (!Store.isOwner() || !panelEl) return render();
    renderPanel();
  }

  function render() {
    if (!root) return;
    root.innerHTML = '';
    overlay = h('div', { class: 'adm', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Painel do dono' });
    overlay.addEventListener('focusout', () => setTimeout(() => { if (pending) schedule(); }, 0));
    root.append(overlay);
    if (!Store.isOwner()) { panelEl = null; overlay.append(renderLogin()); return; }

    const tabsEl = h('div', { class: 'adm-tabs', role: 'tablist', 'aria-label': 'Seções do painel' });
    TABS.forEach((t) => {
      const b = h('button', {
        class: 'adm-tab', type: 'button', role: 'tab', id: 'adm-tab-' + t.id,
        'aria-selected': String(ui.tab === t.id), 'aria-controls': 'adm-panel',
        onclick: () => setTab(t.id)
      }, t.label);
      if (t.id === 'pedidos') { const n = activeOrderCount(); if (n) b.append(h('span', { class: 'adm-tab-count num', 'aria-label': n + ' em andamento' }, n)); }
      tabsEl.append(b);
    });

    const head = h('header', { class: 'adm-head' },
      h('div', { class: 'adm-head-in' },
        h('div', { class: 'adm-brand' },
          h('span', { class: 'adm-brand-name' }, Store.info().name || 'Spetitos'),
          h('span', { class: 'adm-brand-sub' }, 'Painel do dono')),
        h('div', { class: 'adm-head-actions' },
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-logout', onclick: () => { Store.logout(); } }, 'Sair'),
          h('button', { class: 'btn btn--sm', type: 'button', id: 'adm-close', onclick: close }, 'Ver cardápio'))),
      h('div', { class: 'adm-head-in adm-tabs-wrap' }, tabsEl));
    overlay.append(head);

    if (Store.usingDefaultPassword()) {
      overlay.append(h('div', { class: 'adm-banner', role: 'alert' },
        h('div', { class: 'adm-wrap adm-banner-in' },
          h('p', {}, h('strong', {}, 'Senha padrão em uso. '), 'Qualquer pessoa que conheça a senha de fábrica entra no painel. Troque o e-mail e a senha agora.'),
          h('button', { class: 'btn btn--primary btn--sm', type: 'button', id: 'adm-banner-go', onclick: () => { setTab('config'); setTimeout(() => { const el = document.getElementById('adm-cred'); el && el.scrollIntoView({ block: 'start', behavior: 'smooth' }); document.getElementById('adm-cred-email')?.focus({ preventScroll: true }); }, 30); } }, 'Trocar senha'))));
    }
    panelEl = h('main', { class: 'adm-wrap adm-panel', id: 'adm-panel', role: 'tabpanel', 'aria-labelledby': 'adm-tab-' + ui.tab });
    overlay.append(panelEl);
    renderPanel();
  }

  function setTab(id) {
    ui.tab = id; lsSet('spetitos:admin-tab', id);
    render();
    if (overlay) overlay.scrollTop = 0;
  }

  function renderPanel() {
    if (!panelEl) return;
    // atualiza contador da aba Pedidos sem redesenhar o cabeçalho
    const tabBtn = overlay.querySelector('#adm-tab-pedidos');
    if (tabBtn) { tabBtn.querySelector('.adm-tab-count')?.remove(); const n = activeOrderCount(); if (n) tabBtn.append(h('span', { class: 'adm-tab-count num' }, n)); }
    if (!!overlay.querySelector('.adm-banner') !== Store.usingDefaultPassword()) return render();
    const scroll = overlay.scrollTop;
    panelEl.innerHTML = '';
    const fn = { pedidos: tabPedidos, cardapio: tabCardapio, estoque: tabEstoque, financeiro: tabFinanceiro, config: tabConfig }[ui.tab] || tabPedidos;
    panelEl.append(fn());
    overlay.scrollTop = scroll;
    if (ui.tab === 'financeiro') drawCharts();
  }

  const activeOrderCount = () => Store.orders().filter((o) => !o.example && ['recebido', 'preparo', 'saiu'].includes(o.status)).length;

  /* ---------- login ---------- */
  function renderLogin() {
    const err = h('p', { class: 'adm-login-err', role: 'alert', hidden: true });
    const email = h('input', { class: 'input', id: 'adm-login-email', type: 'email', autocomplete: 'username', required: true, autofocus: true });
    const pass = h('input', { class: 'input', id: 'adm-login-pass', type: 'password', autocomplete: 'current-password', required: true });
    const submit = h('button', { class: 'btn btn--primary btn--block', type: 'submit', id: 'adm-login-submit' }, 'Entrar');
    const form = h('form', { class: 'adm-login stack', novalidate: true },
      h('div', { class: 'adm-login-head' },
        h('p', { class: 'adm-eyebrow' }, Store.info().name || 'Spetitos'),
        h('h1', { class: 'adm-login-title' }, 'Painel do dono'),
        h('p', { class: 'muted' }, 'Entre para ver pedidos, editar o cardápio e acompanhar o caixa.')),
      h('label', { class: 'field', for: 'adm-login-email' }, h('span', {}, 'E-mail'), email),
      h('label', { class: 'field', for: 'adm-login-pass' }, h('span', {}, 'Senha'), pass),
      err, submit,
      h('button', { class: 'btn btn--ghost btn--block', type: 'button', id: 'adm-login-back', onclick: close }, 'Voltar ao cardápio'),
      h('p', { class: 'field-hint' }, 'Protótipo: o acesso é verificado no próprio navegador. Para uso real, a loja precisa de login no servidor.'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      if (!email.value.trim() || !pass.value) { err.textContent = 'Preencha o e-mail e a senha.'; err.hidden = false; return; }
      submit.disabled = true; submit.textContent = 'Entrando…';
      let ok = false;
      try { ok = await Store.login(email.value, pass.value); } catch (x) { ok = false; }
      submit.disabled = false; submit.textContent = 'Entrar';
      if (!ok) { err.textContent = 'E-mail ou senha incorretos. Confira e tente de novo.'; err.hidden = false; pass.select(); return; }
      knownOrders = new Set(Store.orders().map((o) => o.id));
      render();
    });
    return h('div', { class: 'adm-login-wrap' }, form);
  }

  /* =====================================================================
     PEDIDOS
     ===================================================================== */
  function tabPedidos() {
    const all = Store.orders();
    const real = all.filter((o) => !o.example);
    const examples = all.filter((o) => o.example);
    const groups = {
      andamento: (o) => ['recebido', 'preparo', 'saiu'].includes(o.status),
      entregue: (o) => o.status === 'entregue',
      cancelado: (o) => o.status === 'cancelado',
      todos: () => true
    };
    const filt = groups[ui.orderFilter] || groups.todos;
    const byDate = (a, b) => b.createdAt.localeCompare(a.createdAt);
    let list = real.filter(filt).sort(byDate);
    if (ui.showExamples) list = list.concat(examples.filter(filt).sort(byDate));
    const shown = list.slice(0, ui.orderLimit);

    const chips = h('div', { class: 'row', role: 'group', 'aria-label': 'Filtrar pedidos' },
      ...[['andamento', 'Em andamento'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['todos', 'Todos']].map(([k, l]) => {
        const n = real.filter(groups[k]).length;
        return h('button', { class: 'chip', type: 'button', id: 'adm-of-' + k, 'aria-pressed': String(ui.orderFilter === k), onclick: () => { ui.orderFilter = k; ui.orderLimit = 30; renderPanel(); } }, l, h('span', { class: 'num adm-chip-n' }, n));
      }));
    const exToggle = examples.length ? h('label', { class: 'adm-check', for: 'adm-show-ex' },
      h('input', { type: 'checkbox', id: 'adm-show-ex', checked: ui.showExamples, onchange: (e) => { ui.showExamples = e.target.checked; renderPanel(); } }),
      'Mostrar ' + fmtInt(examples.length) + ' pedidos de exemplo') : '';

    const wrap = h('section', { class: 'stack', style: '--gap:16px' },
      h('div', { class: 'adm-section-head' }, h('h2', { class: 'adm-h2' }, 'Pedidos'), exToggle),
      chips);
    if (!shown.length) {
      wrap.append(h('div', { class: 'adm-empty' },
        h('p', { class: 'adm-empty-title' }, ui.orderFilter === 'andamento' ? 'Nenhum pedido em andamento' : 'Nenhum pedido aqui'),
        h('p', { class: 'muted' }, real.length ? 'Os pedidos novos aparecem aqui assim que o cliente finaliza a compra.' : 'Ainda não chegou nenhum pedido real. Quando um cliente finalizar a compra no cardápio, ele aparece aqui na hora.')));
    } else {
      wrap.append(h('div', { class: 'adm-orders' }, ...shown.map(orderCard)));
      if (list.length > shown.length) wrap.append(h('button', { class: 'btn btn--ghost', type: 'button', id: 'adm-more-orders', onclick: () => { ui.orderLimit += 30; renderPanel(); } }, 'Mostrar mais (' + (list.length - shown.length) + ')'));
    }
    return wrap;
  }

  function orderCard(o) {
    const c = o.customer || {};
    const a = o.address || {};
    const p = o.payment || {};
    const nf = o.nfce || { status: 'pendente' };
    const card = h('article', { class: 'adm-card adm-order adm-order--' + o.status + (o.example ? ' is-example' : '') });

    card.append(h('div', { class: 'adm-order-top' },
      h('div', { class: 'adm-order-id' },
        h('span', { class: 'adm-order-num num' }, '#' + o.number),
        h('span', { class: 'muted adm-small' }, fmtDateTime(o.createdAt) + (['recebido', 'preparo', 'saiu'].includes(o.status) ? ' · ' + ago(o.createdAt) : ''))),
      h('div', { class: 'row', style: '--gap:6px' },
        o.example ? h('span', { class: 'adm-pill adm-pill--muted' }, 'Exemplo') : '',
        statusBadge(STATUS, o.status))));

    // cliente
    const phone = c.phone || '';
    const wa = digits(phone).length >= 10 ? 'https://wa.me/55' + digits(phone).replace(/^55(?=\d{10,11}$)/, '') : '';
    card.append(h('div', { class: 'adm-order-grid' },
      h('div', { class: 'adm-kv' }, h('span', { class: 'adm-k' }, 'Cliente'),
        h('span', { class: 'adm-v' }, h('strong', {}, c.name || '—')),
        c.cpf ? h('span', { class: 'adm-v num' }, 'CPF ' + c.cpf) : '',
        phone ? h('span', { class: 'adm-v row', style: '--gap:8px' }, h('span', { class: 'num adm-select' }, phone),
          wa ? h('a', { href: wa, target: '_blank', rel: 'noopener' }, 'WhatsApp') : '') : ''),
      h('div', { class: 'adm-kv' }, h('span', { class: 'adm-k' }, 'Entrega'), ...addressLines(a)),
      h('div', { class: 'adm-kv' }, h('span', { class: 'adm-k' }, 'Pagamento'),
        h('span', { class: 'adm-v' }, PAY[p.method] || p.method || '—', p.status ? ' · ' + p.status : ''),
        p.changeFor ? h('span', { class: 'adm-v num' }, 'Troco para ' + money(p.changeFor) + ' (devolver ' + money(Math.max(0, p.changeFor - o.total)) + ')') : '')));

    // itens
    const items = h('ul', { class: 'adm-items' });
    (o.items || []).forEach((it) => {
      const det = [];
      (it.options || []).forEach((op) => det.push('+ ' + (op.qty > 1 ? op.qty + 'x ' : '') + op.name));
      (it.removed || []).forEach((r) => det.push('sem ' + r));
      items.append(h('li', {},
        h('div', { class: 'adm-item-row' },
          h('span', {}, h('strong', { class: 'num' }, it.qty + 'x '), it.name),
          h('span', { class: 'num' }, money(Store.linePrice(it)))),
        det.length ? h('div', { class: 'adm-small muted' }, det.join(' · ')) : '',
        it.note ? h('div', { class: 'adm-small adm-note' }, 'Obs.: ' + it.note) : ''));
    });
    card.append(items);
    card.append(h('div', { class: 'adm-totals' },
      h('span', { class: 'muted adm-small num' }, 'Subtotal ' + money(o.subtotal) + ' · Entrega ' + money(o.deliveryFee)),
      h('span', { class: 'adm-total num' }, money(o.total))));

    // NFC-e
    const nfRow = h('div', { class: 'adm-nf' }, statusBadge(NFCE, nf.status));
    if (nf.status === 'autorizada') {
      nfRow.append(h('span', { class: 'adm-small muted num' }, 'Nº ' + (nf.numero ?? '—') + (nf.serie ? ' · série ' + nf.serie : '') + (nf.provider === 'simulado' ? ' · demonstração' : '')));
      if (nf.chave) nfRow.append(h('code', { class: 'adm-chave' }, Fiscal.formatChave(nf.chave)));
      if (nf.urlDanfe) nfRow.append(h('a', { href: nf.urlDanfe, target: '_blank', rel: 'noopener', class: 'adm-small' }, 'Abrir DANFE'));
    }
    if (nf.status === 'erro' && nf.erro) nfRow.append(h('span', { class: 'adm-small adm-err-text' }, nf.erro));
    if ((nf.status === 'pendente' || nf.status === 'erro') && o.status !== 'cancelado' && !o.example) {
      const busy = ui.emitting.has(o.id);
      nfRow.append(h('button', {
        class: 'btn btn--sm', type: 'button', id: 'adm-nf-' + o.id, disabled: busy,
        onclick: async () => {
          ui.emitting.add(o.id); renderPanel();
          const r = await Fiscal.emitir(Store.orders().find((x) => x.id === o.id) || o);
          ui.emitting.delete(o.id);
          UI.toast(r && r.nfce && r.nfce.status === 'autorizada' ? 'NFC-e do pedido #' + o.number + ' autorizada' : 'Não foi possível emitir: ' + ((r && r.nfce && r.nfce.erro) || 'tente de novo'), { tone: r && r.nfce && r.nfce.status === 'autorizada' ? 'ok' : 'err' });
          renderPanel();
        }
      }, busy ? 'Emitindo…' : (nf.status === 'erro' ? 'Tentar emitir de novo' : 'Emitir NFC-e')));
    }
    card.append(nfRow);

    // ações de status
    if (!o.example && o.status !== 'entregue' && o.status !== 'cancelado') {
      const act = h('div', { class: 'adm-order-actions' });
      if (ui.confirmCancel === o.id) {
        act.append(h('div', { class: 'adm-confirm', role: 'alert' },
          h('p', {}, 'Cancelar o pedido #' + o.number + '? O cliente não é avisado automaticamente e o estoque não volta sozinho.'),
          h('div', { class: 'row' },
            h('button', { class: 'btn btn--danger btn--sm', type: 'button', id: 'adm-cancel-yes-' + o.id, onclick: () => { ui.confirmCancel = null; Store.updateOrder(o.id, { status: 'cancelado', canceledAt: new Date().toISOString() }); UI.toast('Pedido #' + o.number + ' cancelado', { tone: 'warn' }); } }, 'Sim, cancelar pedido'),
            h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-cancel-no-' + o.id, onclick: () => { ui.confirmCancel = null; renderPanel(); } }, 'Manter'))));
      } else {
        const nx = NEXT[o.status];
        if (nx) act.append(h('button', { class: 'btn btn--primary btn--sm', type: 'button', id: 'adm-next-' + o.id, onclick: () => { const patch = { status: nx.to }; patch[nx.to + 'At'] = new Date().toISOString(); Store.updateOrder(o.id, patch); } }, nx.label));
        act.append(h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-cancel-' + o.id, onclick: () => { ui.confirmCancel = o.id; renderPanel(); } }, 'Cancelar'));
        act.append(statusStepper(o.status));
      }
      card.append(act);
    }
    return card;
  }

  function statusStepper(st) {
    const order = ['recebido', 'preparo', 'saiu', 'entregue'];
    const idx = order.indexOf(st);
    return h('ol', { class: 'adm-steps', 'aria-label': 'Andamento do pedido' },
      ...order.map((s, i) => h('li', { class: i <= idx ? 'is-done' : '', 'aria-current': i === idx ? 'step' : null }, STATUS[s].label)));
  }

  function addressLines(a) {
    const out = [];
    const line1 = [a.text, a.number].filter(Boolean).join(', ');
    if (line1) out.push(h('span', { class: 'adm-v' }, line1));
    if (a.complement) out.push(h('span', { class: 'adm-v' }, a.complement));
    if (a.reference) out.push(h('span', { class: 'adm-v muted' }, 'Ref.: ' + a.reference));
    if (a.lat != null && a.lng != null) {
      out.push(h('span', { class: 'adm-v row', style: '--gap:8px' },
        h('a', { href: 'https://www.google.com/maps?q=' + a.lat + ',' + a.lng, target: '_blank', rel: 'noopener' }, 'Abrir no Google Maps'),
        a.accuracy ? h('span', { class: 'adm-small muted num' }, 'precisão ~' + Math.round(a.accuracy) + ' m') : ''));
    } else if (line1 && !/exemplo/i.test(line1)) {
      out.push(h('a', { class: 'adm-v', href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(line1), target: '_blank', rel: 'noopener' }, 'Buscar no Google Maps'));
    }
    if (!out.length) out.push(h('span', { class: 'adm-v muted' }, 'Sem endereço'));
    return out;
  }

  /* =====================================================================
     CARDÁPIO
     ===================================================================== */
  function tabCardapio() {
    const cats = Store.categories();
    const prods = Store.products({ includeInactive: true });
    const q = ui.menuSearch.trim().toLowerCase();
    const match = (p) => !q || (p.name + ' ' + (p.desc || '')).toLowerCase().includes(q);

    const search = h('input', { class: 'input', id: 'adm-menu-search', type: 'search', placeholder: 'Buscar produto', value: ui.menuSearch, 'aria-label': 'Buscar produto' });
    search.addEventListener('input', () => { ui.menuSearch = search.value; const pos = search.selectionStart; renderPanel(); const s2 = document.getElementById('adm-menu-search'); if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} } });

    const wrap = h('section', { class: 'stack', style: '--gap:18px' },
      h('div', { class: 'adm-section-head' },
        h('h2', { class: 'adm-h2' }, 'Cardápio'),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn--primary btn--sm', type: 'button', id: 'adm-add-product', onclick: () => openProductSheet(null) }, 'Novo produto'),
          h('button', { class: 'btn btn--sm', type: 'button', id: 'adm-add-cat', onclick: addCategory }, 'Nova categoria'))),
      h('p', { class: 'muted adm-small' }, fmtInt(prods.length) + ' produtos em ' + cats.length + ' categorias · ' + prods.filter((p) => !p.active).length + ' pausados. As mudanças aparecem no cardápio na hora.'),
      search);

    const sections = cats.map((c, i) => ({ c, i, items: prods.filter((p) => p.catId === c.id) }));
    const orphans = prods.filter((p) => !cats.some((c) => c.id === p.catId));
    sections.forEach(({ c, i, items }) => {
      const vis = items.filter(match);
      if (q && !vis.length) return;
      wrap.append(categoryBlock(c, i, cats.length, items, vis));
    });
    if (orphans.filter(match).length) wrap.append(categoryBlock(null, -1, 0, orphans, orphans.filter(match)));
    if (q && !prods.some(match)) wrap.append(h('div', { class: 'adm-empty' }, h('p', { class: 'adm-empty-title' }, 'Nenhum produto com "' + ui.menuSearch + '"')));
    return wrap;
  }

  function categoryBlock(c, i, n, items, vis) {
    const box = h('div', { class: 'adm-card adm-cat' });
    const head = h('div', { class: 'adm-cat-head' });
    if (c && ui.renamingCat === c.id) {
      const inp = h('input', { class: 'input', id: 'adm-cat-name-' + c.id, value: c.name, 'aria-label': 'Nome da categoria' });
      const save = () => { const v = inp.value.trim(); if (!v) { inp.setAttribute('aria-invalid', 'true'); return; } ui.renamingCat = null; Store.upsertCategory(Object.assign({}, c, { name: v })); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { e.stopPropagation(); ui.renamingCat = null; renderPanel(); } });
      head.append(h('div', { class: 'adm-cat-rename' }, inp,
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', id: 'adm-cat-save-' + c.id, onclick: save }, 'Salvar'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-cat-cancel-' + c.id, onclick: () => { ui.renamingCat = null; renderPanel(); } }, 'Cancelar')));
      setTimeout(() => { const el = document.getElementById('adm-cat-name-' + c.id); el && el.focus(); }, 0);
    } else {
      head.append(h('h3', { class: 'adm-cat-title' }, c ? c.name : 'Sem categoria', h('span', { class: 'adm-small muted num' }, ' ' + items.length)));
      if (c) head.append(h('div', { class: 'adm-cat-tools' },
        h('button', { class: 'adm-icon-btn', type: 'button', id: 'adm-cat-up-' + c.id, 'aria-label': 'Subir categoria ' + c.name, disabled: i === 0, onclick: () => moveCategory(c.id, -1) }, '↑'),
        h('button', { class: 'adm-icon-btn', type: 'button', id: 'adm-cat-down-' + c.id, 'aria-label': 'Descer categoria ' + c.name, disabled: i === n - 1, onclick: () => moveCategory(c.id, 1) }, '↓'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-cat-ren-' + c.id, onclick: () => { ui.renamingCat = c.id; renderPanel(); } }, 'Renomear'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-cat-add-' + c.id, onclick: () => openProductSheet(null, c.id) }, '+ Produto'),
        h('button', { class: 'btn btn--danger btn--sm', type: 'button', id: 'adm-cat-del-' + c.id, onclick: () => { ui.confirmDelCat = c.id; renderPanel(); } }, 'Excluir')));
      else head.append(h('p', { class: 'adm-small muted' }, 'Abra cada produto e escolha uma categoria para ele aparecer no cardápio no lugar certo.'));
    }
    box.append(head);
    if (c && ui.confirmDelCat === c.id) {
      box.append(h('div', { class: 'adm-confirm', role: 'alert' },
        items.length
          ? h('p', {}, 'A categoria "' + c.name + '" tem ' + items.length + ' produto(s). Mova ou exclua esses produtos antes de apagar a categoria.')
          : h('p', {}, 'Excluir a categoria "' + c.name + '"? Ela está vazia.'),
        h('div', { class: 'row' },
          items.length ? '' : h('button', { class: 'btn btn--danger btn--sm', type: 'button', id: 'adm-cat-del-yes-' + c.id, onclick: () => { ui.confirmDelCat = null; Store.deleteCategory(c.id); UI.toast('Categoria excluída'); } }, 'Sim, excluir'),
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-cat-del-no-' + c.id, onclick: () => { ui.confirmDelCat = null; renderPanel(); } }, items.length ? 'Entendi' : 'Cancelar'))));
    }
    if (!items.length) box.append(h('p', { class: 'muted adm-small adm-cat-empty' }, 'Nenhum produto nesta categoria.'));
    const list = h('ul', { class: 'adm-plist' });
    vis.forEach((p) => list.append(productRow(p)));
    box.append(list);
    return box;
  }

  function productRow(p) {
    const price = h('input', { class: 'input adm-price-input num', id: 'adm-price-' + p.id, inputmode: 'decimal', value: fmtNum(p.price), 'aria-label': 'Preço de ' + p.name });
    const commit = () => {
      const v = parseNum(price.value);
      if (!Number.isFinite(v) || v < 0) { price.setAttribute('aria-invalid', 'true'); UI.toast('Preço inválido. Use números, ex.: 12,50', { tone: 'err' }); return; }
      price.removeAttribute('aria-invalid');
      if (Math.round(v * 100) === Math.round(p.price * 100)) { price.value = fmtNum(p.price); return; }
      const cur = Store.product(p.id);
      Store.upsertProduct(Object.assign({}, cur, { price: Math.round(v * 100) / 100 }));
      UI.toast(p.name + ': ' + money(v));
    };
    price.addEventListener('change', commit);
    price.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); price.blur(); } });

    const sw = h('input', { type: 'checkbox', class: 'adm-switch-input', id: 'adm-active-' + p.id, checked: p.active, role: 'switch' });
    sw.addEventListener('change', () => { const cur = Store.product(p.id); Store.upsertProduct(Object.assign({}, cur, { active: sw.checked })); UI.toast(p.name + (sw.checked ? ' voltou ao cardápio' : ' pausado'), { tone: sw.checked ? 'ok' : 'warn' }); });

    const stockTag = p.stock === null ? '' : p.stock <= 0 ? h('span', { class: 'adm-pill adm-pill--err' }, 'Esgotado') : p.stock <= (p.minStock || 0) ? h('span', { class: 'adm-pill adm-pill--warn num' }, 'Estoque ' + p.stock) : '';
    return h('li', { class: 'adm-prow' + (p.active ? '' : ' is-paused') },
      h('div', { class: 'adm-thumb', 'aria-hidden': 'true' }, p.img ? h('img', { src: p.img, alt: '', loading: 'lazy' }) : h('span', {}, (p.name || '?').slice(0, 1))),
      h('div', { class: 'adm-prow-main' },
        h('button', { class: 'adm-prow-name', type: 'button', id: 'adm-edit-' + p.id, onclick: () => openProductSheet(p.id) }, p.name || '(sem nome)'),
        h('div', { class: 'row adm-small muted', style: '--gap:6px' },
          p.active ? '' : h('span', { class: 'adm-pill adm-pill--muted' }, 'Pausado'), stockTag,
          (p.optionGroups || []).length ? h('span', {}, p.optionGroups.length + ' grupo(s) de opções') : '',
          p.cost ? h('span', { class: 'num' }, 'custo ' + money(p.cost)) : '')),
      h('div', { class: 'adm-prow-ctrl' },
        h('label', { class: 'adm-price', for: 'adm-price-' + p.id }, h('span', { class: 'muted' }, 'R$'), price),
        h('label', { class: 'adm-switch', for: 'adm-active-' + p.id, title: p.active ? 'Ativo no cardápio' : 'Pausado' }, sw, h('span', { class: 'adm-switch-ui', 'aria-hidden': 'true' }), h('span', { class: 'visually-hidden' }, 'Ativo no cardápio')),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-editbtn-' + p.id, onclick: () => openProductSheet(p.id) }, 'Editar')));
  }

  function moveCategory(id, dir) {
    const cats = Store.categories().map((c, i) => Object.assign({}, c, { order: (i + 1) * 10 }));
    const i = cats.findIndex((c) => c.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= cats.length) return;
    const a = cats[i].order; cats[i].order = cats[j].order; cats[j].order = a;
    // grava todas (normaliza ordens antigas iguais ou faltando)
    cats.forEach((c) => Store.upsertCategory(c));
  }
  function addCategory() {
    const cats = Store.categories();
    const max = cats.reduce((m, c) => Math.max(m, c.order || 0), 0);
    const c = Store.upsertCategory({ name: 'Nova categoria', order: max + 10 });
    ui.renamingCat = c.id; renderPanel();
  }

  /* ---------- folha de edição de produto ---------- */
  function openProductSheet(id, presetCat) {
    const cats = Store.categories();
    const isNew = !id;
    const src = isNew ? null : Store.product(id);
    if (!isNew && !src) return;
    const d = isNew
      ? { id: null, catId: presetCat || (cats[0] && cats[0].id) || '', name: '', desc: '', price: 0, cost: 0, img: '', tag: '', active: true, ingredients: [], optionGroups: [], stock: null, minStock: 5 }
      : Store.clone(src);
    d.ingredients = d.ingredients || []; d.optionGroups = d.optionGroups || [];
    let confirmDel = false;

    const fld = (label, input, hint) => h('label', { class: 'field', for: input.id }, h('span', {}, label), input, hint ? h('span', { class: 'field-hint' }, hint) : '');
    const name = h('input', { class: 'input', id: 'adm-p-name', value: d.name, required: true, autofocus: true });
    const desc = h('textarea', { class: 'input', id: 'adm-p-desc', rows: 3 }, d.desc || '');
    const price = h('input', { class: 'input num', id: 'adm-p-price', inputmode: 'decimal', value: fmtNum(d.price) });
    const cost = h('input', { class: 'input num', id: 'adm-p-cost', inputmode: 'decimal', value: fmtNum(d.cost) });
    const cat = h('select', { class: 'input', id: 'adm-p-cat' }, ...cats.map((c) => h('option', { value: c.id, selected: c.id === d.catId }, c.name)), cats.some((c) => c.id === d.catId) ? '' : h('option', { value: '', selected: true }, 'Sem categoria'));
    const tag = h('input', { class: 'input', id: 'adm-p-tag', value: d.tag || '', placeholder: 'ex.: Mais pedido', maxlength: 24 });
    const margin = h('span', { class: 'field-hint num', id: 'adm-p-margin' });
    const updMargin = () => { const pv = parseNum(price.value), cv = parseNum(cost.value); margin.textContent = Number.isFinite(pv) && pv > 0 && Number.isFinite(cv) ? 'Margem estimada ' + money(pv - cv) + ' (' + Math.round(((pv - cv) / pv) * 100) + '%)' : ''; };
    price.addEventListener('input', updMargin); cost.addEventListener('input', updMargin); updMargin();

    // foto
    const preview = h('div', { class: 'adm-photo-prev' });
    const photoErr = h('p', { class: 'field-hint adm-err-text', hidden: true });
    const url = h('input', { class: 'input', id: 'adm-p-imgurl', type: 'url', placeholder: 'https://…', value: /^data:/.test(d.img) ? '' : (d.img || '') });
    const file = h('input', { type: 'file', id: 'adm-p-file', accept: 'image/*', class: 'adm-file' });
    const drawPreview = () => {
      preview.innerHTML = '';
      if (d.img) preview.append(h('img', { src: d.img, alt: 'Foto de ' + (name.value || 'produto') }), h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-p-imgdel', onclick: () => { d.img = ''; url.value = ''; drawPreview(); } }, 'Remover foto'));
      else preview.append(h('span', { class: 'muted adm-small' }, 'Sem foto'));
    };
    file.addEventListener('change', async () => {
      photoErr.hidden = true;
      const f = file.files && file.files[0]; if (!f) return;
      try { d.img = await resizeImage(f, 800); url.value = ''; drawPreview(); }
      catch (e) { photoErr.textContent = e.message; photoErr.hidden = false; }
      file.value = '';
    });
    url.addEventListener('change', () => { const v = url.value.trim(); if (v) { d.img = v; drawPreview(); } });
    drawPreview();

    // ingredientes
    const ingBox = h('div', { class: 'stack', style: '--gap:8px' });
    const drawIng = () => {
      ingBox.innerHTML = '';
      if (!d.ingredients.length) ingBox.append(h('p', { class: 'muted adm-small' }, 'Nenhum ingrediente listado. Liste os que o cliente pode pedir para tirar (ex.: cebola, tomate).'));
      d.ingredients.forEach((ing, i) => {
        const n = h('input', { class: 'input', id: 'adm-ing-' + i + '-name', value: ing.name || '', placeholder: 'Ingrediente', 'aria-label': 'Ingrediente ' + (i + 1) });
        n.addEventListener('input', () => { ing.name = n.value; });
        const r = h('input', { type: 'checkbox', id: 'adm-ing-' + i + '-rem', checked: !!ing.removable });
        r.addEventListener('change', () => { ing.removable = r.checked; });
        ingBox.append(h('div', { class: 'adm-ing-row' }, n,
          h('label', { class: 'adm-check', for: 'adm-ing-' + i + '-rem' }, r, 'Cliente pode retirar'),
          h('button', { class: 'adm-icon-btn', type: 'button', id: 'adm-ing-' + i + '-del', 'aria-label': 'Remover ingrediente ' + (ing.name || i + 1), onclick: () => { d.ingredients.splice(i, 1); drawIng(); } }, '×')));
      });
      ingBox.append(h('button', { class: 'btn btn--ghost btn--sm adm-self-start', type: 'button', id: 'adm-ing-add', onclick: () => { d.ingredients.push({ name: '', removable: true }); drawIng(); document.getElementById('adm-ing-' + (d.ingredients.length - 1) + '-name')?.focus(); } }, '+ Ingrediente'));
    };
    drawIng();

    // grupos de opções
    const grpBox = h('div', { class: 'stack', style: '--gap:12px' });
    const drawGroups = () => {
      grpBox.innerHTML = '';
      if (!d.optionGroups.length) grpBox.append(h('p', { class: 'muted adm-small' }, 'Sem adicionais. Crie um grupo para oferecer escolhas como ponto da carne, molhos ou adicionais pagos.'));
      d.optionGroups.forEach((g, gi) => {
        const gname = h('input', { class: 'input', id: 'adm-g-' + gi + '-name', value: g.name || '', placeholder: 'Nome do grupo (ex.: Adicionais)' });
        gname.addEventListener('input', () => { g.name = gname.value; });
        const gmin = h('input', { class: 'input num', id: 'adm-g-' + gi + '-min', type: 'number', min: 0, step: 1, value: g.min ?? 0 });
        const gmax = h('input', { class: 'input num', id: 'adm-g-' + gi + '-max', type: 'number', min: 1, step: 1, value: g.max ?? 1 });
        gmin.addEventListener('input', () => { g.min = Math.max(0, parseInt(gmin.value, 10) || 0); });
        gmax.addEventListener('input', () => { g.max = Math.max(1, parseInt(gmax.value, 10) || 1); });
        const opts = h('div', { class: 'stack', style: '--gap:6px' });
        (g.options = g.options || []).forEach((op, oi) => {
          const on = h('input', { class: 'input', id: 'adm-g-' + gi + '-o-' + oi + '-name', value: op.name || '', placeholder: 'Opção', 'aria-label': 'Nome da opção ' + (oi + 1) });
          on.addEventListener('input', () => { op.name = on.value; });
          const opPrice = h('input', { class: 'input num', id: 'adm-g-' + gi + '-o-' + oi + '-price', inputmode: 'decimal', value: fmtNum(op.price), 'aria-label': 'Preço adicional da opção ' + (oi + 1) });
          opPrice.addEventListener('input', () => { const v = parseNum(opPrice.value); op.price = Number.isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0; });
          opts.append(h('div', { class: 'adm-opt-row' }, on,
            h('label', { class: 'adm-price', for: opPrice.id }, h('span', { class: 'muted' }, '+R$'), opPrice),
            h('button', { class: 'adm-icon-btn', type: 'button', id: 'adm-g-' + gi + '-o-' + oi + '-del', 'aria-label': 'Remover opção ' + (op.name || oi + 1), onclick: () => { g.options.splice(oi, 1); drawGroups(); } }, '×')));
        });
        grpBox.append(h('fieldset', { class: 'adm-group' },
          h('legend', { class: 'visually-hidden' }, 'Grupo ' + (gi + 1)),
          h('div', { class: 'adm-group-head' },
            h('label', { class: 'field adm-grow', for: gname.id }, h('span', {}, 'Grupo'), gname),
            h('label', { class: 'field adm-narrow', for: gmin.id }, h('span', {}, 'Mín.'), gmin),
            h('label', { class: 'field adm-narrow', for: gmax.id }, h('span', {}, 'Máx.'), gmax)),
          h('p', { class: 'field-hint' }, 'Mín. 0 = opcional. Mín. 1 = o cliente precisa escolher. Máx. = quantas opções ele pode marcar.'),
          opts,
          h('div', { class: 'row' },
            h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-g-' + gi + '-addopt', onclick: () => { g.options.push({ id: Store.uid('o'), name: '', price: 0 }); drawGroups(); document.getElementById('adm-g-' + gi + '-o-' + (g.options.length - 1) + '-name')?.focus(); } }, '+ Opção'),
            h('button', { class: 'btn btn--danger btn--sm', type: 'button', id: 'adm-g-' + gi + '-del', onclick: () => { d.optionGroups.splice(gi, 1); drawGroups(); } }, 'Remover grupo'))));
      });
      grpBox.append(h('button', { class: 'btn btn--ghost btn--sm adm-self-start', type: 'button', id: 'adm-g-add', onclick: () => { d.optionGroups.push({ id: Store.uid('g'), name: '', min: 0, max: 1, options: [{ id: Store.uid('o'), name: '', price: 0 }] }); drawGroups(); document.getElementById('adm-g-' + (d.optionGroups.length - 1) + '-name')?.focus(); } }, '+ Grupo de opções'));
    };
    drawGroups();

    const errBox = h('p', { class: 'adm-login-err', role: 'alert', hidden: true });
    const content = h('div', { class: 'stack adm-form', style: '--gap:20px' },
      h('section', { class: 'stack' },
        fld('Nome', name),
        fld('Descrição', desc),
        h('div', { class: 'adm-grid2' }, fld('Preço de venda (R$)', price), fld('Custo (R$)', cost, 'Usado no lucro estimado do Financeiro.')),
        margin,
        h('div', { class: 'adm-grid2' }, fld('Categoria', cat), fld('Selo (opcional)', tag))),
      h('section', { class: 'stack' },
        h('h3', { class: 'adm-h3' }, 'Foto'),
        preview,
        h('div', { class: 'adm-grid2' },
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Enviar do aparelho'),
            h('label', { class: 'btn btn--sm adm-file-btn', for: 'adm-p-file' }, 'Escolher imagem', file),
            h('span', { class: 'field-hint' }, 'Reduzida para até 800 px e salva como JPEG.')),
          fld('Ou endereço da imagem (URL)', url)),
        photoErr),
      h('section', { class: 'stack' }, h('h3', { class: 'adm-h3' }, 'Ingredientes'), ingBox),
      h('section', { class: 'stack' }, h('h3', { class: 'adm-h3' }, 'Opções e adicionais'), grpBox),
      errBox);

    const foot = h('div', { class: 'adm-sheet-foot' });
    let sheet;
    const save = () => {
      errBox.hidden = true;
      const pv = parseNum(price.value), cv = parseNum(cost.value || '0');
      const problems = [];
      if (!name.value.trim()) problems.push('o nome');
      if (!Number.isFinite(pv) || pv < 0) problems.push('um preço válido');
      if (!Number.isFinite(cv) || cv < 0) problems.push('um custo válido');
      d.optionGroups.forEach((g, gi) => { if (!String(g.name || '').trim()) problems.push('o nome do grupo ' + (gi + 1)); if ((g.min || 0) > (g.max || 1)) problems.push('mín. ≤ máx. no grupo "' + (g.name || gi + 1) + '"'); });
      if (problems.length) { errBox.textContent = 'Preencha ' + problems.join(', ') + '.'; errBox.hidden = false; errBox.scrollIntoView({ block: 'nearest' }); return; }
      d.name = name.value.trim(); d.desc = desc.value.trim();
      d.price = Math.round(pv * 100) / 100; d.cost = Math.round(cv * 100) / 100;
      d.catId = cat.value; d.tag = tag.value.trim() || undefined;
      d.ingredients = d.ingredients.filter((x) => String(x.name || '').trim()).map((x) => ({ name: x.name.trim(), removable: !!x.removable }));
      d.optionGroups = d.optionGroups.map((g) => Object.assign({}, g, { name: g.name.trim(), options: g.options.filter((o) => String(o.name || '').trim()).map((o) => Object.assign({}, o, { name: o.name.trim() })) }));
      // preserva campos que outro módulo possa ter alterado (estoque) enquanto a folha estava aberta
      if (!isNew) { const cur = Store.product(d.id); if (cur) { d.stock = cur.stock; } }
      if (isNew) delete d.id;
      Store.upsertProduct(d);
      if (/^data:/.test(d.img || '')) checkPersisted();
      UI.toast(isNew ? 'Produto criado' : 'Produto salvo');
      sheet.close();
    };
    const drawFoot = () => {
      foot.innerHTML = '';
      if (confirmDel) {
        foot.append(h('div', { class: 'adm-confirm adm-grow', role: 'alert' },
          h('p', {}, 'Excluir "' + (src.name) + '" de vez? Ele sai do cardápio e do estoque. Pedidos antigos continuam no histórico.'),
          h('div', { class: 'row' },
            h('button', { class: 'btn btn--danger btn--sm', type: 'button', id: 'adm-p-del-yes', onclick: () => { Store.deleteProduct(src.id); UI.toast('Produto excluído', { tone: 'warn' }); sheet.close(); } }, 'Sim, excluir produto'),
            h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-p-del-no', onclick: () => { confirmDel = false; drawFoot(); } }, 'Cancelar'))));
        return;
      }
      if (!isNew) foot.append(h('button', { class: 'btn btn--danger', type: 'button', id: 'adm-p-del', onclick: () => { confirmDel = true; drawFoot(); } }, 'Excluir'));
      foot.append(h('button', { class: 'btn btn--ghost', type: 'button', id: 'adm-p-cancel', onclick: () => sheet.close() }, 'Cancelar'));
      foot.append(h('button', { class: 'btn btn--primary', type: 'button', id: 'adm-p-save', onclick: save }, isNew ? 'Criar produto' : 'Salvar'));
    };
    drawFoot();
    sheet = UI.openSheet({ title: isNew ? 'Novo produto' : 'Editar produto', content, footer: foot, size: 'lg', className: 'adm-sheet' });
  }

  /* =====================================================================
     ESTOQUE
     ===================================================================== */
  function tabEstoque() {
    const cats = Store.categories();
    const catIdx = new Map(cats.map((c, i) => [c.id, i]));
    const all = Store.products({ includeInactive: true }).slice().sort((a, b) => ((catIdx.get(a.catId) ?? 999) - (catIdx.get(b.catId) ?? 999)) || a.name.localeCompare(b.name, 'pt-BR'));
    const level = (p) => p.stock === null ? 'off' : p.stock <= 0 ? 'out' : p.stock <= (p.minStock || 0) ? 'low' : 'ok';
    const controlled = all.filter((p) => p.stock !== null);
    const out = all.filter((p) => level(p) === 'out');
    const low = all.filter((p) => level(p) === 'low');
    const q = ui.stockSearch.trim().toLowerCase();
    const filters = { todos: () => true, controle: (p) => p.stock !== null, alerta: (p) => ['out', 'low'].includes(level(p)) };
    const rows = all.filter(filters[ui.stockFilter] || filters.todos).filter((p) => !q || p.name.toLowerCase().includes(q));

    const search = h('input', { class: 'input', id: 'adm-stock-search', type: 'search', placeholder: 'Buscar produto', value: ui.stockSearch, 'aria-label': 'Buscar produto no estoque' });
    search.addEventListener('input', () => { ui.stockSearch = search.value; const pos = search.selectionStart; renderPanel(); const s2 = document.getElementById('adm-stock-search'); if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} } });

    const wrap = h('section', { class: 'stack', style: '--gap:16px' },
      h('div', { class: 'adm-section-head' }, h('h2', { class: 'adm-h2' }, 'Estoque')),
      h('div', { class: 'adm-stock-sum' },
        sumTile('Com controle', controlled.length + ' de ' + all.length, ''),
        sumTile('Estoque baixo', low.length, low.length ? 'warn' : ''),
        sumTile('Esgotados', out.length, out.length ? 'err' : '')),
      h('p', { class: 'muted adm-small' }, 'Produto com controle ligado sai do cardápio sozinho quando o estoque chega a zero. Os pedidos dão baixa automática.'),
      h('div', { class: 'adm-toolbar' },
        h('div', { class: 'row', role: 'group', 'aria-label': 'Filtrar estoque' },
          ...[['todos', 'Todos'], ['controle', 'Com controle'], ['alerta', 'Baixo ou esgotado']].map(([k, l]) =>
            h('button', { class: 'chip', type: 'button', id: 'adm-sf-' + k, 'aria-pressed': String(ui.stockFilter === k), onclick: () => { ui.stockFilter = k; renderPanel(); } }, l))),
        search));

    const tbody = h('tbody');
    rows.forEach((p) => tbody.append(stockRow(p, level(p))));
    if (!rows.length) tbody.append(h('tr', {}, h('td', { colspan: 5, class: 'muted' }, 'Nenhum produto neste filtro.')));
    wrap.append(h('div', { class: 'adm-table-wrap' },
      h('table', { class: 'adm-table adm-stock-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Produto'), h('th', {}, 'Controle'), h('th', { class: 'is-num' }, 'Atual'), h('th', { class: 'is-num' }, 'Mínimo'), h('th', {}, 'Movimentar'))),
        tbody)));

    // histórico
    const moves = (Store.get().stockMoves || []).slice(0, 60);
    wrap.append(h('h3', { class: 'adm-h3' }, 'Movimentações recentes'));
    if (!moves.length) wrap.append(h('p', { class: 'muted adm-small' }, 'Nenhuma movimentação ainda. Entradas, ajustes e baixas por pedido aparecem aqui.'));
    else wrap.append(h('div', { class: 'adm-table-wrap' },
      h('table', { class: 'adm-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Quando'), h('th', {}, 'Produto'), h('th', { class: 'is-num' }, 'Qtd.'), h('th', {}, 'Motivo'))),
        h('tbody', {}, ...moves.map((m) => {
          const p = Store.product(m.productId);
          return h('tr', {},
            h('td', { class: 'num adm-nowrap' }, fmtDateTime(m.at)),
            h('td', {}, p ? p.name : h('span', { class: 'muted' }, 'produto excluído')),
            h('td', { class: 'is-num num ' + (m.qty < 0 ? 'adm-neg' : 'adm-pos') }, (m.qty > 0 ? '+' : '') + m.qty),
            h('td', {}, m.reason));
        })))));
    return wrap;
  }

  function sumTile(label, value, tone) {
    return h('div', { class: 'adm-sum' + (tone ? ' adm-sum--' + tone : '') }, h('span', { class: 'adm-sum-label' }, label), h('span', { class: 'adm-sum-value' }, value));
  }

  function stockRow(p, lvl) {
    const tr = h('tr', { class: 'adm-stock-' + lvl });
    const status = lvl === 'out' ? h('span', { class: 'adm-pill adm-pill--err' }, 'Esgotado') : lvl === 'low' ? h('span', { class: 'adm-pill adm-pill--warn' }, 'Baixo') : '';
    tr.append(h('td', {}, h('div', { class: 'adm-stock-name' }, h('span', {}, p.name), h('span', { class: 'row', style: '--gap:4px' }, status, p.active ? '' : h('span', { class: 'adm-pill adm-pill--muted' }, 'Pausado')))));

    const sw = h('input', { type: 'checkbox', class: 'adm-switch-input', id: 'adm-sc-' + p.id, role: 'switch', checked: p.stock !== null || ui.enablingStock === p.id });
    sw.addEventListener('change', () => {
      if (sw.checked) { ui.enablingStock = p.id; renderPanel(); setTimeout(() => document.getElementById('adm-sinit-' + p.id)?.focus(), 0); }
      else { ui.enablingStock = null; Store.setStockControl(p.id, false); UI.toast('Controle de estoque desligado para ' + p.name); }
    });
    tr.append(h('td', {}, h('label', { class: 'adm-switch', for: 'adm-sc-' + p.id }, sw, h('span', { class: 'adm-switch-ui', 'aria-hidden': 'true' }), h('span', { class: 'visually-hidden' }, 'Controlar estoque de ' + p.name))));

    if (ui.enablingStock === p.id && p.stock === null) {
      const init = h('input', { class: 'input num adm-qty', id: 'adm-sinit-' + p.id, type: 'number', min: 0, step: 1, value: '', placeholder: '0', 'aria-label': 'Estoque inicial de ' + p.name });
      const go = () => { const v = Math.max(0, parseInt(init.value, 10) || 0); ui.enablingStock = null; Store.setStockControl(p.id, true, v); UI.toast('Controle ligado: ' + v + ' em estoque' + (v === 0 ? '. O produto fica esgotado até a próxima entrada.' : ''), { tone: v ? 'ok' : 'warn' }); };
      init.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      tr.append(h('td', { colspan: 3 }, h('div', { class: 'adm-inline' },
        h('label', { for: init.id, class: 'adm-small muted' }, 'Estoque inicial'), init,
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', id: 'adm-sinit-go-' + p.id, onclick: go }, 'Ligar controle'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-sinit-no-' + p.id, onclick: () => { ui.enablingStock = null; renderPanel(); } }, 'Cancelar'))));
      return tr;
    }
    if (p.stock === null) {
      tr.append(h('td', { class: 'is-num muted' }, '—'), h('td', { class: 'is-num muted' }, '—'), h('td', { class: 'muted adm-small' }, 'Sem controle: sempre disponível'));
      return tr;
    }
    tr.append(h('td', { class: 'is-num num adm-stock-cur' }, fmtInt(p.stock)));
    const min = h('input', { class: 'input num adm-qty', id: 'adm-smin-' + p.id, type: 'number', min: 0, step: 1, value: p.minStock ?? 0, 'aria-label': 'Estoque mínimo de ' + p.name });
    min.addEventListener('change', () => { const v = Math.max(0, parseInt(min.value, 10) || 0); const cur = Store.product(p.id); Store.upsertProduct(Object.assign({}, cur, { minStock: v })); });
    tr.append(h('td', { class: 'is-num' }, min));
    const qty = h('input', { class: 'input num adm-qty', id: 'adm-sqty-' + p.id, type: 'number', min: 1, step: 1, placeholder: 'Qtd.', 'aria-label': 'Quantidade de entrada de ' + p.name });
    const entrada = () => { const v = parseInt(qty.value, 10); if (!v || v <= 0) { qty.setAttribute('aria-invalid', 'true'); qty.focus(); return; } Store.adjustStock(p.id, v, 'entrada'); UI.toast('+' + v + ' ' + p.name); };
    qty.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); entrada(); } });
    tr.append(h('td', {}, h('div', { class: 'adm-inline' },
      h('button', { class: 'adm-icon-btn', type: 'button', id: 'adm-sminus-' + p.id, 'aria-label': 'Tirar 1 de ' + p.name, disabled: p.stock <= 0, onclick: () => Store.adjustStock(p.id, -1, 'saída manual') }, '−'),
      h('button', { class: 'adm-icon-btn', type: 'button', id: 'adm-splus-' + p.id, 'aria-label': 'Somar 1 a ' + p.name, onclick: () => Store.adjustStock(p.id, 1, 'ajuste manual') }, '+'),
      qty,
      h('button', { class: 'btn btn--sm', type: 'button', id: 'adm-sin-' + p.id, onclick: entrada }, 'Entrada'))));
    return tr;
  }

  /* =====================================================================
     FINANCEIRO — gráficos em SVG escrito à mão (sem biblioteca), cor única
     (--chart-1) porque toda série aqui é uma só; tooltip por barra; tabela
     de apoio com os mesmos números.
     ===================================================================== */
  function periodRange() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (ui.period - 1));
    return start;
  }
  function finData() {
    const start = periodRange();
    const all = Store.orders().filter((o) => o.status !== 'cancelado' && new Date(o.createdAt) >= start);
    const hasExamples = all.some((o) => o.example);
    const orders = ui.includeExamples ? all : all.filter((o) => !o.example);
    const revenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cost = orders.reduce((s, o) => s + (o.items || []).reduce((t, it) => { const p = Store.product(it.productId); return t + (p ? Number(p.cost) || 0 : 0) * it.qty; }, 0), 0);
    // por dia
    const days = [];
    for (let i = 0; i < ui.period; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push({ key: d.toDateString(), date: d, value: 0, count: 0 }); }
    const dayMap = new Map(days.map((d) => [d.key, d]));
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, value: 0 }));
    const pay = {}; const prod = {};
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const day = dayMap.get(d.toDateString()); if (day) { day.value += o.total; day.count++; }
      hours[d.getHours()].count++; hours[d.getHours()].value += o.total;
      const m = (o.payment && o.payment.method) || 'outro';
      pay[m] = pay[m] || { key: m, label: PAY[m] || m, value: 0, count: 0 }; pay[m].value += o.total; pay[m].count++;
      (o.items || []).forEach((it) => {
        const k = it.productId || it.name;
        prod[k] = prod[k] || { label: (Store.product(it.productId) || {}).name || it.name, qty: 0, value: 0 };
        prod[k].qty += it.qty; prod[k].value += Store.linePrice(it);
      });
    });
    return {
      orders, hasExamples, revenue, cost, profit: revenue - cost,
      count: orders.length, ticket: orders.length ? revenue / orders.length : 0,
      days, hours, pay: Object.values(pay).sort((a, b) => b.value - a.value),
      top: Object.values(prod).sort((a, b) => b.qty - a.qty || b.value - a.value).slice(0, 10)
    };
  }

  let fin = null;
  function tabFinanceiro() {
    fin = finData();
    const exAll = Store.orders().some((o) => o.example);
    const wrap = h('section', { class: 'stack', style: '--gap:18px' },
      h('div', { class: 'adm-section-head' },
        h('h2', { class: 'adm-h2' }, 'Financeiro'),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Período' },
          ...[[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']].map(([v, l]) =>
            h('button', { class: 'chip', type: 'button', id: 'adm-per-' + v, 'aria-pressed': String(ui.period === v), onclick: () => { ui.period = v; renderPanel(); } }, l)))));

    if (fin.hasExamples) {
      wrap.append(h('div', { class: 'adm-notice', role: 'note' },
        h('div', { class: 'stack', style: '--gap:4px' },
          h('strong', {}, ui.includeExamples ? 'Estes números incluem dados de exemplo' : 'Dados de exemplo ocultos'),
          h('span', { class: 'adm-small' }, 'Os pedidos de exemplo foram gerados para mostrar como o painel funciona. Não são vendas reais.')),
        h('div', { class: 'row' },
          h('label', { class: 'adm-check', for: 'adm-fin-ex' }, h('input', { type: 'checkbox', id: 'adm-fin-ex', checked: ui.includeExamples, onchange: (e) => { ui.includeExamples = e.target.checked; renderPanel(); } }), 'Incluir exemplos'),
          h('button', { class: 'btn btn--sm', type: 'button', id: 'adm-ex-clear', onclick: () => { Store.clearExampleOrders(); UI.toast('Dados de exemplo apagados'); } }, 'Apagar dados de exemplo'))));
    } else if (!exAll) {
      wrap.append(h('div', { class: 'adm-notice adm-notice--quiet', role: 'note' },
        h('span', { class: 'adm-small' }, fin.count ? 'Mostrando só vendas reais.' : 'Ainda não há vendas neste período. Quer ver como o painel fica com movimento?'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-ex-seed', onclick: () => { Store.seedExampleOrders(); ui.includeExamples = true; UI.toast('30 dias de pedidos de exemplo gerados'); } }, 'Gerar dados de exemplo')));
    }

    wrap.append(h('div', { class: 'adm-kpis' },
      kpi('Faturamento', money(fin.revenue), 'pedidos não cancelados'),
      kpi('Pedidos', fmtInt(fin.count), ui.period === 1 ? 'hoje' : 'em ' + ui.period + ' dias'),
      kpi('Ticket médio', money(fin.ticket), 'por pedido'),
      kpi('Lucro estimado', money(fin.profit), 'faturamento − custo dos produtos', fin.revenue ? Math.round((fin.profit / fin.revenue) * 100) + '% do faturamento' : '')));

    if (!fin.count) {
      wrap.append(h('div', { class: 'adm-empty' }, h('p', { class: 'adm-empty-title' }, 'Sem vendas no período'), h('p', { class: 'muted' }, 'Escolha um período maior ou aguarde os primeiros pedidos.')));
      return wrap;
    }
    const daily = ui.period > 1;
    wrap.append(h('div', { class: 'adm-charts' },
      chartCard(daily ? 'Faturamento por dia' : 'Faturamento por hora (hoje)', 'adm-ch-rev', 'adm-chart--wide',
        tableDetails('adm-tb-rev', daily ? ['Dia', 'Pedidos', 'Faturamento'] : ['Hora', 'Pedidos', 'Faturamento'],
          (daily ? fin.days.map((d) => [d.date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }), d.count, money(d.value)])
            : fin.hours.filter((x) => x.count).map((x) => [String(x.hour).padStart(2, '0') + 'h', x.count, money(x.value)])))),
      chartCard('Pedidos por hora do dia', 'adm-ch-hour', '', null),
      chartCard('Vendas por forma de pagamento', null, '', hbars(fin.pay.map((p) => ({ label: p.label, value: p.value, text: money(p.value), sub: p.count + ' pedidos · ' + Math.round((p.value / fin.revenue) * 100) + '%' })))),
      chartCard('Top 10 produtos (unidades)', null, '', hbars(fin.top.map((p) => ({ label: p.label, value: p.qty, text: fmtInt(p.qty) + ' un.', sub: money(p.value) }))))));
    wrap.append(h('p', { class: 'field-hint' }, 'Lucro estimado = faturamento (com taxa de entrega) menos o custo cadastrado de cada produto vendido. Não desconta taxas de cartão, embalagem, entregador ou contas fixas. Pedidos cancelados ficam fora de todos os números.'));
    return wrap;
  }

  function kpi(label, value, sub, extra) {
    return h('div', { class: 'adm-kpi' }, h('span', { class: 'adm-kpi-label' }, label), h('span', { class: 'adm-kpi-value' }, value), h('span', { class: 'adm-kpi-sub' }, sub), extra ? h('span', { class: 'adm-kpi-sub' }, extra) : '');
  }
  function chartCard(title, chartId, cls, extra) {
    return h('figure', { class: 'adm-card adm-chart ' + cls },
      h('figcaption', { class: 'adm-chart-title' }, title),
      chartId ? h('div', { class: 'adm-svg-host', id: chartId }) : '',
      extra || '');
  }
  function tableDetails(id, head, rows) {
    return h('details', { class: 'adm-details', id },
      h('summary', {}, 'Ver tabela'),
      h('div', { class: 'adm-table-wrap' }, h('table', { class: 'adm-table' },
        h('thead', {}, h('tr', {}, ...head.map((x, i) => h('th', { class: i ? 'is-num' : '' }, x)))),
        h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((c, i) => h('td', { class: i ? 'is-num num' : '' }, c))))))));
  }
  /* Barras horizontais em HTML: rótulo à esquerda, valor na ponta. Uma série só. */
  function hbars(items) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return h('ol', { class: 'adm-hbars' }, ...items.map((it) => h('li', { class: 'adm-hbar', title: it.label + ': ' + it.text + (it.sub ? ' · ' + it.sub : '') },
      h('span', { class: 'adm-hbar-label' }, it.label),
      h('span', { class: 'adm-hbar-track' }, h('span', { class: 'adm-hbar-fill', style: 'width:' + Math.max(1.5, (it.value / max) * 100).toFixed(2) + '%' })),
      h('span', { class: 'adm-hbar-val num' }, h('strong', {}, it.text), it.sub ? h('span', { class: 'muted' }, ' ' + it.sub) : ''))));
  }

  /* ---------- colunas em SVG com escala, grade e tooltip ---------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs) => { const el = document.createElementNS(SVGNS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function columns(host, data, { yFmt, tipTitle, tipValue, xLabelEvery = 1 }) {
    host.innerHTML = '';
    const W = Math.max(260, host.clientWidth || 600), H = 220;
    const m = { t: 12, r: 8, b: 26, l: 0 };
    const max = niceMax(Math.max(...data.map((d) => d.value)));
    const ticks = [0, max / 2, max];
    // largura do eixo Y conforme o maior rótulo
    m.l = Math.max(...ticks.map((t) => yFmt(t).length)) * 7 + 10;
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const band = iw / data.length;
    const bw = Math.max(2, Math.min(24, band - 2));
    const y = (v) => m.t + ih - (v / max) * ih;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'adm-svg', role: 'img', 'aria-label': host.getAttribute('data-label') || '' });
    ticks.forEach((t) => {
      svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? 'adm-axis' : 'adm-grid' }));
      const tx = s('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'adm-tick' }); tx.textContent = yFmt(t); svg.append(tx);
    });
    const tip = h('div', { class: 'adm-tip', hidden: true });
    const hits = [];
    const barIndex = new Map(); let k = 0; data.forEach((d, i) => { if (d.value > 0) barIndex.set(i, k++); });
    data.forEach((d, i) => {
      const cx = m.l + band * i + band / 2;
      const top = y(d.value), hgt = m.t + ih - top;
      if (d.value > 0) {
        const r = Math.min(4, bw / 2, hgt);
        // coluna com topo arredondado (4px) e base reta
        const x0 = cx - bw / 2, x1 = cx + bw / 2, yb = m.t + ih;
        svg.append(s('path', { class: 'adm-bar', d: `M${x0},${yb}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${yb}Z` }));
      }
      if (i % xLabelEvery === 0 || i === data.length - 1) {
        const lx = s('text', { x: cx, y: H - 8, 'text-anchor': 'middle', class: 'adm-tick' }); lx.textContent = d.x; svg.append(lx);
      }
      const hit = s('rect', { x: m.l + band * i, y: m.t, width: band, height: ih, class: 'adm-hit', tabindex: 0, 'aria-label': tipTitle(d) + ': ' + tipValue(d) });
      const show = () => {
        tip.innerHTML = '';
        tip.append(h('strong', { class: 'num' }, tipValue(d)), h('span', {}, tipTitle(d)));
        tip.hidden = false;
        const left = Math.min(Math.max(cx, 70), W - 70);
        tip.style.left = left + 'px'; tip.style.top = Math.max(0, top - 8) + 'px';
        svg.querySelectorAll('.adm-bar.is-hot').forEach((b) => b.classList.remove('is-hot'));
        const bar = svg.querySelectorAll('.adm-bar')[barIndex.get(i)];
        bar && bar.classList.add('is-hot');
      };
      const hide = () => { tip.hidden = true; svg.querySelectorAll('.adm-bar.is-hot').forEach((b) => b.classList.remove('is-hot')); };
      hit.addEventListener('pointerenter', show); hit.addEventListener('focus', show);
      hit.addEventListener('pointerleave', hide); hit.addEventListener('blur', hide);
      hits.push(hit);
    });
    hits.forEach((x) => svg.append(x)); // camada de toque por cima das barras
    host.append(svg, tip);
  }
  function drawCharts() {
    if (!fin || !fin.count) return;
    const rev = document.getElementById('adm-ch-rev');
    const hr = document.getElementById('adm-ch-hour');
    if (rev) {
      const W = rev.clientWidth || 600;
      if (ui.period > 1) {
        const data = fin.days.map((d) => ({ x: d.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: d.value, count: d.count, date: d.date }));
        const every = Math.ceil(data.length / Math.max(2, Math.floor(W / 52)));
        rev.setAttribute('data-label', 'Faturamento por dia');
        columns(rev, data, { yFmt: compactMoney, xLabelEvery: every, tipTitle: (d) => d.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) + ' · ' + d.count + ' pedidos', tipValue: (d) => money(d.value) });
      } else {
        const data = hourWindow().map((x) => ({ x: x.hour + 'h', value: x.value, count: x.count, hour: x.hour }));
        rev.setAttribute('data-label', 'Faturamento por hora hoje');
        columns(rev, data, { yFmt: compactMoney, xLabelEvery: Math.ceil(data.length / Math.max(2, Math.floor(W / 40))), tipTitle: (d) => d.hour + 'h às ' + (d.hour + 1) + 'h · ' + d.count + ' pedidos', tipValue: (d) => money(d.value) });
      }
    }
    if (hr) {
      const data = hourWindow().map((x) => ({ x: x.hour + 'h', value: x.count, hour: x.hour, rev: x.value }));
      const W = hr.clientWidth || 400;
      hr.setAttribute('data-label', 'Pedidos por hora do dia');
      columns(hr, data, { yFmt: (v) => fmtInt(Math.round(v * 10) / 10), xLabelEvery: Math.ceil(data.length / Math.max(2, Math.floor(W / 36))), tipTitle: (d) => d.hour + 'h às ' + (d.hour + 1) + 'h · ' + money(d.rev), tipValue: (d) => d.value + (d.value === 1 ? ' pedido' : ' pedidos') });
    }
  }
  /* Janela de horas com movimento (com 1h de folga de cada lado), para não desenhar 24 colunas vazias */
  function hourWindow() {
    const used = fin.hours.filter((x) => x.count);
    if (!used.length) return fin.hours;
    const lo = Math.max(0, used[0].hour - 1), hi = Math.min(23, used[used.length - 1].hour + 1);
    return fin.hours.slice(lo, hi + 1);
  }
  let resizeT = null;
  window.addEventListener('resize', () => { if (!isOpenFlag || ui.tab !== 'financeiro') return; clearTimeout(resizeT); resizeT = setTimeout(drawCharts, 150); });

  /* =====================================================================
     CONFIGURAÇÕES
     ===================================================================== */
  function tabConfig() {
    const st = Store.info();
    const wrap = h('section', { class: 'stack', style: '--gap:20px' }, h('div', { class: 'adm-section-head' }, h('h2', { class: 'adm-h2' }, 'Configurações')));
    const fld = (label, input, hint) => h('label', { class: 'field', for: input.id }, h('span', {}, label), input, hint ? h('span', { class: 'field-hint' }, hint) : '');
    const inp = (id, value, extra = {}) => h('input', Object.assign({ class: 'input', id, value: value ?? '' }, extra));

    /* ----- Loja ----- */
    const f = {
      name: inp('adm-st-name', st.name), slogan: inp('adm-st-slogan', st.slogan),
      address: inp('adm-st-address', st.address), phone: inp('adm-st-phone', st.phone, { type: 'tel', inputmode: 'tel' }),
      whatsapp: inp('adm-st-whatsapp', st.whatsapp, { type: 'tel', inputmode: 'tel', placeholder: '(71) 99999-9999' }),
      hours: inp('adm-st-hours', st.hours, { placeholder: 'ex.: Ter a Dom, 18:00–23:30' }),
      deliveryFee: inp('adm-st-fee', fmtNum(st.deliveryFee), { inputmode: 'decimal', class: 'input num' }),
      minOrder: inp('adm-st-min', fmtNum(st.minOrder), { inputmode: 'decimal', class: 'input num' }),
      etaMin: inp('adm-st-etamin', st.etaMin, { type: 'number', min: 0, step: 5, class: 'input num' }),
      etaMax: inp('adm-st-etamax', st.etaMax, { type: 'number', min: 0, step: 5, class: 'input num' })
    };
    const imgs = { logo: st.logo || '', cover: st.cover || '' };
    const imgPicker = (key, label, max) => {
      const prev = h('div', { class: 'adm-photo-prev adm-photo-prev--' + key });
      const err = h('p', { class: 'field-hint adm-err-text', hidden: true });
      const file = h('input', { type: 'file', id: 'adm-st-' + key + '-file', accept: 'image/*', class: 'adm-file' });
      const url = inp('adm-st-' + key + '-url', /^data:/.test(imgs[key]) ? '' : imgs[key], { type: 'url', placeholder: 'https://…', 'aria-label': label + ' por URL' });
      const draw = () => { prev.innerHTML = ''; if (imgs[key]) prev.append(h('img', { src: imgs[key], alt: label }), h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-st-' + key + '-del', onclick: () => { imgs[key] = ''; url.value = ''; draw(); } }, 'Remover')); else prev.append(h('span', { class: 'muted adm-small' }, 'Sem imagem')); };
      file.addEventListener('change', async () => { err.hidden = true; const fl = file.files && file.files[0]; if (!fl) return; try { imgs[key] = await resizeImage(fl, max); url.value = ''; draw(); } catch (e) { err.textContent = e.message; err.hidden = false; } file.value = ''; });
      url.addEventListener('change', () => { if (url.value.trim()) { imgs[key] = url.value.trim(); draw(); } });
      draw();
      return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), prev,
        h('div', { class: 'row' }, h('label', { class: 'btn btn--sm adm-file-btn', for: file.id }, 'Enviar imagem', file)), url, err);
    };
    const lojaMsg = h('p', { class: 'adm-login-err', role: 'alert', hidden: true });
    wrap.append(cfgCard('Loja', 'adm-cfg-loja', 'Nome, contato e regras de entrega que aparecem no cardápio.',
      h('div', { class: 'adm-grid2' }, fld('Nome da loja', f.name), fld('Slogan', f.slogan)),
      fld('Endereço', f.address),
      h('div', { class: 'adm-grid2' }, fld('Telefone', f.phone), fld('WhatsApp', f.whatsapp, 'Com DDD. Usado no botão de contato.')),
      fld('Horário de funcionamento', f.hours),
      h('div', { class: 'adm-grid4' }, fld('Taxa de entrega (R$)', f.deliveryFee), fld('Pedido mínimo (R$)', f.minOrder), fld('Tempo mín. (min)', f.etaMin), fld('Tempo máx. (min)', f.etaMax)),
      h('div', { class: 'adm-grid2' }, imgPicker('logo', 'Logo', 400), imgPicker('cover', 'Capa', 1600)),
      lojaMsg,
      h('div', { class: 'row' }, h('button', { class: 'btn btn--primary', type: 'button', id: 'adm-st-save', onclick: () => {
        lojaMsg.hidden = true;
        const fee = parseNum(f.deliveryFee.value || '0'), mn = parseNum(f.minOrder.value || '0');
        const e1 = parseInt(f.etaMin.value, 10) || 0, e2 = parseInt(f.etaMax.value, 10) || 0;
        if (!f.name.value.trim()) { lojaMsg.textContent = 'Informe o nome da loja.'; lojaMsg.hidden = false; return; }
        if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(mn) || mn < 0) { lojaMsg.textContent = 'Taxa de entrega e pedido mínimo precisam ser valores em reais, ex.: 5,00.'; lojaMsg.hidden = false; return; }
        if (e2 && e1 > e2) { lojaMsg.textContent = 'O tempo mínimo não pode ser maior que o máximo.'; lojaMsg.hidden = false; return; }
        Store.updateStore({
          name: f.name.value.trim(), slogan: f.slogan.value.trim(), address: f.address.value.trim(), phone: f.phone.value.trim(),
          whatsapp: f.whatsapp.value.trim(), hours: f.hours.value.trim(), deliveryFee: Math.round(fee * 100) / 100, minOrder: Math.round(mn * 100) / 100,
          etaMin: e1, etaMax: e2, logo: imgs.logo, cover: imgs.cover
        });
        if (/^data:/.test(imgs.logo + imgs.cover)) checkPersisted();
        UI.toast('Dados da loja salvos');
      } }, 'Salvar dados da loja'))));

    /* ----- PIX ----- */
    const pixKey = inp('adm-pix-key', st.pixKey, { placeholder: 'CNPJ, e-mail, telefone ou chave aleatória' });
    const pixName = inp('adm-pix-name', st.pixName, { maxlength: 25, placeholder: 'SPETITOS LANCHES' });
    const pixCity = inp('adm-pix-city', st.pixCity, { maxlength: 15, placeholder: 'SALVADOR' });
    wrap.append(cfgCard('Pix', 'adm-cfg-pix', 'Dados usados para gerar o QR Code e o "copia e cola" no checkout.',
      fld('Chave Pix', pixKey),
      h('div', { class: 'adm-grid2' }, fld('Nome do recebedor', pixName, 'Até 25 letras, como está no banco.'), fld('Cidade', pixCity, 'Até 15 letras, sem acento.')),
      h('p', { class: 'field-hint' }, 'O Pix estático não confirma o pagamento sozinho: confira o extrato antes de mandar o pedido. Para confirmação automática, use um provedor de pagamentos com servidor.'),
      h('div', { class: 'row' }, h('button', { class: 'btn btn--primary', type: 'button', id: 'adm-pix-save', onclick: () => {
        Store.updateStore({ pixKey: pixKey.value.trim(), pixName: pixName.value.trim().slice(0, 25), pixCity: pixCity.value.trim().slice(0, 15) });
        UI.toast('Dados do Pix salvos');
      } }, 'Salvar Pix'))));

    /* ----- Nota fiscal ----- */
    const fc = Store.fiscalConfig();
    const prov = h('select', { class: 'input', id: 'adm-nf-provider' }, ...Fiscal.providers.map((p) => h('option', { value: p.id, selected: p.id === fc.provider }, p.name)));
    const amb = h('select', { class: 'input', id: 'adm-nf-amb' }, h('option', { value: 'homologacao', selected: fc.ambiente !== 'producao' }, 'Homologação (testes)'), h('option', { value: 'producao', selected: fc.ambiente === 'producao' }, 'Produção (vale de verdade)'));
    const nf = {
      cnpj: inp('adm-nf-cnpj', fc.cnpj, { inputmode: 'numeric', placeholder: '00.000.000/0000-00', class: 'input num' }),
      ie: inp('adm-nf-ie', fc.ie, { inputmode: 'numeric', class: 'input num' }),
      serie: inp('adm-nf-serie', fc.serie, { type: 'number', min: 1, step: 1, class: 'input num' }),
      prox: inp('adm-nf-prox', fc.proximoNumero, { type: 'number', min: 1, step: 1, class: 'input num' }),
      cscId: inp('adm-nf-cscid', fc.cscId, { inputmode: 'numeric', class: 'input num', placeholder: 'ex.: 000001' }),
      backend: inp('adm-nf-backend', fc.backendUrl, { type: 'text', placeholder: '/api (padrão no site hospedado)' })
    };
    const nfMsg = h('p', { class: 'adm-login-err', role: 'alert', hidden: true });
    wrap.append(cfgCard('Nota fiscal (NFC-e)', 'adm-cfg-nf', 'Emissão automática da nota do consumidor a cada pedido.',
      h('div', { class: 'adm-callout' },
        h('strong', {}, 'Certificado digital e token ficam no servidor, nunca aqui. '),
        'Este painel roda no navegador e qualquer dado salvo nele pode ser lido. Por isso não existe campo para o certificado A1, para o CSC (código secreto) nem para o token do provedor. Eles devem ser guardados na função do servidor indicada abaixo, que recebe o pedido e conversa com o provedor. Sem servidor, use o modo Demonstração.'),
      h('div', { class: 'adm-grid2' }, fld('Provedor', prov), fld('Ambiente', amb, 'Teste em homologação antes de ligar produção.')),
      h('div', { class: 'adm-grid2' }, fld('CNPJ', nf.cnpj), fld('Inscrição estadual', nf.ie)),
      h('div', { class: 'adm-grid4' }, fld('Série', nf.serie), fld('Próximo número', nf.prox), fld('ID do CSC', nf.cscId, 'Só o número identificador.'), h('span', {})),
      fld('URL do servidor de emissão', nf.backend, 'Endereço da sua função serverless. O painel envia o pedido para {URL}/nfce.'),
      nfMsg,
      h('div', { class: 'row' }, h('button', { class: 'btn btn--primary', type: 'button', id: 'adm-nf-save', onclick: () => {
        nfMsg.hidden = true;
        const cnpj = digits(nf.cnpj.value);
        if (cnpj && cnpj.length !== 14) { nfMsg.textContent = 'O CNPJ precisa ter 14 números.'; nfMsg.hidden = false; return; }
        if (prov.value !== 'simulado' && nf.backend.value.trim() && !/^(https:\/\/|\/)/.test(nf.backend.value.trim())) { nfMsg.textContent = 'Para usar ' + prov.options[prov.selectedIndex].text + ', deixe em branco para usar /api do próprio site ou informe uma URL começando com https://.'; nfMsg.hidden = false; return; }
        Store.updateFiscal({ provider: prov.value, ambiente: amb.value, cnpj: nf.cnpj.value.trim(), ie: nf.ie.value.trim(), serie: Math.max(1, parseInt(nf.serie.value, 10) || 1), proximoNumero: Math.max(1, parseInt(nf.prox.value, 10) || 1), cscId: nf.cscId.value.trim(), backendUrl: nf.backend.value.trim() });
        UI.toast('Configuração fiscal salva');
      } }, 'Salvar nota fiscal'))));

    /* ----- Credenciais ----- */
    const ce = inp('adm-cred-email', Store.get().owner.email, { type: 'email', autocomplete: 'username' });
    const cp = inp('adm-cred-pass', '', { type: 'password', autocomplete: 'new-password', minlength: 8 });
    const cc = inp('adm-cred-pass2', '', { type: 'password', autocomplete: 'new-password' });
    const credMsg = h('p', { class: 'adm-login-err', role: 'alert', hidden: true });
    const credBtn = h('button', { class: 'btn btn--primary', type: 'button', id: 'adm-cred-save' }, 'Trocar acesso');
    credBtn.addEventListener('click', async () => {
      credMsg.hidden = true;
      const email = ce.value.trim();
      const bad = (m) => { credMsg.textContent = m; credMsg.hidden = false; };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Informe um e-mail válido.');
      if (cp.value.length < 8) return bad('A nova senha precisa ter pelo menos 8 caracteres.');
      if (cp.value === 'spetitos123') return bad('Escolha uma senha diferente da senha de fábrica.');
      if (cp.value !== cc.value) return bad('As duas senhas não são iguais. Digite de novo.');
      credBtn.disabled = true;
      try { await Store.changeCredentials(email, cp.value); UI.toast('Acesso atualizado. Use o novo e-mail e senha no próximo login.'); }
      catch (e) { bad('Não foi possível salvar: ' + e.message); }
      credBtn.disabled = false;
    });
    const credCard = cfgCard('Acesso do dono', 'adm-cred', Store.usingDefaultPassword() ? 'Você ainda usa a senha de fábrica. Troque agora.' : 'E-mail e senha para entrar neste painel.',
      fld('E-mail', ce),
      h('div', { class: 'adm-grid2' }, fld('Nova senha', cp, 'Mínimo de 8 caracteres.'), fld('Confirmar nova senha', cc)),
      credMsg,
      h('p', { class: 'field-hint' }, 'Neste protótipo a senha é guardada (em hash) no próprio navegador. Para segurança real, a loja precisa de login no servidor.'),
      h('div', { class: 'row' }, credBtn));
    if (Store.usingDefaultPassword()) credCard.classList.add('is-alert');
    wrap.append(credCard);

    /* ----- Restaurar ----- */
    const resetBox = h('div', { class: 'stack' });
    if (!ui.confirmReset) resetBox.append(h('div', { class: 'row' }, h('button', { class: 'btn btn--danger', type: 'button', id: 'adm-reset', onclick: () => { ui.confirmReset = true; renderPanel(); document.getElementById('adm-reset-no')?.focus(); } }, 'Restaurar cardápio original')));
    else resetBox.append(h('div', { class: 'adm-confirm', role: 'alert' },
      h('p', {}, h('strong', {}, 'Isto apaga tudo o que foi feito neste navegador: '), 'produtos, categorias, fotos, pedidos, estoque, configurações da loja e do Pix, e volta o acesso para a senha de fábrica. Não dá para desfazer.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn--danger btn--sm', type: 'button', id: 'adm-reset-yes', onclick: () => { ui.confirmReset = false; Store.resetAll(); UI.toast('Cardápio original restaurado', { tone: 'warn' }); render(); } }, 'Sim, apagar e restaurar'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', id: 'adm-reset-no', onclick: () => { ui.confirmReset = false; renderPanel(); } }, 'Cancelar'))));
    wrap.append(cfgCard('Restaurar', 'adm-cfg-reset', 'Volta o cardápio ao original de fábrica.', resetBox));
    return wrap;
  }

  function cfgCard(title, id, sub, ...children) {
    return h('section', { class: 'adm-card adm-cfg stack', id, 'aria-labelledby': id + '-t' },
      h('div', { class: 'stack', style: '--gap:4px' }, h('h3', { class: 'adm-h3', id: id + '-t' }, title), sub ? h('p', { class: 'muted adm-small' }, sub) : ''),
      ...children);
  }

  /* ---------- teclado e atalho por endereço ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpenFlag) return;
    if (document.querySelector('.sheet-backdrop')) return; // a folha aberta fecha primeiro (ui.js)
    if (ui.confirmCancel || ui.confirmReset || ui.confirmDelCat || ui.renamingCat) { ui.confirmCancel = null; ui.confirmReset = false; ui.confirmDelCat = null; ui.renamingCat = null; renderPanel(); return; }
    close();
  });
  function fromHash() { if (location.hash === '#painel' && !isOpenFlag) open(); }
  window.addEventListener('hashchange', fromHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash); else setTimeout(fromHash, 0);

  window.Admin = { open, close, isOpen: () => isOpenFlag };
})();
