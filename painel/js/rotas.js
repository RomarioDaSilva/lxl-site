/* PAINEL LXL | ROTAS: qual tela abre para cada endereço (#/...) e a partida do painel.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* ---------- rotas ---------- */
function rota() {
  if (!csrf) return;
  const h = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  /* telas sem login: link de convite, link de senha, "esqueci" e plano B do administrador */
  if (['convite', 'senha'].includes(h[0]) && h[1]) return telaToken(h[0] === 'convite' ? 'convite' : 'senha', h[1]);
  if (!logado) { if (h[0] === 'esqueci') return telaEsqueci(); if (h[0] === 'recuperar') return telaRecuperar(); return telaLogin(setupPendente); }
  const telas = { novo: ['pedido_salvar', () => telaPedidoForm(0)], editar: ['pedido_salvar', () => telaPedidoForm(+h[1])], nota: ['pedido', () => telaNota(+h[1])],
    orcamentos: ['orcamentos', () => telaOrcamentos()], 'orcamento-novo': ['orcamento_salvar', () => telaPedidoForm(0, 'orcamento')], 'orcamento-ver': ['orcamento', () => telaOrcamentoVer(+h[1])], 'orcamento-editar': ['orcamento_salvar', () => telaPedidoForm(+h[1], 'orcamento')],
    estoque: ['produto_salvar', () => telaEstoque()], ajustes: ['ajustes', () => telaAjustes()], historico: ['historico', () => telaHistorico()], usuarios: ['usuarios', () => telaUsuarios()],
    categorias: ['categorias', () => telaCategorias()], categoria: ['categorias', () => telaCategoria(+h[1])], clientes: ['clientes', () => telaClientes()], cliente: ['cliente', () => telaCliente(+h[1])],
    relatorios: ['relatorios', () => telaRelatorios()], calculadora: ['parametros_salvar', () => telaCalculadora()] };
  const t = telas[h[0]];
  if (t && pode(t[0])) return t[1]();
  return telaPedidos();   /* endereço desconhecido ou sem permissão: volta para os pedidos */
}
window.addEventListener('hashchange', rota);

let setupPendente = false;
async function iniciar() {
  try {
    const j = await (await fetch('api.php?a=estado', { credentials: 'same-origin' })).json();
    if (j.erro) { app.innerHTML = '<div class="wrap"><div class="card"><h2>Ops</h2><p>' + esc(j.erro) + '</p></div></div>'; return; }
    csrf = j.csrf; usuario = j.usuario; logado = !!j.logado; perfil = j.perfil || 'admin'; permitidas = j.permitidas || null; setupPendente = !!j.setup;
    produtos = null; clientes = null;   /* limpa o que estava guardado de outro usuário */
    rota();
  } catch (e) { app.innerHTML = '<div class="wrap"><p class="carregando">Não consegui abrir o painel. Tente de novo.</p></div>'; }
}
iniciar();
