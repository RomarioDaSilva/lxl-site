/* PAINEL LXL | BASE: atalhos, listas editáveis (status, pagamento, dados da empresa), chamada à API, janelas e menu.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
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
/* Dados da empresa vêm do empresa.js da raiz do site (um lugar só). */
const EMPRESA = { fone: LXL_EMPRESA.fone, insta: '@' + LXL_EMPRESA.instagram, site: LXL_EMPRESA.site, cidade: LXL_EMPRESA.cidade };

let csrf = '', usuario = '', produtos = null;
/* Quem está logado e o que pode fazer. Vem do servidor (api.php?a=estado); o servidor também confere tudo, aqui só esconde botões. */
let perfil = 'admin', permitidas = null, logado = false;
const pode = acao => permitidas === null || permitidas.includes(acao);
const ehAdmin = () => perfil === 'admin';
/* Nomes dos tipos de acesso. Se criar um perfil novo no sessao.php, acrescente aqui. */
const PERFIS = { admin: 'Administrador', pedidos: 'Pedidos' };
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

let modalSeq = 0;
/* Janela por cima da tela. Tem barra "Voltar" que acompanha a rolagem e o botão Voltar do celular fecha a janela (sem sair do painel). */
function modal(html, semVoltar) {
  const f = document.createElement('div');
  f.className = 'mf';
  f.innerHTML = '<div class="mc">' + (semVoltar ? '' : '<div class="mvolta"><button type="button" class="btn s l" data-fechar>&larr; Voltar</button></div>') + html + '</div>';
  const id = ++modalSeq;
  let aberto = true; const hashAberto = location.hash;
  const sair = voltou => {
    if (!aberto) return; aberto = false;
    f.remove(); document.removeEventListener('keydown', tecla); window.removeEventListener('popstate', pop);
    /* tira a entrada que a janela pôs no histórico, mas só se a tela não mudou logo em seguida (senão desfaria a navegação) */
    if (!voltou) setTimeout(() => { if (history.state && history.state.lxlModal === id && location.hash === hashAberto) history.back(); }, 0);
  };
  const eTopo = () => { const todos = document.querySelectorAll('.mf'); return todos[todos.length - 1] === f; };
  const tecla = e => { if (e.key === 'Escape' && eTopo()) f.fechar(); };
  const pop = () => { if (!(history.state && history.state.lxlModal === id) && eTopo()) sair(true); };
  f.fechar = () => sair(false);
  f.addEventListener('mousedown', e => { if (e.target === f) f.fechar(); });
  document.addEventListener('keydown', tecla);
  try { history.pushState({ lxlModal: id }, ''); window.addEventListener('popstate', pop); } catch (e) { /* sem histórico: só os botões fecham */ }
  document.body.appendChild(f);
  f.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => f.fechar()));
  return f;
}

function confirmar(titulo, texto, rotulo) {
  return new Promise(res => {
    const m = modal('<h2>' + esc(titulo) + '</h2><p style="margin:4px 0 16px">' + esc(texto) + '</p>' +
      '<div class="acoes"><button class="btn r" id="cfSim" type="button">' + esc(rotulo || 'Sim, excluir') + '</button><button class="btn l" id="cfNao" type="button">Cancelar</button></div>', true);
    let feito = false;
    const fim = v => { if (feito) return; feito = true; res(v); };
    const fechar0 = m.fechar; m.fechar = () => { fechar0(); fim(false); };
    $('#cfSim', m).onclick = () => { fim(true); fechar0(); };
    $('#cfNao', m).onclick = () => m.fechar();
    $('#cfNao', m).focus();
  });
}

/* ---------- moldura do painel: menu lateral (computador), abas embaixo (celular) e barra do topo ---------- */
const IC = {
  inicio: '<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
  pedidos: '<path d="M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2M9 12h6M9 16h4"/>',
  orcamentos: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/>',
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c3 0 4.5 1.8 4.5 5"/>',
  estoque: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  categorias: '<path d="M3 6h6l2 2h10v11H3z"/>',
  calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2"/>',
  relatorios: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  mais: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  sair: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  mais1: '<path d="M12 5v14M5 12h14"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>'
};
const svgIc = (k, c) => '<svg class="ic' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + '</svg>';
/* Cada item do menu: [endereço, chave, nome, ação da API que o perfil precisa ter para ver o item] */
const MENU = [['#/inicio', 'inicio', 'Início', null], ['#/pedidos', 'pedidos', 'Pedidos', 'pedidos'], ['#/orcamentos', 'orcamentos', 'Orçamentos', 'orcamentos'],
  ['#/clientes', 'clientes', 'Clientes', 'clientes'], ['#/estoque', 'estoque', 'Estoque', 'produto_salvar'], ['#/categorias', 'categorias', 'Categorias', 'categorias'],
  ['#/calculadora', 'calculadora', 'Calculadora', 'parametros_salvar'], ['#/relatorios', 'relatorios', 'Relatórios', 'relatorios'], ['#/ajustes', 'ajustes', 'Ajustes', 'ajustes']];
const ABAS_FIXAS = ['inicio', 'pedidos', 'estoque', 'clientes'];   /* as 4 abas fixas do celular; o resto fica em "Mais" */
const SUBTELAS = /^#\/(editar|nota|orcamento-ver|orcamento-editar|orcamento-novo|novo|cliente|categoria)(\/|$)/;

function quadro(ativo, corpo) {
  const itens = MENU.filter(x => !x[3] || pode(x[3]));
  const lado = itens.map(([h, k, tx]) => '<a href="' + h + '" class="' + (ativo === k ? 'on' : '') + '">' + svgIc(k) + '<span>' + tx + '</span></a>').join('');
  const abas = itens.filter(x => ABAS_FIXAS.includes(x[1])).map(([h, k, tx]) => '<a href="' + h + '" class="' + (ativo === k ? 'on' : '') + '">' + svgIc(k) + '<span>' + tx + '</span></a>').join('') +
    '<button type="button" id="abaMais" class="' + (ativo && !ABAS_FIXAS.includes(ativo) ? 'on' : '') + '">' + svgIc('mais') + '<span>Mais</span></button>';
  let dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); dia = dia.charAt(0).toUpperCase() + dia.slice(1);
  const nome = usuario || 'Você';
  app.innerHTML =
    '<div class="app">' +
    '<aside class="lado"><a class="lado-logo" href="#/inicio" aria-label="Tela inicial"><img src="/natal/imagens/logo-branca.png" alt="LXL Projetos"></a>' +
    '<nav class="lado-menu" aria-label="Menu principal">' + lado + '</nav>' +
    '<div class="lado-pe"><a class="lado-site" href="../" target="_blank" rel="noopener">' + svgIc('site') + '<span>Ver site</span></a>' +
    '<div class="lado-user"><span class="av">' + esc(nome.charAt(0).toUpperCase()) + '</span><span class="lado-nome"><b>' + esc(nome) + '</b><small>' + esc(PERFIS[perfil] || perfil) + '</small></span>' +
    '<button id="sair" type="button" aria-label="Sair" title="Sair">' + svgIc('sair') + '</button></div></div></aside>' +
    '<div class="corpo"><header class="topo2">' +
    (SUBTELAS.test(location.hash) ? '<button class="voltar" type="button" id="voltaTela" aria-label="Voltar">' + svgIc('voltar') + '<span>Voltar</span></button>' : '') +
    '<a class="topo2-logo" href="#/inicio" aria-label="Tela inicial"><img src="/natal/imagens/logo-colorida.png" alt="LXL"></a>' +
    '<form class="busca-g" id="buscaG" role="search">' + svgIc('busca') + '<input type="search" id="buscaGq" placeholder="Buscar pedido ou cliente" aria-label="Buscar pedido, cliente ou número" enterkeyhint="search" autocomplete="off"></form>' +
    '<span class="topo2-data">' + esc(dia) + '</span>' +
    (pode('pedido_salvar') ? '<a class="btn o topo2-novo" href="#/novo">' + svgIc('mais1') + '<span>Novo pedido</span></a>' : '') +
    '</header><main class="wrap">' + corpo + '</main></div>' +
    '<nav class="abas" aria-label="Menu rápido">' + abas + '</nav></div>';
  const vt = $('#voltaTela'); if (vt) vt.onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/inicio'; };
  $('#sair').onclick = sairDoPainel;
  $('#buscaG').onsubmit = e => { e.preventDefault(); busca = $('#buscaGq').value.trim(); filtro = 'todos'; if (location.hash === '#/pedidos') telaPedidos(); else location.hash = '#/pedidos'; };
  $('#abaMais').onclick = () => {
    const resto = itens.filter(x => !ABAS_FIXAS.includes(x[1])).map(([h, k, tx]) => '<a class="mais-item' + (ativo === k ? ' on' : '') + '" href="' + h + '" data-fechar>' + svgIc(k) + '<span>' + tx + '</span></a>').join('');
    const m = modal('<h2>Mais opções</h2><div class="mais-grade">' + resto + '<a class="mais-item" href="../" target="_blank" rel="noopener">' + svgIc('site') + '<span>Ver site</span></a>' +
      '<button type="button" class="mais-item" id="sair2">' + svgIc('sair') + '<span>Sair</span></button></div>');
    $('#sair2', m).onclick = () => { m.fechar(); sairDoPainel(); };
  };
}
async function sairDoPainel() { await api('logout', {}); csrf = ''; location.hash = ''; iniciar(); }


/* ---------- rótulos ligados aos campos (acessibilidade) ----------
   As telas são montadas em texto, com o <label> logo antes (ou depois, no caso de caixa de marcar) do campo.
   Esta função liga cada rótulo ao seu campo (for/id) sempre que a tela muda: assim leitor de tela entende e tocar no texto foca o campo. */
let contaRotulo = 0, rotuloAgendado = false;
function ligarRotulos() {
  rotuloAgendado = false;
  document.querySelectorAll('label:not([for])').forEach(l => {
    if (l.querySelector('input,select,textarea')) return;   /* rótulo que já envolve o campo */
    const campo = [l.nextElementSibling, l.previousElementSibling].find(x => x && x.matches && x.matches('input,select,textarea'));
    if (!campo) return;
    if (!campo.id) campo.id = 'campo' + (++contaRotulo);
    l.htmlFor = campo.id;
  });
}
new MutationObserver(() => { if (!rotuloAgendado) { rotuloAgendado = true; requestAnimationFrame(ligarRotulos); } }).observe(document.body, { childList: true, subtree: true });
