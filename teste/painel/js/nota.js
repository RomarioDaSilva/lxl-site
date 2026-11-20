/* PAINEL LXL | NOTINHA: comprovante do pedido, situação e pagamento.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* ---------- notinha ---------- */
function notaHTML(p, orc) {   /* orc: nota de orçamento (sem pagamento, com validade) */
  const sub = p.itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  const temCod = p.itens.some(i => i.codigo);
  const lin = p.itens.map(i => '<tr><td class="c">' + i.qtd + 'x</td>' + (temCod ? '<td class="cd">' + esc(i.codigo || '') + '</td>' : '') + '<td>' + esc(i.descricao) + (i.detalhes ? '<br><small>' + esc(i.detalhes) + '</small>' : '') + '</td><td class="r">' + brl(i.preco) + '</td><td class="r">' + brl(i.preco * i.qtd) + '</td></tr>').join('');
  return '<div class="nota" id="nota"><div class="cab"><img src="/natal/imagens/logo-colorida.png" alt="LXL Projetos"><div>Peças em impressão 3D &middot; ' + EMPRESA.cidade + '<br>WhatsApp ' + EMPRESA.fone + ' &middot; ' + EMPRESA.insta + '<br>' + EMPRESA.site + '</div></div>' +
    '<div class="tit">' + (orc ? 'ORÇAMENTO' : 'COMPROVANTE DE VENDA') + '<span>Nº ' + (orc ? 'ORC-' : 'PED-') + numPed(p.id) + ' &middot; ' + dataBR(p.data) + '</span></div>' +
    '<div class="cli"><b>Cliente:</b> ' + esc(p.cliente) + (p.whatsapp ? '<br><b>WhatsApp:</b> ' + esc(p.whatsapp) : '') +
    '<br><b>' + (p.entrega === 'Entrega' ? 'Entrega' : 'Retirada') + (p.entrega === 'Entrega' && p.endereco ? ':</b> ' + esc(p.endereco) : '</b>') + (p.prazo ? '<br><b>Prazo:</b> ' + esc(p.prazo) : '') + '</div>' +
    '<table><thead><tr><th class="c">Qtd</th>' + (temCod ? '<th class="cd">Cód.</th>' : '') + '<th>Descrição</th><th class="r">Unit.</th><th class="r">Total</th></tr></thead><tbody>' + lin + '</tbody></table>' +
    '<div class="tot"><div><span>Subtotal</span><span>' + brl(sub) + '</span></div>' +
    (p.desconto ? '<div><span>Desconto</span><span>- ' + brl(p.desconto) + '</span></div>' : '') +
    (p.frete ? '<div><span>Frete</span><span>' + brl(p.frete) + '</span></div>' : '') +
    '<div class="g"><span>TOTAL</span><span>' + brl(p.total) + '</span></div></div>' +
    (orc ? '<div class="pg"><b>Válido até:</b> ' + (p.validade ? dataBR(p.validade) : 'consulte') + '</div>'
      : '<div class="pg"><b>Pagamento:</b> ' + esc(p.pagamento || 'A combinar') + ' &middot; ' + (p.pago ? 'PAGO' : p.pago_valor > 0 ? 'SINAL ' + brl(p.pago_valor) + ' &middot; FALTA ' + brl(p.saldo) : 'A PAGAR') + '</div>') +
    (p.obs ? '<div class="ob"><b>Obs.:</b> ' + esc(p.obs).replace(/\n/g, '<br>') + '</div>' : '') +
    '<div class="rod">' + (orc ? 'Valores e prazo sujeitos à confirmação no WhatsApp.' : 'Obrigado pela preferência!') + '<small>' + (orc ? 'Orçamento, não é um pedido nem tem valor fiscal' : 'Documento sem valor fiscal') + '</small></div></div>';
}

/* ---------- tela do pedido (layout de sistema). A notinha-imagem só abre no botão "Nota e compartilhar". ---------- */
const codigoOk = c => /^\d{4}$/.test(String(c || ''));
const linkCatalogo = c => '../natal/p/' + c + '/';
function listaItens(itens) {
  if (!itens.length) return '<div class="vazio">Nenhum item.</div>';
  return itens.map(i => {
    const ok = codigoOk(i.codigo);
    return '<div class="it">' + (ok ? '<img class="it-f" src="../natal/imagens/mini/' + i.codigo + '.jpg" alt="" width="56" height="56" loading="lazy">' : '<span class="it-f it-sem" aria-hidden="true"></span>') +
      '<div class="it-t"><b>' + esc(i.descricao) + '</b>' + ((i.cor || i.detalhes) ? '<small>' + esc([i.cor, i.detalhes].filter(Boolean).join(' &middot; ').replace(/&middot;/g, '·')) + '</small>' : '') +
      '<div class="it-b">' + (i.codigo ? '<button type="button" class="cod" data-cod="' + esc(i.codigo) + '" title="Copiar o código" aria-label="Copiar o código ' + esc(i.codigo) + '">' + esc(i.codigo) + '</button>' : '<span class="mut" style="font-size:12px">sem código</span>') +
      (ok ? '<a class="btn s l" href="' + linkCatalogo(i.codigo) + '" target="_blank" rel="noopener">Ver no catálogo</a>' : '') + '</div></div>' +
      '<div class="it-v"><span class="mut">' + i.qtd + ' x ' + brl(i.preco) + '</span><b>' + brl(i.preco * i.qtd) + '</b></div></div>';
  }).join('');
}
function ligarItens(raiz) {
  raiz.querySelectorAll('.it-f[src]').forEach(im => im.addEventListener('error', () => { im.style.visibility = 'hidden'; }));
  raiz.querySelectorAll('[data-cod]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.cod); toast('Código ' + b.dataset.cod + ' copiado.'); } catch (e) { toast('Código: ' + b.dataset.cod); } });
}
/* Mensagem de WhatsApp com o pedido (texto puro, sem a imagem). */
function msgPedido(p) {
  const nome = (p.cliente || '').trim().split(/\s+/)[0], sub = p.itens.reduce((t, i) => t + i.preco * i.qtd, 0);
  const pg = p.pago ? 'pago' : p.pago_valor > 0 ? 'sinal de ' + brl(p.pago_valor) + ' recebido, falta ' + brl(p.saldo) : 'a pagar';
  return 'Olá' + (nome ? ', ' + nome : '') + '! Segue o resumo do seu pedido *PED-' + numPed(p.id) + '* da LXL Projetos:\n\n' +
    p.itens.map(i => '• ' + i.qtd + 'x ' + i.descricao + (i.cor ? ' (' + i.cor + ')' : '') + (i.codigo ? ' [' + i.codigo + ']' : '') + ' ' + brl(i.preco * i.qtd)).join('\n') + '\n\n' +
    (p.desconto || p.frete ? 'Subtotal: ' + brl(sub) + '\n' : '') + (p.desconto ? 'Desconto: -' + brl(p.desconto) + '\n' : '') + (p.frete ? 'Frete: ' + brl(p.frete) + '\n' : '') +
    '*Total: ' + brl(p.total) + '*\nPagamento: ' + (p.pagamento || 'a combinar') + ' (' + pg + ')\n' +
    (p.entrega === 'Entrega' ? 'Entrega' + (p.endereco ? ': ' + p.endereco : '') : 'Retirada') + '\n' + (p.prazo ? 'Prazo: ' + p.prazo + '\n' : '') + (p.obs ? '\n' + p.obs + '\n' : '') +
    '\nQualquer dúvida é só me chamar! Obrigado pela preferência.';
}
/* Abre a notinha (imagem) numa janela, com Imprimir, Baixar e Compartilhar. */
function abrirNota(p, orc) {
  const m = modal('<h2>' + (orc ? 'Orçamento' : 'Comprovante') + ' para enviar <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<div class="barra"><button class="btn" id="imp" type="button">Imprimir</button><button class="btn o" id="png" type="button">Baixar imagem</button><button class="btn l" id="cmp" type="button">Compartilhar</button></div>' +
    '<div class="notaarea">' + notaHTML(p, orc) + '</div>' +
    (orc ? '' : '<h2 style="margin-top:16px">Mensagem para o WhatsApp</h2><textarea id="msgP" rows="12"></textarea><div class="acoes"><button class="btn o" id="cpyP" type="button">Copiar mensagem</button><a class="btn l" id="waP" target="_blank" rel="noopener" href="#">' + (foneWa(p.whatsapp) ? 'Abrir no WhatsApp do cliente' : 'Abrir no WhatsApp') + '</a></div>'));
  if (!orc) {
    $('#msgP', m).value = msgPedido(p);
    const lk = () => { $('#waP', m).href = 'https://wa.me/' + foneWa(p.whatsapp) + '?text=' + encodeURIComponent($('#msgP', m).value); };
    lk(); $('#msgP', m).addEventListener('input', lk);
    $('#cpyP', m).onclick = async () => { try { await navigator.clipboard.writeText($('#msgP', m).value); toast('Mensagem copiada.'); } catch (e) { $('#msgP', m).select(); toast('Selecionei o texto, é só copiar.'); } };
  }
  $('#imp', m).onclick = () => window.print();
  ligarImagemNota((orc ? 'orcamento-ORC-' : 'nota-PED-') + numPed(p.id) + '-' + slugNome(p.cliente) + '.png', orc ? 'Orçamento LXL Projetos' : 'Comprovante LXL Projetos');
}
const foneWa = f => { const d = String(f || '').replace(/\D/g, '').replace(/^55/, ''); return d ? '55' + d : ''; };

async function telaNota(id) {
  quadro('pedidos', '<p class="carregando">Carregando...</p>');
  let p;
  try { p = (await api('pedido', null, '&id=' + id)).pedido; } catch (e) { toast(e.message); return; }
  const sub = p.itens.reduce((t, i) => t + i.preco * i.qtd, 0), fone = foneWa(p.whatsapp);
  const pgTxt = p.pago ? 'Pago' : p.pago_valor > 0 ? 'Sinal ' + brl(p.pago_valor) + ', falta ' + brl(p.saldo) : 'A receber';
  const prox = PROXIMO[p.status];
  $('.wrap').innerHTML =
    '<div class="barra"><a class="btn l s" href="#/pedidos">&larr; Pedidos</a></div>' +
    '<div class="pv-cab card"><div><h1>Pedido PED-' + numPed(p.id) + '</h1><p class="mut" style="margin:2px 0 8px">' + esc(dataBR(p.data)) + ' &middot; ' + brl(p.total) + '</p>' +
    '<span class="pill ' + p.status + '">' + STATUS[p.status] + '</span> <span class="pill ' + (p.pago ? 'pago' : 'apagar') + '">' + esc(pgTxt) + '</span></div>' +
    '<div class="pv-btn"><button class="btn o" id="bNota" type="button">Nota e compartilhar</button><a class="btn l" href="#/editar/' + p.id + '">Editar pedido</a>' +
    (prox && p.status !== 'cancelado' ? '<button class="btn" id="bProx" type="button">Marcar: ' + STATUS[prox] + '</button>' : '') +
    (!p.pago && p.saldo > 0 && p.status !== 'cancelado' ? '<button class="btn l" id="rec" type="button">Recebi (falta ' + brl(p.saldo) + ')</button>' : '') +
    (fone ? '<a class="btn l" target="_blank" rel="noopener" href="https://wa.me/' + fone + '">WhatsApp</a>' : '') + '</div></div>' +
    '<div class="pv"><div class="card"><h2>Itens do pedido <small class="mut">' + p.itens.length + ' item(ns)</small></h2><div id="itens">' + listaItens(p.itens) + '</div>' +
    '<div class="pv-tot"><div><span>Subtotal</span><span>' + brl(sub) + '</span></div>' + (p.desconto ? '<div><span>Desconto</span><span>- ' + brl(p.desconto) + '</span></div>' : '') + (p.frete ? '<div><span>Frete</span><span>' + brl(p.frete) + '</span></div>' : '') +
    '<div class="g"><span>Total</span><span>' + brl(p.total) + '</span></div></div></div>' +
    '<div class="pv-lado"><div class="card"><h2>Cliente</h2><p style="margin:0"><b>' + (p.cliente_id ? '<a href="#/cliente/' + p.cliente_id + '">' + esc(p.cliente) + '</a>' : esc(p.cliente)) + '</b></p>' + (p.whatsapp ? '<p class="mut" style="margin:2px 0 0">' + esc(p.whatsapp) + '</p>' : '') + '</div>' +
    '<div class="card"><h2>Entrega</h2><p style="margin:0"><b>' + (p.entrega === 'Entrega' ? 'Entrega' : 'Retirada') + '</b></p>' + (p.entrega === 'Entrega' && p.endereco ? '<p class="mut" style="margin:2px 0 0">' + esc(p.endereco) + '</p>' : '') + '<p class="mut" style="margin:6px 0 0">Prazo: ' + (p.prazo ? esc(p.prazo) : 'a combinar') + '</p></div>' +
    '<div class="card"><h2>Pagamento</h2><p style="margin:0"><b>' + esc(p.pagamento || 'A combinar') + '</b></p><p class="mut" style="margin:2px 0 0">' + esc(pgTxt) + '</p></div>' +
    (p.obs ? '<div class="card"><h2>Observações</h2><p style="margin:0;white-space:pre-wrap">' + esc(p.obs) + '</p></div>' : '') + '</div></div>';
  ligarItens($('#itens'));
  $('#bNota').onclick = () => abrirNota(p, false);
  if ($('#bProx')) $('#bProx').onclick = async () => { try { await api('pedido_status', { id: p.id, status: prox }); produtos = null; toast('Atualizado.'); telaNota(id); } catch (e) { toast(e.message); } };
  if ($('#rec')) $('#rec').onclick = () => receberModal(p, () => telaNota(id));
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

let fEst = 'todos', bEst = '', sEst = '', cEst = '', oEst = '';
let catAbertas = new Set(), catComSub = true;   /* categorias abertas na árvore; e se a tela de itens inclui as subcategorias */

