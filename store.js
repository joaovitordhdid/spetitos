/* Spetitos — estado compartilhado (cardápio, pedidos, estoque, acesso do dono).
   Todos os módulos (menu.js, checkout.js, admin.js, fiscal.js) usam SOMENTE esta API.
   Persistência: localStorage (protótipo). Em produção, troque as funções load/save
   por chamadas a um backend (ex.: Supabase) mantendo a mesma API. */
(function () {
  const KEY = 'spetitos:v1';
  const SESSION_KEY = 'spetitos:owner-session';
  const listeners = new Set();

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

  function safeGet(k, store) { try { return (store || localStorage).getItem(k); } catch (e) { return null; } }
  function safeSet(k, v, store) { try { (store || localStorage).setItem(k, v); } catch (e) {} }
  function safeDel(k, store) { try { (store || localStorage).removeItem(k); } catch (e) {} }

  function seedState() {
    const seed = clone(window.SPETITOS_SEED || { store: {}, categories: [], products: [] });
    const shared = seed.sharedGroups || {};
    seed.products.forEach((p) => {
      // grupos compartilhados (ex.: "adicionais") são referenciados pelo nome no data.js
      p.optionGroups = (p.optionGroups || []).map((g) => (typeof g === 'string' ? clone(shared[g]) : g)).filter(Boolean);
      p.active = p.active !== false;
      p.ingredients = p.ingredients || [];
      p.optionGroups = p.optionGroups || [];
      if (p.stock === undefined) p.stock = null;     // null = sem controle de estoque
      if (p.minStock === undefined) p.minStock = 5;  // alerta de estoque baixo
      if (p.cost === undefined) p.cost = Math.round(p.price * 0.42 * 100) / 100; // custo estimado editável
    });
    return {
      version: 1,
      store: seed.store,
      categories: seed.categories,
      products: seed.products,
      orders: [],
      stockMoves: [],               // {id, productId, qty(+/-), reason, at}
      fiscal: { provider: 'simulado', ambiente: 'homologacao', cnpj: '', ie: '', csc: '', cscId: '', token: '', serie: 1, proximoNumero: 1 },
      owner: { email: 'dono@spetitos.com', passHash: null, salt: 'spetitos' }, // passHash null => senha padrão "spetitos123"
      orderSeq: 1000
    };
  }

  let state = null;
  function load() {
    const raw = safeGet(KEY);
    if (raw) { try { state = JSON.parse(raw); } catch (e) { state = null; } }
    if (!state || !state.products) state = seedState();
    // cardápio-base novo publicado: atualiza itens/categorias/loja e mantém pedidos, estoque e acesso
    const sv = (window.SPETITOS_SEED || {}).version || 1;
    if (state.seedVersion !== sv && !state.ownerEdited) {
      const fresh = seedState();
      state.store = Object.assign(fresh.store, { pixKey: state.store.pixKey, pixName: state.store.pixName, pixCity: state.store.pixCity });
      state.categories = fresh.categories; state.products = fresh.products;
      state.seedVersion = sv;
      safeSet(KEY, JSON.stringify(state));
    }
    return state;
  }
  function save() { safeSet(KEY, JSON.stringify(state)); emit(); }
  function edited() { state.ownerEdited = true; }
  function emit() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const money = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  /* Preço de uma linha do carrinho: preço base + opções escolhidas, vezes a quantidade */
  function linePrice(item) {
    const opts = (item.options || []).reduce((s, o) => s + (Number(o.price) || 0) * (o.qty || 1), 0);
    return (Number(item.unitPrice) + opts) * item.qty;
  }

  const Store = {
    uid, money, linePrice, clone,
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /* ---------- Cardápio ---------- */
    info: () => state.store,
    categories: () => [...state.categories].sort((a, b) => (a.order || 0) - (b.order || 0)),
    products: ({ includeInactive = false } = {}) => state.products.filter((p) => includeInactive || p.active),
    product: (id) => state.products.find((p) => p.id === id),
    /* disponível para venda: ativo e (sem controle de estoque ou estoque > 0) */
    available: (p) => p.active && (p.stock === null || p.stock > 0),
    updateStore(patch) { edited(); Object.assign(state.store, patch); save(); },
    upsertProduct(p) { edited();
      if (!p.id) p.id = uid('p');
      const i = state.products.findIndex((x) => x.id === p.id);
      if (i >= 0) state.products[i] = p; else state.products.push(p);
      save(); return p;
    },
    deleteProduct(id) { edited(); state.products = state.products.filter((p) => p.id !== id); save(); },
    upsertCategory(c) { edited();
      if (!c.id) c.id = uid('c');
      const i = state.categories.findIndex((x) => x.id === c.id);
      if (i >= 0) state.categories[i] = c; else state.categories.push(c);
      save(); return c;
    },
    deleteCategory(id) { edited(); state.categories = state.categories.filter((c) => c.id !== id); save(); },

    /* ---------- Estoque ---------- */
    adjustStock(productId, qty, reason) {
      const p = Store.product(productId); if (!p) return;
      if (p.stock === null) p.stock = 0;
      p.stock = Math.max(0, p.stock + qty);
      state.stockMoves.unshift({ id: uid('m'), productId, qty, reason: reason || 'ajuste', at: new Date().toISOString() });
      save();
    },
    setStockControl(productId, enabled, initial) {
      const p = Store.product(productId); if (!p) return;
      p.stock = enabled ? (Number(initial) || 0) : null; save();
    },

    /* ---------- Pedidos ----------
       order = { customer:{name,cpf,phone}, address:{lat,lng,accuracy,text,number,complement,reference},
                 items:[{productId,name,qty,unitPrice,options:[{group,name,price,qty}],removed:[ingrediente],note}],
                 payment:{method:'pix'|'cartao'|'dinheiro', changeFor}, deliveryFee }  */
    createOrder(order) {
      const o = clone(order);
      o.id = uid('o');
      o.number = ++state.orderSeq;
      o.createdAt = new Date().toISOString();
      o.subtotal = o.items.reduce((s, it) => s + linePrice(it), 0);
      o.deliveryFee = Number(o.deliveryFee ?? state.store.deliveryFee ?? 0);
      o.total = Math.round((o.subtotal + o.deliveryFee) * 100) / 100;
      o.status = 'recebido'; // recebido → preparo → saiu → entregue | cancelado
      o.nfce = { status: 'pendente' };
      // baixa de estoque
      o.items.forEach((it) => {
        const p = Store.product(it.productId);
        if (p && p.stock !== null) {
          p.stock = Math.max(0, p.stock - it.qty);
          state.stockMoves.unshift({ id: uid('m'), productId: p.id, qty: -it.qty, reason: 'pedido #' + o.number, at: o.createdAt });
        }
      });
      state.orders.unshift(o);
      save();
      return o;
    },
    updateOrder(id, patch) {
      const o = state.orders.find((x) => x.id === id); if (!o) return;
      Object.assign(o, patch); save(); return o;
    },
    orders: () => state.orders,

    /* ---------- Nota fiscal (config) ---------- */
    fiscalConfig: () => state.fiscal,
    updateFiscal(patch) { Object.assign(state.fiscal, patch); save(); },

    /* ---------- Acesso do dono ---------- */
    async login(email, password) {
      const o = state.owner;
      const hash = await sha256(o.salt + ':' + password);
      const expected = o.passHash || (await sha256(o.salt + ':spetitos123'));
      const ok = email.trim().toLowerCase() === o.email.toLowerCase() && hash === expected;
      if (ok) safeSet(SESSION_KEY, JSON.stringify({ email: o.email, at: Date.now() }), sessionStorage);
      return ok;
    },
    logout() { safeDel(SESSION_KEY, sessionStorage); emit(); },
    isOwner() {
      const raw = safeGet(SESSION_KEY, sessionStorage); if (!raw) return false;
      try { const s = JSON.parse(raw); return Date.now() - s.at < 8 * 3600 * 1000; } catch (e) { return false; }
    },
    usingDefaultPassword: () => !state.owner.passHash,
    async changeCredentials(email, newPassword) {
      state.owner.email = email.trim();
      state.owner.salt = uid('s');
      state.owner.passHash = await sha256(state.owner.salt + ':' + newPassword);
      save();
    },

    /* ---------- Dados de exemplo para o painel financeiro ---------- */
    seedExampleOrders(days = 30) {
      const prods = state.products.filter((p) => p.price > 0);
      if (!prods.length) return;
      const names = ['Exemplo Ana', 'Exemplo Bruno', 'Exemplo Carla', 'Exemplo Diego', 'Exemplo Elis'];
      const methods = ['pix', 'pix', 'cartao', 'dinheiro'];
      const now = Date.now();
      for (let d = days - 1; d >= 0; d--) {
        const weekday = new Date(now - d * 86400000).getDay();
        const n = 6 + Math.floor(Math.random() * 8) + (weekday === 5 || weekday === 6 ? 8 : 0);
        for (let k = 0; k < n; k++) {
          const at = new Date(now - d * 86400000);
          at.setHours(18 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 60));
          const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
            const p = prods[Math.floor(Math.random() * prods.length)];
            return { productId: p.id, name: p.name, qty: 1 + Math.floor(Math.random() * 2), unitPrice: p.price, options: [], removed: [] };
          });
          const subtotal = items.reduce((s, it) => s + linePrice(it), 0);
          const fee = Number(state.store.deliveryFee || 0);
          state.orders.push({
            id: uid('o'), number: ++state.orderSeq, example: true, createdAt: at.toISOString(),
            customer: { name: names[k % names.length], cpf: '000.000.000-00', phone: '(00) 00000-0000' },
            address: { text: 'Endereço de exemplo' }, items, subtotal, deliveryFee: fee,
            total: Math.round((subtotal + fee) * 100) / 100,
            payment: { method: methods[Math.floor(Math.random() * methods.length)] },
            status: 'entregue', nfce: { status: 'autorizada', provider: 'simulado', numero: 0 }
          });
        }
      }
      state.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      save();
    },
    clearExampleOrders() { state.orders = state.orders.filter((o) => !o.example); save(); },
    resetAll() { state = seedState(); state.seedVersion = (window.SPETITOS_SEED || {}).version || 1; save(); }
  };

  load();
  if (!state.orders.length && !safeGet(KEY + ':seeded')) { Store.seedExampleOrders(); safeSet(KEY + ':seeded', '1'); }
  window.Store = Store;
})();
