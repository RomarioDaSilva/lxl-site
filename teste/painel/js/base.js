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

function confirmar(titulo, texto, rotulo) {
  return new Promise(res => {
    const m = modal('<h2>' + esc(titulo) + '</h2><p style="margin:4px 0 16px">' + esc(texto) + '</p>' +
      '<div class="acoes"><button class="btn r" id="cfSim" type="button">' + esc(rotulo || 'Sim, excluir') + '</button><button class="btn l" id="cfNao" type="button">Cancelar</button></div>');
    let feito = false;
    const fim = v => { if (feito) return; feito = true; res(v); };
    const fechar0 = m.fechar; m.fechar = () => { fechar0(); fim(false); };
    $('#cfSim', m).onclick = () => { fim(true); fechar0(); };
    $('#cfNao', m).onclick = () => m.fechar();
    $('#cfNao', m).focus();
  });
}

function quadro(ativo, corpo) {
  /* Cada item do menu: [endereço, chave, ícone, texto, ação da API que o perfil precisa ter para ver o item] */
  const itens = [['#/pedidos', 'pedidos', '&#128203;', 'Pedidos', 'pedidos'], ['#/novo', 'novo', '&#10133;', 'Novo', 'pedido_salvar'], ['#/orcamentos', 'orcamentos', '&#128221;', 'Orçamentos', 'orcamentos'],
    ['#/clientes', 'clientes', '&#128100;', 'Clientes', 'clientes'], ['#/estoque', 'estoque', '&#128230;', 'Estoque', 'produto_salvar'], ['#/categorias', 'categorias', '&#128193;', 'Categorias', 'categorias'],
    ['#/calculadora', 'calculadora', '&#129518;', 'Calculadora', 'parametros_salvar'], ['#/relatorios', 'relatorios', '&#128200;', 'Relatórios', 'relatorios'], ['#/ajustes', 'ajustes', '&#9881;', 'Ajustes', 'ajustes']];
  const menu = itens.filter(x => pode(x[4])).map(([h, k, ic, tx]) => '<a href="' + h + '" class="' + (ativo === k ? 'on' : '') + '"><span>' + ic + '</span>' + tx + '</a>').join('');
  app.innerHTML =
    '<div class="topo"><img src="/natal/imagens/logo-colorida.png" alt="LXL">' +
    '<nav class="menu">' + menu + '</nav>' +
    '<a class="vsite" href="../" target="_blank" rel="noopener">Ver site</a><button id="sair" type="button">Sair</button></div>' +
    '<div class="wrap">' + corpo + '</div>';
  const mn = $('.topo .menu'), at = $('.topo .menu a.on'); if (mn && at) mn.scrollLeft = at.offsetLeft - (mn.clientWidth - at.offsetWidth) / 2;
  $('#sair').onclick = async () => { await api('logout', {}); csrf = ''; location.hash = ''; iniciar(); };
}

