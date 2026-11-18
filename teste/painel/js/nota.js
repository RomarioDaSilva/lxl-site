/* PAINEL LXL | NOTINHA: comprovante do pedido, situação e pagamento.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* ---------- notinha ---------- */
function notaHTML(p, orc) {   /* orc: nota de orçamento (sem pagamento, com validade) */
  const sub = p.itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  const lin = p.itens.map(i => '<tr><td class="c">' + i.qtd + 'x</td><td>' + esc(i.descricao) + (i.detalhes ? '<br><small>' + esc(i.detalhes) + '</small>' : '') + '</td><td class="r">' + brl(i.preco) + '</td><td class="r">' + brl(i.preco * i.qtd) + '</td></tr>').join('');
  return '<div class="nota" id="nota"><div class="cab"><img src="/natal/imagens/logo-colorida.png" alt="LXL Projetos"><div>Peças em impressão 3D &middot; ' + EMPRESA.cidade + '<br>WhatsApp ' + EMPRESA.fone + ' &middot; ' + EMPRESA.insta + '<br>' + EMPRESA.site + '</div></div>' +
    '<div class="tit">' + (orc ? 'ORÇAMENTO' : 'COMPROVANTE DE VENDA') + '<span>Nº ' + (orc ? 'ORC-' : 'PED-') + numPed(p.id) + ' &middot; ' + dataBR(p.data) + '</span></div>' +
    '<div class="cli"><b>Cliente:</b> ' + esc(p.cliente) + (p.whatsapp ? '<br><b>WhatsApp:</b> ' + esc(p.whatsapp) : '') +
    '<br><b>' + (p.entrega === 'Entrega' ? 'Entrega' : 'Retirada') + (p.entrega === 'Entrega' && p.endereco ? ':</b> ' + esc(p.endereco) : '</b>') + (p.prazo ? '<br><b>Prazo:</b> ' + esc(p.prazo) : '') + '</div>' +
    '<table><thead><tr><th class="c">Qtd</th><th>Descrição</th><th class="r">Unit.</th><th class="r">Total</th></tr></thead><tbody>' + lin + '</tbody></table>' +
    '<div class="tot"><div><span>Subtotal</span><span>' + brl(sub) + '</span></div>' +
    (p.desconto ? '<div><span>Desconto</span><span>- ' + brl(p.desconto) + '</span></div>' : '') +
    (p.frete ? '<div><span>Frete</span><span>' + brl(p.frete) + '</span></div>' : '') +
    '<div class="g"><span>TOTAL</span><span>' + brl(p.total) + '</span></div></div>' +
    (orc ? '<div class="pg"><b>Válido até:</b> ' + (p.validade ? dataBR(p.validade) : 'consulte') + '</div>'
      : '<div class="pg"><b>Pagamento:</b> ' + esc(p.pagamento || 'A combinar') + ' &middot; ' + (p.pago ? 'PAGO' : p.pago_valor > 0 ? 'SINAL ' + brl(p.pago_valor) + ' &middot; FALTA ' + brl(p.saldo) : 'A PAGAR') + '</div>') +
    (p.obs ? '<div class="ob"><b>Obs.:</b> ' + esc(p.obs).replace(/\n/g, '<br>') + '</div>' : '') +
    '<div class="rod">' + (orc ? 'Valores e prazo sujeitos à confirmação no WhatsApp.' : 'Obrigado pela preferência!') + '<small>' + (orc ? 'Orçamento, não é um pedido nem tem valor fiscal' : 'Documento sem valor fiscal') + '</small></div></div>';
}

async function telaNota(id) {
  quadro('', '<p class="carregando">Carregando...</p>');
  let p;
  try { p = (await api('pedido', null, '&id=' + id)).pedido; } catch (e) { toast(e.message); return; }
  $('.wrap').innerHTML =
    '<div class="barra"><a class="btn l s" href="#/pedidos">&larr; Pedidos</a><a class="btn l s" href="#/editar/' + p.id + '">Editar</a>' +
    '<span class="pill ' + p.status + '" style="align-self:center">' + STATUS[p.status] + '</span></div>' +
    '<div class="barra"><button class="btn" id="imp" type="button">Imprimir</button><button class="btn o" id="png" type="button">Baixar imagem</button><button class="btn l" id="cmp" type="button">Compartilhar</button></div>' +
    '<div class="notaarea">' + notaHTML(p) + '</div>' +
    '<div class="card"><h2>Situação do pedido</h2><div class="l2"><div><label>Situação</label><select id="st">' + Object.keys(STATUS).map(k => '<option value="' + k + '"' + (k === p.status ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select></div>' +
    '<div><label>Pagamento</label><select id="pg"><option value="0"' + (p.pago ? '' : ' selected') + '>A receber</option><option value="1"' + (p.pago ? ' selected' : '') + '>Pago</option></select></div></div>' +
    (!p.pago && p.saldo > 0 && p.status !== 'cancelado' ? '<div class="acoes"><button class="btn s" id="rec" type="button">Registrar pagamento (falta ' + brl(p.saldo) + ')</button></div>' : '') +
    (p.whatsapp ? '<div class="acoes"><a class="btn l s" target="_blank" rel="noopener" href="https://wa.me/55' + p.whatsapp.replace(/\D/g, '').replace(/^55/, '') + '">Abrir conversa no WhatsApp</a></div>' : '') + '</div>';
  const salvarSt = async () => { try { await api('pedido_status', { id: p.id, status: $('#st').value, pago: +$('#pg').value }); produtos = null; toast('Atualizado.'); telaNota(id); } catch (e) { toast(e.message); } };
  $('#st').onchange = salvarSt; $('#pg').onchange = salvarSt;
  if ($('#rec')) $('#rec').onclick = () => receberModal(p, () => telaNota(id));
  $('#imp').onclick = () => window.print();
  ligarImagemNota('nota-PED-' + numPed(p.id) + '-' + slugNome(p.cliente) + '.png', 'Comprovante LXL Projetos');
}

const slugNome = n => n.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
/* Liga os botões Baixar imagem e Compartilhar (ids #png e #cmp) à imagem da nota que está na tela (#nota). */
function ligarImagemNota(nomeArq, titulo) {
  const gerar = async () => {
    const n = $('#nota');
    const c = await html2canvas(n, { scale: Math.max(2, 1100 / n.offsetWidth), backgroundColor: '#ffffff', useCORS: true });
    return new Promise(res => c.toBlob(res, 'image/png'));
  };
  $('#png').onclick = async () => {
    try { const b = await gerar(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nomeArq; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    catch (e) { toast('Não consegui gerar a imagem.'); }
  };
  $('#cmp').onclick = async () => {
    try {
      const b = await gerar(); const f = new File([b], nomeArq, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: titulo });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nomeArq; a.click(); toast('Seu aparelho não compartilha direto, então baixei a imagem.'); }
    } catch (e) { if (e.name !== 'AbortError') toast('Não consegui compartilhar.'); }
  };
}

let fEst = 'todos', bEst = '', sEst = '', cEst = '';
let catAbertas = new Set(), catComSub = true;   /* categorias abertas na árvore; e se a tela de itens inclui as subcategorias */

