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

## Categorias (painel e catálogo)
- No painel, aba **Categorias**: árvore sem limite de níveis. Um item pode estar em várias categorias.
- A árvore é recolhível (setas ▸ ▾). "Ver itens" abre a tela da categoria (`#/categoria/ID`), onde dá para criar um item já dentro dela, incluir itens que já existem e tirar itens (só desliga a ligação, nunca apaga o item).
- Mover uma categoria leva os itens junto (eles estão ligados à categoria, não ao lugar dela).
- O catálogo de Natal lê a categoria **Natal** do painel (por `painel/estoque.php`): as subcategorias de Natal viram as seções, na ordem do painel (setas ↑ ↓).
- Peça que não está no painel, ou está sem categoria, continua na seção escrita em `natal/dados.js`.
- Peça colocada só em categorias de fora de Natal (ex.: Chaveiros) some do catálogo de Natal.
- O texto, a foto e a descrição de cada peça continuam em `natal/dados.js` (o painel guarda preço, estoque e categorias).

## Regras de ouro
1. Edite primeiro em `teste/`. Só depois copie para produção.
2. Quando copiar da pasta `teste/` para a raiz, copie também os arquivos `.css` e `.js` de cada página, e troque `/teste/` por `/` nos endereços.
3. Custos e margens nunca entram neste repositório (ele é público). Eles ficam só no banco, pelo painel.
4. Arquivos com `?v=NN` no final (ex.: `app.js?v=25`): ao editar o arquivo à mão, aumente o número para o navegador baixar a versão nova.
5. O mesmo banco serve ao painel de teste e ao de produção.
