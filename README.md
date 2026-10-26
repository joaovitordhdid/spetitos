# Spetitos — cardápio digital

Site estático (HTML/CSS/JS sem build) + uma função serverless para a NFC-e.

- `index.html` — página
- `data.js` — cardápio inicial (copiado do InstaDelivery em 26/10/2026)
- `store.js` — dados, pedidos, estoque e login do dono (hoje no navegador)
- `menu.js` / `checkout.js` / `admin.js` — cardápio, finalização do pedido, painel do dono
- `fiscal.js` + `api/nfce.js` — emissão da NFC-e pela Focus NFe (veja `COMO-ATIVAR-NFCE.md`)

Painel do dono: botão no rodapé ou `/#painel`.
