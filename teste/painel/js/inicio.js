/* PAINEL LXL | TELA INICIAL (painel de controle): números do mês, gráfico, situação dos pedidos, últimos pedidos, mais vendidos e estoque baixo.
   Quem não é administrador vê só os atalhos e os pedidos recentes. */
'use strict';
const COR_ST = { novo: '#E0784A', producao: '#2f6fbf', pronto: '#7bb342', entregue: '#1F5B3F', cancelado: '#b3261e' };
const iniciais = n => (String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x.charAt(0)).join('') || '?').toUpperCase();
const pct = (a, b) => b > 0 ? Math.round((a - b) / b * 100) : null;
const delta = v => v === null ? '<span class="dl nd">primeiro mês com vendas</span>' : '<span class="dl ' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '▲ ' : '▼ ') + Math.abs(v) + '%</span> <small>vs mês passado</small>';
const maiuscula = t => t.charAt(0).toUpperCase() + t.slice(1);

/* Mini gráfico de linha dos KPIs (SVG) */
function spark(vals, cor) {
  if (!vals.length) return '';
  const w = 100, h = 32, mx = Math.max(1, ...vals), n = vals.length;
  const pts = vals.map((v, i) => [n === 1 ? w / 2 : i / (n - 1) * w, h - 3 - v / mx * (h - 8)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + 'L' + w + ' ' + h + 'L0 ' + h + 'Z" fill="' + cor + '" opacity=".12"/><path d="' + d + '" fill="none" stroke="' + cor + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
/* Gráfico de área do faturamento por dia */
function graficoArea(dias) {
  if (!dias.length) return '<div class="vazio">Sem vendas no período.</div>';
  const W = 640, H = 220, L = 8, B = 26, T = 10, mx = Math.max(1, ...dias.map(x => x.v)), n = dias.length;
  const X = i => L + (n === 1 ? (W - L * 2) / 2 : i / (n - 1) * (W - L * 2)), Y = v => T + (H - T - B) * (1 - v / mx);
  const pts = dias.map((x, i) => [X(i), Y(x.v)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const grade = [0, .5, 1].map(f => '<line x1="' + L + '" x2="' + (W - L) + '" y1="' + Y(mx * f).toFixed(1) + '" y2="' + Y(mx * f).toFixed(1) + '" stroke="#e3ded2" stroke-dasharray="3 4"/>').join('');
  const rot = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => '<text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '" font-size="11" fill="#6b7a72">' + esc(dataBR(dias[i].data).slice(0, 5)) + '</text>').join('');
  const pontos = n <= 31 ? pts.map((p, i) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="#fff" stroke="#1F5B3F" stroke-width="2"><title>' + esc(dataBR(dias[i].data)) + ': ' + brl(dias[i].v) + '</title></circle>').join('') : '';
  return '<svg class="area" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Faturamento por dia">' +
    '<defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F5B3F" stop-opacity=".35"/><stop offset="1" stop-color="#1F5B3F" stop-opacity="0"/></linearGradient></defs>' +
    grade + '<path d="' + d + 'L' + X(n - 1).toFixed(1) + ' ' + Y(0) + 'L' + X(0).toFixed(1) + ' ' + Y(0) + 'Z" fill="url(#gA)"/><path d="' + d + '" fill="none" stroke="#1F5B3F" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' + pontos + rot + '</svg>';
}
/* Rosca com a situação dos pedidos */
function rosca(itens) {
  const tot = itens.reduce((s, x) => s + x.n, 0);
  if (!tot) return '<div class="vazio">Sem pedidos no período.</div>';
  const R = 15.9155, C = 2 * Math.PI * R; let off = 0;
  const arcos = itens.filter(x => x.n).map(x => { const f = x.n / tot * C, s = '<circle r="' + R + '" cx="21" cy="21" fill="none" stroke="' + (COR_ST[x.status] || '#999') + '" stroke-width="6" stroke-dasharray="' + f.toFixed(2) + ' ' + (C - f).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>'; off += f; return s; }).join('');
  const leg = itens.filter(x => x.n).map(x => '<li><i style="background:' + (COR_ST[x.status] || '#999') + '"></i><span>' + esc(STATUS[x.status] || x.status) + '</span><b>' + x.n + '</b></li>').join('');
  return '<div class="rosca"><svg viewBox="0 0 42 42" role="img" aria-label="Pedidos por situação"><g transform="rotate(-90 21 21)">' + arcos + '</g><text x="21" y="20.5" text-anchor="middle" font-size="7" font-weight="800" fill="#1d2a24">' + tot + '</text><text x="21" y="26.5" text-anchor="middle" font-size="3.6" fill="#6b7a72">pedidos</text></svg><ul>' + leg + '</ul></div>';
}
const linhaPedido = p => '<a class="lp" href="#/nota/' + p.id + '"><span class="av">' + esc(iniciais(p.cliente)) + '</span><span class="lp-t"><b>' + esc(p.cliente) + '</b><small>PED-' + numPed(p.id) + ' &middot; ' + esc(dataBR(p.data)) + '</small></span><span class="lp-v">' + brl(p.total) + '<span class="pill ' + p.status + '">' + STATUS[p.status] + '</span></span></a>';

async function telaInicio() {
  quadro('inicio', '<p class="carregando">Carregando...</p>');
  const h = new Date(), ini = new Date(h.getFullYear(), h.getMonth(), 1), pa = new Date(h.getFullYear(), h.getMonth() - 1, 1), pf = new Date(h.getFullYear(), h.getMonth(), 0);
  const saud = h.getHours() < 12 ? 'Bom dia' : h.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  let ped = null, rel = null, ant = null, gas = null;
  try { ped = await api('pedidos', null, '&status=todos&q='); } catch (e) { return toast(e.message); }
  if (ehAdmin()) {
    try { [rel, ant] = await Promise.all([api('relatorios', null, '&de=' + isoD(ini) + '&ate=' + isoD(h)), api('relatorios', null, '&de=' + isoD(pa) + '&ate=' + isoD(pf))]); } catch (e) { rel = null; }
    try { gas = (await api('gastos')).resumo; } catch (e) { gas = null; }
  }
  const r = ped.resumo, ultimos = ped.pedidos.slice(0, 6);
  const cab = '<div class="dash-cab"><div><h1>' + saud + (usuario ? ', ' + esc(usuario) : '') + '</h1><p class="mut">Resumo de ' + esc(h.toLocaleDateString('pt-BR', { month: 'long' })) + ' &middot; ' + esc(EMPRESA.cidade) + '</p></div></div>';
  if (!rel) {
    const atalhos = MENU.filter(x => x[1] !== 'inicio' && (!x[3] || pode(x[3]))).map(([hr, k, tx]) => '<a class="atalho" href="' + hr + '">' + svgIc(k) + tx + '</a>').join('');
    $('.wrap').innerHTML = cab + '<div class="kpis">' + kpi('Vendido no mês', brl(r.mes_total), r.mes_qtd + ' pedido(s)', '#1F5B3F', []) + kpi('Em aberto', r.abertos, 'pedidos', '#E0784A', []) + kpi('A receber', brl(r.a_receber), '', '#2f6fbf', []) + '</div>' +
      '<div class="card"><h2>Últimos pedidos</h2>' + (ultimos.map(linhaPedido).join('') || '<div class="vazio">Nenhum pedido ainda.</div>') + '</div><div class="atalhos">' + atalhos + '</div>';
    return;
  }
  const R = rel.resumo, A = ant ? ant.resumo : null, mapa = {};
  (rel.dias || []).forEach(x => mapa[x.data] = x);
  const dias = []; for (let d = new Date(ini); d <= h; d.setDate(d.getDate() + 1)) { const k = isoD(d); dias.push(mapa[k] || { data: k, n: 0, v: 0 }); }
  const sp = f => dias.map(f);
  const kpis = '<div class="kpis">' +
    kpi('Faturamento do mês', brl(R.faturamento), delta(A ? pct(R.faturamento, A.faturamento) : null) + '', '#1F5B3F', sp(x => x.v)) +
    kpi('Pedidos no mês', R.pedidos, delta(A ? pct(R.pedidos, A.pedidos) : null) + '', '#2f6fbf', sp(x => x.n)) +
    kpi('Ticket médio', brl(R.ticket), delta(A ? pct(R.ticket, A.ticket) : null) + '', '#E0784A', []) +
    kpi('A receber', brl(r.a_receber), r.abertos + ' pedido(s) em aberto', '#b7791f', []) + '</div>';
  const gcard = gas && gas.total > 0 ? (() => { const pc = Math.min(100, Math.round(gas.recebido / gas.total * 100)); return '<a class="card meta" href="#/custos"><h2>Investimento recuperado <b>' + pc + '%</b></h2><div class="prog"><i style="width:' + pc + '%"></i></div><p class="mut" style="font-size:13px;margin:8px 0 0">Recebido ' + brl(gas.recebido) + ' de ' + brl(gas.total) + ' gastos. ' + (gas.recebido >= gas.total ? 'Já deu lucro.' : 'Faltam ' + brl(gas.total - gas.recebido) + '.') + '</p></a>'; })() : '';
  const top = (rel.top_produtos || []).slice(0, 5), mxT = Math.max(1, ...top.map(x => x.v));
  const tops = top.length ? top.map((x, i) => '<li><span class="rk">' + (i + 1) + '</span><span class="tn"><b>' + esc(x.nome) + '</b><i style="width:' + Math.max(6, x.v / mxT * 100) + '%"></i></span><span class="tv">' + brl(x.v) + '<small>' + x.q + ' un.</small></span></li>').join('') : '<li class="vazio">Sem vendas no mês.</li>';
  const baixo = (rel.estoque && rel.estoque.baixo || []).slice(0, 5);
  const est = baixo.length ? '<div class="card"><h2>Estoque baixo</h2>' + baixo.map(x => '<a class="lp" href="#/estoque"><span class="av av-o">' + esc(iniciais(x.nome)) + '</span><span class="lp-t"><b>' + esc(x.nome) + '</b><small>' + esc(x.codigo) + '</small></span><span class="lp-v"><span class="pill novo">' + x.estoque + ' un.</span></span></a>').join('') + '</div>' : '';
  $('.wrap').innerHTML = cab + kpis + gcard +
    '<div class="dash-grade"><div class="card g-area"><h2>Faturamento por dia <small class="mut">neste mês</small></h2>' + graficoArea(dias) + '</div>' +
    '<div class="card g-rosca"><h2>Pedidos por situação</h2>' + rosca(rel.por_status || []) + '</div></div>' +
    '<div class="dash-grade b"><div class="card"><h2>Últimos pedidos <a class="vmais" href="#/pedidos">Ver todos</a></h2>' + (ultimos.map(linhaPedido).join('') || '<div class="vazio">Nenhum pedido ainda.</div>') + '</div>' +
    '<div class="dash-col"><div class="card"><h2>Mais vendidos no mês</h2><ol class="tops">' + tops + '</ol></div>' + est + '</div></div>';
}
function kpi(rot, val, sub, cor, serie) {
  return '<div class="card kpi2" style="--k:' + cor + '"><small>' + rot + '</small><b>' + val + '</b><div class="kpi2-s">' + (sub || '') + '</div>' + spark(serie, cor) + '</div>';
}
