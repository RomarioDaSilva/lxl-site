# Site LXL Projetos (lxlprojetos.site)

Como o site está organizado, para quando precisar mexer à mão.

## Pastas
- `index.html`, `estilo.css`, `home.js`: página inicial (texto, aparência e scripts separados).
- `natal/`: catálogo de Natal.
  - `dados.js`: **o que você edita à mão** (WhatsApp, prazo, seções e produtos).
  - `catalogo.js`: lógica (lista, página da peça, pedido, estoque ao vivo). Em geral não precisa mexer.
  - `estilo.css`: aparência. `busca.js`: caixa de busca. `enfeites.js`: neve e luzes do topo.
  - `imagens/`: fotos (`imagens/CODIGO.jpg`, miniaturas em `imagens/mini/`). `p/CODIGO/`: página de compartilhar cada peça.
  - `busca-indice.json`: índice usado pela busca da home e pela importação do painel.
- `faq/`: perguntas frequentes (`index.html` + `estilo.css`).
- `painel/`: sistema de pedidos, estoque, clientes, categorias, relatórios e calculadora.
  - `api.php` (banco e regras), `app.js` (telas), `app.css` (visual), `calc.js` (fórmula de custo),
    `estoque.php` (dados públicos do estoque para o catálogo), `track.php` e `medir.js` (contador de visitas), `lib.php` (conexão).
  - A senha do banco NÃO fica aqui: fica em `lxl-config.php`, um nível acima do `public_html` (modelo em `painel/config.example.php`).
- `teste/`: cópia de tudo para testar antes. Nada novo vai direto para produção.
- `analytics.js`: Google Analytics (cole o ID `G-...` na variável `GA_ID`).

## Regras de ouro
1. Edite primeiro em `teste/`. Só depois copie para produção.
2. Quando copiar da pasta `teste/` para a raiz, copie também os arquivos `.css` e `.js` de cada página, e troque `/teste/` por `/` nos endereços.
3. Custos e margens nunca entram neste repositório (ele é público). Eles ficam só no banco, pelo painel.
4. Arquivos com `?v=NN` no final (ex.: `app.js?v=25`): ao editar o arquivo à mão, aumente o número para o navegador baixar a versão nova.
5. O mesmo banco serve ao painel de teste e ao de produção.
