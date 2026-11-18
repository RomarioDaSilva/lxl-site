/* PAINEL LXL | ORÇAMENTOS: lista e botão "Gerar pedido". O formulário é o mesmo do pedido (telaPedidoForm com modo 'orcamento').
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

const STATUS_ORC = { aberto: 'Em aberto', aprovado: 'Virou pedido', recusado: 'Recusado' };
let fOrc = 'aberto';

async function telaOrcamentos() {
  quadro('orcamentos', '<p class="carregando">Carregando...</p>');
  let j; try { j = await api('orcamentos', null, fOrc ? '&status=' + fOrc : ''); } catch (e) { return toast(e.message); }
  const hojeStr = hoje();
  $('.wrap').innerHTML = '<h1>Orçamentos</h1><div class="barra"><a class="btn o" href="#/orcamento-novo">Novo orçamento</a></div>' +
    '<div class="chips">' + [['aberto', 'Em aberto'], ['aprovado', 'Viraram pedido'], ['recusado', 'Recusados'], ['', 'Todos']].map(([k, t]) => '<button type="button" class="chip' + (fOrc === k ? ' on' : '') + '" data-f="' + k + '">' + t + '</button>').join('') + '</div>' +
    (j.orcamentos.length ? j.orcamentos.map(o => {
      const venceu = o.status === 'aberto' && o.validade && o.validade < hojeStr;
      return '<div class="card orc"><div class="hh"><b>ORC-' + numPed(o.id) + ' &middot; ' + esc(o.cliente) + '</b><span class="pill ' + (o.status === 'aprovado' ? 'pago' : o.status === 'recusado' ? 'cancelado' : 'apagar') + '">' + STATUS_ORC[o.status] + '</span></div>' +
        '<div class="mut">' + dataBR(o.data) + (o.validade ? ' &middot; válido até ' + dataBR(o.validade) + (venceu ? ' <span class="neg">(venceu)</span>' : '') : '') + '</div>' +
        '<div class="mut">' + esc(o.resumo) + '</div><div class="hh"><b>' + brl(o.total) + '</b><span class="acoes">' +
        (o.status === 'aprovado' ? '<a class="btn s l" href="#/nota/' + o.pedido_id + '">Ver pedido #' + numPed(o.pedido_id) + '</a>' :
          '<a class="btn s l" href="#/orcamento-editar/' + o.id + '">Editar</a><button class="btn s" data-ger="' + o.id + '" type="button">Gerar pedido</button>' +
          '<button class="btn s l" data-st="' + o.id + '" data-novo="' + (o.status === 'aberto' ? 'recusado' : 'aberto') + '" type="button">' + (o.status === 'aberto' ? 'Recusar' : 'Reabrir') + '</button>') +
        '</span></div></div>';
    }).join('') : '<div class="vazio">Nenhum orçamento aqui.</div>');
  document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { fOrc = b.dataset.f; telaOrcamentos(); });
  document.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => { try { await api('orcamento_status', { id: +b.dataset.st, status: b.dataset.novo }); telaOrcamentos(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-ger]').forEach(b => b.onclick = () => gerarPedido(j.orcamentos.find(x => x.id === +b.dataset.ger)));
}

/* Confirma e transforma o orçamento em pedido. Pode já informar um sinal pago. */
function gerarPedido(o) {
  const m = modal('<h2>Gerar pedido <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<p>O orçamento <b>ORC-' + numPed(o.id) + '</b> de <b>' + esc(o.cliente) + '</b> (' + brl(o.total) + ') vira um pedido e baixa o estoque das peças de pronta entrega.</p>' +
    '<label>O cliente já pagou algum sinal? (R$, deixe vazio se não)</label><input type="text" inputmode="decimal" id="gs" placeholder="0,00">' +
    '<div class="acoes"><button class="btn" id="gok" type="button">Gerar pedido</button></div>');
  $('#gok', m).onclick = async () => {
    const b = $('#gok', m); b.disabled = true;
    try {
      const j = await api('orcamento_gerar_pedido', { id: o.id, sinal: parseNum($('#gs', m).value) });
      produtos = null; m.fechar();
      if (j.avisos && j.avisos.length) toast('Atenção: estoque negativo em ' + j.avisos.join(', '));
      location.hash = '#/nota/' + j.pedido_id;
    } catch (e) { toast(e.message); b.disabled = false; }
  };
}
