/* PAINEL LXL | CALCULADORA de custo (as contas ficam no calc.js).
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

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


