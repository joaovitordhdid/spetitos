/* Carrinho do cliente (por visitante, em localStorage). Usado por menu.js e checkout.js. */
(function () {
  const KEY = 'spetitos:cart';
  const listeners = new Set();
  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { items = []; }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    listeners.forEach((fn) => { try { fn(items); } catch (e) { console.error(e); } });
  }

  const Cart = {
    /* item = {productId, name, img, qty, unitPrice, options:[{group,name,price,qty}], removed:[...], note} */
    items: () => items,
    add(item) { items.push(Object.assign({ key: Store.uid('ci'), qty: 1, options: [], removed: [], note: '' }, item)); persist(); },
    setQty(key, qty) {
      const it = items.find((i) => i.key === key); if (!it) return;
      if (qty <= 0) items = items.filter((i) => i.key !== key); else it.qty = qty;
      persist();
    },
    remove(key) { items = items.filter((i) => i.key !== key); persist(); },
    clear() { items = []; persist(); },
    count: () => items.reduce((s, i) => s + i.qty, 0),
    subtotal: () => items.reduce((s, i) => s + Store.linePrice(i), 0),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
  window.Cart = Cart;
})();
