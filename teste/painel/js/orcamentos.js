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
      return '<div class="card orc"><div class="hh"><b>ORC-' + numPed(o.id) + ' &middot; ' + esc(o.cliente) + '</b><span class="pill ' + (o.status === 'aprovado' ? 'pago' : o.status === 'recusado' ? 'cancelado' : 'apagar') + '">' + STATUS_ORC[o.status] + (venceu ? ' &middot; venceu' : '') + '</span></div>' +
        '<div class="hh"><b>' + brl(o.total) + '</b><span class="acoes">' +
        (o.status === 'aprovado' ? '<a class="btn s l" href="#/orcamento-ver/' + o.id + '">Ver orçamento</a><a class="btn s l" href="#/nota/' + o.pedido_id + '">Ver pedido PED-' + numPed(o.pedido_id) + '</a>' :
          '<a class="btn s l" href="#/orcamento-ver/' + o.id + '">Ver orçamento</a><a class="btn s l" href="#/orcamento-editar/' + o.id + '">Editar</a><button class="btn s" data-ger="' + o.id + '" type="button">Gerar pedido</button>' +
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

/* Mensagem de WhatsApp com o orçamento (texto puro, sem a imagem). */
function msgOrcamento(o) {
  const nome = (o.cliente || '').trim().split(/\s+/)[0];
  const sub = o.itens.reduce((t, i) => t + i.preco * i.qtd, 0);
  return 'Olá' + (nome ? ', ' + nome : '') + '! Segue o orçamento *ORC-' + numPed(o.id) + '* da LXL Projetos:\n\n' +
    o.itens.map(i => '• ' + i.qtd + 'x ' + i.descricao + ' ' + brl(i.preco * i.qtd)).join('\n') + '\n\n' +
    (o.desconto || o.frete ? 'Subtotal: ' + brl(sub) + '\n' : '') + (o.desconto ? 'Desconto: -' + brl(o.desconto) + '\n' : '') + (o.frete ? 'Frete: ' + brl(o.frete) + '\n' : '') +
    '*Total: ' + brl(o.total) + '*\n' + (o.entrega === 'Entrega' ? 'Entrega' + (o.endereco ? ': ' + o.endereco : '') : 'Retirada') + '\n' +
    (o.prazo ? 'Prazo: ' + o.prazo + '\n' : '') + (o.validade ? 'Orçamento válido até ' + dataBR(o.validade) + '.\n' : '') + (o.obs ? '\n' + o.obs + '\n' : '') +
    '\nQualquer dúvida é só me chamar!';
}

/* Ver orçamento: nota de orçamento (para baixar ou compartilhar como imagem) e a mensagem de WhatsApp. */
async function telaOrcamentoVer(id) {
  quadro('orcamentos', '<p class="carregando">Carregando...</p>');
  let o;
  try { o = (await api('orcamento', null, '&id=' + id)).orcamento; } catch (e) { toast(e.message); return telaOrcamentos(); }
  const fone = (o.whatsapp || '').replace(/\D/g, '').replace(/^55/, '');
  $('.wrap').innerHTML =
    '<div class="barra"><a class="btn l s" href="#/orcamentos">&larr; Orçamentos</a>' + (o.status === 'aprovado' ? '' : '<a class="btn l s" href="#/orcamento-editar/' + o.id + '">Editar</a>') +
    '<span class="pill ' + (o.status === 'aprovado' ? 'pago' : o.status === 'recusado' ? 'cancelado' : 'apagar') + '" style="align-self:center">' + STATUS_ORC[o.status] + '</span></div>' +
    '<div class="barra"><button class="btn o" id="png" type="button">Baixar imagem</button><button class="btn l" id="cmp" type="button">Compartilhar</button></div>' +
    '<div class="notaarea">' + notaHTML(o, true) + '</div>' +
    '<div class="card"><h2>Mensagem para o WhatsApp</h2><textarea id="msg" rows="12"></textarea>' +
    '<div class="acoes"><button class="btn o" id="cpy" type="button">Copiar mensagem</button>' +
    '<a class="btn l" id="wa" target="_blank" rel="noopener" href="#">' + (fone ? 'Abrir no WhatsApp do cliente' : 'Abrir no WhatsApp') + '</a></div></div>';
  $('#msg').value = msgOrcamento(o);
  const link = () => { $('#wa').href = 'https://wa.me/' + (fone ? '55' + fone : '') + '?text=' + encodeURIComponent($('#msg').value); };
  link(); $('#msg').addEventListener('input', link);
  $('#cpy').onclick = async () => { try { await navigator.clipboard.writeText($('#msg').value); toast('Mensagem copiada.'); } catch (e) { $('#msg').select(); toast('Selecionei o texto, é só copiar.'); } };
  ligarImagemNota('orcamento-ORC-' + numPed(o.id) + '-' + slugNome(o.cliente) + '.png', 'Orçamento LXL Projetos');
}
