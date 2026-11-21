/* PAINEL LXL | CUSTOS E INVESTIMENTOS (só administrador): lista, resumo, novo custo, editar e importar do CSV do projeto.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

const G_TIPOS = { investimento: 'Investimento', variavel: 'Variável', fixo: 'Fixo' };
const G_COR = { investimento: '#2f6fbf', variavel: '#E0784A', fixo: '#7a5cc2' };
const G_CATS = ['Equipamento', 'Filamento', 'Embalagem', 'Acabamento', 'Insumos', 'Ferramentas', 'Armazenamento', 'Manutenção e limpeza', 'Modelos e licenças', 'Anúncios', 'Impostos e taxas', 'Outros'];
const G_PAG = ['', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto', 'Outro'];
let gTipo = 'todos', gBusca = '', gDados = null;

const gTexto = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function gBarras(obj, cor, max) {
  const it = Object.entries(obj).slice(0, max || 8); if (!it.length) return '<div class="vazio">Sem dados.</div>';
  const mx = Math.max(1, ...it.map(x => x[1]));
  return '<ul class="tops">' + it.map(([k, v]) => '<li><span class="tn"><b>' + esc(G_TIPOS[k] || k) + '</b><i style="width:' + Math.max(4, v / mx * 100) + '%;' + (cor ? 'background:' + (G_COR[k] || cor) : '') + '"></i></span><span class="tv">' + brl(v) + '</span></li>').join('') + '</ul>';
}

async function telaCustos() {
  quadro('custos', '<p class="carregando">Carregando...</p>');
  try { gDados = await api('gastos'); } catch (e) { return toast(e.message); }
  const R = gDados.resumo, falta = Math.max(0, R.total - R.recebido), lucro = R.recebido - R.total, pc = R.total > 0 ? Math.min(100, Math.round(R.recebido / R.total * 100)) : 0;
  const chips = [['todos', 'Todos'], ['investimento', 'Investimentos'], ['variavel', 'Variáveis'], ['fixo', 'Fixos']].map(([k, t]) => '<button class="chip ' + (gTipo === k ? 'on' : '') + '" data-t="' + k + '" type="button">' + t + '</button>').join('');
  $('.wrap').innerHTML =
    '<div class="dash-cab"><div><h1>Custos e investimentos</h1><p class="mut">Tudo o que o negócio já gastou, separado por tipo e categoria.</p></div>' +
    '<div class="barra"><button class="btn o" id="gNovo" type="button">+ Novo custo</button><button class="btn l" id="gImp" type="button">Importar CSV</button></div></div>' +
    '<div class="kpis">' + kpi('Total gasto', brl(R.total), R.qtd + ' lançamento(s)', '#b3261e', []) + kpi('Já recebido nas vendas', brl(R.recebido), 'pedidos pagos', '#1F5B3F', []) +
    kpi(lucro >= 0 ? 'Resultado (lucro)' : 'Falta para recuperar', brl(lucro >= 0 ? lucro : falta), lucro >= 0 ? 'já passou do investimento' : 'recebido menos gasto', lucro >= 0 ? '#1c7a45' : '#E0784A', []) + kpi('Ainda a receber', brl(R.a_receber), 'pedidos em aberto', '#2f6fbf', []) + '</div>' +
    '<div class="card" style="margin-bottom:14px"><h2>Investimento recuperado <b style="font-size:20px">' + pc + '%</b></h2><div class="prog" role="progressbar" aria-valuenow="' + pc + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pc + '%"></i></div>' +
    '<p class="mut" style="font-size:13px;margin:8px 0 0">Recebido ' + brl(R.recebido) + ' de ' + brl(R.total) + (R.a_receber > 0 ? '. Se receber o que está em aberto, vai a ' + (R.total > 0 ? Math.min(100, Math.round((R.recebido + R.a_receber) / R.total * 100)) : 0) + '%.' : '.') + '</p></div>' +
    '<div class="dash-grade b"><div class="card"><h2>Por categoria</h2>' + gBarras(R.por_categoria, '#1F5B3F', 8) + '</div><div class="card"><h2>Por tipo</h2>' + gBarras(R.por_tipo, '#1F5B3F') + '<h2 style="margin-top:18px">Por mês</h2>' + gBarras(Object.fromEntries(Object.entries(R.por_mes).map(([k, v]) => [k.slice(5) + '/' + k.slice(0, 4), v])), '#2f6fbf', 6) + '</div></div>' +
    '<div class="chips">' + chips + '</div><input type="search" id="gQ" placeholder="Buscar por item, loja ou categoria" value="' + esc(gBusca) + '" aria-label="Buscar custo"><div id="gLista"></div>';
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { gTipo = b.dataset.t; telaCustos(); });
  $('#gQ').oninput = e => { gBusca = e.target.value; gDesenhaLista(); };
  $('#gNovo').onclick = () => formGasto(null);
  $('#gImp').onclick = importarGastos;
  gDesenhaLista();
}
function gDesenhaLista() {
  const q = gTexto(gBusca);
  const l = gDados.gastos.filter(g => (gTipo === 'todos' || g.tipo === gTipo) && (!q || gTexto(g.descricao + ' ' + g.fornecedor + ' ' + g.categoria).includes(q)));
  const tot = l.reduce((s, g) => s + g.total, 0);
  $('#gLista').innerHTML = l.length ? '<div class="card" style="margin-top:12px"><h2>' + l.length + ' lançamento(s) <small class="mut">somam ' + brl(tot) + '</small></h2>' + l.map(g =>
    '<button type="button" class="lp lp-b" data-g="' + g.id + '"><span class="av" style="background:' + (G_COR[g.tipo] || '#999') + '">' + esc((g.categoria || '?').charAt(0).toUpperCase()) + '</span>' +
    '<span class="lp-t"><b>' + esc(g.descricao) + '</b><small>' + esc(dataBR(g.data)) + (g.fornecedor ? ' &middot; ' + esc(g.fornecedor) : '') + ' &middot; ' + esc(g.categoria || 'Sem categoria') + ' &middot; ' + esc(G_TIPOS[g.tipo]) + '</small></span>' +
    '<span class="lp-v">' + brl(g.total) + (g.qtd !== 1 ? '<small class="mut">' + String(g.qtd).replace('.', ',') + ' x ' + brl(g.valor_unit) + '</small>' : '') + '</span></button>').join('') + '</div>' : '<div class="vazio">Nenhum custo por aqui. Toque em "+ Novo custo" ou "Importar CSV".</div>';
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => formGasto(gDados.gastos.find(x => x.id === +b.dataset.g)));
}
function formGasto(g) {
  const n = g || { id: 0, data: hoje(), tipo: 'variavel', categoria: '', descricao: '', fornecedor: '', qtd: 1, valor_unit: 0, pagamento: '', obs: '' };
  const cats = [...new Set([...G_CATS, ...gDados.gastos.map(x => x.categoria).filter(Boolean)])];
  const m = modal('<h2>' + (g ? 'Editar custo' : 'Novo custo') + ' <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<label for="gd">Data</label><input type="date" id="gd" value="' + esc(n.data) + '">' +
    '<label for="gt">Tipo</label><select id="gt">' + Object.entries(G_TIPOS).map(([k, t]) => '<option value="' + k + '"' + (n.tipo === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
    '<p class="mut" style="font-size:12px;margin:2px 0 0">Investimento: coisa durável (impressora, ferramenta). Variável: gasta com a produção (filamento, embalagem). Fixo: todo mês (mensalidade, plano).</p>' +
    '<label for="gc">Categoria</label><input type="text" id="gc" list="gcl" value="' + esc(n.categoria) + '" placeholder="ex: Filamento" autocomplete="off"><datalist id="gcl">' + cats.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist>' +
    '<label for="gx">O que foi comprado *</label><input type="text" id="gx" value="' + esc(n.descricao) + '" placeholder="ex: Filamento PLA preto 1 kg">' +
    '<label for="gf">Loja ou fornecedor</label><input type="text" id="gf" value="' + esc(n.fornecedor) + '" placeholder="ex: Shopee">' +
    '<div class="duas"><div><label for="gq">Quantidade</label><input type="text" id="gq" inputmode="decimal" value="' + esc(fm(n.qtd) || '1') + '"></div><div><label for="gv">Valor de cada (R$)</label><input type="text" id="gv" inputmode="decimal" value="' + esc(fm(n.valor_unit)) + '" placeholder="0,00"></div></div>' +
    '<p style="font-weight:800;margin:6px 0 0" id="gtot"></p>' +
    '<label for="gp">Forma de pagamento</label><select id="gp">' + G_PAG.map(p => '<option value="' + esc(p) + '"' + (n.pagamento === p ? ' selected' : '') + '>' + (p || '(não informada)') + '</option>').join('') + '</select>' +
    '<label for="go">Observações</label><textarea id="go" rows="2">' + esc(n.obs) + '</textarea>' +
    '<div class="mfoot"><button class="btn" id="gok" type="button">Salvar</button>' + (g ? '<button class="btn r" id="gdel" type="button">Excluir</button>' : '') + '</div>');
  const tot = () => { $('#gtot', m).textContent = 'Total: ' + brl(Math.max(0.01, nn($('#gq', m).value) || 1) * nn($('#gv', m).value)); };
  $('#gq', m).oninput = tot; $('#gv', m).oninput = tot; tot();
  $('#gok', m).onclick = async () => {
    const corpo = { id: n.id, data: $('#gd', m).value, tipo: $('#gt', m).value, categoria: $('#gc', m).value, descricao: $('#gx', m).value, fornecedor: $('#gf', m).value, qtd: nn($('#gq', m).value) || 1, valor_unit: nn($('#gv', m).value), pagamento: $('#gp', m).value, obs: $('#go', m).value };
    if (!corpo.descricao.trim()) return toast('Escreva o que foi comprado.');
    try { await api('gasto_salvar', corpo); m.fechar(); toast('Custo salvo.'); telaCustos(); } catch (e) { toast(e.message); }
  };
  if (g) $('#gdel', m).onclick = async () => {
    if (!(await confirmar('Excluir este custo?', g.descricao + ' (' + brl(g.total) + '). Não dá para desfazer.'))) return;
    try { await api('gasto_excluir', { id: g.id }); m.fechar(); toast('Custo excluído.'); telaCustos(); } catch (e) { toast(e.message); }
  };
}
/* Lê o CSV do projeto (separador ;, decimal com ponto): data;tipo;categoria;descricao;fornecedor;quantidade;valor_unit;forma_pagamento;observacoes */
function gLerCsv(txt) {
  const L = String(txt || '').replace(/^﻿/, '').split(/\r?\n/).filter(x => x.trim()); if (L.length < 2) return [];
  const cab = L[0].split(';').map(x => x.trim().toLowerCase());
  return L.slice(1).map(l => { const c = l.split(';'), o = {}; cab.forEach((k, i) => o[k] = (c[i] || '').trim()); return { data: o.data, tipo: o.tipo, categoria: o.categoria, descricao: o.descricao, fornecedor: o.fornecedor, qtd: parseFloat(o.quantidade) || 1, valor_unit: parseFloat(o.valor_unit) || 0, pagamento: o.forma_pagamento, obs: o.observacoes }; }).filter(x => x.descricao);
}
function importarGastos() {
  const m = modal('<h2>Importar custos do CSV <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<p class="mut" style="font-size:13px">Escolha o arquivo <b>custos-investimentos.csv</b> do projeto (ou cole o texto abaixo). Custos que já estão aqui não são repetidos.</p>' +
    '<input type="file" id="gArq" accept=".csv,text/csv,text/plain"><label for="gTxt">Ou cole o conteúdo</label><textarea id="gTxt" rows="5" placeholder="data;tipo;categoria;descricao;..."></textarea><p id="gPrev" class="mut"></p>' +
    '<div class="acoes"><button class="btn" id="gGo" type="button" disabled>Importar</button></div>');
  let lista = [];
  const ler = t => { lista = gLerCsv(t); $('#gPrev', m).textContent = lista.length ? lista.length + ' custo(s) encontrados, somando ' + brl(lista.reduce((s, x) => s + x.qtd * x.valor_unit, 0)) + '.' : 'Não encontrei custos nesse texto.'; $('#gGo', m).disabled = !lista.length; };
  $('#gArq', m).onchange = async e => { const f = e.target.files[0]; if (f) { const t = await f.text(); $('#gTxt', m).value = t; ler(t); } };
  $('#gTxt', m).oninput = e => ler(e.target.value);
  $('#gGo', m).onclick = async () => { try { const j = await api('gastos_importar', { lista }); m.fechar(); toast(j.novos + ' importado(s), ' + j.pulados + ' já existiam.'); telaCustos(); } catch (e) { toast(e.message); } };
}
