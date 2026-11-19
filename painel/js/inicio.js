/* PAINEL LXL | TELA INICIAL: logo grande ao fundo e atalhos para as áreas. Abre ao entrar no painel e ao tocar na logo. */
'use strict';
function telaInicio() {
  const atalhos = [['#/pedidos', '&#128203;', 'Pedidos', 'pedidos'], ['#/orcamentos', '&#128221;', 'Orçamentos', 'orcamentos'],
    ['#/clientes', '&#128100;', 'Clientes', 'clientes'], ['#/estoque', '&#128230;', 'Estoque', 'produto_salvar'], ['#/categorias', '&#128193;', 'Categorias', 'categorias'],
    ['#/calculadora', '&#129518;', 'Calculadora', 'parametros_salvar'], ['#/relatorios', '&#128200;', 'Relatórios', 'relatorios'], ['#/ajustes', '&#9881;', 'Ajustes', 'ajustes']]
    .filter(x => pode(x[3])).map(([h, ic, tx]) => '<a class="atalho" href="' + h + '"><span>' + ic + '</span>' + tx + '</a>').join('');
  quadro('inicio', '<div class="inicio"><div class="inicio-corpo"><h1>' + (usuario ? 'Olá, ' + esc(usuario) : 'Olá') + '</h1><p class="mut">O que vamos fazer hoje?</p><div class="atalhos">' + atalhos + '</div></div>' +
    '<div class="inicio-marca"><img src="/natal/imagens/logo-colorida.png" alt="LXL Projetos"></div>' +
    '<p class="inicio-rodape">' + esc(EMPRESA.cidade) + ' &middot; ' + esc(EMPRESA.fone) + ' &middot; ' + esc(EMPRESA.insta) + '</p></div>');
}
