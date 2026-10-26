# Como ativar a NFC-e real (Focus NFe)

O app já envia cada pedido para `api/nfce.js`, que fala com a Focus NFe. Falta só a parte da empresa:

1. **SEFAZ-SE:** CNPJ com inscrição estadual habilitada para emitir NFC-e (modelo 65). Peça ao contador.
2. **CSC:** gere o Código de Segurança do Contribuinte (CSC) e o ID do CSC no portal da SEFAZ-SE.
3. **Certificado digital A1** (arquivo .pfx e senha).
4. **Focus NFe** (https://focusnfe.com.br): crie a conta, cadastre a empresa, envie o certificado A1 e informe o CSC lá no painel deles. Copie o **token de homologação**.
5. **No servidor (Vercel → Settings → Environment Variables):**
   - `FOCUS_NFE_TOKEN` = token da Focus
   - `FOCUS_NFE_AMBIENTE` = `homologacao` (troque para `producao` só depois de testar)
6. **No painel do dono → Configurações → Nota fiscal:** escolha *Focus NFe*, preencha CNPJ, IE, série e próximo número. Deixe o servidor em branco (usa `/api`).
7. Faça um pedido de teste e confira a nota no painel da Focus. Peça ao contador para validar NCM, CFOP e CST de cada produto (o app usa NCM 21069090, CFOP 5102 e CSOSN 102 como padrão para Simples Nacional).

O token e o certificado nunca ficam no navegador.
