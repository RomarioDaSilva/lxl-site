# Site LXL Projetos (lxlprojetos.site)

Como o site está organizado, para quando precisar mexer à mão.

## Pastas
- `index.html`, `estilo.css`, `home.js`: página inicial (texto, aparência e scripts separados).
- `natal/`: catálogo de Natal.
  - `dados.js`: **o que você edita à mão** (prazo, seções e produtos). O WhatsApp vem do `empresa.js`.
  - `catalogo.js`: lógica (lista, página da peça, pedido, estoque ao vivo). Em geral não precisa mexer.
  - `estilo.css`: aparência. `busca.js`: caixa de busca. `enfeites.js`: neve e luzes do topo.
  - `imagens/`: fotos (`imagens/CODIGO.jpg`, miniaturas em `imagens/mini/`). `p/CODIGO/`: página de compartilhar cada peça.
  - `busca-indice.json`: índice usado pela busca da home e pela importação do painel.
- `faq/`: perguntas frequentes (`index.html` + `estilo.css`).
- `painel/`: sistema de pedidos, orçamentos, estoque, clientes, categorias, relatórios, calculadora, usuários e ajustes.
  - `api.php` é só o roteador. Cada assunto tem o seu arquivo em `acoes/`: `acesso` (entrar, esqueci a senha, convite, plano B), `ajustes` (backup, histórico, e-mail), `usuarios`, `estoque`, `relatorios`, `clientes`, `categorias`, `pedidos`, `orcamentos`.
    Para achar uma ação (ex.: `pedido_receber`), procure o nome dela dentro de `acoes/`.
  - `bd.php` (tabelas e registro de mudanças do banco), `sessao.php` (login e **perfis de acesso**), `dados.php` (funções de leitura), `seguranca.php` (histórico e avisos por e-mail), `backup.php`, `lib.php` (conexão).
  - `js/` (telas, uma por assunto: `pedidos`, `pedido-form`, `nota`, `orcamentos`, `clientes`, `estoque`, `categorias`, `usuarios`, `ajustes`, `acesso`...). `index.html` carrega todos na ordem. `app.css` (visual), `calc.js` (fórmula de custo).
  - `estoque.php` (dados públicos do estoque para o catálogo), `track.php` e `medir.js` (contador de visitas).
  - A senha do banco NÃO fica aqui: fica em `lxl-config.php`, um nível acima do `public_html` (modelo em `painel/config.example.php`).
- `empresa.js`: **dados da empresa** (WhatsApp, Instagram, site, cidade) num lugar só. A home, o catálogo, o FAQ e a notinha do painel leem dele.
- `testes/`: testes automáticos (`sh testes/rodar.sh`). Também rodam sozinhos no GitHub a cada envio (`.github/workflows/testes.yml`): um X vermelho no commit quer dizer que algo quebrou.
- `scripts/`: `promover.sh` (sobe teste para produção sem esquecer nada), `atualizar-versoes.py` (números `?v=` automáticos) e `google-producao.sh`.
- `teste/`: cópia de tudo para testar antes. Nada novo vai direto para produção.
- `analytics.js`: Google Analytics (cole o ID `G-...` na variável `GA_ID`).

## Categorias (painel e catálogo)
- No painel, aba **Categorias**: árvore sem limite de níveis. Um item pode estar em várias categorias.
- A árvore é recolhível (setas ▸ ▾). "Ver itens" abre a tela da categoria (`#/categoria/ID`), onde dá para criar um item já dentro dela, incluir itens que já existem e tirar itens (só desliga a ligação, nunca apaga o item).
- Mover uma categoria leva os itens junto (eles estão ligados à categoria, não ao lugar dela).
- "Mostrar no site" (caixinha na categoria): desmarcada, a categoria e as subcategorias somem do catálogo junto com as peças. Nada é apagado. No banco usa a coluna `ativo` da tabela `categorias`.
- O catálogo de Natal lê a categoria **Natal** do painel (por `painel/estoque.php`): as subcategorias de Natal viram as seções, na ordem do painel (setas ↑ ↓).
- Peça que não está no painel, ou está sem categoria, continua na seção escrita em `natal/dados.js`.
- Peça colocada só em categorias de fora de Natal (ex.: Chaveiros) some do catálogo de Natal.
- O texto, a foto e a descrição de cada peça continuam em `natal/dados.js` (o painel guarda preço, estoque e categorias).

## Regras de ouro
1. Edite primeiro em `teste/`. Só depois copie para produção.
2. Para subir, use `sh scripts/promover.sh` (mostra o que vai mudar) e depois `sh scripts/promover.sh --valendo` (copia, troca `/teste/` por `/`, atualiza versões e confere). Nunca apaga arquivos da produção: ele só lista os que sobraram.
3. Custos e margens nunca entram neste repositório (ele é público). Eles ficam só no banco, pelo painel.
4. Os números `?v=...` no final dos arquivos `.css` e `.js` são automáticos: depois de editar um arquivo à mão, rode `python3 scripts/atualizar-versoes.py` (a rotina do GitHub avisa se esquecer).
5. O mesmo banco serve ao painel de teste e ao de produção.

## Site e painel separados
- O site (home, catálogo, FAQ) **nunca fala com o banco**. Só tem 2 ligações com o painel, e as duas podem falhar sem derrubar nada: o catálogo lê `painel/estoque.php` (preço, estoque e categorias; se falhar, usa os dados do `natal/dados.js`) e `painel/medir.js` conta visitas (se falhar, é ignorado).
- O painel só lê do site o `natal/busca-indice.json` (para importar peças) e o logo.
- O teste `testes/site-sem-painel.py` prova que o catálogo abre normal com o painel desligado.

## Ajustes, usuários e segurança (painel)
- **Backup**: Ajustes, "Baixar backup agora". Baixa um JSON com tudo, sem senhas. Guarde fora do GitHub.
- **Histórico**: tudo que é alterado fica registrado (quem, quando, antes e depois). Custos não entram no histórico.
- **Avisos por e-mail**: o e-mail é digitado em Ajustes (fica no banco, não no código). Avisa no 3º e no 8º erro de senha, aparelho novo e senha trocada.
- **Usuários**: só o administrador convida (Ajustes, Gerenciar usuários). A pessoa recebe um link e escolhe nome, login e senha. Perfis ficam em `PERFIS_ACOES` (`sessao.php`): `admin` vê tudo; `pedidos` vê só pedidos, orçamentos e clientes (sem custos). Para criar um perfil novo, acrescente em `sessao.php` e em `PERFIS` (`js/base.js`).
- **Esqueci a senha**: link por e-mail, vale 30 minutos e funciona uma vez. O administrador também gera link de senha nova para qualquer usuário.
- **PLANO B do administrador** (se o e-mail não chegar): 1) Hostinger, Arquivos, Gerenciador de arquivos. 2) Abra a pasta acima do `public_html`, onde está o `lxl-config.php`. 3) Copie o valor de `codigo_inicial`. 4) No painel, "Esqueci minha senha" e depois "Sou o administrador e o e-mail não chega". 5) Cole o código, informe o seu usuário e a senha nova. 6) Depois de entrar, troque o `codigo_inicial` por um novo (mínimo 8 caracteres) nesse mesmo arquivo.
- **Orçamento**: não baixa estoque nem entra nas vendas. O botão "Gerar pedido" cria o pedido, baixa o estoque e liga os dois.
- **Pagamento parcial**: o pedido guarda o que já foi pago (sinal) e mostra quanto falta. O botão "Recebi" registra um pagamento.

## Google (só na hora de ir para produção)
- `/teste/` é sempre `noindex` e bloqueado no `robots.txt`.
- As páginas públicas já têm título, descrição, canonical e dados do negócio. Na promoção, rode `sh scripts/google-producao.sh` na raiz: tira o `noindex` das 3 páginas públicas, cria o `sitemap.xml` e libera o `robots.txt`. As páginas `/natal/p/CODIGO/` (prévia do WhatsApp) ficam `noindex` de propósito.
- Depois de publicar, envie o sitemap no Google Search Console.

## Banco de dados: como mudar
- As tabelas se criam sozinhas. Para uma **coluna nova**, acrescente `[tabela, coluna, tipo]` na lista em `painel/bd.php`. Para qualquer outra mudança, use `MIGRACOES_SQL` no mesmo arquivo.
- A tabela `migracoes` registra o que já foi aplicado e quando, então cada mudança roda uma vez só.

## Acessibilidade dos formulários
- As telas do painel são montadas em texto. A função `ligarRotulos` (em `js/base.js`) liga sozinha cada `<label>` ao seu campo (`for`/`id`). O teste `telas-painel.py` falha se sobrar rótulo solto.

## Limites conhecidos (de propósito, por simplicidade)
- Os arquivos de `js/` compartilham variáveis (sem módulos). Funciona e é simples de editar à mão; se o painel crescer muito, o próximo passo é migrar para módulos.
- As telas são montadas em texto dentro do JS. Se um dia houver redesenho completo, os arquivos `js/*.js` e as classes do `app.css` são o ponto de partida.
- Os testes são de fumaça e de regras principais (API, telas, cálculos). Não cobrem cada detalhe visual.
