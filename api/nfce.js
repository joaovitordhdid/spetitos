/* Função serverless (Vercel, Node 18+) que emite a NFC-e na Focus NFe.
   O navegador nunca vê o token: ele fica nas variáveis de ambiente do projeto.
     FOCUS_NFE_TOKEN      token da empresa no painel da Focus NFe (obrigatório)
     FOCUS_NFE_AMBIENTE   "homologacao" (padrão) ou "producao"
     ALLOWED_ORIGIN       domínio do cardápio (opcional; padrão: mesma origem)
   Docs: https://focusnfe.com.br/doc/#nfce  —  POST /v2/nfce?ref=REFERENCIA (síncrono para NFC-e) */
const HOSTS = {
  homologacao: 'https://homologacao.focusnfe.com.br',
  producao: 'https://api.focusnfe.com.br'
};

module.exports = async (req, res) => {
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const token = process.env.FOCUS_NFE_TOKEN;
  if (!token) return res.status(500).json({ erro: 'FOCUS_NFE_TOKEN não configurado no servidor' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { ref, payload } = body;
  if (!ref || !payload || !Array.isArray(payload.items) || !payload.items.length) {
    return res.status(400).json({ erro: 'Pedido sem referência ou sem itens' });
  }

  // O ambiente vem do servidor, não do navegador, para ninguém emitir em produção por engano
  const ambiente = process.env.FOCUS_NFE_AMBIENTE === 'producao' ? 'producao' : 'homologacao';
  const url = `${HOSTS[ambiente]}/v2/nfce?ref=${encodeURIComponent(ref)}&completa=0`;
  const auth = 'Basic ' + Buffer.from(token + ':').toString('base64');

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    const base = HOSTS[ambiente];
    // A Focus devolve caminhos relativos para DANFE/XML
    const abs = (p) => (p && p.startsWith('/') ? base + p : p);
    return res.status(r.ok ? 200 : r.status).json({
      status: data.status,                    // autorizado | erro_autorizacao | denegado | processando_autorizacao
      mensagem: data.mensagem_sefaz || data.mensagem,
      numero: data.numero, serie: data.serie,
      chave_nfe: data.chave_nfe && String(data.chave_nfe).replace(/^NFe/, ''),
      protocolo: data.protocolo,
      caminho_danfe: abs(data.caminho_danfe),
      caminho_xml: abs(data.caminho_xml_nota_fiscal),
      qrcode_url: data.qrcode_url,
      url_consulta: data.url_consulta_nf,
      erros: data.erros,
      ambiente
    });
  } catch (e) {
    return res.status(502).json({ erro: 'Falha ao falar com a Focus NFe: ' + e.message });
  }
};
