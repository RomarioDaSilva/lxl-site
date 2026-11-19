/* NOVO VISUAL (teste): scripts da página inicial nova.
   1) WhatsApp  2) menu do celular  3) carrossel de destaques  4) "Os mais pedidos"  5) busca  6) menu marca a seção em que você está.
   Para trocar as peças dos "mais pedidos", edite a lista DESTAQUES logo abaixo (código da peça e o selo). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var BRL = function (v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
  var numero = (window.LXL_EMPRESA || {}).whatsapp || '';
  var wa = function (txt) { return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(txt); };

  /* 1) WhatsApp */
  var geral = wa('Olá! Vi o site da LXL Projetos e quero fazer um orçamento.');
  ['wa-topo', 'wa-contato', 'wa-rodape'].forEach(function (id) { var a = document.getElementById(id); if (a) a.href = geral; });
  $('#cat-perso').href = wa('Olá! Quero fazer uma peça personalizada. Vou explicar a minha ideia:');

  /* 2) menu do celular */
  var nav = $('#nav'), bMenu = $('#b-menu');
  bMenu.onclick = function () { var a = nav.classList.toggle('aberto'); bMenu.setAttribute('aria-expanded', a); };
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('aberto'); bMenu.setAttribute('aria-expanded', 'false'); }); });

  /* 3) carrossel de destaques */
  var slides = $$('.slide'), pontos = $('#pontos'), atual = 0, timer = null;
  slides.forEach(function (s, i) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Destaque ' + (i + 1));
    b.onclick = function () { ir(i, true); }; pontos.appendChild(b);
  });
  function ir(i, manual) {
    atual = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === atual; s.classList.toggle('on', on); s.setAttribute('aria-hidden', on ? 'false' : 'true');
      $$('a,button', s).forEach(function (el) { el.tabIndex = on ? 0 : -1; });
      var im = $('img', s); if (on && im) im.loading = 'eager';
    });
    $$('button', pontos).forEach(function (b, k) { b.setAttribute('aria-selected', k === atual ? 'true' : 'false'); });
    if (manual) parar();
  }
  function tocar() { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; parar(); timer = setInterval(function () { ir(atual + 1); }, 6500); }
  function parar() { if (timer) { clearInterval(timer); timer = null; } }
  $('#h-ant').onclick = function () { ir(atual - 1, true); };
  $('#h-prox').onclick = function () { ir(atual + 1, true); };
  var hero = $('#hero');
  hero.addEventListener('mouseenter', parar); hero.addEventListener('mouseleave', tocar);
  hero.addEventListener('focusin', parar);
  var x0 = null;   /* arrastar com o dedo */
  hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; parar(); }, { passive: true });
  hero.addEventListener('touchend', function (e) { if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 50) ir(atual + (d < 0 ? 1 : -1), true); }, { passive: true });
  ir(0); tocar();

  /* 4) os mais pedidos: peças que aparecem em destaque (código da peça + selo). Preços vêm do catálogo e do painel. */
  var DESTAQUES = [['0003', 'Mais pedido'], ['0007', 'Destaque'], ['0062', 'Novo'], ['0063', 'Novo'], ['0006', 'Mais pedido'], ['0054', 'Fé'], ['0055', 'Divertido'], ['0001', 'Natal']];
  var CATALOGOS = ['natal', 'religioso', 'chaveiros'], indice = null, precos = {};
  var pegar = function (c) { return fetch('../' + c + '/busca-indice.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { return []; }); };
  var tudo = Promise.all(CATALOGOS.map(pegar)).then(function (rs) { indice = [].concat.apply([], rs); });
  var painel = fetch('../painel/estoque.php', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && d.precos) precos = d.precos; }).catch(function () {});
  var preco = function (p) { return precos[p.sku] > 0 ? precos[p.sku] : p.preco; };
  var foto = function (p, mini) { return '../' + p.c + '/imagens/' + (mini ? 'mini/' : '') + p.foto + '.jpg'; };
  var link = function (p) { return '../' + p.u.replace(/\/$/, '') + '/#/p/' + p.sku; };
  var icWpp = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8z"/><path d="M9 9c.3 2.2 2.4 4.4 5 5.2l1.2-1.2-1.8-1-.8.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.8-1-1.8z"/></svg>';
  Promise.all([tudo, painel]).then(function () {
    var por = {}; indice.forEach(function (p) { por[p.sku] = p; });
    var html = DESTAQUES.map(function (d) {
      var p = por[d[0]]; if (!p) return '';
      var msg = 'Olá! Quero a peça ' + p.nome + ' (código ' + p.sku + '). Pode me passar o prazo?';
      return '<article class="card"><a class="card-foto" href="' + esc(link(p)) + '"><span class="card-selo' + (p.c !== 'natal' ? ' verde' : '') + '">' + esc(d[1]) + '</span>' +
        '<img src="' + esc(foto(p, false)) + '" alt="' + esc(p.nome) + '" loading="lazy" decoding="async" width="750" height="750"></a>' +
        '<div class="card-corpo"><h3><a href="' + esc(link(p)) + '">' + esc(p.nome) + '</a></h3><span class="card-sec">' + esc(p.secao) + ' &middot; ' + esc(p.entrega || '') + '</span>' +
        '<span class="card-preco">' + BRL(preco(p)) + '</span><a class="card-btn" target="_blank" rel="noopener" href="' + esc(wa(msg)) + '">' + icWpp + 'Pedir no WhatsApp</a></div></article>';
    }).join('');
    $('#trilho').innerHTML = html || '<p class="carregando">Não consegui carregar as peças agora. Abra um catálogo no menu acima.</p>';
  });
  function rolar(d) { var t = $('#trilho'), c = $('.card', t); t.scrollBy({ left: d * (c ? c.offsetWidth + 16 : 260), behavior: 'smooth' }); }
  $('#c-ant').onclick = function () { rolar(-1); }; $('#c-prox').onclick = function () { rolar(1); };

  /* 5) busca */
  var busca = $('#busca'), q = $('#q'), res = $('#res'), bAbrir = $('#b-abrir');
  function abrir() { busca.hidden = false; bAbrir.setAttribute('aria-expanded', 'true'); q.focus(); }
  function fechar() { busca.hidden = true; bAbrir.setAttribute('aria-expanded', 'false'); q.value = ''; res.innerHTML = ''; bAbrir.focus(); }
  bAbrir.onclick = function () { busca.hidden ? abrir() : fechar(); };
  $('#b-fechar').onclick = fechar;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !busca.hidden) fechar(); });
  q.addEventListener('input', function () {
    var t = norm(q.value).split(' ').filter(Boolean);
    if (!t.length) { res.innerHTML = ''; return; }
    tudo.then(function () {
      var achou = indice.filter(function (p) { var h = ' ' + norm([p.sku, p.antigo, p.nome, p.secao, p.tag, p.desc].join(' ')) + ' '; return t.every(function (x) { return h.indexOf(x.length > 3 && /s$/.test(x) ? x.slice(0, -1) : x) > -1; }); }).slice(0, 8);
      res.innerHTML = achou.length ? achou.map(function (p) {
        return '<a class="res-item" href="' + esc(link(p)) + '"><img src="' + esc(foto(p, true)) + '" alt="" loading="lazy" width="52" height="52"><span><b>' + esc(p.nome) + '</b><small>' + esc(p.secao) + ' &middot; ' + esc(p.sku) + '</small></span><span class="pr">' + BRL(preco(p)) + '</span></a>';
      }).join('') : '<p class="res-vazio">Nenhuma peça com esse nome. Tente outra palavra ou chame no WhatsApp.</p>';
    });
  });

  /* 6) menu marca a seção em que você está */
  if ('IntersectionObserver' in window) {
    var mapa = { inicio: 0, catalogos: 1, 'mais-pedidos': 2, 'como-pedir': 3, contato: 4 }, links = $$('a', nav);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var i = mapa[e.target.id]; links.forEach(function (a, k) { a.classList.toggle('on', k === i); }); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(mapa).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }
})();
