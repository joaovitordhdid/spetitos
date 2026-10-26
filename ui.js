/* Primitivas de interface compartilhadas: folha (bottom sheet / modal), toast e helpers.
   Visual em base.css (classes .sheet*, .toast). Todos os módulos usam estas funções. */
(function () {
  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    children.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  };

  let stack = [];
  /* UI.openSheet({ title, content: Node, footer?: Node, size?: 'sm'|'md'|'lg'|'full', onClose? }) → { el, body, close } */
  function openSheet({ title, content, footer, size = 'md', onClose, className = '' }) {
    const backdrop = h('div', { class: 'sheet-backdrop' });
    const closeBtn = h('button', { class: 'sheet-close', type: 'button', 'aria-label': 'Fechar' }, '×');
    const body = h('div', { class: 'sheet-body' }, content || '');
    const panel = h('div', { class: `sheet sheet--${size} ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' },
      h('div', { class: 'sheet-head' }, h('div', { class: 'sheet-grip' }), title ? h('h2', { class: 'sheet-title' }, title) : '', closeBtn),
      body,
      footer ? h('div', { class: 'sheet-foot' }, footer) : ''
    );
    backdrop.append(panel);
    document.body.append(backdrop);
    document.documentElement.classList.add('has-sheet');
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    const api = {
      el: panel, body,
      close() {
        backdrop.classList.remove('is-open');
        stack = stack.filter((s) => s !== api);
        if (!stack.length) document.documentElement.classList.remove('has-sheet');
        setTimeout(() => backdrop.remove(), 260);
        onClose && onClose();
      }
    };
    closeBtn.addEventListener('click', api.close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) api.close(); });
    stack.push(api);
    setTimeout(() => (panel.querySelector('[autofocus]') || closeBtn).focus(), 50);
    return api;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

  /* UI.toast(msg, {tone:'ok'|'warn'|'err'}) */
  function toast(msg, { tone = 'ok', ms = 2600 } = {}) {
    let host = document.querySelector('.toast-host');
    if (!host) { host = h('div', { class: 'toast-host', 'aria-live': 'polite' }); document.body.append(host); }
    const t = h('div', { class: `toast toast--${tone}` }, msg);
    host.append(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); }, ms);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copiado'); return true; }
    catch (e) { toast('Selecione o texto e copie manualmente', { tone: 'warn' }); return false; }
  }

  window.UI = { h, openSheet, toast, copy, money: (v) => Store.money(v) };
})();
