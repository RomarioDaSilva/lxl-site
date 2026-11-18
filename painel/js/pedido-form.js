/* PAINEL LXL | PEDIDO NOVO / EDITAR: formulário (serve também para orçamento), itens, escolha de cliente e peça, colar do WhatsApp.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* ---------- pedido: novo / editar ---------- */
let P = null;
function pedidoVazio() {
  return { modo: 'pedido', pago_valor: 0, id: 0, cliente_id: null, data: hoje(), cliente: '', whatsapp: '', itens: [], desconto: 0, frete: 0, entrega: 'Retirada', endereco: '', prazo: '', pagamento: 'Pix', pago: 0, status: 'novo', obs: '' };
}
/* Orçamento começa igual ao pedido, mas sem pagamento e com validade. */
const orcVazio = () => ({ ...pedidoVazio(), modo: 'orcamento', validade: '' });
const subtotal = () => P.itens.reduce((s, i) => s + (Number(i.preco) || 0) * (Number(i.qtd) || 0), 0);
const totalPed = () => Math.max(0, subtotal() - (Number(P.desconto) || 0) + (Number(P.frete) || 0));

async function telaPedidoForm(id, modo) {
  const orc = modo === 'orcamento';   /* a mesma tela serve para pedido e para orçamento */
  quadro(id ? '' : (orc ? 'orcamentos' : 'novo'), '<p class="carregando">Carregando...</p>');
  try {
    await Promise.all([carregarProdutos(), carregarCatalogo(), carregarClientes()]);
    if (id) { P = orc ? (await api('orcamento', null, '&id=' + id)).orcamento : (await api('pedido', null, '&id=' + id)).pedido; P.modo = orc ? 'orcamento' : 'pedido'; }
    else if (!P || P.id || (P.modo || 'pedido') !== (orc ? 'orcamento' : 'pedido')) P = orc ? orcVazio() : pedidoVazio();
  } catch (e) { return toast(e.message); }
  const opt = (arr, v) => arr.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  $('.wrap').innerHTML =
    '<h1>' + (orc ? (P.id ? 'Editar orçamento #' + numPed(P.id) : 'Novo orçamento') : (P.id ? 'Editar pedido #' + numPed(P.id) : 'Novo pedido')) + '</h1>' +
    (orc ? '<p class="mut">Orçamento não baixa estoque nem entra nas vendas. Quando o cliente aprovar, use o botão "Gerar pedido" na lista de orçamentos.</p>' : '') +
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
    (orc ? '<div class="l2"><div><label>Entrega</label><select id="entrega">' + opt(['Retirada', 'Entrega'], P.entrega) + '</select></div>' +
      '<div><label>Válido até</label><input type="date" id="validade" value="' + esc(P.validade || '') + '"></div></div>'
    : '<div class="l2"><div><label>Pagamento</label><select id="pagamento">' + opt(PAGTO, P.pagamento) + '</select></div>' +
      '<div><label>Entrega</label><select id="entrega">' + opt(['Retirada', 'Entrega'], P.entrega) + '</select></div></div>' +
      '<div class="ck"><input type="checkbox" id="pago"' + (P.pago ? ' checked' : '') + '><label style="margin:0;color:inherit">Já está pago por completo</label></div>' +
      '<label>Já pagou (sinal, R$)</label><input type="text" inputmode="decimal" id="pago_valor" value="' + (P.pago_valor && !P.pago ? fmtIn(P.pago_valor) : '') + '" placeholder="0,00">' +
      '<div id="falta" class="mut" style="font-size:14px;margin-top:4px"></div>') +
    '<div id="endbox"><label>Endereço de entrega</label><input type="text" id="endereco" value="' + esc(P.endereco) + '"></div>' +
    '<div class="l2"><div><label>Prazo combinado</label><input type="text" id="prazo" value="' + esc(P.prazo) + '" placeholder="ex: 20/12"></div>' +
    (orc ? '<div></div>' : '<div><label>Situação</label><select id="status">' + Object.keys(STATUS).map(k => '<option value="' + k + '"' + (k === P.status ? ' selected' : '') + '>' + STATUS[k] + '</option>').join('') + '</select></div>') + '</div>' +
    '<label>Observações' + (orc ? '' : ' (aparecem na notinha)') + '</label><textarea id="obs">' + esc(P.obs) + '</textarea></div>' +
    '<div class="total"><div class="v" id="tot"></div><button class="btn" id="salvar" type="button">' + (orc ? 'Salvar orçamento' : 'Salvar pedido') + '</button></div>';
  const bind = (id, key, conv) => { const el = $('#' + id); if (!el) return; el.addEventListener('input', e => { P[key] = conv ? conv(e.target) : e.target.value; if (['desconto', 'frete', 'pago_valor', 'pago'].includes(id)) totais(); }); };
  bind('validade', 'validade'); bind('pago_valor', 'pago_valor', el => parseNum(el.value));
  bind('whatsapp', 'whatsapp'); bind('data', 'data'); bind('endereco', 'endereco'); bind('prazo', 'prazo'); bind('obs', 'obs');
  bind('desconto', 'desconto', el => parseNum(el.value)); bind('frete', 'frete', el => parseNum(el.value));
  bind('pagamento', 'pagamento'); bind('status', 'status'); bind('pago', 'pago', el => el.checked ? 1 : 0);
  totais();
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
function totais() { const t = $('#tot'); if (t) t.textContent = 'Total ' + brl(totalPed());
  const fa = $('#falta'); if (fa) { const f = P.pago ? 0 : Math.max(0, totalPed() - (Number(P.pago_valor) || 0)); fa.textContent = P.pago ? 'Pago por completo.' : (Number(P.pago_valor) > 0 ? 'Falta pagar: ' + brl(f) : ''); } document.querySelectorAll('[data-lu]').forEach(el => { const i = P.itens[+el.dataset.lu]; const l = ((Number(i.preco) || 0) - (Number(i.custo) || 0)) * (Number(i.qtd) || 0); el.textContent = Number(i.custo) > 0 ? 'Lucro neste item: ' + brl(l) : 'Informe o custo para ver o lucro.'; });
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
      (ehAdmin() ? '<label>Custo (R$ por unidade)</label><input type="text" inputmode="decimal" class="pcusto" data-n="' + n + '" value="' + (i.custo ? fmtIn(i.custo) : '') + '" placeholder="0,00"><div class="mut plucro" data-lu="' + n + '" style="font-size:13px;margin-top:4px"></div>' : '') + '</div>' : '';
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
    m.fechar(); telaPedidoForm(0, P.modo);
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
    if (P.modo === 'orcamento') { await api('orcamento_salvar', P); toast('Orçamento salvo.'); P = null; location.hash = '#/orcamentos'; return; }
    const j = await api('pedido_salvar', P);
    if (j.avisos && j.avisos.length) toast('Atenção: estoque negativo em ' + j.avisos.join(', '));
    produtos = null; P = null;
    location.hash = '#/nota/' + j.id;
  } catch (e) { toast(e.message); b.disabled = false; }
}

