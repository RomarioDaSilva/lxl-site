/* PAINEL LXL | ESTOQUE: peças, cores, importar custos e importar do catálogo.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

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

