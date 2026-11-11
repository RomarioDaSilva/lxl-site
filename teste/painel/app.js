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
const STATUS = { novo: 'Novo', producao: 'Em produção', pronto: 'Pronto', entregue: 'Entregue', cancelado: 'Cancelado' };
const PROXIMO = { novo: 'producao', producao: 'pronto', pronto: 'entregue' };
const PAGTO = ['Pix', 'Cartão', 'Dinheiro', 'A combinar'];
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

function quadro(ativo, corpo) {
  app.innerHTML =
    '<div class="topo"><img src="/natal/imagens/logo-colorida.png" alt="LXL"><b>Painel</b><button id="sair" type="button">Sair</button></div>' +
    '<div class="wrap">' + corpo + '</div>' +
    '<nav class="nav"><a href="#/pedidos" class="' + (ativo === 'pedidos' ? 'on' : '') + '"><span>&#128203;</span>Pedidos</a>' +
    '<a href="#/novo" class="novo ' + (ativo === 'novo' ? 'on' : '') + '"><span>&#10133;</span>Novo pedido</a>' +
    '<a href="#/estoque" class="' + (ativo === 'estoque' ? 'on' : '') + '"><span>&#128230;</span>Estoque</a></nav>';
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
  if (!produtos || forcar) { const j = await api('produtos'); produtos = j.produtos; coresLista = j.cores || []; }
  return produtos;
}

/* ---------- pedido: novo / editar ---------- */
let P = null;
function pedidoVazio() {
  return { id: 0, data: hoje(), cliente: '', whatsapp: '', itens: [], desconto: 0, frete: 0, entrega: 'Retirada', endereco: '', prazo: '', pagamento: 'Pix', pago: 0, status: 'novo', obs: '' };
}
const subtotal = () => P.itens.reduce((s, i) => s + (Number(i.preco) || 0) * (Number(i.qtd) || 0), 0);
const totalPed = () => Math.max(0, subtotal() - (Number(P.desconto) || 0) + (Number(P.frete) || 0));

async function telaPedidoForm(id) {
  quadro(id ? '' : 'novo', '<p class="carregando">Carregando...</p>');
  try {
    await Promise.all([carregarProdutos(), carregarCatalogo()]);
    if (id) { P = (await api('pedido', null, '&id=' + id)).pedido; }
    else if (!P || P.id) P = pedidoVazio();
  } catch (e) { return toast(e.message); }
  const opt = (arr, v) => arr.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  $('.wrap').innerHTML =
    '<h1>' + (P.id ? 'Editar pedido #' + numPed(P.id) : 'Novo pedido') + '</h1>' +
    '<div class="barra"><button class="btn l" id="colar" type="button">Colar pedido do WhatsApp</button></div>' +
    '<div class="card"><h2>Cliente</h2><label>Nome *</label><input type="text" id="cliente" value="' + esc(P.cliente) + '" autocomplete="off">' +
    '<div class="l2"><div><label>WhatsApp</label><input type="tel" id="whatsapp" value="' + esc(P.whatsapp) + '" placeholder="(38) 9...."></div>' +
    '<div><label>Data do pedido</label><input type="date" id="data" value="' + esc(P.data) + '"></div></div></div>' +
    '<div class="card"><h2>Itens</h2><div id="itens"></div>' +
    '<div class="acoes"><button class="btn o" id="add" type="button">Adicionar peça</button><button class="btn l" id="avulso" type="button">Item avulso</button></div></div>' +
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
  bind('cliente', 'cliente'); bind('whatsapp', 'whatsapp'); bind('data', 'data'); bind('endereco', 'endereco'); bind('prazo', 'prazo'); bind('obs', 'obs');
  bind('desconto', 'desconto', el => parseNum(el.value)); bind('frete', 'frete', el => parseNum(el.value));
  bind('pagamento', 'pagamento'); bind('status', 'status'); bind('pago', 'pago', el => el.checked ? 1 : 0);
  $('#entrega').addEventListener('change', e => { P.entrega = e.target.value; endBox(); });
  endBox();
  desenharItens();
  $('#add').onclick = abrirPicker;
  $('#avulso').onclick = () => { P.itens.push({ produto_id: null, descricao: '', qtd: 1, preco: 0 }); desenharItens(); const l = document.querySelectorAll('.desc'); if (l.length) l[l.length - 1].focus(); };
  $('#colar').onclick = abrirColar;
  $('#salvar').onclick = salvarPedido;
}
function endBox() { $('#endbox').style.display = P.entrega === 'Entrega' ? '' : 'none'; }
function totais() { const t = $('#tot'); if (t) t.textContent = 'Total ' + brl(totalPed()); document.querySelectorAll('[data-sub]').forEach(el => { const i = P.itens[+el.dataset.sub]; el.textContent = brl((Number(i.preco) || 0) * (Number(i.qtd) || 0)); }); }

function desenharItens() {
  const box = $('#itens');
  if (!P.itens.length) { box.innerHTML = '<div class="vazio">Nenhum item ainda.</div>'; totais(); return; }
  box.innerHTML = P.itens.map((i, n) => {
    const p = i.produto_id && produtos.find(x => x.id === i.produto_id);
    const cq = p && i.cor_id ? p.cores.find(c => c.cor_id === i.cor_id) : null;
    const disp = cq ? cq.qtd : (p ? p.estoque : 0);
    const aviso = p && p.controla && disp < i.qtd ? '<div class="neg" style="font-size:13px">Estoque atual' + (cq ? ' (' + esc(cq.nome) + ')' : '') + ': ' + disp + '</div>' : '';
    const seletor = p && p.usa_cores ? '<select class="corsel" data-cs="' + n + '"><option value="">Escolha a cor</option>' + p.cores.map(c => '<option value="' + c.cor_id + '"' + (c.cor_id === i.cor_id ? ' selected' : '') + '>' + esc(c.nome) + ' (' + c.qtd + ' em estoque)</option>').join('') + '</select>' : '';
    return '<div class="item"><div class="nm">' + (i.produto_id ? esc(i.descricao) : '<input type="text" class="desc" data-n="' + n + '" value="' + esc(i.descricao) + '" placeholder="Descrição do item">') + '</div>' + seletor + aviso +
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
  totais();
}

function abrirPicker() {
  const m = modal('<h2>Adicionar peça <button class="btn s l" data-fechar type="button">Concluir</button></h2><input type="search" id="pq" placeholder="Buscar por nome ou código"><div id="pl" style="margin-top:8px"></div>');
  const desenha = () => {
    const q = $('#pq', m).value.toLowerCase().trim();
    const l = produtos.filter(p => p.ativo && (!q || (p.nome + ' ' + p.codigo).toLowerCase().includes(q))).slice(0, 60);
    $('#pl', m).innerHTML = l.length ? l.map(p =>
      '<div class="prod" data-id="' + p.id + '"><div class="esq">' + thumb(p) + '<div><div class="nm">' + esc(p.nome) + '</div><div class="d">' + esc(p.codigo) + (p.codigo ? ' &middot; ' : '') + (p.controla ? (p.estoque > 0 ? 'Pronta entrega: ' + (p.usa_cores ? p.cores.filter(c => c.qtd > 0).map(c => bol(c.hex) + c.qtd).join(' ') : p.estoque) : '<span class="neg">Sem estoque</span>') : 'Sob encomenda') + '</div></div></div><b>' + brl(p.preco) + '</b></div>').join('')
      : '<div class="vazio">Nada encontrado. Cadastre a peça em Estoque ou use "Item avulso".</div>';
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
    if (r.nome) P.cliente = r.nome;
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
    const p = produtos.find(x => sku && x.codigo === sku);
    const pr = resto.match(/R\$\s*([\d.]+,\d{2})\s*cada/);
    itens.push({ produto_id: p ? p.id : null, descricao: p ? p.nome : nome + (sku ? ' (' + sku + ')' : ''), qtd: qtd || 1, preco: pr ? parseNum(pr[1]) : (p ? p.preco : 0) });
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
  const lin = p.itens.map(i => '<tr><td class="c">' + i.qtd + 'x</td><td>' + esc(i.descricao) + '</td><td class="r">' + brl(i.preco) + '</td><td class="r">' + brl(i.preco * i.qtd) + '</td></tr>').join('');
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

/* ---------- estoque ---------- */
let fEst = 'todos', bEst = '', sEst = '';
async function telaEstoque() {
  quadro('estoque', '<p class="carregando">Carregando...</p>');
  try { await Promise.all([carregarProdutos(true), carregarCatalogo()]); } catch (e) { return toast(e.message); }
  $('.wrap').innerHTML =
    '<h1>Estoque</h1><div class="barra"><button class="btn o" id="novo" type="button">Novo produto</button><button class="btn l" id="imp" type="button">Importar do catálogo</button><button class="btn l" id="cores" type="button">Cores</button></div>' +
    '<div class="chips">' + [['todos', 'Todos'], ['pronta', 'Pronta entrega'], ['encomenda', 'Sob encomenda'], ['inativos', 'Inativos']].map(([k, t]) => '<button class="chip ' + (fEst === k ? 'on' : '') + '" data-f="' + k + '" type="button">' + t + '</button>').join('') + '</div>' +
    '<div class="l2"><select id="sec"><option value="">Todas as seções</option>' +
    catalogo.secoes.map(s => '<option value="' + esc(s) + '"' + (sEst === s ? ' selected' : '') + '>' + esc(s) + ' (' + produtos.filter(p => p.ativo && secaoDe(p) === s).length + ')</option>').join('') +
    '<option value="__outros"' + (sEst === '__outros' ? ' selected' : '') + '>Fora do catálogo (' + produtos.filter(p => p.ativo && !secaoDe(p)).length + ')</option></select>' +
    '<input type="search" id="q" placeholder="Buscar produto" value="' + esc(bEst) + '"></div><div class="card" style="margin-top:12px" id="lista"></div>';
  const desenha = () => {
    const q = bEst.toLowerCase().trim();
    const l = produtos.filter(p => {
      if (fEst === 'pronta' && !(p.controla && p.ativo)) return false;
      if (fEst === 'encomenda' && !(!p.controla && p.ativo)) return false;
      if (fEst === 'inativos' && p.ativo) return false;
      if (fEst === 'todos' && !p.ativo) return false;
      if (sEst === '__outros' ? secaoDe(p) : (sEst && secaoDe(p) !== sEst)) return false;
      return !q || (p.nome + ' ' + p.codigo).toLowerCase().includes(q);
    });
    $('#lista').innerHTML = l.length ? l.map(p =>
      '<div class="prod ' + (p.ativo ? '' : 'off') + '" data-id="' + p.id + '"><div class="esq">' + thumb(p) + '<div><div class="nm">' + esc(p.nome) + '</div><div class="d">' + esc(p.codigo) + (p.codigo ? ' &middot; ' : '') + brl(p.preco) + (p.controla ? '' : ' &middot; Sob encomenda') + '</div></div></div>' +
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
  $('#sec').onchange = e => { sEst = e.target.value; desenha(); };
  $('#novo').onclick = () => formProduto(null);
  $('#imp').onclick = importarCatalogo;
  $('#cores').onclick = () => gerenciarCores(() => telaEstoque());
  desenha();
}

function formProduto(p) {
  const n = p || { id: 0, codigo: '', nome: '', preco: 0, controla: 1, estoque: 0, ativo: 1, obs: '', usa_cores: 0, cores: [] };
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
    '<label>Observações</label><input type="text" id="obs" value="' + esc(n.obs) + '">' +
    '<div class="ck"><input type="checkbox" id="ativo"' + (n.ativo ? ' checked' : '') + '><label style="margin:0;color:inherit">Produto ativo (aparece na hora de montar pedidos)</label></div><div class="acoes"><button class="btn" id="ok" type="button">Salvar</button></div>');
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
        usa_cores: usa ? 1 : 0, cores: usa ? coresLista.filter(c => qs[c.id] > 0 || existiam.has(c.id)).map(c => ({ cor_id: c.id, qtd: qs[c.id] || 0 })) : [] });
      m.fechar(); telaEstoque(); toast('Produto salvo.');
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
      row.querySelector('[data-ex]').onclick = async () => { if (!confirm('Excluir a cor "' + row.querySelector('.gn').value + '"?')) return; try { const j = await api('cor_excluir', { id }); coresLista = j.cores; desenha(); } catch (e) { toast(e.message); } };
    });
    $('#gna', m).onclick = async () => { try { const j = await api('cor_salvar', { nome: $('#gnn', m).value, hex: $('#gnh', m).value }); coresLista = j.cores; toast('Cor cadastrada.'); desenha(); } catch (e) { toast(e.message); } };
  };
  desenha();
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
