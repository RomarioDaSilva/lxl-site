/* PAINEL LXL | PEDIDOS: lista, janela "Recebi" e cache de produtos, clientes e catálogo.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* ---------- pedidos (lista) ---------- */
let filtro = 'abertos', busca = '';
async function telaPedidos() {
  quadro('pedidos', '<p class="carregando">Carregando...</p>');
  let j;
  try { j = await api('pedidos', null, '&status=' + encodeURIComponent(filtro) + '&q=' + encodeURIComponent(busca)); }
  catch (e) { return toast(e.message); }
  const r = j.resumo;
  const chips = [['abertos', 'Em aberto'], ['todos', 'Todos'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados']]
    .map(([k, t]) => '<button class="chip ' + (filtro === k ? 'on' : '') + '" data-f="' + k + '" type="button">' + t + '</button>').join('');
  const lista = j.pedidos.length ? j.pedidos.map(p =>
    '<div class="card ped"><a class="ped" href="#/nota/' + p.id + '"><div class="pl"><div><div class="pn">PED-' + numPed(p.id) + ' &middot; ' + esc(p.cliente) + '</div>' +
    '<div class="ps">' + esc(dataBR(p.data)) + ' &middot; ' + esc(p.resumo) + '</div></div><div class="pt">' + brl(p.total) + '</div></div></a>' +
    '<div class="acoes"><span class="pill ' + p.status + '">' + STATUS[p.status] + '</span>' +
    '<span class="pill ' + (p.pago ? 'pago' : 'apagar') + '">' + (p.pago ? 'Pago' : p.pago_valor > 0 ? 'Falta ' + brl(p.saldo) : 'A receber') + '</span>' +
    (PROXIMO[p.status] ? '<button class="btn s l" data-prox="' + p.id + '" data-st="' + PROXIMO[p.status] + '" type="button">Marcar: ' + STATUS[PROXIMO[p.status]] + '</button>' : '') +
    (!p.pago && p.status !== 'cancelado' ? '<button class="btn s l" data-pago="' + p.id + '" type="button">Recebi</button>' : '') +
    '</div></div>').join('') : '<div class="vazio">Nenhum pedido por aqui.</div>';
  $('.wrap').innerHTML =
    '<h1>Pedidos</h1><div class="cards"><div class="card"><small>Vendido no mês</small><b>' + brl(r.mes_total) + '</b><small>' + r.mes_qtd + ' pedido(s)</small></div>' +
    '<div class="card"><small>Em aberto</small><b>' + r.abertos + '</b></div><div class="card"><small>A receber</small><b>' + brl(r.a_receber) + '</b></div></div>' +
    '<div class="chips-linha"><div class="chips">' + chips + '</div>' + (pode('pedido_salvar') ? '<a class="btn" id="novoPed" href="#/novo">+ Novo pedido</a>' : '') + '</div><input type="search" id="q" placeholder="Buscar por nome, WhatsApp ou número" value="' + esc(busca) + '"><div style="height:12px"></div>' + lista;
  document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; telaPedidos(); });
  let tm; $('#q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { busca = e.target.value; telaPedidos(); }, 400); };
  const q = $('#q'); if (busca) { q.focus(); q.setSelectionRange(busca.length, busca.length); }
  document.querySelectorAll('[data-prox]').forEach(b => b.onclick = async () => { try { await api('pedido_status', { id: +b.dataset.prox, status: b.dataset.st }); telaPedidos(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-pago]').forEach(b => b.onclick = () => receberModal(j.pedidos.find(x => x.id === +b.dataset.pago), telaPedidos));
}

/* Janela "Recebi": registra o valor que o cliente pagou agora (sinal ou saldo). O padrão já vem com o que falta. */
function receberModal(p, depois) {
  const m = modal('<h2>Recebi pagamento <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<p class="mut">Pedido PED-' + numPed(p.id) + ' &middot; ' + esc(p.cliente) + '<br>Total ' + brl(p.total) + ' &middot; já pago ' + brl(p.pago_valor) + ' &middot; <b>falta ' + brl(p.saldo) + '</b></p>' +
    '<label>Quanto o cliente pagou agora (R$)</label><input type="text" inputmode="decimal" id="rv" value="' + fmtIn(p.saldo) + '">' +
    '<div class="acoes"><button class="btn" id="rok" type="button">Registrar</button><button class="btn l" id="rtudo" type="button">Recebi tudo</button></div>');
  const enviar = async v => { try { const j = await api('pedido_receber', { id: p.id, valor: v }); m.fechar(); produtos = null; toast(j.pago ? 'Pago por completo.' : 'Registrado. Falta ' + brl(j.saldo) + '.'); if (depois) depois(); } catch (e) { toast(e.message); } };
  $('#rok', m).onclick = () => enviar(parseNum($('#rv', m).value));
  $('#rtudo', m).onclick = () => enviar(p.saldo);
  $('#rv', m).focus(); $('#rv', m).select();
}

/* ---------- produtos (cache) ---------- */
let coresLista = [];
let categorias = [];
let paramsCusto = {};
let clientes = null;
async function carregarClientes(forcar) { if (!clientes || forcar) clientes = (await api('clientes')).clientes; return clientes; }
const acharCliente = (nome, tel) => {
  const d = String(tel || '').replace(/\D/g, ''), n = String(nome || '').trim().toLowerCase();
  return (clientes || []).find(c => (d.length >= 8 && c.telefone.replace(/\D/g, '') === d) || (n && c.nome.trim().toLowerCase() === n)) || null;
};
const bol = hex => '<span class="bol" style="background:' + esc(hex) + '"></span>';
let catalogo = null;
const CATALOGOS = ['natal', 'religioso', 'chaveiros'];   /* pastas dos catálogos do site (catálogo novo: acrescente a pasta aqui) */
async function carregarCatalogo() {
  if (catalogo) return catalogo;
  catalogo = { porCodigo: {}, secoes: [] };
  for (const pasta of CATALOGOS) {
    try {
      const d = await (await fetch('../' + pasta + '/busca-indice.json', { cache: 'no-store' })).json();
      d.forEach(x => {
        const c = String(x.sku || '').toUpperCase();
        catalogo.porCodigo[c] = { secao: x.secao || '', pasta };
        if (x.secao && !catalogo.secoes.includes(x.secao)) catalogo.secoes.push(x.secao);
      });
    } catch (e) { /* catálogo fora do ar: o painel funciona sem as fotos e seções dele */ }
  }
  return catalogo;
}
const secaoDe = p => (catalogo && catalogo.porCodigo[p.codigo]) ? catalogo.porCodigo[p.codigo].secao : '';
function thumb(p) {
  if (!catalogo || !catalogo.porCodigo[p.codigo]) return '<span class="th sem">&#128230;</span>';
  const pasta = catalogo.porCodigo[p.codigo].pasta;
  return '<img class="th" loading="lazy" decoding="async" alt="" data-c="' + esc(p.codigo) + '" data-p="' + esc(pasta) + '" src="../' + pasta + '/imagens/mini/' + encodeURIComponent(p.codigo) + '.jpg">';
}
document.addEventListener('error', e => {
  const i = e.target;
  if (!i || i.tagName !== 'IMG' || !i.classList.contains('th')) return;
  if (!i.dataset.tent) { i.dataset.tent = '1'; i.src = '../' + i.dataset.p + '/imagens/' + encodeURIComponent(i.dataset.c) + '.jpg'; }
  else { const s = document.createElement('span'); s.className = 'th sem'; s.innerHTML = '&#128230;'; i.replaceWith(s); }
}, true);

async function carregarProdutos(forcar) {
  if (!produtos || forcar) { const j = await api('produtos'); produtos = j.produtos; coresLista = j.cores || []; paramsCusto = j.params || {}; categorias = j.categorias || []; }
  return produtos;
}

