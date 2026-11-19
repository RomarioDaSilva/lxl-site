/* PAINEL LXL | CATEGORIAS: árvore, itens de uma categoria e escolha de categorias.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

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
    $('.wrap').innerHTML = '<h1>Categorias</h1>' +
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

