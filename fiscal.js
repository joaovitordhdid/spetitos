/* Emissão automática de NFC-e (nota fiscal de consumidor eletrônica, modelo 65).
   Ponto de integração único: Fiscal.emitir(order) é chamado pelo checkout logo após o pedido.

   Emitir NFC-e de verdade exige: CNPJ com inscrição estadual habilitada para NFC-e na SEFAZ,
   certificado digital A1, CSC (código de segurança do contribuinte) e um provedor/API emissora.
   O certificado e o token do provedor NUNCA podem ficar no navegador: a chamada real deve passar
   por um backend (função serverless) que guarda os segredos. Aqui o modo "simulado" gera uma nota
   de demonstração com chave de 44 dígitos e DANFE para visualização.

   Provedores previstos (adaptadores com o payload no formato de cada API):
     - focusnfe   → POST {backend}/nfce?ref={pedido}  (Focus NFe: https://focusnfe.com.br/doc/#nfce)
     - nfeio      → POST {backend}/nfce               (NFE.io)
     - plugnotas  → POST {backend}/nfce               (PlugNotas / TecnoSpeed)
   O campo "backendUrl" na configuração aponta para a função serverless que repassa ao provedor. */
(function () {
  const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

  function mod11(base) {
    let sum = 0, w = 2;
    for (let i = base.length - 1; i >= 0; i--) { sum += Number(base[i]) * w; w = w === 9 ? 2 : w + 1; }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  }

  /* Chave de acesso: cUF(2) AAMM(4) CNPJ(14) mod(2)=65 serie(3) nNF(9) tpEmis(1) cNF(8) DV(1) */
  function chaveAcesso({ cUF = '29', cnpj, serie, numero, data = new Date() }) {
    const aamm = String(data.getFullYear()).slice(2) + String(data.getMonth() + 1).padStart(2, '0');
    const cnf = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    const base = cUF + aamm + onlyDigits(cnpj || '00000000000000').padStart(14, '0') + '65' +
      String(serie).padStart(3, '0') + String(numero).padStart(9, '0') + '1' + cnf;
    return base + mod11(base);
  }

  /* Monta o payload no formato Focus NFe (os outros adaptadores convertem a partir dele) */
  function payloadFocus(order, cfg) {
    return {
      natureza_operacao: 'Venda ao consumidor',
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      presenca_comprador: 4,                 // 4 = entrega em domicílio
      modalidade_frete: order.deliveryFee > 0 ? 0 : 9,  // 9 = sem frete; validar com o contador em homologação
      local_destino: 1,
      cnpj_emitente: onlyDigits(cfg.cnpj),
      cpf_destinatario: onlyDigits(order.customer.cpf),
      nome_destinatario: order.customer.name,
      valor_frete: order.deliveryFee,
      items: order.items.map((it, i) => ({
        numero_item: i + 1,
        codigo_produto: it.productId,
        descricao: it.name + (it.options && it.options.length ? ' + ' + it.options.map((o) => o.name).join(', ') : ''),
        cfop: '5102',
        unidade_comercial: 'UN',
        quantidade_comercial: it.qty,
        valor_unitario_comercial: Store.linePrice(it) / it.qty,
        valor_bruto: Store.linePrice(it),
        codigo_ncm: '21069090',               // ajustar por produto com o contador
        icms_situacao_tributaria: '102',      // Simples Nacional sem crédito (ajustar)
        icms_origem: 0
      })),
      formas_pagamento: [{
        forma_pagamento: { pix: '17', cartao: '03', dinheiro: '01' }[order.payment.method] || '99',
        valor_pagamento: order.total
      }]
    };
  }

  const adapters = {
    async simulado(order, cfg) {
      await new Promise((r) => setTimeout(r, 900));
      const numero = cfg.proximoNumero || 1;
      Store.updateFiscal({ proximoNumero: numero + 1 });
      const chave = chaveAcesso({ cnpj: cfg.cnpj, serie: cfg.serie || 1, numero });
      return {
        status: 'autorizada', provider: 'simulado', ambiente: 'homologacao',
        numero, serie: cfg.serie || 1, chave,
        protocolo: '1' + String(Date.now()).slice(-14),
        emitidaEm: new Date().toISOString(),
        aviso: 'Nota de demonstração, sem valor fiscal. Configure um provedor no painel do dono.'
      };
    },
    async focusnfe(order, cfg) { return callBackend(order, cfg, payloadFocus(order, cfg)); },
    async nfeio(order, cfg) { return callBackend(order, cfg, payloadFocus(order, cfg)); },
    async plugnotas(order, cfg) { return callBackend(order, cfg, payloadFocus(order, cfg)); }
  };

  async function callBackend(order, cfg, payload) {
    // No site hospedado na Vercel a função fica em /api/nfce (api/nfce.js); backendUrl permite outro servidor
    const base = (cfg.backendUrl || '/api').replace(/\/$/, '');
    const res = await fetch(base + '/nfce', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: cfg.provider, ambiente: cfg.ambiente, ref: 'pedido-' + order.number, payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.mensagem || data.erro || (data.erros && data.erros.map((e) => e.mensagem).join('; ')) || 'Servidor fiscal respondeu ' + res.status);
    return {
      status: data.status === 'autorizado' || data.status === 'autorizada' ? 'autorizada' : (data.status === 'erro_autorizacao' || data.status === 'denegado' ? 'erro' : (data.status || 'processando')),
      erro: data.status === 'autorizado' ? undefined : data.mensagem,
      provider: cfg.provider, ambiente: cfg.ambiente,
      numero: data.numero, serie: data.serie, chave: data.chave_nfe || data.chave,
      protocolo: data.protocolo, urlDanfe: data.caminho_danfe || data.url_danfe, qrcode: data.qrcode_url, urlConsulta: data.url_consulta,
      emitidaEm: new Date().toISOString()
    };
  }

  const Fiscal = {
    providers: [
      { id: 'simulado', name: 'Demonstração (sem valor fiscal)' },
      { id: 'focusnfe', name: 'Focus NFe' },
      { id: 'nfeio', name: 'NFE.io' },
      { id: 'plugnotas', name: 'PlugNotas (TecnoSpeed)' }
    ],
    /* Emite a NFC-e do pedido e grava o resultado em order.nfce. Nunca lança: em erro, grava status 'erro'. */
    async emitir(order) {
      const cfg = Store.fiscalConfig();
      Store.updateOrder(order.id, { nfce: { status: 'emitindo', provider: cfg.provider } });
      try {
        const nfce = await (adapters[cfg.provider] || adapters.simulado)(order, cfg);
        return Store.updateOrder(order.id, { nfce });
      } catch (e) {
        return Store.updateOrder(order.id, { nfce: { status: 'erro', provider: cfg.provider, erro: e.message } });
      }
    },
    formatChave: (c) => String(c || '').replace(/(\d{4})(?=\d)/g, '$1 '),
    payloadFocus, chaveAcesso
  };
  window.Fiscal = Fiscal;
})();
