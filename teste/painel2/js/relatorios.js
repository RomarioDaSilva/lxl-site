/* PAINEL LXL | RELATÓRIOS.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

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

