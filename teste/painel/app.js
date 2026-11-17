/* PAINEL LXL: arquivo principal da tela (um só arquivo, dividido em blocos).
   ÍNDICE (procure pelo título do bloco, escrito entre linhas de traços):
     utilidades de tela  | login  | pedidos (lista) | produtos (cache) | pedido novo/editar | notinha
     categorias          | estoque | clientes        | relatórios       | calculadora de custo | rotas
   Cada tela é uma função "tela..." (telaPedidos, telaEstoque, telaCategorias, telaClientes...).
   As rotas (qual tela abre para cada endereço #/...) ficam no bloco "rotas", no fim do arquivo.
   Quem fala com o banco é o api.php. As contas de custo ficam no calc.js. O visual fica no app.css. */
(function () {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dataBR = s => (s || '').split('-').reverse().join('/');
const numPed = id => String(id).padStart(4, '0');
const parseNum = v => { if (typeof v === 'number') return v; const n = parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const fmtIn = n => (n || n === 0) ? String(Number(n).toFixed(2)).replace('.', ',') : '';
/* Nomes das etapas do pedido na tela. As chaves (novo, producao...) precisam ser iguais ao STATUS do api.php. */
const STATUS = { novo: 'Novo', producao: 'Em produção', pronto: 'Pronto', entregue: 'Entregue', cancelado: 'Cancelado' };
const PROXIMO = { novo: 'producao', producao: 'pronto', pronto: 'entregue' };
/* Opções do menu "Tipo" no item personalizado. Pode editar, apagar ou acrescentar nomes nesta lista. */
const TIPOS_PERSO = ['Miniatura', 'Chaveiro', 'Placa / letreiro', 'Topo de bolo', 'Decoração', 'Reparo / peça sob medida', 'Outro'];
/* Formas de pagamento do pedido. Pode editar a lista. */
const PAGTO = ['Pix', 'Cartão', 'Dinheiro', 'A combinar'];
/* Dados que saem na notinha do pedido. Troque aqui se mudar telefone, Instagram, site ou cidade. */
const EMPRESA = { fone: '(38) 99221-4206', insta: '@lxlprojetos', site: 'lxlprojetos.site', cidade: 'Montes Claros, MG' };

let csrf = '', usuario = '', produtos = null;
const app = $('#app');

/* ---------- utilidades de tela ---------- */
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600); }

async function api(a, body, q) {
  const opt = { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'X-CSRF': csrf } };
  if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let r, j;
  try { r = await fetch('api.php?a=' + a + (q || ''), opt); j = await r.json(); }
  catch (e) { throw new Error('Sem conexão com o servidor.'); }
  if (r.status === 401 && a !== 'login') { telaLogin(false); throw new Error(j.erro || 'Faça login.'); }
  if (!r.ok) throw new Error(j.erro || 'Erro inesperado.');
  return j;
}

function modal(html) {
  const f = document.createElement('div');
  f.className = 'mf';
  f.innerHTML = '<div class="mc">' + html + '</div>';
  const fechar = () => { f.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = e => { if (e.key !== 'Escape') return; const todos = document.querySelectorAll('.mf'); if (todos[todos.length - 1] === f) f.fechar(); };
  f.fechar = fechar;
  f.addEventListener('mousedown', e => { if (e.target === f) f.fechar(); });
  document.addEventListener('keydown', tecla);
  document.body.appendChild(f);
  f.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => f.fechar()));
  return f;
}

function confirmar(titulo, texto, rotulo) {
  return new Promise(res => {
    const m = modal('<h2>' + esc(titulo) + '</h2><p style="margin:4px 0 16px">' + esc(texto) + '</p>' +
      '<div class="acoes"><button class="btn r" id="cfSim" type="button">' + esc(rotulo || 'Sim, excluir') + '</button><button class="btn l" id="cfNao" type="button">Cancelar</button></div>');
    let feito = false;
    const fim = v => { if (feito) return; feito = true; res(v); };
    const fechar0 = m.fechar; m.fechar = () => { fechar0(); fim(false); };
    $('#cfSim', m).onclick = () => { fim(true); fechar0(); };
    $('#cfNao', m).onclick = () => m.fechar();
    $('#cfNao', m).focus();
  });
}

function quadro(ativo, corpo) {
  const it = (h, k, ic, tx) => '<a href="' + h + '" class="' + (ativo === k ? 'on' : '') + '"><span>' + ic + '</span>' + tx + '</a>';
  app.innerHTML =
    '<div class="topo"><img src="/natal/imagens/logo-colorida.png" alt="LXL">' +
    '<nav class="menu">' + it('#/pedidos', 'pedidos', '&#128203;', 'Pedidos') + it('#/novo', 'novo', '&#10133;', 'Novo') + it('#/clientes', 'clientes', '&#128100;', 'Clientes') +
    it('#/estoque', 'estoque', '&#128230;', 'Estoque') + it('#/categorias', 'categorias', '&#128193;', 'Categorias') + it('#/calculadora', 'calculadora', '&#129518;', 'Calculadora') + it('#/relatorios', 'relatorios', '&#128200;', 'Relatórios') + '</nav>' +
    '<a class="vsite" href="../" target="_blank" rel="noopener">Ver site</a><button id="sair" type="button">Sair</button></div>' +
    '<div class="wrap">' + corpo + '</div>';
  const mn = $('.topo .menu'), at = $('.topo .menu a.on'); if (mn && at) mn.scrollLeft = at.offsetLeft - (mn.clientWidth - at.offsetWidth) / 2;
  $('#sair').onclick = async () => { await api('logout', {}); csrf = ''; location.hash = ''; iniciar(); };
}

/* ---------- login / primeira configuração ---------- */
function telaLogin(setup) {
  app.innerHTML =
    '<div class="wrap login"><img src="/natal/imagens/logo-colorida.png" alt="LXL Projetos">' +
    '<h1>' + (setup ? 'Primeiro acesso' : 'Entrar no painel') + '</h1>' +
    (setup ? '<p class="mut">Crie o seu usuário e a sua senha. Você vai precisar do código secreto que colocou no arquivo de configuração.</p>' : '') +
    '<form id="f" class="card">' +
    (setup ? '<label>Código secreto</label><input type="password" id="cod" autocomplete="off">' : '') +
    '<label>Usuário</label><input type="text" id="u" autocomplete="username" autocapitalize="none">' +
    '<label>Senha' + (setup ? ' (mínimo 8 caracteres)' : '') + '</label><input type="password" id="s" autocomplete="' + (setup ? 'new-password' : 'current-password') + '">' +
    '<div class="erro" id="e"></div>' +
    '<button class="btn" style="width:100%;margin-top:8px" type="submit">' + (setup ? 'Criar e entrar' : 'Entrar') + '</button></form></div>';
  $('#f').onsubmit = async ev => {
    ev.preventDefault();
    $('#e').textContent = '';
    try {
      const body = { usuario: $('#u').value, senha: $('#s').value };
      if (setup) body.codigo = $('#cod').value;
      const j = await api(setup ? 'setup' : 'login', body);
      csrf = j.csrf; usuario = j.usuario;
      rota();
    } catch (e) { $('#e').textContent = e.message; }
  };
}

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
    '<div class="card ped"><a class="ped" href="#/nota/' + p.id + '"><div class="pl"><div><div class="pn">#' + numPed(p.id) + ' &middot; ' + esc(p.cliente) + '</div>' +
    '<div class="ps">' + esc(dataBR(p.data)) + ' &middot; ' + esc(p.resumo) + '</div></div><div class="pt">' + brl(p.total) + '</div></div></a>' +
    '<div class="acoes"><span class="pill ' + p.status + '">' + STATUS[p.status] + '</span>' +
    '<span class="pill ' + (p.pago ? 'pago' : 'apagar') + '">' + (p.pago ? 'Pago' : 'A receber') + '</span>' +
    (PROXIMO[p.status] ? '<button class="btn s l" data-prox="' + p.id + '" data-st="' + PROXIMO[p.status] + '" type="button">Marcar: ' + STATUS[PROXIMO[p.status]] + '</button>' : '') +
    (!p.pago && p.status !== 'cancelado' ? '<button class="btn s l" data-pago="' + p.id + '" type="button">Recebi</button>' : '') +
    '</div></div>').join('') : '<div class="vazio">Nenhum pedido por aqui.</div>';
  $('.wrap').innerHTML =
    '<h1>Pedidos</h1><div class="cards"><div class="card"><small>Vendido no mês</small><b>' + brl(r.mes_total) + '</b><small>' + r.mes_qtd + ' pedido(s)</small></div>' +
    '<div class="card"><small>Em aberto</small><b>' + r.abertos + '</b></div><div class="card"><small>A receber</small><b>' + brl(r.a_receber) + '</b></div></div>' +
    '<div class="chips">' + chips + '</div><input type="search" id="q" placeholder="Buscar por nome, WhatsApp ou número" value="' + esc(busca) + '"><div style="height:12px"></div>' + lista;
  document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; telaPedidos(); });
  let tm; $('#q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { busca = e.target.value; telaPedidos(); }, 400); };
  const q = $('#q'); if (busca) { q.focus(); q.setSelectionRange(busca.length, busca.length); }
  document.querySelectorAll('[data-prox]').forEach(b => b.onclick = async () => { try { await api('pedido_status', { id: +b.dataset.prox, status: b.dataset.st }); telaPedidos(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-pago]').forEach(b => b.onclick = async () => { try { await api('pedido_status', { id: +b.dataset.pago, pago: 1 }); telaPedidos(); } catch (e) { toast(e.message); } });
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
async function carregarCatalogo() {
  if (catalogo) return catalogo;
  catalogo = { porCodigo: {}, secoes: [] };
  try {
    const d = await (await fetch('../natal/busca-indice.json', { cache: 'no-store' })).json();
    d.forEach(x => {
      const c = String(x.sku || '').toUpperCase();
      catalogo.porCodigo[c] = { secao: x.secao || '' };
      if (x.secao && !catalogo.secoes.includes(x.secao)) catalogo.secoes.push(x.secao);
    });
  } catch (e) { /* sem catálogo: painel funciona sem fotos e sem seções */ }
  return catalogo;
}
const secaoDe = p => (catalogo && catalogo.porCodigo[p.codigo]) ? catalogo.porCodigo[p.codigo].secao : '';
function thumb(p) {
  if (!catalogo || !catalogo.porCodigo[p.codigo]) return '<span class="th sem">&#128230;</span>';
  return '<img class="th" loading="lazy" decoding="async" alt="" data-c="' + esc(p.codigo) + '" src="/natal/imagens/mini/' + encodeURIComponent(p.codigo) + '.jpg">';
}
document.addEventListener('error', e => {
  const i = e.target;
  if (!i || i.tagName !== 'IMG' || !i.classList.contains('th')) return;
  if (!i.dataset.tent) { i.dataset.tent = '1'; i.src = '/natal/imagens/' + encodeURIComponent(i.dataset.c) + '.jpg'; }
  else { const s = document.createElement('span'); s.className = 'th sem'; s.innerHTML = '&#128230;'; i.replaceWith(s); }
}, true);

async function carregarProdutos(forcar) {
  if (!produtos || forcar) { const j = await api('produtos'); produtos = j.produtos; coresLista = j.cores || []; paramsCusto = j.params || {}; categorias = j.categorias || []; }
  return produtos;
}

/* ---------- pedido: novo / editar ---------- */
let P = null;
function pedidoVazio() {
  return { id: 0, cliente_id: null, data: hoje(), cliente: '', whatsapp: '', itens: [], desconto: 0, frete: 0, entrega: 'Retirada', endereco: '', prazo: '', pagamento: 'Pix', pago: 0, status: 'novo', obs: '' };
}
const subtotal = () => P.itens.reduce((s, i) => s + (Number(i.preco) || 0) * (Number(i.qtd) || 0), 0);
const totalPed = () => Math.max(0, subtotal() - (Number(P.desconto) || 0) + (Number(P.frete) || 0));

async function telaPedidoForm(id) {
  quadro(id ? '' : 'novo', '<p class="carregando">Carregando...</p>');
  try {
    await Promise.all([carregarProdutos(), carregarCatalogo(), carregarClientes()]);
    if (id) { P = (await api('pedido', null, '&id=' + id)).pedido; }
    else if (!P || P.id) P = pedidoVazio();
  } catch (e) { return toast(e.message); }
  const opt = (arr, v) => arr.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  $('.wrap').innerHTML =
    '<h1>' + (P.id ? 'Editar pedido #' + numPed(P.id) : 'Novo pedido') + '</h1>' +
    '<div class="barra"><button class="btn l" id="colar" type="button">Colar pedido do WhatsApp</button></div>' +
    '<div class="card"><h2>Cliente</h2><label>Nome * (digite para buscar ou toque na seta)</label>' +
    '<div class="cli-linha"><input type="text" id="cliente" value="' + esc(P.cliente) + '" autocomplete="off" placeholder="Buscar cliente ou digitar nome"><button class="btn s l" id="cliLista" type="button" aria-label="Ver lista de clientes">&#9662;</button><button class="btn s o" id="cliNovo" type="button" aria-label="Cadastrar novo cliente">+</button></div>' +
    '<div id="cliSug" class="sug" hidden></div><div id="cliTag" class="clitag"></div>' +
    '<div class="l2"><div><label>WhatsApp</label><input type="tel" id="whatsapp" value="' + esc(P.whatsapp) + '" placeholder="(38) 9...."></div>' +
    '<div><label>Data do pedido</label><input type="date" id="data" value="' + esc(P.data) + '"></div></div></div>' +
    '<div class="card"><h2>Itens</h2><div id="itens"></div>' +
    '<div class="acoes"><button class="btn o" id="add" type="button">Adicionar peça</button><button class="btn l" id="avulso" type="button">Item personalizado</button></div></div>' +
    '<div class="card"><h2>Valores</h2><div class="l2"><div><label>Desconto (R$)</label><input type="text" inputmode="decimal" id="desconto" value="' + (P.desconto ? fmtIn(P.desconto) : '') + '" placeholder="0,00"></div>' +
    '<div><label>Frete (R$)</label><input type="text" inputmode="decimal" id="frete" value="' + (P.frete ? fmtIn(P.frete) : '') + '" placeholder="0,00"></div></div>' +
    '<div class="l2"><div><label>Pagamento</label><select id="pagamento">' + opt(PAGTO, P.pagamento) + '</select></div>' +
    '<div><label>Entrega</label><select id="entrega">' + opt(['Retirada', 'Entrega'], P.entrega) + '</select></div></div>' +
    '<div class="ck"><input type="checkbox" id="pago"' + (P.pago ? ' checked' : '') + '><label style="margin:0;color:inherit">Já está pago</label></div>' +
    '<div id="endbox"><label>Endereço de entrega</label><input type="text" id="endereco" value="' + esc(P.endereco) + '"></div>' +
    '<div class="l2"><div><label>Prazo combinado</label><input type="text" id="prazo" value="' + esc(P.prazo) + '" placeholder="ex: 20/12"></div>' +
    '<div><label>Situação</label><select id="status">' + Object.keys(STATUS).map(k => '<option value="' + k + '"' + (k === P.status ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select></div></div>' +
    '<label>Observações (aparecem na notinha)</label><textarea id="obs">' + esc(P.obs) + '</textarea></div>' +
    '<div class="total"><div class="v" id="tot"></div><button class="btn" id="salvar" type="button">Salvar pedido</button></div>';
  const bind = (id, key, conv) => { $('#' + id).addEventListener('input', e => { P[key] = conv ? conv(e.target) : e.target.value; if (id === 'desconto' || id === 'frete') totais(); }); };
  bind('whatsapp', 'whatsapp'); bind('data', 'data'); bind('endereco', 'endereco'); bind('prazo', 'prazo'); bind('obs', 'obs');
  bind('desconto', 'desconto', el => parseNum(el.value)); bind('frete', 'frete', el => parseNum(el.value));
  bind('pagamento', 'pagamento'); bind('status', 'status'); bind('pago', 'pago', el => el.checked ? 1 : 0);
  ligarCliente();
  $('#entrega').addEventListener('change', e => { P.entrega = e.target.value; endBox(); });
  endBox();
  desenharItens();
  $('#add').onclick = abrirPicker;
  $('#avulso').onclick = () => { P.itens.push({ produto_id: null, tipo: '', descricao: '', detalhes: '', custo: 0, qtd: 1, preco: 0 }); desenharItens(); const l = document.querySelectorAll('.desc'); if (l.length) l[l.length - 1].focus(); };
  $('#colar').onclick = abrirColar;
  $('#salvar').onclick = salvarPedido;
}
function tagCliente() {
  const c = P.cliente_id && (clientes || []).find(x => x.id === P.cliente_id);
  $('#cliTag').innerHTML = c ? '<span>' + esc(c.codigo) + ' &middot; cliente cadastrado</span>' : '';
}
function escolherCliente(c) {
  P.cliente_id = c.id; P.cliente = c.nome;
  if (c.telefone) P.whatsapp = c.telefone;
  const end = [c.endereco, c.cidade].filter(Boolean).join(' - ');
  if (end) P.endereco = end;
  $('#cliente').value = P.cliente; $('#whatsapp').value = P.whatsapp || ''; $('#endereco').value = P.endereco || '';
  $('#cliSug').hidden = true; tagCliente();
}
function ligarCliente() {
  const inp = $('#cliente'), sug = $('#cliSug');
  const mostrar = todos => {
    const q = inp.value.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    let l = (clientes || []).filter(c => todos || !q || c.nome.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q) || (qd.length >= 3 && c.telefone.replace(/\D/g, '').includes(qd)));
    const total = l.length; l = l.slice(0, todos ? 50 : 6);
    sug.innerHTML = l.length ? l.map(c => '<button type="button" class="sugi" data-cid="' + c.id + '"><b>' + esc(c.nome) + '</b><small>' + esc(c.codigo) + (c.telefone ? ' &middot; ' + esc(c.telefone) : '') + '</small></button>').join('') + (total > l.length ? '<div class="mut sugm">mais ' + (total - l.length) + '... continue digitando</div>' : '')
      : '<div class="mut sugm">Nenhum cliente encontrado. Toque no + para cadastrar.</div>';
    sug.hidden = false;
    sug.querySelectorAll('[data-cid]').forEach(b => b.onmousedown = e => { e.preventDefault(); escolherCliente(clientes.find(x => x.id === +b.dataset.cid)); });
  };
  inp.addEventListener('input', () => { P.cliente = inp.value; if (P.cliente_id) { const c = clientes.find(x => x.id === P.cliente_id); if (!c || c.nome !== inp.value) { P.cliente_id = null; tagCliente(); } } mostrar(false); });
  inp.addEventListener('focus', () => { if ((clientes || []).length) mostrar(false); });
  inp.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 150));
  $('#cliLista').onclick = () => { if (sug.hidden) mostrar(true); else sug.hidden = true; };
  $('#cliNovo').onclick = () => formCliente({ id: 0, nome: P.cliente || '', telefone: P.whatsapp || '', endereco: '', cidade: '', obs: '' }, c => escolherCliente(c));
  tagCliente();
}
function endBox() { $('#endbox').style.display = P.entrega === 'Entrega' ? '' : 'none'; }
function totais() { const t = $('#tot'); if (t) t.textContent = 'Total ' + brl(totalPed()); document.querySelectorAll('[data-lu]').forEach(el => { const i = P.itens[+el.dataset.lu]; const l = ((Number(i.preco) || 0) - (Number(i.custo) || 0)) * (Number(i.qtd) || 0); el.textContent = Number(i.custo) > 0 ? 'Lucro neste item: ' + brl(l) : 'Informe o custo para ver o lucro.'; });
  document.querySelectorAll('[data-sub]').forEach(el => { const i = P.itens[+el.dataset.sub]; el.textContent = brl((Number(i.preco) || 0) * (Number(i.qtd) || 0)); }); }

function desenharItens() {
  const box = $('#itens');
  if (!P.itens.length) { box.innerHTML = '<div class="vazio">Nenhum item ainda.</div>'; totais(); return; }
  box.innerHTML = P.itens.map((i, n) => {
    const p = i.produto_id && produtos.find(x => x.id === i.produto_id);
    const cq = p && i.cor_id ? p.cores.find(c => c.cor_id === i.cor_id) : null;
    const disp = cq ? cq.qtd : (p ? p.estoque : 0);
    const aviso = p && p.controla && disp < i.qtd ? '<div class="neg" style="font-size:13px">Estoque atual' + (cq ? ' (' + esc(cq.nome) + ')' : '') + ': ' + disp + '</div>' : '';
    const seletor = p && p.usa_cores ? '<select class="corsel" data-cs="' + n + '"><option value="">Escolha a cor</option>' + p.cores.map(c => '<option value="' + c.cor_id + '"' + (c.cor_id === i.cor_id ? ' selected' : '') + '>' + esc(c.nome) + ' (' + c.qtd + ' em estoque)</option>').join('') + '</select>' : '';
    const perso = !i.produto_id;
    const tipoOk = TIPOS_PERSO.includes(i.tipo) || !i.tipo;
    const persoHTML = perso ? '<div class="perso"><label>Tipo de personalização</label><select class="ptipo" data-n="' + n + '"><option value="">Escolha o tipo</option>' + TIPOS_PERSO.map(x => '<option' + (x === i.tipo || (!tipoOk && x === 'Outro') ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' +
      (!tipoOk || i.tipo === 'Outro' ? '<input type="text" class="poutro" data-n="' + n + '" value="' + (tipoOk ? '' : esc(i.tipo)) + '" placeholder="Qual tipo? (ex: Troféu)">' : '') +
      '<label>Nome do item</label><input type="text" class="desc" data-n="' + n + '" value="' + esc(i.descricao) + '" placeholder="ex: Miniatura da Ana">' +
      '<label>Descrição / detalhes</label><input type="text" class="pdet" data-n="' + n + '" value="' + esc(i.detalhes || '') + '" placeholder="medidas, cores, referência...">' +
      '<label>Custo (R$ por unidade)</label><input type="text" inputmode="decimal" class="pcusto" data-n="' + n + '" value="' + (i.custo ? fmtIn(i.custo) : '') + '" placeholder="0,00"><div class="mut plucro" data-lu="' + n + '" style="font-size:13px;margin-top:4px"></div></div>' : '';
    return '<div class="item"><div class="nm">' + (i.produto_id ? esc(i.descricao) : '<b>Item personalizado</b>') + '</div>' + persoHTML + seletor + aviso +
      '<div class="lin"><div class="qtd"><button type="button" data-menos="' + n + '">&minus;</button><span>' + i.qtd + '</span><button type="button" data-mais="' + n + '">+</button></div>' +
      '<input type="text" inputmode="decimal" class="preco" data-p="' + n + '" value="' + fmtIn(i.preco) + '" placeholder="Preço un.">' +
      '<span class="sub" data-sub="' + n + '"></span><button class="x" type="button" data-rm="' + n + '" aria-label="Remover">&times;</button></div></div>';
  }).join('');
  box.querySelectorAll('[data-menos]').forEach(b => b.onclick = () => { const i = P.itens[+b.dataset.menos]; if (i.qtd > 1) i.qtd--; desenharItens(); });
  box.querySelectorAll('[data-mais]').forEach(b => b.onclick = () => { P.itens[+b.dataset.mais].qtd++; desenharItens(); });
  box.querySelectorAll('[data-cs]').forEach(sel => sel.onchange = () => {
    const i = P.itens[+sel.dataset.cs], pr = produtos.find(x => x.id === i.produto_id);
    const c = pr && pr.cores.find(x => x.cor_id === +sel.value);
    i.cor_id = c ? c.cor_id : null; i.cor = c ? c.nome : '';
    i.descricao = pr.nome + (c ? ' (' + c.nome + ')' : '');
    desenharItens();
  });
  box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { P.itens.splice(+b.dataset.rm, 1); desenharItens(); });
  box.querySelectorAll('[data-p]').forEach(el => el.addEventListener('input', () => { P.itens[+el.dataset.p].preco = parseNum(el.value); totais(); }));
  box.querySelectorAll('.desc').forEach(el => el.addEventListener('input', () => { P.itens[+el.dataset.n].descricao = el.value; }));
  box.querySelectorAll('.pdet').forEach(el => el.addEventListener('input', () => { P.itens[+el.dataset.n].detalhes = el.value; }));
  box.querySelectorAll('.pcusto').forEach(el => el.addEventListener('input', () => { P.itens[+el.dataset.n].custo = parseNum(el.value); totais(); }));
  box.querySelectorAll('.ptipo').forEach(el => el.onchange = () => { const i = P.itens[+el.dataset.n]; i.tipo = el.value === 'Outro' ? 'Outro' : el.value; desenharItens(); });
  box.querySelectorAll('.poutro').forEach(el => el.addEventListener('input', () => { P.itens[+el.dataset.n].tipo = el.value.trim() || 'Outro'; }));
  totais();
}

function abrirPicker() {
  const m = modal('<h2>Adicionar peça <button class="btn s l" data-fechar type="button">Concluir</button></h2><input type="search" id="pq" placeholder="Buscar por nome ou código"><div id="pl" style="margin-top:8px"></div>');
  const desenha = () => {
    const q = $('#pq', m).value.toLowerCase().trim();
    const l = produtos.filter(p => p.ativo && (!q || (p.nome + ' ' + p.codigo).toLowerCase().includes(q))).slice(0, 60);
    $('#pl', m).innerHTML = l.length ? l.map(p =>
      '<div class="prod" data-id="' + p.id + '"><div class="esq">' + thumb(p) + '<div><div class="nm">' + esc(p.nome) + '</div><div class="d">' + esc(p.codigo) + (p.codigo ? ' &middot; ' : '') + (p.controla ? (p.estoque > 0 ? 'Pronta entrega: ' + (p.usa_cores ? p.cores.filter(c => c.qtd > 0).map(c => bol(c.hex) + c.qtd).join(' ') : p.estoque) : '<span class="neg">Sem estoque</span>') : 'Sob encomenda') + '</div></div></div><b>' + brl(p.preco) + '</b></div>').join('')
      : '<div class="vazio">Nada encontrado. Cadastre a peça em Estoque ou use "Item personalizado".</div>';
    m.querySelectorAll('.prod').forEach(el => el.onclick = () => {
      const p = produtos.find(x => x.id === +el.dataset.id);
      const ex = p.usa_cores ? null : P.itens.find(i => i.produto_id === p.id);
      if (ex) ex.qtd++;
      else if (p.usa_cores) {
        const so = p.cores.length === 1 ? p.cores[0] : null;
        P.itens.push({ produto_id: p.id, cor_id: so ? so.cor_id : null, cor: so ? so.nome : '', descricao: p.nome + (so ? ' (' + so.nome + ')' : ''), qtd: 1, preco: p.preco });
      } else P.itens.push({ produto_id: p.id, descricao: p.nome, qtd: 1, preco: p.preco });
      desenharItens(); toast('Adicionado: ' + p.nome);
    });
  };
  $('#pq', m).addEventListener('input', desenha);
  desenha();
  $('#pq', m).focus();
}

function abrirColar() {
  const m = modal('<h2>Colar pedido do WhatsApp <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<p class="mut" style="margin-top:0">Cole aqui a mensagem que o cliente mandou pelo catálogo. Eu preencho os itens, o nome e as observações.</p>' +
    '<textarea id="txt" style="min-height:180px" placeholder="Olá! Quero fazer um pedido do Catálogo de Natal 2026:..."></textarea>' +
    '<div class="acoes"><button class="btn" id="ok" type="button">Preencher pedido</button></div>');
  $('#txt', m).focus();
  $('#ok', m).onclick = () => {
    const r = lerWhats($('#txt', m).value);
    if (!r.itens.length) return toast('Não encontrei itens na mensagem.');
    P.itens = r.itens;
    if (r.nome) { P.cliente = r.nome; const ex = acharCliente(r.nome, ''); if (ex) { P.cliente_id = ex.id; if (ex.telefone) P.whatsapp = ex.telefone; } }
    if (r.obs) P.obs = r.obs;
    m.fechar(); telaPedidoForm(0);
    toast(r.itens.length + ' item(ns) preenchido(s). Confira e complete o WhatsApp.');
  };
}

function lerWhats(t) {
  const itens = [];
  t.split(/\r?\n/).forEach(l => {
    let m = l.match(/^\s*\d+\)\s*(\d+)\s*x\s+(.+?)\s+\(([A-Za-z0-9-]+)\):\s*(.*)$/);
    let sku = '', nome, qtd, resto;
    if (m) { qtd = +m[1]; nome = m[2]; sku = m[3].toUpperCase(); resto = m[4]; }
    else { m = l.match(/^\s*\d+\)\s*(\d+)\s*x\s+(.+?):\s*(.*)$/); if (!m) return; qtd = +m[1]; nome = m[2]; resto = m[3]; }
    let corNome = ''; const mc = nome.match(/\s*\[([^\]]+)\]\s*$/); if (mc) { corNome = mc[1].trim(); nome = nome.replace(/\s*\[[^\]]+\]\s*$/, ''); }
    const corObj = corNome ? coresLista.find(c => c.nome.toLowerCase() === corNome.toLowerCase()) : null;
    const p = produtos.find(x => sku && x.codigo === sku);
    const pr = resto.match(/R\$\s*([\d.]+,\d{2})\s*cada/);
    itens.push({ produto_id: p ? p.id : null, descricao: p ? p.nome + (corObj ? ' (' + corObj.nome + ')' : '') : nome + (sku ? ' (' + sku + ')' : ''), qtd: qtd || 1, preco: pr ? parseNum(pr[1]) : (p ? p.preco : 0), cor_id: corObj ? corObj.id : null, cor: corObj ? corObj.nome : '' });
  });
  const n = t.match(/^\s*Nome:\s*(.+)$/im), o = t.match(/^\s*Observa[cç][õo]es:\s*(.+)$/im);
  return { itens, nome: n ? n[1].trim() : '', obs: o ? o[1].trim() : '' };
}

async function salvarPedido() {
  const semCor = P.itens.find(i => { const pr = i.produto_id && produtos.find(x => x.id === i.produto_id); return pr && pr.usa_cores && !i.cor_id; });
  if (semCor) return toast('Escolha a cor de ' + semCor.descricao + '.');
  const b = $('#salvar'); b.disabled = true;
  try {
    const j = await api('pedido_salvar', P);
    if (j.avisos && j.avisos.length) toast('Atenção: estoque negativo em ' + j.avisos.join(', '));
    produtos = null; P = null;
    location.hash = '#/nota/' + j.id;
  } catch (e) { toast(e.message); b.disabled = false; }
}

/* ---------- notinha ---------- */
function notaHTML(p) {
  const sub = p.itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  const lin = p.itens.map(i => '<tr><td class="c">' + i.qtd + 'x</td><td>' + esc(i.descricao) + (i.detalhes ? '<br><small>' + esc(i.detalhes) + '</small>' : '') + '</td><td class="r">' + brl(i.preco) + '</td><td class="r">' + brl(i.preco * i.qtd) + '</td></tr>').join('');
  return '<div class="nota" id="nota"><div class="cab"><img src="/natal/imagens/logo-colorida.png" alt="LXL Projetos"><div>Peças em impressão 3D &middot; ' + EMPRESA.cidade + '<br>WhatsApp ' + EMPRESA.fone + ' &middot; ' + EMPRESA.insta + '<br>' + EMPRESA.site + '</div></div>' +
    '<div class="tit">COMPROVANTE DE VENDA<span>Nº ' + numPed(p.id) + ' &middot; ' + dataBR(p.data) + '</span></div>' +
    '<div class="cli"><b>Cliente:</b> ' + esc(p.cliente) + (p.whatsapp ? '<br><b>WhatsApp:</b> ' + esc(p.whatsapp) : '') +
    '<br><b>' + (p.entrega === 'Entrega' ? 'Entrega' : 'Retirada') + (p.entrega === 'Entrega' && p.endereco ? ':</b> ' + esc(p.endereco) : '</b>') + (p.prazo ? '<br><b>Prazo:</b> ' + esc(p.prazo) : '') + '</div>' +
    '<table><thead><tr><th class="c">Qtd</th><th>Descrição</th><th class="r">Unit.</th><th class="r">Total</th></tr></thead><tbody>' + lin + '</tbody></table>' +
    '<div class="tot"><div><span>Subtotal</span><span>' + brl(sub) + '</span></div>' +
    (p.desconto ? '<div><span>Desconto</span><span>- ' + brl(p.desconto) + '</span></div>' : '') +
    (p.frete ? '<div><span>Frete</span><span>' + brl(p.frete) + '</span></div>' : '') +
    '<div class="g"><span>TOTAL</span><span>' + brl(p.total) + '</span></div></div>' +
    '<div class="pg"><b>Pagamento:</b> ' + esc(p.pagamento || 'A combinar') + ' &middot; ' + (p.pago ? 'PAGO' : 'A PAGAR') + '</div>' +
    (p.obs ? '<div class="ob"><b>Obs.:</b> ' + esc(p.obs).replace(/\n/g, '<br>') + '</div>' : '') +
    '<div class="rod">Obrigado pela preferência!<small>Documento sem valor fiscal</small></div></div>';
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
    (p.whatsapp ? '<div class="acoes"><a class="btn l s" target="_blank" rel="noopener" href="https://wa.me/55' + p.whatsapp.replace(/\D/g, '').replace(/^55/, '') + '">Abrir conversa no WhatsApp</a></div>' : '') + '</div>';
  const salvarSt = async () => { try { await api('pedido_status', { id: p.id, status: $('#st').value, pago: +$('#pg').value }); produtos = null; toast('Atualizado.'); telaNota(id); } catch (e) { toast(e.message); } };
  $('#st').onchange = salvarSt; $('#pg').onchange = salvarSt;
  $('#imp').onclick = () => window.print();
  const nomeArq = 'nota-' + numPed(p.id) + '-' + p.cliente.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '.png';
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
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Comprovante LXL Projetos' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nomeArq; a.click(); toast('Seu aparelho não compartilha direto, então baixei a imagem.'); }
    } catch (e) { if (e.name !== 'AbortError') toast('Não consegui compartilhar.'); }
  };
}

let fEst = 'todos', bEst = '', sEst = '', cEst = '';
let catAbertas = new Set(), catComSub = true;   /* categorias abertas na árvore; e se a tela de itens inclui as subcategorias */
/* ---------- categorias ---------- */
const catPorId = id => categorias.find(c => c.id === id);
function catCaminho(id) { const t = []; let c = catPorId(id), g = 0; while (c && g++ < 30) { t.unshift(c.nome); c = c.parent_id ? catPorId(c.parent_id) : null; } return t.join(' › '); }
/* oculta = ela mesma ou alguma categoria de cima está desmarcada em "Mostrar no site". Devolve '' (visível), 'própria' ou o nome da de cima. */
function catOculta(id) { const c = catPorId(id); if (!c) return ''; if (!c.visivel) return 'própria'; let x = c.parent_id ? catPorId(c.parent_id) : null, g = 0; while (x && g++ < 30) { if (!x.visivel) return x.nome; x = x.parent_id ? catPorId(x.parent_id) : null; } return ''; }
function catSelo(id) { const o = catOculta(id); return o ? ' <span class="selo-oculta">' + (o === 'própria' ? 'oculta no site' : 'oculta (por ' + esc(o) + ')') + '</span>' : ''; }
function catFilhas(pai) { return categorias.filter(c => (c.parent_id || null) === (pai || null)); }
function catDescend(id) { const r = new Set([id]); const v = i => catFilhas(i).forEach(f => { r.add(f.id); v(f.id); }); v(id); return r; }
function catLista(pai, prof, ev) { /* lista achatada em ordem de árvore, com profundidade */
  let r = []; catFilhas(pai).forEach(c => { if (c.id === ev) return; r.push({ c, prof }); r = r.concat(catLista(c.id, prof + 1, ev)); }); return r;
}
function catTotal(id) { const ds = catDescend(id); return produtos ? produtos.filter(p => p.ativo && (p.categorias || []).some(x => ds.has(x))).length : 0; }
function catOpcoes(sel, ev, vazio) { return '<option value="">' + vazio + '</option>' + catLista(null, 0, ev).map(({ c, prof }) => '<option value="' + c.id + '"' + (sel === c.id ? ' selected' : '') + '>' + '   '.repeat(prof) + (prof ? '↳ ' : '') + esc(c.nome) + '</option>').join(''); }

function formCategoria(c, paiInicial, depois) {
  const n = c || { id: 0, nome: '', parent_id: paiInicial || null, visivel: 1 };
  const m = modal('<h2>' + (c ? 'Editar categoria' : 'Nova categoria') + ' <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<label>Nome *</label><input type="text" id="kn" value="' + esc(n.nome) + '" placeholder="ex: Cruzes">' +
    '<label>Fica dentro de</label><select id="kp">' + catOpcoes(n.parent_id, c ? c.id : 0, '(nenhuma, categoria principal)') + '</select>' +
    '<div class="ck"><input type="checkbox" id="kv"' + (n.visivel ? ' checked' : '') + '><label style="margin:0;color:inherit" for="kv">Mostrar no site</label></div>' +
    '<p class="mut" style="font-size:13px">Desmarque para tirar do site todos os itens desta categoria (e das subcategorias). Nada é apagado, é só marcar de novo para voltarem.</p>' +
    '<p class="mut" style="font-size:13px">Dá para criar categoria dentro de categoria, quantas vezes precisar.</p>' +
    '<div class="mfoot"><button class="btn" id="kok" type="button">Salvar</button></div>');
  if (c) { /* não deixa escolher ela mesma nem suas filhas como "pai" */
    const ds = catDescend(c.id); $('#kp', m).querySelectorAll('option').forEach(o => { if (o.value && ds.has(+o.value)) o.remove(); });
  }
  $('#kok', m).onclick = async () => {
    /* mudar de lugar leva os itens junto (eles estão ligados à categoria, não ao lugar dela): avisa antes */
    if (c) {
      const novoPai = $('#kp', m).value ? +$('#kp', m).value : null;
      if (novoPai !== (c.parent_id || null) && catTotal(c.id) > 0) {
        const destino = novoPai ? 'dentro de "' + catCaminho(novoPai) + '"' : 'para o nível principal';
        if (!await confirmar('Mover "' + c.nome + '" ' + destino + '?', 'Os ' + catTotal(c.id) + ' itens dessa categoria (e das subcategorias) vão junto com ela. Nenhum item é apagado. Se ela sair de Natal, esses itens deixam de aparecer no catálogo de Natal.', 'Mover')) return;
      }
    }
    try { const j = await api('categoria_salvar', { id: n.id, nome: $('#kn', m).value, parent_id: $('#kp', m).value || null, visivel: $('#kv', m).checked ? 1 : 0 }); categorias = j.categorias; m.fechar(); toast('Categoria salva.'); depois && depois(j.id); }
    catch (e) { toast(e.message); }
  };
  setTimeout(() => $('#kn', m).focus(), 50);
}

async function telaCategorias() {
  quadro('categorias', '<p class="carregando">Carregando...</p>');
  try { await carregarProdutos(true); await carregarCatalogo(); } catch (e) { return toast(e.message); }
  /* árvore recolhível: só mostra as subcategorias das categorias que você abriu (seta). Fica lembrado enquanto o painel está aberto. */
  const arvore = (pai, prof) => catFilhas(pai).map(c => {
    const filhas = catFilhas(c.id).length, aberta = catAbertas.has(c.id), tot = catTotal(c.id);
    return '<div class="catl" style="margin-left:' + (prof * 18) + 'px"><div class="catn">' +
      (filhas ? '<button class="cat-tg" data-tg="' + c.id + '" type="button" aria-expanded="' + aberta + '" aria-label="' + (aberta ? 'Recolher' : 'Abrir') + ' ' + esc(c.nome) + '">' + (aberta ? '&#9662;' : '&#9656;') + '</button>' : '<span class="cat-tg vazio-tg"></span>') +
      '<b>' + esc(c.nome) + '</b>' + catSelo(c.id) + ' <span class="mut">' + tot + ' ite' + (tot === 1 ? 'm' : 'ns') + (filhas ? ' &middot; ' + filhas + ' sub' : '') + '</span></div>' +
      '<div class="cata"><button class="btn s l" data-up="' + c.id + '" type="button" aria-label="Subir">&#8593;</button><button class="btn s l" data-dn="' + c.id + '" type="button" aria-label="Descer">&#8595;</button><button class="btn s l" data-sub="' + c.id + '" type="button">+ Sub</button><button class="btn s l" data-ed="' + c.id + '" type="button">Editar</button><button class="btn s l" data-ver="' + c.id + '" type="button">Ver itens</button><button class="btn s l" data-ex="' + c.id + '" type="button">Excluir</button></div></div>' +
      (filhas && aberta ? arvore(c.id, prof + 1) : '');
  }).join('');
  const desenha = () => {
    $('.wrap').innerHTML = '<h1>Categorias</h1><p class="mut" style="margin:0 0 10px">Organize os itens em categorias e subcategorias. Um item pode ficar em mais de uma. Para colocar um item numa categoria, abra o item no Estoque e escolha em "Categorias".</p>' +
      '<div class="barra"><button class="btn o" id="kNova" type="button">Nova categoria</button><button class="btn l" id="kAbrir" type="button">Abrir tudo</button><button class="btn l" id="kFechar" type="button">Recolher tudo</button></div>' +
      '<div class="card" id="kArv">' + (categorias.length ? arvore(null, 0) : '<div class="vazio">Nenhuma categoria ainda. Toque em "Nova categoria".</div>') + '</div>';
    $('#kNova').onclick = () => formCategoria(null, null, desenha);
    $('#kAbrir').onclick = () => { categorias.forEach(c => { if (catFilhas(c.id).length) catAbertas.add(c.id); }); desenha(); };
    $('#kFechar').onclick = () => { catAbertas.clear(); desenha(); };
    document.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const id = +b.dataset.tg; catAbertas.has(id) ? catAbertas.delete(id) : catAbertas.add(id); desenha(); });
    /* setas: mudam a ordem entre categorias irmãs (a ordem das subcategorias de Natal vira a ordem das seções no catálogo) */
    const mover = async (id, dir) => { try { const j = await api('categoria_ordenar', { id, dir }); categorias = j.categorias; desenha(); } catch (e) { toast(e.message); } };
    document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => mover(+b.dataset.up, -1));
    document.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => mover(+b.dataset.dn, 1));
    document.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { catAbertas.add(+b.dataset.sub); formCategoria(null, +b.dataset.sub, desenha); });   /* abre a categoria para você ver a nova sub */
    document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => formCategoria(catPorId(+b.dataset.ed), null, desenha));
    document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { location.hash = '#/categoria/' + b.dataset.ver; });
    document.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
      const c = catPorId(+b.dataset.ex);
      if (!await confirmar('Excluir "' + c.nome + '"?', 'Nenhum item é apagado nem alterado, eles só deixam de aparecer nessa categoria.', 'Excluir')) return;
      try { const j = await api('categoria_excluir', { id: c.id }); categorias = j.categorias; produtos = null; await carregarProdutos(true); toast('Categoria excluída.'); desenha(); } catch (e) { toast(e.message); }
    });
  };
  desenha();
}


/* ---------- itens de uma categoria ---------- */
async function telaCategoria(id) {
  quadro('categorias', '<p class="carregando">Carregando...</p>');
  try { await carregarProdutos(true); await carregarCatalogo(); } catch (e) { return toast(e.message); }
  const c = catPorId(id);
  if (!c) { location.hash = '#/categorias'; return; }
  const recarrega = () => telaCategoria(id);
  const desenha = () => {
    const ds = catComSub ? catDescend(id) : new Set([id]);
    const lista = produtos.filter(p => p.ativo && (p.categorias || []).some(x => ds.has(x)));
    const filhas = catFilhas(id);
    const trilha = catCaminho(id).split(' › ').map(esc).join(' &rsaquo; ');
    $('.wrap').innerHTML = '<a class="voltar-cat" href="#/categorias">&larr; Todas as categorias</a>' +
      '<h1>' + esc(c.nome) + '</h1><p class="mut" style="margin:0 0 10px">' + trilha + ' &middot; ' + lista.length + ' ite' + (lista.length === 1 ? 'm' : 'ns') + '</p>' +
      '<div class="ck" style="margin:0 0 10px"><input type="checkbox" id="kcVis"' + (c.visivel ? ' checked' : '') + '><label style="margin:0;color:inherit" for="kcVis">Mostrar no site' + catSelo(id) + '</label></div>' +
      '<div class="barra"><button class="btn o" id="kcNovo" type="button">Novo item aqui</button><button class="btn l" id="kcInc" type="button">Incluir item que já existe</button></div>' +
      (filhas.length ? '<div class="chips">' + filhas.map(f => '<a class="chip" href="#/categoria/' + f.id + '">' + esc(f.nome) + ' (' + catTotal(f.id) + ')</a>').join('') + '</div>' +
        '<div class="ck" style="margin:8px 0"><input type="checkbox" id="kcSub"' + (catComSub ? ' checked' : '') + '><label style="margin:0;color:inherit" for="kcSub">Mostrar também os itens das subcategorias</label></div>' : '') +
      '<div class="card" id="kcLista">' + (lista.length ? lista.map(p => {
        const direto = (p.categorias || []).includes(id);
        const em = (p.categorias || []).filter(x => ds.has(x) && x !== id).map(catCaminho).filter(Boolean);
        return '<div class="prod" data-id="' + p.id + '"><div class="esq">' + thumb(p) + '<div><div class="nm">' + esc(p.nome) + '</div><div class="d">' + esc(p.codigo) + (p.codigo ? ' &middot; ' : '') + brl(p.preco) + '</div>' +
          (em.length ? '<div class="d cats">em ' + em.map(esc).join(' &middot; ') + '</div>' : '') + '</div></div>' +
          (direto ? '<div data-stop="1"><button class="btn s l" data-tira="' + p.id + '" type="button">Tirar daqui</button></div>' : '') + '</div>';
      }).join('') : '<div class="vazio">Nenhum item nesta categoria ainda. Toque em "Novo item aqui" ou "Incluir item que já existe".</div>') + '</div>';
    $('#kcVis').onchange = async e => {
      const ligar = e.target.checked;
      if (!ligar && !await confirmar('Tirar "' + c.nome + '" do site?', 'Os itens dela (e das subcategorias) deixam de aparecer no site. Nada é apagado, é só marcar de novo para voltarem.', 'Tirar do site')) { e.target.checked = true; return; }
      try { const j = await api('categoria_visivel', { id, visivel: ligar ? 1 : 0 }); categorias = j.categorias; toast(ligar ? 'Categoria visível no site.' : 'Categoria oculta no site.'); recarrega(); } catch (er) { toast(er.message); e.target.checked = !ligar; }
    };
    $('#kcNovo').onclick = () => formProduto(null, [id], recarrega);
    $('#kcInc').onclick = () => incluirExistentes(c, recarrega);
    const sb = $('#kcSub'); if (sb) sb.onchange = () => { catComSub = sb.checked; desenha(); };
    $('#kcLista').querySelectorAll('.prod').forEach(el => el.onclick = ev => { if (ev.target.closest('[data-stop]')) return; formProduto(produtos.find(p => p.id === +el.dataset.id), null, recarrega); });
    $('#kcLista').querySelectorAll('[data-tira]').forEach(b => b.onclick = async () => {
      const p = produtos.find(x => x.id === +b.dataset.tira);
      if (!await confirmar('Tirar "' + p.nome + '" de "' + c.nome + '"?', 'O item não é apagado nem alterado. Ele só deixa de estar nessa categoria.', 'Tirar')) return;
      try { await api('categoria_itens', { id, remove: [p.id] }); toast('Item tirado da categoria.'); recarrega(); } catch (e) { toast(e.message); }
    });
  };
  desenha();
}

/* escolher itens que já existem para colocar na categoria */
function incluirExistentes(c, depois) {
  const sel = new Set();
  const m = modal('<h2>Incluir em "' + esc(c.nome) + '" <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<input type="search" id="kiq" placeholder="Buscar item pelo nome ou código"><div id="kil" class="ckl" style="margin-top:8px"></div>' +
    '<div class="mfoot"><button class="btn" id="kiok" type="button">Incluir</button></div>');
  const fora = produtos.filter(p => p.ativo && !(p.categorias || []).includes(c.id));
  const d = () => {
    const q = $('#kiq', m).value.toLowerCase().trim();
    const l = fora.filter(p => !q || (p.nome + ' ' + p.codigo).toLowerCase().includes(q)).slice(0, 80);
    $('#kil', m).innerHTML = l.length ? l.map(p => '<label class="ckr"><input type="checkbox" data-p="' + p.id + '"' + (sel.has(p.id) ? ' checked' : '') + '> ' + esc(p.nome) + ' <span class="mut">' + esc(p.codigo) + '</span></label>').join('') : '<p class="mut">Nenhum item encontrado.</p>';
    $('#kil', m).querySelectorAll('input').forEach(i => i.onchange = () => { i.checked ? sel.add(+i.dataset.p) : sel.delete(+i.dataset.p); $('#kiok', m).textContent = sel.size ? 'Incluir ' + sel.size : 'Incluir'; });
  };
  $('#kiq', m).addEventListener('input', d); d();
  $('#kiok', m).onclick = async () => {
    if (!sel.size) return toast('Marque pelo menos um item.');
    try { await api('categoria_itens', { id: c.id, add: [...sel] }); m.fechar(); toast(sel.size + ' item(ns) incluído(s).'); depois(); } catch (e) { toast(e.message); }
  };
}

/* escolher categorias de um item: lista com caixinhas */
function escolherCategorias(atual, depois) {
  const sel = new Set(atual);
  const m = modal('<h2>Categorias do item <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<div id="ckl" class="ckl"></div><div class="acoes"><button class="btn s l" id="ckNova" type="button">+ Nova categoria</button></div>' +
    '<div class="mfoot"><button class="btn" id="ckOk" type="button">Pronto</button></div>');
  const d = () => {
    $('#ckl', m).innerHTML = categorias.length ? catLista(null, 0, 0).map(({ c, prof }) => '<label class="ckr" style="padding-left:' + (prof * 18) + 'px"><input type="checkbox" data-c="' + c.id + '"' + (sel.has(c.id) ? ' checked' : '') + '> ' + esc(c.nome) + '</label>').join('')
      : '<p class="mut">Nenhuma categoria ainda. Toque em "+ Nova categoria".</p>';
    $('#ckl', m).querySelectorAll('input').forEach(i => i.onchange = () => { i.checked ? sel.add(+i.dataset.c) : sel.delete(+i.dataset.c); });
  };
  d();
  $('#ckNova', m).onclick = () => formCategoria(null, null, id => { if (id) sel.add(id); d(); });
  $('#ckOk', m).onclick = () => { m.fechar(); depois([...sel]); };
}

/* ---------- estoque ---------- */
async function telaEstoque() {
  quadro('estoque', '<p class="carregando">Carregando...</p>');
  try { await Promise.all([carregarProdutos(true), carregarCatalogo()]); } catch (e) { return toast(e.message); }
  $('.wrap').innerHTML =
    '<h1>Estoque</h1><div class="barra"><button class="btn o" id="novo" type="button">Novo produto</button><button class="btn l" id="imp" type="button">Importar do catálogo</button><button class="btn l" id="cores" type="button">Cores</button><button class="btn l" id="impc" type="button">Importar custos</button></div>' +
    '<div class="chips">' + [['todos', 'Todos'], ['pronta', 'Pronta entrega'], ['encomenda', 'Sob encomenda'], ['inativos', 'Inativos']].map(([k, t]) => '<button class="chip ' + (fEst === k ? 'on' : '') + '" data-f="' + k + '" type="button">' + t + '</button>').join('') + '</div>' +
    '<div class="l2">' +
    '<input type="search" id="q" placeholder="Buscar produto" value="' + esc(bEst) + '"></div>' +
    '<div class="l2" style="margin-top:8px"><select id="cat"><option value="">Todas as categorias</option>' + catLista(null, 0, 0).map(({ c, prof }) => '<option value="' + c.id + '"' + (cEst === String(c.id) ? ' selected' : '') + '>' + '\u00a0\u00a0\u00a0'.repeat(prof) + (prof ? '\u21b3 ' : '') + esc(c.nome) + ' (' + catTotal(c.id) + ')</option>').join('') + '<option value="__sem"' + (cEst === '__sem' ? ' selected' : '') + '>Sem categoria (' + produtos.filter(p => p.ativo && !(p.categorias || []).length).length + ')</option></select><a class="btn l" href="#/categorias" style="text-align:center">Gerenciar categorias</a></div><div class="card" style="margin-top:12px" id="lista"></div>';
  const desenha = () => {
    const q = bEst.toLowerCase().trim();
    const l = produtos.filter(p => {
      if (fEst === 'pronta' && !(p.controla && p.ativo)) return false;
      if (fEst === 'encomenda' && !(!p.controla && p.ativo)) return false;
      if (fEst === 'inativos' && p.ativo) return false;
      if (fEst === 'todos' && !p.ativo) return false;
      if (cEst === '__sem') { if ((p.categorias || []).length) return false; }
      else if (cEst) { const ds = catDescend(+cEst); if (!(p.categorias || []).some(x => ds.has(x))) return false; }
      return !q || (p.nome + ' ' + p.codigo).toLowerCase().includes(q);
    });
    $('#lista').innerHTML = l.length ? l.map(p =>
      '<div class="prod ' + (p.ativo ? '' : 'off') + '" data-id="' + p.id + '"><div class="esq">' + thumb(p) + '<div><div class="nm">' + esc(p.nome) + '</div><div class="d">' + esc(p.codigo) + (p.codigo ? ' &middot; ' : '') + brl(p.preco) + (p.controla ? '' : ' &middot; Sob encomenda') + '</div>' + ((p.categorias || []).length ? '<div class="d cats">' + p.categorias.map(catCaminho).filter(Boolean).map(esc).join(' &middot; ') + '</div>' : '') + '</div></div>' +
      (p.controla && p.usa_cores ? '<div class="cmini">' + p.cores.filter(c => c.qtd > 0).map(c => bol(c.hex) + c.qtd).join(' ') + '<b class="' + (p.estoque <= 0 ? 'neg' : '') + '">' + p.estoque + '</b></div>' : p.controla ? '<div class="qtd" data-stop="1"><button type="button" data-d="-1" data-id="' + p.id + '">&minus;</button><span class="' + (p.estoque <= 0 ? 'neg' : '') + '">' + p.estoque + '</span><button type="button" data-d="1" data-id="' + p.id + '">+</button></div>' : '') + '</div>').join('')
      : '<div class="vazio">Nenhum produto aqui. Toque em "Novo produto" ou "Importar do catálogo".</div>';
    $('#lista').querySelectorAll('.prod').forEach(el => el.onclick = ev => {
      if (ev.target.closest('[data-stop]')) return;
      formProduto(produtos.find(p => p.id === +el.dataset.id));
    });
    $('#lista').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      try { const j = await api('produto_ajustar', { id: +b.dataset.id, delta: +b.dataset.d }); const i = produtos.findIndex(p => p.id === j.produto.id); produtos[i] = j.produto; desenha(); } catch (e) { toast(e.message); }
    });
  };
  document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { fEst = b.dataset.f; telaEstoque(); });
  $('#q').oninput = e => { bEst = e.target.value; desenha(); };
  $('#cat').onchange = e => { cEst = e.target.value; desenha(); };
  $('#novo').onclick = () => formProduto(null);
  $('#imp').onclick = importarCatalogo;
  $('#impc').onclick = importarCustos;
  $('#cores').onclick = () => gerenciarCores(() => telaEstoque());
  desenha();
}

/* p = item a editar (ou null para novo). catsIniciais = categorias já marcadas num item novo. depois = o que fazer ao salvar (padrão: voltar ao Estoque). */
function formProduto(p, catsIniciais, depois) {
  const n = p || { categorias: catsIniciais || [], id: 0, codigo: '', nome: '', preco: 0, controla: 1, estoque: 0, ativo: 1, obs: '', usa_cores: 0, cores: [], peso_g: 0, tempo_min: 0, material: 'PLA', perda_pct: 10, extras: 0, embalagem: 0.8, custo: 0, preco_kg: 0 };
  const qs = {}; n.cores.forEach(c => { qs[c.cor_id] = c.qtd; });
  const existiam = new Set(n.cores.map(c => c.cor_id));
  const m = modal('<h2>' + (p ? 'Editar produto' : 'Novo produto') + ' <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<label>Nome *</label><input type="text" id="nome" value="' + esc(n.nome) + '"><div class="l2"><div><label>Código</label><input type="text" id="codigo" value="' + esc(n.codigo) + '" placeholder="ex: PRE-001"></div>' +
    '<div><label>Preço (R$)</label><input type="text" inputmode="decimal" id="preco" value="' + fmtIn(n.preco) + '"></div></div>' +
    '<label>Tipo</label><select id="controla"><option value="1"' + (n.controla ? ' selected' : '') + '>Pronta entrega (controla estoque)</option><option value="0"' + (n.controla ? '' : ' selected') + '>Sob encomenda (sem estoque)</option></select>' +
    '<div id="eb"><label>Quantidade total em estoque</label><input type="text" inputmode="numeric" id="estoque" value="' + n.estoque + '">' +
    '<div class="ck"><input type="checkbox" id="usaCores"' + (n.usa_cores ? ' checked' : '') + '><label style="margin:0;color:inherit">Esta peça tem mais de uma cor</label></div>' +
    '<div id="cbox" class="cbox"></div></div>' +
    '<p id="eh" class="mut" style="font-size:13px;margin:6px 0 0">Para informar a quantidade em estoque, escolha "Pronta entrega" no tipo.</p>' +
    '<label>Categorias</label><div id="pcats" class="pcats"></div><div class="acoes"><button class="btn s l" id="pcEsc" type="button">Escolher categorias</button></div>' +
    '<label>Observações</label><input type="text" id="obs" value="' + esc(n.obs) + '">' +
    '<button type="button" class="acord" id="acBtn" aria-expanded="false"><span>Custo</span><span class="seta">&#9662;</span></button>' +
    '<div id="acBox" class="acbox" hidden>' +
    '<div class="l2"><div><label>Peso (g)</label><input type="text" inputmode="decimal" id="cPeso" value="' + fmtIn(n.peso_g) + '"></div>' +
    '<div><label>Tempo (horas)</label><input type="text" inputmode="decimal" id="cTempo" value="' + fmtIn(Math.round(n.tempo_min / 6) / 10) + '" placeholder="ex: 1,5"></div></div>' +
    '<div class="l2"><div><label>Material</label><select id="cMat"><option' + (n.material === 'PLA' ? ' selected' : '') + '>PLA</option><option' + (n.material === 'PETG' ? ' selected' : '') + '>PETG</option></select></div>' +
    '<div><label>Filamento (R$/kg)</label><input type="text" inputmode="decimal" id="cKg" value="' + (n.preco_kg > 0 ? fmtIn(n.preco_kg) : '') + '" placeholder="média"></div></div><div class="l2"><div><label>Perda (%)</label><input type="text" inputmode="decimal" id="cPerda" value="' + fmtIn(n.perda_pct) + '"></div></div>' +
    '<div class="l2"><div><label>Extras (R$)</label><input type="text" inputmode="decimal" id="cExtra" value="' + fmtIn(n.extras) + '" placeholder="argola, LED..."></div>' +
    '<div><label>Embalagem (R$)</label><input type="text" inputmode="decimal" id="cEmb" value="' + fmtIn(n.embalagem) + '"></div></div>' +
    '<div id="cRes" class="cres"></div></div>' +
    '<div class="ck"><input type="checkbox" id="ativo"' + (n.ativo ? ' checked' : '') + '><label style="margin:0;color:inherit">Produto ativo (aparece na hora de montar pedidos)</label></div><div class="acoes"><button class="btn" id="ok" type="button">Salvar</button></div>');
  const calcCusto = () => {
    const P = paramsCusto, v = id => parseNum($('#' + id, m).value) || 0;
    const peso = v('cPeso'), h = v('cTempo'), perda = v('cPerda');
    const kg = v('cKg') > 0 ? v('cKg') : ($('#cMat', m).value === 'PETG' ? (P.preco_kg_petg || 0) : (P.preco_kg_pla || 0));
    const mat = peso * (1 + perda / 100) * kg / 1000;
    const en = h * (P.potencia_w || 0) / 1000 * (P.energia_kwh || 0);
    const des = (P.vida_util_h > 0) ? h * (P.valor_impressora || 0) / P.vida_util_h : 0;
    const ext = v('cExtra'), emb = v('cEmb');
    const tot = mat + en + des + ext + emb;
    const den = 1 - ((P.margem_pct || 0) + (P.imposto_pct || 0)) / 100;
    const sug = den > 0 && tot > 0 ? LXLCalc.paraCima90(tot / den) : 0;
    const preco = parseNum($('#preco', m).value) || 0;
    const lucro = preco - tot, marg = preco > 0 ? lucro / preco * 100 : 0;
    return { mat, en, des, ext, emb, tot, sug, preco, lucro, marg, h };
  };
  const linhaC = (a, b, cls) => '<div class="cl' + (cls ? ' ' + cls : '') + '"><span>' + a + '</span><b>' + b + '</b></div>';
  const desenhaCusto = () => {
    const c = calcCusto();
    $('#cRes', m).innerHTML = linhaC('Filamento (com perda)', brl(c.mat)) + linhaC('Energia', brl(c.en)) + linhaC('Desgaste da impressora', brl(c.des)) +
      linhaC('Extras', brl(c.ext)) + linhaC('Embalagem', brl(c.emb)) + linhaC('Custo total', brl(c.tot), 'tt') +
      linhaC('Preço sugerido (margem ' + (paramsCusto.margem_pct || 0) + '%)', brl(c.sug)) +
      (c.preco > 0 ? linhaC('Lucro no preço atual', brl(c.lucro), c.lucro < 0 ? 'neg' : '') + linhaC('Margem real', c.marg.toFixed(0) + '%', c.lucro < 0 ? 'neg' : '') : '');
  };
  $('#acBtn', m).onclick = () => { const b = $('#acBox', m), a = $('#acBtn', m); b.hidden = !b.hidden; a.setAttribute('aria-expanded', String(!b.hidden)); a.classList.toggle('aberto', !b.hidden); if (!b.hidden) desenhaCusto(); };
  ['cPeso', 'cTempo', 'cKg', 'cPerda', 'cExtra', 'cEmb', 'preco'].forEach(id => $('#' + id, m).addEventListener('input', desenhaCusto));
  $('#cMat', m).onchange = desenhaCusto;
  const total = () => parseInt($('#estoque', m).value, 10) || 0;
  const soma = () => coresLista.reduce((s, c) => s + (qs[c.id] > 0 ? qs[c.id] : 0), 0);
  const contador = () => {
    const el = $('#cont', m); if (!el) return;
    const s = soma(), tt = total();
    el.className = 'cont ' + (s === tt ? 'ok' : 'erro2');
    el.textContent = s === tt ? 'Tudo certo: ' + s + ' de ' + tt + ' distribuídos.' : (s < tt ? 'Faltam distribuir ' + (tt - s) + ' (distribuído ' + s + ' de ' + tt + ').' : 'Passou ' + (s - tt) + ' do total (distribuído ' + s + ' de ' + tt + ').');
  };
  const desenhaCores = () => {
    const box = $('#cbox', m);
    if (!$('#usaCores', m).checked) { box.innerHTML = ''; return; }
    box.innerHTML = (coresLista.length ? coresLista.map(c =>
      '<div class="corlin">' + bol(c.hex) + '<span class="cn">' + esc(c.nome) + '</span><input type="text" inputmode="numeric" class="cq" data-cor="' + c.id + '" value="' + (qs[c.id] > 0 || existiam.has(c.id) ? (qs[c.id] || 0) : '') + '" placeholder="0"></div>').join('')
      : '<p class="mut" style="margin:4px 0">Nenhuma cor cadastrada ainda. Toque em "Cadastrar cor" abaixo.</p>') +
      '<div class="cont" id="cont"></div>' +
      '<div class="acoes"><button class="btn s l" id="novaCor" type="button">Cadastrar cor</button><button class="btn s l" id="editCores" type="button">Editar cores</button></div>' +
      '<div id="ncbox" hidden class="ncbox"><input type="text" id="ncNome" placeholder="Nome da cor (ex: Vermelho)"><input type="color" id="ncHex" value="#c0392b" aria-label="Cor"><button class="btn s" id="ncOk" type="button">Salvar cor</button></div>';
    box.querySelectorAll('.cq').forEach(el => el.addEventListener('input', () => { qs[+el.dataset.cor] = parseInt(el.value, 10) || 0; contador(); }));
    $('#novaCor', m).onclick = () => { const b = $('#ncbox', m); b.hidden = !b.hidden; if (!b.hidden) $('#ncNome', m).focus(); };
    $('#ncOk', m).onclick = async () => {
      try { const j = await api('cor_salvar', { nome: $('#ncNome', m).value, hex: $('#ncHex', m).value }); coresLista = j.cores; desenhaCores(); toast('Cor cadastrada.'); }
      catch (e) { toast(e.message); }
    };
    $('#editCores', m).onclick = () => gerenciarCores(() => { desenhaCores(); });
    contador();
  };
  let escolhidas = (n.categorias || []).filter(catPorId);
  const dcat = () => { $('#pcats', m).innerHTML = escolhidas.filter(catPorId).length ? escolhidas.filter(catPorId).map(id => '<span class="chipc">' + esc(catCaminho(id)) + '</span>').join('') : '<span class="mut" style="font-size:13px">Sem categoria. Escolha onde o item vai aparecer no site.</span>'; };
  $('#pcEsc', m).onclick = () => escolherCategorias(escolhidas, l => { escolhidas = l; dcat(); });
  dcat();
  const eb = () => { const c = $('#controla', m).value === '1'; $('#eb', m).style.display = c ? '' : 'none'; $('#eh', m).style.display = c ? 'none' : ''; };
  $('#controla', m).onchange = eb; eb();
  $('#usaCores', m).onchange = desenhaCores;
  $('#estoque', m).addEventListener('input', contador);
  desenhaCores();
  $('#ok', m).onclick = async () => {
    const usa = $('#controla', m).value === '1' && $('#usaCores', m).checked;
    if (usa && soma() !== total()) return toast('As cores somam ' + soma() + ', mas o estoque total é ' + total() + '. Ajuste para ficarem iguais.');
    try {
      await api('produto_salvar', { id: n.id, nome: $('#nome', m).value, codigo: $('#codigo', m).value, preco: parseNum($('#preco', m).value), controla: +$('#controla', m).value, estoque: total(), ativo: $('#ativo', m).checked ? 1 : 0, obs: $('#obs', m).value,
        peso_g: parseNum($('#cPeso', m).value) || 0, tempo_min: Math.round((parseNum($('#cTempo', m).value) || 0) * 60), material: $('#cMat', m).value,
        preco_kg: parseNum($('#cKg', m).value) || 0, perda_pct: parseNum($('#cPerda', m).value) || 0, extras: parseNum($('#cExtra', m).value) || 0, embalagem: parseNum($('#cEmb', m).value) || 0, custo: Math.round(calcCusto().tot * 100) / 100,
        categorias: escolhidas, usa_cores: usa ? 1 : 0, cores: usa ? coresLista.filter(c => qs[c.id] > 0 || existiam.has(c.id)).map(c => ({ cor_id: c.id, qtd: qs[c.id] || 0 })) : [] });
      m.fechar(); (depois || telaEstoque)(); toast('Produto salvo.');
    } catch (e) { toast(e.message); }
  };
}

function gerenciarCores(aoFechar) {
  const m = modal('<h2>Cores cadastradas <button class="btn s l" data-fechar type="button">Concluir</button></h2><div id="lc"></div>');
  const fecharOrig = m.fechar;
  m.fechar = () => { fecharOrig(); if (aoFechar) aoFechar(); };
  const desenha = () => {
    $('#lc', m).innerHTML = coresLista.map(c =>
      '<div class="gc" data-id="' + c.id + '"><input type="color" value="' + esc(c.hex) + '" class="gh"><input type="text" class="gn" value="' + esc(c.nome) + '"><button class="btn s l" data-sv type="button">Salvar</button><button class="btn s r" data-ex type="button">Excluir</button></div>').join('') +
      '<div class="gc novo"><input type="color" value="#c0392b" class="gh" id="gnh"><input type="text" class="gn" id="gnn" placeholder="Nova cor (nome)"><button class="btn s" id="gna" type="button">Adicionar</button></div>' +
      (coresLista.length ? '' : '<p class="mut">Ainda não há cores. Adicione a primeira acima.</p>');
    m.querySelectorAll('.gc[data-id]').forEach(row => {
      const id = +row.dataset.id;
      row.querySelector('[data-sv]').onclick = async () => { try { const j = await api('cor_salvar', { id, nome: row.querySelector('.gn').value, hex: row.querySelector('.gh').value }); coresLista = j.cores; produtos = null; toast('Cor salva.'); desenha(); } catch (e) { toast(e.message); } };
      row.querySelector('[data-ex]').onclick = async () => { if (!await confirmar('Excluir cor', 'Tem certeza que deseja excluir a cor "' + row.querySelector('.gn').value + '"?')) return; try { const j = await api('cor_excluir', { id }); coresLista = j.cores; desenha(); } catch (e) { toast(e.message); } };
    });
    $('#gna', m).onclick = async () => { try { const j = await api('cor_salvar', { nome: $('#gnn', m).value, hex: $('#gnh', m).value }); coresLista = j.cores; toast('Cor cadastrada.'); desenha(); } catch (e) { toast(e.message); } };
  };
  desenha();
}

function importarCustos() {
  const m = modal('<h2>Importar custos <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<p class="mut">Cole uma linha por peça, neste formato:<br><b>CÓDIGO;peso(g);tempo(h);material;perda(%);extras;embalagem;R$/kg</b></p>' +
    '<textarea id="ct" rows="8" style="width:100%;font-size:13px" placeholder="PRE-001;44.14;6.27;PLA;10;0;0;79.48"></textarea>' +
    '<div class="acoes"><button class="btn" id="ok" type="button">Importar custos</button></div>');
  const n = s => { const x = parseFloat(String(s || '').trim().replace(',', '.')); return isNaN(x) ? 0 : x; };
  $('#ok', m).onclick = async () => {
    const lista = $('#ct', m).value.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^codigo/i.test(l)).map(l => {
      const c = l.split(';');
      return { codigo: (c[0] || '').trim().toUpperCase(), peso_g: n(c[1]), tempo_h: n(c[2]), material: /petg/i.test(c[3] || '') ? 'PETG' : 'PLA', perda_pct: c[4] === undefined || c[4].trim() === '' ? 10 : n(c[4]), extras: n(c[5]), embalagem: n(c[6]), preco_kg: n(c[7]) };
    });
    if (!lista.length) return toast('Cole os dados primeiro.');
    try {
      const j = await api('custos_importar', { lista });
      m.fechar(); produtos = null; telaEstoque();
      toast(j.atualizados + ' produto(s) atualizado(s)' + (j.nao_encontrados.length ? '. Não achei: ' + j.nao_encontrados.join(', ') : '.'));
    } catch (e) { toast(e.message); }
  };
}

async function importarCatalogo() {
  try {
    const r = await fetch('../natal/busca-indice.json', { cache: 'no-store' });
    const d = await r.json();
    const lista = d.map(x => ({ codigo: String(x.sku || '').toUpperCase(), nome: x.nome, preco: typeof x.preco === 'number' ? x.preco : 0 }));
    const existentes = new Set(produtos.map(p => p.codigo));
    const faltam = lista.filter(x => x.codigo && !existentes.has(x.codigo));
    const topo = '<h2>Importar do catálogo <button class="btn s l" data-fechar type="button">Fechar</button></h2>';
    if (!faltam.length) {
      modal(topo + '<p>Está tudo em dia. As <b>' + lista.length + '</b> peças do catálogo já estão cadastradas no estoque.</p>');
      return;
    }
    const nomes = faltam.slice(0, 12).map(x => '<li>' + esc(x.codigo) + ' &middot; ' + esc(x.nome) + '</li>').join('');
    const m = modal(topo + '<p>O catálogo tem <b>' + faltam.length + '</b> peça(s) que ainda não estão no estoque:</p><ul style="padding-left:18px;margin:0 0 12px">' + nomes + '</ul>' +
      (faltam.length > 12 ? '<p class="mut">e mais ' + (faltam.length - 12) + '...</p>' : '') +
      '<p class="mut">Elas entram como <b>sob encomenda</b>, com o preço do catálogo. As peças que já estão cadastradas não mudam.</p><div class="acoes"><button class="btn" id="ok" type="button">Importar ' + faltam.length + ' peça(s)</button></div>');
    $('#ok', m).onclick = async () => {
      try { const j = await api('produto_importar', { lista: faltam }); m.fechar(); toast(j.novos + ' peça(s) cadastrada(s).'); telaEstoque(); } catch (e) { toast(e.message); }
    };
  } catch (e) { toast('Não consegui ler o catálogo.'); }
}

/* ---------- clientes ---------- */
let fCli = '';
async function telaClientes() {
  quadro('clientes', '<p class="carregando">Carregando...</p>');
  try { await carregarClientes(true); } catch (e) { return toast(e.message); }
  $('.wrap').innerHTML = '<h1>Clientes</h1><div class="barra"><button class="btn o" id="cNovo" type="button">Novo cliente</button></div>' +
    '<input type="search" id="cBusca" placeholder="Buscar por nome, telefone ou código" value="' + esc(fCli) + '" style="margin-bottom:12px"><div id="cLista"></div>';
  const desenha = () => {
    const q = fCli.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    const l = clientes.filter(c => !q || c.nome.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q) || (qd.length >= 3 && c.telefone.replace(/\D/g, '').includes(qd)));
    $('#cLista').innerHTML = l.length ? l.map(c => '<div class="card cli" data-id="' + c.id + '"><div><b>' + esc(c.nome) + '</b><small>' + esc(c.codigo) + (c.telefone ? ' &middot; ' + esc(c.telefone) : '') + (c.cidade ? ' &middot; ' + esc(c.cidade) : '') + '</small></div><div class="cr">' + c.pedidos + ' pedido(s)<small>' + brl(c.total) + '</small></div></div>').join('')
      : '<div class="vazio">' + (clientes.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Toque em "Novo cliente".') + '</div>';
    document.querySelectorAll('.cli').forEach(el => el.onclick = () => formCliente(clientes.find(x => x.id === +el.dataset.id), () => telaClientes()));
  };
  $('#cBusca').addEventListener('input', e => { fCli = e.target.value; desenha(); });
  $('#cNovo').onclick = () => formCliente({ id: 0, nome: '', telefone: '', endereco: '', cidade: '', obs: '' }, () => telaClientes());
  desenha();
}
function formCliente(c, aoSalvar) {
  const m = modal('<h2>' + (c.id ? 'Editar cliente ' + esc(c.codigo) : 'Novo cliente') + ' <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<label>Nome *</label><input type="text" id="cn" value="' + esc(c.nome) + '">' +
    '<label>Telefone / WhatsApp</label><input type="tel" id="ct" value="' + esc(c.telefone) + '" placeholder="(38) 9....">' +
    '<label>Endereço</label><input type="text" id="ce" value="' + esc(c.endereco) + '" placeholder="Rua, número, bairro">' +
    '<label>Cidade</label><input type="text" id="cc" value="' + esc(c.cidade) + '" placeholder="Montes Claros">' +
    '<label>Observações</label><input type="text" id="co" value="' + esc(c.obs) + '">' +
    '<div class="acoes"><button class="btn" id="ok" type="button">Salvar</button>' + (c.id ? '<button class="btn s r" id="ex" type="button">Excluir</button>' : '') + '</div>');
  $('#ok', m).onclick = async () => {
    try {
      const j = await api('cliente_salvar', { id: c.id, nome: $('#cn', m).value, telefone: $('#ct', m).value, endereco: $('#ce', m).value, cidade: $('#cc', m).value, obs: $('#co', m).value });
      clientes = j.clientes; m.fechar(); toast('Cliente salvo.'); if (aoSalvar) aoSalvar(j.cliente);
    } catch (e) { toast(e.message); }
  };
  if (c.id) $('#ex', m).onclick = async () => {
    if (!await confirmar('Excluir cliente', 'Tem certeza que deseja excluir o cliente "' + c.nome + '"? Os pedidos dele continuam salvos.')) return;
    try { const j = await api('cliente_excluir', { id: c.id }); clientes = j.clientes; m.fechar(); toast('Cliente excluído.'); if (aoSalvar) aoSalvar(null); } catch (e) { toast(e.message); }
  };
}

/* ---------- relatórios ---------- */
let relPer = '30', relAba = 'vendas';
const isoD = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function periodoRel() {
  const h = new Date(), ini = new Date(h);
  if (relPer === '7') ini.setDate(h.getDate() - 6);
  else if (relPer === '30') ini.setDate(h.getDate() - 29);
  else if (relPer === 'mes') ini.setDate(1);
  else if (relPer === 'mesant') { const a = new Date(h.getFullYear(), h.getMonth() - 1, 1), b = new Date(h.getFullYear(), h.getMonth(), 0); return { de: isoD(a), ate: isoD(b) }; }
  else if (relPer === 'tudo') return { de: '2000-01-01', ate: '2999-12-31' };
  return { de: isoD(ini), ate: isoD(h) };
}
const PERS = { 7: '7 dias', 30: '30 dias', mes: 'Este mês', mesant: 'Mês passado', tudo: 'Tudo' };
const ABAS = { vendas: 'Vendas', itens: 'Peças e clientes', estoque: 'Estoque', site: 'Site' };
async function telaRelatorios() {
  quadro('relatorios', '<p class="carregando">Carregando...</p>');
  const pr = periodoRel();
  let d;
  try { d = await api('relatorios', null, '&de=' + pr.de + '&ate=' + pr.ate); } catch (e) { return toast(e.message); }
  const kpi = (r, v, s, cls) => '<div class="card kpi"><small>' + r + '</small><b class="' + (cls || '') + '">' + v + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>';
  const barras = (lin, fmt) => { const mx = Math.max(1, ...lin.map(x => x.v)); return lin.length ? '<div class="bars">' + lin.map(x => '<div class="bar"><span class="bl">' + esc(x.r) + '</span><div class="bt"><div class="bf" style="width:' + Math.max(2, x.v / mx * 100) + '%"></div></div><span class="bv">' + fmt(x.v) + '</span></div>').join('') + '</div>' : '<div class="vazio">Sem dados no período.</div>'; };
  const tab = (cab, linhas) => linhas.length ? '<table class="rt"><tr>' + cab.map(c => '<th' + (c.r ? ' class="r"' : '') + '>' + c.t + '</th>').join('') + '</tr>' + linhas.join('') + '</table>' : '<div class="vazio">Sem dados no período.</div>';
  const R = d.resumo, S = d.site, E = d.estoque;
  let corpo = '';
  if (relAba === 'vendas') {
    const dd = new Date(pr.ate) - new Date(pr.de) > 70 * 864e5 || relPer === 'tudo';
    const g = {}; d.dias.forEach(x => { const k = dd ? x.data.slice(0, 7) : x.data; g[k] = (g[k] || 0) + Number(x.v); });
    const lin = Object.keys(g).sort().map(k => ({ r: dd ? k.slice(5) + '/' + k.slice(2, 4) : k.slice(8) + '/' + k.slice(5, 7), v: g[k] }));
    const mg = R.faturamento > 0 ? Math.round(R.lucro / R.faturamento * 100) : 0;
    const stN = { novo: 'Novo', producao: 'Em produção', pronto: 'Pronto', entregue: 'Entregue', cancelado: 'Cancelado' };
    corpo = '<div class="kpis">' + kpi('Faturamento', brl(R.faturamento), R.pedidos + ' pedido(s)') + kpi('Ticket médio', brl(R.ticket)) +
      kpi('Lucro estimado', brl(R.lucro), mg + '% de margem', R.lucro < 0 ? 'neg' : '') + kpi('Custo das peças', brl(R.custo), R.sem_custo ? R.sem_custo + ' peça(s) sem custo cadastrado' : '') +
      kpi('Já recebido', brl(R.recebido)) + kpi('A receber', brl(R.a_receber), '', R.a_receber > 0 ? 'neg' : '') + '</div>' +
      '<div class="card"><h2>' + (dd ? 'Vendas por mês' : 'Vendas por dia') + '</h2>' + barras(lin, brl) + '</div>' +
      '<div class="card"><h2>Pedidos por situação</h2>' + tab([{ t: 'Situação' }, { t: 'Pedidos', r: 1 }, { t: 'Valor', r: 1 }], d.por_status.map(x => '<tr><td>' + (stN[x.status] || x.status) + '</td><td class="r">' + x.n + '</td><td class="r">' + brl(x.v) + '</td></tr>')) +
      '<p class="mut" style="margin:8px 0 0;font-size:13px">Em aberto agora (todas as datas): <b>' + d.abertos.n + '</b> pedido(s), ' + brl(d.abertos.v) + '</p></div>' +
      '<div class="card"><h2>Forma de pagamento</h2>' + tab([{ t: 'Forma' }, { t: 'Pedidos', r: 1 }, { t: 'Valor', r: 1 }], d.por_pagamento.map(x => '<tr><td>' + esc(x.nome || '-') + '</td><td class="r">' + x.n + '</td><td class="r">' + brl(x.v) + '</td></tr>')) +
      '<p class="mut" style="margin:8px 0 0;font-size:13px">' + d.por_entrega.map(x => esc(x.nome) + ': ' + x.n).join(' &middot; ') + (R.cancelados ? ' &middot; Cancelados: ' + R.cancelados : '') + '</p></div>';
  } else if (relAba === 'itens') {
    corpo = '<div class="card"><h2>Peças mais vendidas</h2>' + tab([{ t: 'Peça' }, { t: 'Qtd', r: 1 }, { t: 'Vendido', r: 1 }, { t: 'Lucro', r: 1 }],
        d.top_produtos.map(x => '<tr><td>' + esc(x.nome) + (x.codigo ? '<small>' + esc(x.codigo) + '</small>' : '') + '</td><td class="r">' + x.q + '</td><td class="r">' + brl(x.v) + '</td><td class="r">' + (Number(x.c) > 0 ? brl(x.v - x.c) : '-') + '</td></tr>')) + '</div>' +
      '<div class="card"><h2>Itens personalizados</h2>' + tab([{ t: 'Tipo' }, { t: 'Qtd', r: 1 }, { t: 'Vendido', r: 1 }, { t: 'Lucro', r: 1 }], (d.personalizados || []).map(x => '<tr><td>' + esc(x.nome) + '</td><td class="r">' + x.q + '</td><td class="r">' + brl(x.v) + '</td><td class="r">' + (Number(x.c) > 0 ? brl(x.v - x.c) : '-') + '</td></tr>')) + '</div>' +
      '<div class="card"><h2>Cores mais pedidas</h2>' + barras(d.top_cores.map(x => ({ r: x.nome, v: Number(x.q) })), v => v + ' un.') + '</div>' +
      '<div class="card"><h2>Melhores clientes</h2>' + tab([{ t: 'Cliente' }, { t: 'Pedidos', r: 1 }, { t: 'Total', r: 1 }], d.top_clientes.map(x => '<tr><td>' + esc(x.nome) + '</td><td class="r">' + x.n + '</td><td class="r">' + brl(x.v) + '</td></tr>')) + '</div>';
  } else if (relAba === 'estoque') {
    corpo = '<p class="mut" style="margin-top:0;font-size:13px">O estoque mostra a situação de agora, não depende do período.</p><div class="kpis">' + kpi('Peças em pronta entrega', E.pecas, E.n + ' modelo(s)') + kpi('Valor a custo', brl(E.valor_custo)) + kpi('Valor a preço de venda', brl(E.valor_venda)) + kpi('Sob encomenda', E.sob_encomenda, 'modelo(s)') + '</div>' +
      (E.sem_custo ? '<div class="card"><small class="mut">' + E.sem_custo + ' produto(s) ativo(s) ainda sem custo cadastrado. O lucro dessas peças não é calculado.</small></div>' : '') +
      '<div class="card"><h2>Acabando ou zerados (pronta entrega)</h2>' + tab([{ t: 'Peça' }, { t: 'Estoque', r: 1 }], E.baixo.map(x => '<tr><td>' + esc(x.nome) + '<small>' + esc(x.codigo) + '</small></td><td class="r' + (x.estoque <= 0 ? ' neg' : '') + '">' + x.estoque + '</td></tr>')) + '</div>';
  } else {
    const tv = S.paginas.natal || 0, ad = S.adds.reduce((s, x) => s + x.q, 0);
    corpo = '<p class="mut" style="margin-top:0;font-size:13px">Contagem própria, sem cookies. Começa a contar a partir de quando o site novo foi publicado.</p><div class="kpis">' + kpi('Visitantes', S.visitas, 'por dia, por aparelho') + kpi('Visitas ao catálogo', tv) +
      kpi('Adicionaram ao pedido', ad, 'toques em adicionar') + kpi('Enviaram o pedido', S.enviar_pedido, 'toques em enviar pelo WhatsApp') + kpi('Pedidos no painel', R.pedidos, 'no período') + kpi('Outros WhatsApp', S.enviar_contato, 'botões de contato') + '</div>' +
      '<div class="card"><h2>Páginas mais abertas</h2>' + barras(Object.keys(S.paginas).map(k => ({ r: ({ home: 'Início', natal: 'Catálogo de Natal', faq: 'Dúvidas' })[k] || k, v: S.paginas[k] })), v => v) + '</div>' +
      '<div class="card"><h2>Peças mais vistas</h2>' + barras(S.produtos.map(x => ({ r: x.nome, v: x.q })), v => v) + '</div>' +
      '<div class="card"><h2>Mais adicionadas ao pedido</h2>' + barras(S.adds.map(x => ({ r: x.nome, v: x.q })), v => v) + '</div>' +
      (S.teste ? '<p class="mut" style="font-size:12px">Acessos de teste (não entram nas contas): ' + S.teste + '</p>' : '');
  }
  $('.wrap').innerHTML = '<h1>Relatórios</h1><div class="chips">' + Object.keys(PERS).map(k => '<button type="button" class="chip' + (k === relPer ? ' on' : '') + '" data-per="' + k + '">' + PERS[k] + '</button>').join('') + '</div>' +
    '<div class="chips ab">' + Object.keys(ABAS).map(k => '<button type="button" class="chip' + (k === relAba ? ' on' : '') + '" data-aba="' + k + '">' + ABAS[k] + '</button>').join('') + '</div>' + corpo;
  document.querySelectorAll('[data-per]').forEach(b => b.onclick = () => { relPer = b.dataset.per; telaRelatorios(); });
  document.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { relAba = b.dataset.aba; telaRelatorios(); });
}

/* ---------- calculadora de custo ---------- */
const nn = s => { s = String(s == null ? '' : s).trim(); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const x = parseFloat(s); return isFinite(x) && x > 0 ? x : 0; };
const fm = x => { x = Number(x || 0); return x ? String(Math.round(x * 100) / 100).replace('.', ',') : ''; };
let CALC = null;
const linhaLivre = () => ({ k: 'livre', nome: '', qtd: 1, materiais: [{ nome: '', tipo: 'PLA', peso_g: '', preco_kg: '' }], tempo_h: '', perda_pct: '10', extras: '', embalagem: '', mao_h: '', mao_valor: '', preco_un: '' });
function calcInicial() { return { linhas: [], fixos: '', p: null, aberto: false, modo: null, ab: {} }; }
function paramsCalc() {
  const b = paramsCusto || {};
  return { energia_kwh: b.energia_kwh ?? 1.17, potencia_w: b.potencia_w ?? 100, valor_impressora: b.valor_impressora ?? 2461.04, vida_util_h: b.vida_util_h ?? 5000,
    margem_pct: b.margem_pct ?? 45, imposto_pct: b.imposto_pct ?? 0, taxa_pct: 0, preco_kg_pla: b.preco_kg_pla ?? 88, preco_kg_petg: b.preco_kg_petg ?? 57 };
}
function paraMotor(l) {
  if (l.k === 'cat') {
    const p = produtos.find(x => x.id === l.pid) || {};
    return { nome: p.nome, qtd: nn(l.qtd), materiais: [{ nome: (p.material || 'PLA') + ' ' + (p.codigo || ''), tipo: p.material, peso_g: p.peso_g, preco_kg: p.preco_kg }],
      tempo_h: (p.tempo_min || 0) / 60, perda_pct: p.perda_pct, extras: (p.extras || 0) + nn(l.extra), embalagem: p.embalagem, preco_un: nn(l.preco_un) || p.preco };
  }
  return { nome: l.nome, qtd: nn(l.qtd), materiais: l.materiais.map(m => ({ nome: m.nome, tipo: m.tipo, peso_g: nn(m.peso_g), preco_kg: nn(m.preco_kg) })),
    tempo_h: nn(l.tempo_h), perda_pct: nn(l.perda_pct), extras: nn(l.extras), embalagem: nn(l.embalagem), mao_h: nn(l.mao_h), mao_valor: nn(l.mao_valor), preco_un: nn(l.preco_un) };
}
const horasTxt = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') + ' min' : ''); };
const kgTxt = g => g >= 1000 ? (g / 1000).toFixed(2).replace('.', ',') + ' kg' : Math.round(g) + ' g';
const nomeItem = (x, i) => x.nome || 'Item ' + (i + 1);

async function telaCalculadora() {
  if (!CALC) CALC = calcInicial();
  quadro('calculadora', '<p class="carregando">Carregando...</p>');
  try { await carregarProdutos(); } catch (e) { return toast(e.message); }
  if (!CALC.p) CALC.p = paramsCalc();
  desenharCalc();
}
function desenharCalc() {
  const P = CALC.p;
  const campo = (rot, cls, val, ph, ex) => '<div><label>' + rot + '</label><input type="text" inputmode="decimal" class="' + cls + '" ' + (ex || '') + ' value="' + esc(val) + '" placeholder="' + (ph || '') + '"></div>';
  const qtdBox = (n, val) => '<div><label>Quantidade</label><div class="qty"><button type="button" class="qm" data-qm="' + n + '" aria-label="Diminuir">&minus;</button><input type="text" inputmode="numeric" class="f-qtd" data-n="' + n + '" value="' + esc(val) + '"><button type="button" class="qp" data-qp="' + n + '" aria-label="Aumentar">+</button></div></div>';
  const itens = CALC.linhas.map((l, n) => {
    if (l.k === 'cat') {
      const p = produtos.find(x => x.id === l.pid);
      return '<div class="card cq" data-n="' + n + '"><div class="cqh"><b>' + esc(p ? p.nome : 'Produto removido') + '</b><small>' + esc(p ? p.codigo : '') + '</small><button type="button" class="x" data-rm="' + n + '" aria-label="Remover">&times;</button></div>' +
        '<div class="l2">' + qtdBox(n, l.qtd) + campo('Preço de venda un. (R$)', 'f-preco_un', l.preco_un, p ? fm(p.preco) : '', 'data-n="' + n + '"') + '</div>' +
        campo('Custo extra por peça (R$)', 'f-extra', l.extra, 'argola, LED, pintura...', 'data-n="' + n + '"') +
        '<div class="mut cinfo" data-info="' + n + '"></div></div>';
    }
    const mats = l.materiais.map((m, j) => '<div class="matl"><div class="l2"><div><label>Material / cor</label><input type="text" class="m-nome" data-n="' + n + '" data-j="' + j + '" value="' + esc(m.nome) + '" placeholder="ex: Branco"></div>' +
      '<div><label>Tipo</label><select class="m-tipo" data-n="' + n + '" data-j="' + j + '"><option' + (m.tipo === 'PLA' ? ' selected' : '') + '>PLA</option><option' + (m.tipo === 'PETG' ? ' selected' : '') + '>PETG</option></select></div></div>' +
      '<div class="l2">' + campo('Peso por peça (g)', 'm-peso_g', m.peso_g, '0', 'data-n="' + n + '" data-j="' + j + '"') + campo('Filamento (R$/kg)', 'm-preco_kg', m.preco_kg, 'média: ' + fm(m.tipo === 'PETG' ? P.preco_kg_petg : P.preco_kg_pla), 'data-n="' + n + '" data-j="' + j + '"') + '</div>' +
      (l.materiais.length > 1 ? '<button type="button" class="btn s l" data-rmmat="' + n + ':' + j + '">Tirar este material</button>' : '') + '</div>').join('');
    return '<div class="card cq" data-n="' + n + '"><div class="cqh"><b>Item livre' + (l.nome ? ': ' + esc(l.nome) : '') + '</b><button type="button" class="x" data-rm="' + n + '" aria-label="Remover">&times;</button></div>' +
      '<div class="l2">' + '<div><label>Nome (opcional)</label><input type="text" class="f-nome" data-n="' + n + '" value="' + esc(l.nome) + '" placeholder="ex: Miniatura"></div>' + qtdBox(n, l.qtd) + '</div>' +
      mats + '<button type="button" class="btn s l" data-addmat="' + n + '">+ Outro material ou cor</button>' +
      '<div class="l2">' + campo('Tempo por peça (horas)', 'f-tempo_h', l.tempo_h, 'ex: 1,5', 'data-n="' + n + '"') + campo('Perda de filamento (%)', 'f-perda_pct', l.perda_pct, '10', 'data-n="' + n + '"') + '</div>' +
      '<div class="l2">' + campo('Extras por peça (R$)', 'f-extras', l.extras, 'argola, LED...', 'data-n="' + n + '"') + campo('Embalagem por peça (R$)', 'f-embalagem', l.embalagem, '0,80', 'data-n="' + n + '"') + '</div>' +
      '<div class="l2">' + campo('Mão de obra (h por peça)', 'f-mao_h', l.mao_h, 'pintura, acabamento', 'data-n="' + n + '"') + campo('Valor da hora (R$)', 'f-mao_valor', l.mao_valor, '', 'data-n="' + n + '"') + '</div>' +
      campo('Preço de venda por unidade (opcional)', 'f-preco_un', l.preco_un, 'vazio = o painel sugere', 'data-n="' + n + '"') + '<div class="mut cinfo" data-info="' + n + '"></div></div>';
  }).join('');
  const par = (rot, k, suf) => '<div><label>' + rot + '</label><input type="text" inputmode="decimal" class="p-in" data-k="' + k + '" value="' + esc(fm(P[k])) + '"' + (suf ? ' placeholder="' + suf + '"' : '') + '></div>';
  $('.wrap').innerHTML = '<h1>Calculadora de custo</h1><p class="mut" style="margin-top:-6px">Preencha só o que tiver. O que ficar vazio conta como zero.</p>' +
    '<div class="acoes calcbar"><button class="btn o" id="addCat" type="button">Produto do catálogo</button><button class="btn l" id="addLivre" type="button">Item livre</button></div>' +
    (itens || '<div class="vazio">Toque em "Produto do catálogo" ou "Item livre" para começar.</div>') +
    (CALC.linhas.length ? '<button class="btn l mais" id="maisUm" type="button">+ Adicionar mais ' + (CALC.modo === 'cat' ? 'um produto' : 'uma peça') + '</button>' : '') +
    '<div class="card"><h2>Custos do pedido todo</h2>' + campo('Frete, design ou outros custos fixos (R$)', 'c-fixos', CALC.fixos, '0,00') + '<p class="mut" style="font-size:12px;margin:6px 0 0">Esse valor é somado uma vez só no custo do pedido, não é multiplicado pela quantidade.</p></div>' +
    '<button type="button" class="acord' + (CALC.aberto ? ' aberto' : '') + '" id="parBtn"><span>Valores usados no cálculo</span><span class="seta">&#9662;</span></button>' +
    '<div class="acbox" id="parBox"' + (CALC.aberto ? '' : ' hidden') + '><div class="l2">' + par('Energia (R$/kWh)', 'energia_kwh') + par('Consumo (W)', 'potencia_w') + '</div><div class="l2">' + par('Valor da impressora (R$)', 'valor_impressora') + par('Vida útil (horas)', 'vida_util_h') + '</div>' +
      '<div class="l2">' + par('Margem de lucro (%)', 'margem_pct') + par('Imposto (%)', 'imposto_pct') + '</div><div class="l2">' + par('Taxa de venda/plataforma (%)', 'taxa_pct') + par('PLA médio (R$/kg)', 'preco_kg_pla') + '</div><div class="l2">' + par('PETG médio (R$/kg)', 'preco_kg_petg') + '<div></div></div>' +
      '<button class="btn s l" id="parSalvar" type="button">Salvar como padrão do painel</button></div>' +
    '<div class="acoes calcgo"><button class="btn big" id="calcular" type="button">Calcular</button><button class="btn l" id="limpar" type="button">Limpar tudo</button></div>' +
    '<div id="calcAviso" class="calcaviso" hidden>Você mudou algum valor. Toque em <b>Calcular</b> para atualizar o resultado.</div><div id="calcRes"></div>';
  ligarCalc();
  if (CALC.res) { $('#calcRes').innerHTML = CALC.res; (CALC.infos || []).forEach((h, n) => { const el = document.querySelector('[data-info="' + n + '"]'); if (el) el.innerHTML = h; }); ligarCopiar(); $('#calcAviso').hidden = !CALC.stale; $('#calcRes').classList.toggle('velho', !!CALC.stale); }
}
function resultadoCalc() {
  const P = CALC.p, R = LXLCalc.calcOrcamento(CALC.linhas.map(paraMotor), nn(CALC.fixos), P);
  document.querySelectorAll('[data-info]').forEach(el => {
    const x = R.linhas[+el.dataset.info], l = CALC.linhas[+el.dataset.info]; if (!x) return;
    const p = l.k === 'cat' ? produtos.find(q => q.id === l.pid) : null;
    const aviso = p && !(p.peso_g > 0) ? '<span class="neg">Esta peça ainda não tem custo cadastrado (Estoque > Custo).</span><br>' : '';
    el.innerHTML = aviso + 'Custo por peça: <b>' + brl(x.un.total) + '</b> &middot; Venda por peça: <b>' + brl(x.venda_un) + '</b>' + (x.venda_manual ? '' : ' <span>(sugerido)</span>') + ' &middot; Total do item: <b>' + brl(x.total.custo) + '</b>';
  });
  const d = R.detalhe, pr = R.producao;
  const lin = (a, b, c) => '<div class="cl2' + (c ? ' ' + c : '') + '"><span>' + a + '</span><b>' + b + '</b></div>';
  const ac = (k, titulo, corpo) => { const ab = !!CALC.ab[k]; return '<button type="button" class="acord' + (ab ? ' aberto' : '') + '" data-ac="' + k + '" aria-expanded="' + ab + '"><span>' + titulo + '</span><span class="seta">&#9662;</span></button><div class="acbox res" data-acb="' + k + '"' + (ab ? '' : ' hidden') + '>' + corpo + '</div>'; };
  const mats = pr.por_material.filter(m => m.g > 0).map(m => lin(esc(m.nome || m.tipo) + ' (' + m.tipo + ')', kgTxt(m.g))).join('');
  const porItem = R.linhas.map((x, i) => '<div class="it"><b>' + esc(nomeItem(x, i)) + '</b><small>' + x.qtd + ' un.</small>' + lin('Custo', brl(x.total.custo)) + lin('Venda', brl(x.total.venda)) + '</div>').join('') +
    (R.fixos > 0 ? '<div class="it"><b>Custos fixos do pedido</b>' + lin('Custo', brl(R.fixos)) + '</div>' : '');
  $('#calcRes').innerHTML =
    ac('res', 'Resultado', lin('Custo total', brl(R.custo), 'tt') + lin('Valor de venda', brl(R.venda)) + (R.descontos > 0 ? lin('Imposto e taxas', '- ' + brl(R.descontos)) : '') +
      lin('Lucro', brl(R.lucro), 'tt' + (R.lucro < 0 ? ' neg' : '')) + lin('Margem real', R.margem_real.toFixed(1).replace('.', ',') + '%', R.lucro < 0 ? 'neg' : '') +
      lin('Preço sugerido para a margem de ' + fm(P.margem_pct) + '%', brl(R.sugerido_total)) + (R.pecas > 0 ? lin('Custo médio por peça', brl(R.custo / R.pecas)) : '')) +
    ac('custo', 'Onde vai o custo', lin('Filamento', brl(d.filamento)) + lin('Energia', brl(d.energia)) + lin('Desgaste da impressora', brl(d.desgaste)) +
      lin('Mão de obra', brl(d.mao)) + lin('Extras', brl(d.extras)) + lin('Embalagem', brl(d.embalagem)) + lin('Fixos do pedido', brl(R.fixos))) +
    ac('prod', 'Para produzir (' + R.pecas + ' peça' + (R.pecas === 1 ? '' : 's') + ')', lin('Tempo de impressão', horasTxt(pr.horas)) +
      (pr.gramas_pla > 0 ? lin('Filamento PLA', kgTxt(pr.gramas_pla)) : '') + (pr.gramas_petg > 0 ? lin('Filamento PETG', kgTxt(pr.gramas_petg)) : '') +
      (mats ? '<div class="mut" style="margin:10px 0 2px;font-size:12px">Por material (já com a perda):</div>' + mats : '')) +
    ac('itens', 'Resumo por item', porItem) +
    '<div class="acoes"><button class="btn" id="copiar" type="button">Copiar resumo</button></div>';
  CALC.ultimo = R;
  CALC.res = $('#calcRes').innerHTML; CALC.stale = false;
  CALC.infos = [...document.querySelectorAll('[data-info]')].map(el => el.innerHTML);
  ligarCopiar(); $('#calcAviso').hidden = true; $('#calcRes').classList.remove('velho');
}
function mudouEstrutura() { CALC.stale = true; CALC.infos = []; }
function marcarVelho() { if (!CALC.res) return; CALC.stale = true; $('#calcAviso').hidden = false; $('#calcRes').classList.add('velho'); }
function ligarCalc() {
  const L = el => CALC.linhas[+el.dataset.n];
  document.querySelectorAll('.cq input.f-nome, .cq input[class^="f-"], .cq input[class^="m-"], .cq select.m-tipo').forEach(el => {
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const cls = [...el.classList].find(c => /^(f|m)-/.test(c)), l = L(el), k = cls.slice(2);
      if (cls[0] === 'm') { l.materiais[+el.dataset.j][k] = el.value; if (k === 'tipo') { mudouEstrutura(); return desenharCalc(); } } else l[k] = el.value;
      marcarVelho();
    });
  });
  const passo = (n, d) => { const l = CALC.linhas[n], v = Math.max(1, Math.floor(nn(l.qtd)) + d); l.qtd = String(v); const inp = document.querySelector('.f-qtd[data-n="' + n + '"]'); if (inp) inp.value = v; marcarVelho(); };
  document.querySelectorAll('[data-qm]').forEach(b => b.onclick = () => passo(+b.dataset.qm, -1));
  document.querySelectorAll('[data-qp]').forEach(b => b.onclick = () => passo(+b.dataset.qp, 1));
  document.querySelectorAll('.p-in').forEach(el => el.addEventListener('input', () => { CALC.p[el.dataset.k] = nn(el.value); marcarVelho(); }));
  $('.c-fixos').addEventListener('input', e => { CALC.fixos = e.target.value; marcarVelho(); });
  $('.wrap').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    const campos = [...document.querySelectorAll('.wrap input, .wrap select')].filter(x => x.offsetParent !== null);
    const i = campos.indexOf(e.target); const prox = campos[i + 1];
    if (prox) { prox.focus(); if (prox.select) prox.select(); } else e.target.blur();
  });
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { CALC.linhas.splice(+b.dataset.rm, 1); mudouEstrutura(); desenharCalc(); });
  document.querySelectorAll('[data-addmat]').forEach(b => b.onclick = () => { CALC.linhas[+b.dataset.addmat].materiais.push({ nome: '', tipo: 'PLA', peso_g: '', preco_kg: '' }); mudouEstrutura(); desenharCalc(); });
  document.querySelectorAll('[data-rmmat]').forEach(b => b.onclick = () => { const [n, j] = b.dataset.rmmat.split(':').map(Number); CALC.linhas[n].materiais.splice(j, 1); mudouEstrutura(); desenharCalc(); });
  const zerar = modo => { const p = CALC.p; CALC = calcInicial(); CALC.p = p; CALC.modo = modo; };
  $('#addLivre').onclick = () => { zerar('livre'); CALC.linhas.push(linhaLivre()); desenharCalc(); };
  $('#addCat').onclick = () => { zerar('cat'); desenharCalc(); escolherProdutoCalc(); };
  const mais = $('#maisUm');
  if (mais) mais.onclick = () => { if (CALC.modo === 'cat') escolherProdutoCalc(); else { CALC.linhas.push(linhaLivre()); mudouEstrutura(); desenharCalc(); const ult = document.querySelectorAll('.cq'); if (ult.length) ult[ult.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  $('#parBtn').onclick = () => { CALC.aberto = !CALC.aberto; $('#parBox').hidden = !CALC.aberto; $('#parBtn').classList.toggle('aberto', CALC.aberto); };
  $('#parSalvar').onclick = async () => {
    const P = CALC.p;
    try { const j = await api('parametros_salvar', { params: { energia_kwh: P.energia_kwh, potencia_w: P.potencia_w, valor_impressora: P.valor_impressora, vida_util_h: P.vida_util_h, margem_pct: P.margem_pct, imposto_pct: P.imposto_pct, preco_kg_pla: P.preco_kg_pla, preco_kg_petg: P.preco_kg_petg } }); paramsCusto = j.params; toast('Valores salvos como padrão.'); } catch (e) { toast(e.message); }
  };
  $('#limpar').onclick = async () => { if (!CALC.linhas.length || await confirmar('Limpar a calculadora', 'Tem certeza? Tudo o que você preencheu vai ser apagado.', 'Sim, limpar')) { zerar(null); desenharCalc(); } };
  $('#calcRes').addEventListener('click', e => {
    const b = e.target.closest('[data-ac]'); if (!b) return;
    const k = b.dataset.ac, box = document.querySelector('[data-acb="' + k + '"]');
    CALC.ab[k] = box.hidden; box.hidden = !box.hidden; b.classList.toggle('aberto', !box.hidden); b.setAttribute('aria-expanded', String(!box.hidden));
    CALC.res = $('#calcRes').innerHTML;
  });
  $('#calcular').onclick = () => {
    if (!CALC.linhas.length) return toast('Adicione um produto ou item livre primeiro.');
    resultadoCalc(); toast('Calculado.'); $('#calcRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}
function ligarCopiar() {
  const bt = $('#copiar'); if (!bt) return;
  bt.onclick = () => {
    const R = CALC.ultimo, pr = R.producao; if (!R.linhas.length) return toast('Nada para copiar.');
    const t = ['ORÇAMENTO LXL PROJETOS'].concat(R.linhas.map((x, i) => (x.qtd + 'x ' + nomeItem(x, i) + ': ' + brl(x.venda_un) + ' cada = ' + brl(x.venda_un * x.qtd))),
      ['Total: ' + brl(R.venda), '', 'Uso interno: custo ' + brl(R.custo) + ' | lucro ' + brl(R.lucro) + ' (' + R.margem_real.toFixed(1).replace('.', ',') + '%)', 'Produção: ' + horasTxt(pr.horas) + ', PLA ' + kgTxt(pr.gramas_pla) + (pr.gramas_petg ? ', PETG ' + kgTxt(pr.gramas_petg) : '')]).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Resumo copiado.')).catch(() => toast('Não consegui copiar.'));
  };
}
function escolherProdutoCalc() {
  const m = modal('<h2>Escolha o produto <button class="btn s l" data-fechar type="button">Fechar</button></h2><input type="search" id="q" placeholder="Buscar por nome ou código" autocomplete="off"><div id="lista"></div>');
  const des = () => {
    const q = $('#q', m).value.trim().toLowerCase();
    const l = produtos.filter(p => p.ativo && (!q || p.nome.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q))).slice(0, 60);
    $('#lista', m).innerHTML = l.length ? l.map(p => '<button type="button" class="sugi" data-pid="' + p.id + '"><b>' + esc(p.nome) + '</b><small>' + esc(p.codigo || '') + ' &middot; ' + brl(p.preco) + (p.peso_g > 0 ? '' : ' &middot; sem custo cadastrado') + '</small></button>').join('') : '<div class="vazio">Nada encontrado.</div>';
    $('#lista', m).querySelectorAll('[data-pid]').forEach(b => b.onclick = () => { const p = produtos.find(x => x.id === +b.dataset.pid); CALC.modo = 'cat'; CALC.linhas.push({ k: 'cat', pid: p.id, qtd: 1, preco_un: fm(p.preco), extra: '' }); mudouEstrutura(); m.fechar(); desenharCalc(); });
  };
  $('#q', m).addEventListener('input', des); des(); setTimeout(() => $('#q', m).focus(), 50);
}

/* ---------- rotas ---------- */
function rota() {
  if (!csrf) return;
  const h = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  switch (h[0]) {
    case 'novo': return telaPedidoForm(0);
    case 'editar': return telaPedidoForm(+h[1]);
    case 'nota': return telaNota(+h[1]);
    case 'estoque': return telaEstoque();
    case 'categorias': return telaCategorias();
    case 'categoria': return telaCategoria(+h[1]);
    case 'clientes': return telaClientes();
    case 'relatorios': return telaRelatorios();
    case 'calculadora': return telaCalculadora();
    default: return telaPedidos();
  }
}
window.addEventListener('hashchange', rota);

async function iniciar() {
  try {
    const j = await (await fetch('api.php?a=estado', { credentials: 'same-origin' })).json();
    if (j.erro) { app.innerHTML = '<div class="wrap"><div class="card"><h2>Ops</h2><p>' + esc(j.erro) + '</p></div></div>'; return; }
    csrf = j.csrf; usuario = j.usuario;
    if (j.logado) rota(); else { csrf = j.csrf; telaLogin(j.setup); }
  } catch (e) { app.innerHTML = '<div class="wrap"><p class="carregando">Não consegui abrir o painel. Tente de novo.</p></div>'; }
}
iniciar();
})();
