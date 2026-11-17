/* CATÁLOGO DE NATAL: LÓGICA (montar a lista, página da peça, pedido, WhatsApp, estoque ao vivo).
   Usa CONFIG, SECOES e PRODUTOS de dados.js. Para mudar texto de produto, preço ou seção, edite o dados.js, não este arquivo. */

const brl = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const wppLink = msg => "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
const msgGeral = "Olá! Vi o catálogo de Natal da LXL Projetos e quero saber mais.";

const porSku = k => PRODUTOS.find(p=>p.sku===k);
const temCores = p => !!(p && p.coresPronta && p.coresPronta.length);
const fotosDe = p => p.fotos || [p.sku];
const foto = (k,nome,lazy) => '<img src="imagens/'+k+'.jpg" alt="'+nome+'"'+(lazy?' loading="lazy"':'')+' decoding="async" onerror="this.remove()">';
const msgProduto = p => typeof p.preco==="number"
  ? "Olá! Vi o catálogo de Natal e quero o "+p.nome+" ("+p.sku+"). Pode me passar os detalhes?"
  : "Olá! Vi o catálogo de Natal e quero saber o valor do "+p.nome+" ("+p.sku+").";

function precoHTML(p){
  return typeof p.preco==="number"
    ? '<div class="preco">'+(p.antes?'<s>'+brl(p.antes)+'</s>':'')+brl(p.preco)+'</div>'
    : '<div class="preco consulte">Consulte o valor</div>';
}
function limiteHTML(){
  var L=CONFIG.limitePedido; if(!L||!L.ate) return "";
  var f=new Date(L.ate+"T23:59:59"); if(new Date()>f) return "";
  return '<span class="limite"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'+L.texto+'</span>';
}
function entregaHTML(p, card){
  const dots = p.coresPronta&&p.coresPronta.length ? '<span class="cores-pronta" aria-label="Cores em pronta entrega">'+p.coresPronta.map(c=>'<i title="'+c.n.replace(/"/g,"")+'" style="background:'+c.h+'"></i>').join('')+'</span>' : '';
  const pronta = p.estoque>0;
  const txt = pronta ? (card?'':'Pronta entrega: ')+p.estoque+(p.estoque>1?' disponíveis':' disponível') : (p.entrega||'');
  return txt?'<span class="entrega'+(pronta||/^pronta/i.test(p.entrega||'')?' pronta':'')+'">'+txt+'</span>'+dots:'';
}

/* Card da lista: só código, título, prazo, valor e botão. Tocar no card abre a página do produto. */
function cardHTML(p){
  const temPreco = typeof p.preco==="number";
  return '<a class="card-link" href="#/p/'+p.sku+'">'+
    '<div class="foto">'+(p.tag?'<span class="tag">'+p.tag+'</span>':'')+(p.top?'<span class="tag top">Mais vendido</span>':'')+'<span>Foto em breve</span>'+foto(fotosDe(p)[0],p.nome,true)+'</div>'+
    '<div class="info"><span class="cod">'+p.sku+'</span><h3>'+p.nome+'</h3>'+entregaHTML(p,true)+precoHTML(p)+'</div></a>'+
    '<button type="button" class="btn btn-wpp btn-add" data-add="'+p.sku+'">Adicionar ao pedido</button>';
}

let lastY = 0, veioDaLista = false;

function montar(){
  const nav = document.getElementById("nav");
  const cont = document.getElementById("secoes");
  nav.querySelectorAll("a:not(.nav-busca)").forEach(function(a){a.remove();});
  cont.innerHTML = "";

  const CORES=[["#FFF1D6","#C9A227"],["#E6F4EA","#2E7D55"],["#FDE9EA","#B3202A"],["#E7F0FA","#3B7DB8"],["#FFEFE2","#D9772B"],["#EEF8F0","#1F5B3F"],["#F5EBF8","#8E5BA8"],["#FFF1D6","#C9A227"]];
  let _ci=0;
  SECOES.forEach(s=>{
    const itens = PRODUTOS.filter(p=>p.secao===s.id);
    if(!itens.length) return;
    nav.insertAdjacentHTML("beforeend",'<a href="#'+s.id+'">'+s.titulo+'</a>');
    const sec = document.createElement("section");
    sec.id = s.id;
    const cc=CORES[_ci++%CORES.length]; sec.style.setProperty("--tint",cc[0]); sec.style.setProperty("--acc",cc[1]);
    sec.innerHTML = '<div class="sec-head"><h2>'+s.titulo+'</h2><p>'+s.sub+'</p></div><div class="grid"></div>';
    const grid = sec.querySelector(".grid");
    itens.forEach(p=>{
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = cardHTML(p);
      grid.appendChild(card);
    });
    cont.appendChild(sec);
  });
  nav.insertAdjacentHTML("beforeend",'<a href="#como-pedir">Como pedir</a><a href="../faq/">Dúvidas</a>');

  ["cta-rodape"].forEach(id=>{
    const a = document.getElementById(id);
    a.href = wppLink(msgGeral);
    a.target = "_blank";
    a.rel = "noopener";
  });

  if(CONFIG.mes){
    document.getElementById("selo-mes").innerHTML = '<span class="selo-mes">Preços especiais de '+CONFIG.mes+'</span>';
  }
  if(CONFIG.prazo){
    document.getElementById("prazo").innerHTML = '<span class="prazo">'+CONFIG.prazo+'</span>';
    document.getElementById("rodape-prazo").textContent = CONFIG.prazo;
  }
}

/* Página do produto (endereço #/p/CODIGO) */
function detalheHTML(p){
  const fs = fotosDe(p);
  const temPreco = typeof p.preco==="number";
  const pronta = temCores(p) ? '<span class="cor-pronta">Em pronta entrega, escolha a cor:</span><div class="cor-ops" id="cor-ops">'+p.coresPronta.map(c=>'<button type="button" class="cor-op" data-cor="'+esc2(c.n)+'"><i style="background:'+c.h+'"></i>'+c.n.replace(/[<>&"]/g,"")+' <small>('+c.q+')</small></button>').join("")+'</div>' : '';
  const cores = (p.cor ? p.cor+'. Outras cores sob consulta.' : (temCores(p) ? 'Outras cores sob consulta.' : 'Consulte as cores disponíveis.'));
  const medidas = p.medidas ? (/^[0-9,. ]+x/.test(p.medidas) ? p.medidas+' (comprimento x largura x altura)' : p.medidas) : '<a class="link-med" target="_blank" rel="noopener" href="'+wppLink("Olá! Quero saber as medidas da peça "+p.nome+" ("+p.sku+").")+'">Consultar as medidas pelo WhatsApp</a>';
  const rel = PRODUTOS.filter(x=>x.secao===p.secao && x.sku!==p.sku).slice(0,4);
  return '<button class="voltar" type="button" id="voltar">&larr; Voltar</button>'+
  '<div class="det">'+
    '<div class="gal">'+
      '<div class="foto" id="foto-grande">'+(p.tag?'<span class="tag">'+p.tag+'</span>':'')+(p.top?'<span class="tag top">Mais vendido</span>':'')+'<span>Foto em breve</span>'+foto(fs[0],p.nome,false)+'</div>'+
      (fs.length>1?'<div class="thumbs">'+fs.map((k,i)=>'<button type="button" data-foto="'+k+'" class="'+(i===0?'on':'')+'" aria-label="Foto '+(i+1)+'">'+foto(k,p.nome,false)+'</button>').join('')+'</div>':'')+
    '</div>'+
    '<div class="det-info">'+
      '<span class="cod">'+p.sku+'</span><h1>'+p.nome+'</h1>'+entregaHTML(p)+limiteHTML()+precoHTML(p)+pronta+
      '<button type="button" class="btn btn-wpp btn-add" data-add="'+p.sku+'">Adicionar ao pedido</button>'+
      '<button type="button" class="btn btn-comp" data-comp="'+p.sku+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>Compartilhar</button>'+
      '<a class="link-wpp" target="_blank" rel="noopener" href="'+wppLink(msgProduto(p))+'">'+(temPreco?'Pedir só este pelo WhatsApp':'Perguntar o valor pelo WhatsApp')+'</a>'+
      (temPreco&&CONFIG.mes?'<div class="aviso-mes">Preço especial válido para '+CONFIG.mes+'. Em dezembro os valores mudam.</div>':'')+
      '<div class="bloco"><h2>Sobre a peça</h2><p>'+p.desc+'</p></div>'+
      '<div class="bloco"><h2>Detalhes</h2><dl class="ficha">'+
        '<div><dt>Medidas</dt><dd>'+medidas+'</dd></div>'+
        '<div><dt>Material</dt><dd>'+(p.material||'Impressão 3D em PLA. Outros materiais sob consulta.')+'</dd></div>'+
        '<div><dt>Cores</dt><dd>'+cores+'</dd></div>'+
        '<div><dt>Prazo</dt><dd>'+(p.entrega||'Combinado no pedido')+(CONFIG.prazo?'. '+CONFIG.prazo:'')+'</dd></div>'+
        '<div><dt>Pagamento</dt><dd>Pix, cartão e dinheiro</dd></div>'+
      '</dl></div>'+
      '<p class="nota">'+(temPreco?'Valor para impressão em PLA, em cor simples. ':'')+'Peças com várias cores ou em outros materiais podem ter valor diferente. Confirme no WhatsApp.</p>'+
    '</div>'+
    (rel.length?'<div class="relac"><h2>Veja também</h2><div class="grid">'+rel.map(x=>'<article class="card">'+cardHTML(x)+'</article>').join('')+'</div></div>':'')+
  '</div>';
}

function rota(){
  const m = location.hash.match(/^#\/p\/([\w-]+)/);
  const lista = [document.querySelector(".hero"),document.getElementById("nav"),document.querySelector("main:not(#detalhe)")];
  const det = document.getElementById("detalhe");
  const p = m && porSku(m[1]);
  if(p){
    lista.forEach(e=>e.hidden=true);
    det.hidden=false;
    det.innerHTML = detalheHTML(p);
    document.title = p.nome+" | LXL Projetos";
    window.scrollTo(0,0);
  }else{
    const estava = !det.hidden;
    det.hidden=true; det.innerHTML="";
    lista.forEach(e=>e.hidden=false);
    document.title = "Catálogo de Natal 2026 | LXL Projetos";
    if(estava) window.scrollTo(0,lastY);
    else if(location.hash.length>1){ const alvo=document.querySelector(location.hash); if(alvo) alvo.scrollIntoView(); }
  }
}
/* ===== Pedido (carrinho) ===== */
/* O pedido do cliente fica guardado no celular dele com este nome. Se algum dia mudar o formato do pedido,
   troque v1 por v2 para limpar os pedidos antigos que ficaram salvos nos aparelhos. */
const CHAVE = "lxl_natal_pedido_v1";
let pedido = {};      /* {SKU: quantidade} */
let dadosCliente = {nome:"", obs:""};
try{
  const salvo = JSON.parse(localStorage.getItem(CHAVE)||"{}");
  Object.keys(salvo.itens||{}).forEach(k=>{ if(porSku(k.split("|")[0]) && salvo.itens[k]>0) pedido[k]=Math.min(99,salvo.itens[k]|0); });
  if(salvo.cliente) dadosCliente = {nome:String(salvo.cliente.nome||""), obs:String(salvo.cliente.obs||"")};
}catch(e){}
function salvarPedido(){ try{ localStorage.setItem(CHAVE, JSON.stringify({itens:pedido,cliente:dadosCliente})); }catch(e){} }
const itensPedido = () => Object.keys(pedido).map(k=>{ const a=k.split("|"); return {p:porSku(a[0]),q:pedido[k],cor:a[1]||"",key:k}; }).filter(x=>x.p);
const qtdTotal = () => itensPedido().reduce((a,x)=>a+x.q,0);
function totais(){
  let total=0, combinar=0;
  itensPedido().forEach(({p,q})=>{ if(typeof p.preco==="number") total+=p.preco*q; else combinar++; });
  return {total,combinar};
}
function atualizarBarra(){
  const b = document.getElementById("barra-pedido");
  const n = qtdTotal();
  document.body.classList.toggle("tem-pedido", n>0);
  if(!n){ b.hidden=true; return; }
  const t = totais();
  b.innerHTML = '<span><span class="qtd">'+n+'</span> <span class="tot">'+(n===1?'item':'itens')+(t.total>0?' · '+brl(t.total):'')+'</span></span><span class="ver">Ver meu pedido</span>';
  b.hidden=false;
}
function toast(msg){
  document.querySelector(".toast")?.remove();
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),1800);
}
function adicionar(sku,cor){
  const p = porSku(sku); if(!p) return;
  const k = cor ? sku+"|"+cor : sku;
  pedido[k] = Math.min(99,(pedido[k]||0)+1);
  salvarPedido(); atualizarBarra();
  toast("Adicionado ao pedido: "+p.nome+(cor?" ("+cor+")":""));
}
function escolherCor(sku){
  const p = porSku(sku); if(!p) return;
  let f = document.getElementById("cor-fundo");
  if(!f){ f=document.createElement("div"); f.id="cor-fundo"; document.body.appendChild(f); }
  f.innerHTML = '<div class="cor-folha" role="dialog" aria-modal="true" aria-label="Escolha a cor"><h3>Qual cor você quer?</h3><p>'+esc2(p.nome)+'</p><div class="cor-ops">'+
    p.coresPronta.map(c=>'<button type="button" class="cor-op" data-pick="'+esc2(c.n)+'" data-sku="'+sku+'"><i style="background:'+c.h+'"></i>'+c.n.replace(/[<>&"]/g,"")+' <small>('+c.q+')</small></button>').join("")+
    '</div><button type="button" class="cor-cancela" data-cor-fechar>Cancelar</button></div>';
  f.hidden = false;
}
function fecharCor(){ const f=document.getElementById("cor-fundo"); if(f){ f.hidden=true; f.innerHTML=""; } }
function mensagemPedido(){
  const linhas = itensPedido().map(({p,q,cor},i)=>{
    const tem = typeof p.preco==="number";
    return (i+1)+") "+q+"x "+p.nome+(cor?" ["+cor+"]":"")+" ("+p.sku+"): "+(tem ? brl(p.preco)+" cada = "+brl(p.preco*q) : "valor a combinar");
  });
  const t = totais();
  let m = "Olá! Quero fazer um pedido do Catálogo de Natal 2026:\n\n"+linhas.join("\n")+"\n\n";
  m += "Total: "+brl(t.total)+(t.combinar?" (mais "+t.combinar+(t.combinar>1?" itens":" item")+" com valor a combinar)":"")+"\n";
  if(dadosCliente.nome.trim()) m += "Nome: "+dadosCliente.nome.trim()+"\n";
  if(dadosCliente.obs.trim()) m += "Observações: "+dadosCliente.obs.trim()+"\n";
  m += "\nPode confirmar a disponibilidade e o prazo?";
  return m;
}
const esc2 = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
function abrirPedido(){
  const f = document.getElementById("ped-fundo");
  const its = itensPedido();
  let corpo;
  if(!its.length){
    corpo = '<div class="ped-vazio">Seu pedido está vazio.<br>Toque em "Adicionar ao pedido" nas peças que você quiser.</div>';
  }else{
    const t = totais();
    corpo = its.map(({p,q,cor,key})=>{
      const tem = typeof p.preco==="number";
      return '<div class="ped-item"><div><b>'+esc2(p.nome)+'</b><small>'+p.sku+(cor?' · Cor: '+esc2(cor):'')+(tem?' · '+brl(p.preco)+' cada':' · valor a combinar')+'</small>'+
        '<div class="ped-qtd"><button type="button" data-menos="'+esc2(key)+'" aria-label="Diminuir">−</button><span>'+q+'</span><button type="button" data-mais="'+esc2(key)+'" aria-label="Aumentar">+</button><button type="button" class="ped-rem" data-rem="'+esc2(key)+'">Remover</button></div></div>'+
        '<div class="sub'+(tem?'':' combinar')+'">'+(tem?brl(p.preco*q):'A combinar')+'</div></div>';
    }).join('') +
    '<div class="ped-total"><span>Total</span><span>'+brl(t.total)+'</span></div>'+
    (t.combinar?'<p class="ped-aviso">'+t.combinar+(t.combinar>1?' itens estão':' item está')+' com valor a combinar e não entra'+(t.combinar>1?'m':'')+' no total.</p>':'')+
    '<p class="ped-aviso">Preços especiais de '+(CONFIG.mes||'novembro')+'. O valor final e o prazo são confirmados no WhatsApp.</p>'+
    '<label for="ped-nome">Seu nome (opcional)</label><input id="ped-nome" type="text" autocomplete="name" value="'+esc2(dadosCliente.nome)+'">'+
    '<label for="ped-obs">Observações (opcional)</label><textarea id="ped-obs" placeholder="Cores, quantidade para lembrancinhas, data de entrega...">'+esc2(dadosCliente.obs)+'</textarea>';
  }
  f.innerHTML = '<div class="ped" role="dialog" aria-modal="true" aria-label="Meu pedido"><div class="ped-topo"><h2>Meu pedido</h2><button type="button" class="ped-fechar" data-fechar aria-label="Fechar">&times;</button></div>'+
    '<div class="ped-corpo">'+corpo+'</div>'+
    '<div class="ped-pe">'+(its.length?'<a class="btn btn-wpp" id="ped-enviar" target="_blank" rel="noopener" href="'+wppLink(mensagemPedido())+'">Enviar pedido pelo WhatsApp</a><button type="button" class="ped-limpar" data-limpar>Limpar pedido</button>':'<button type="button" class="btn btn-wpp" data-fechar>Escolher peças</button>')+'</div></div>';
  f.hidden = false;
  document.body.style.overflow = "hidden";
}
function fecharPedido(){
  const f = document.getElementById("ped-fundo");
  f.hidden = true; f.innerHTML = ""; document.body.style.overflow = "";
}
function mudar(sku,delta){
  const q = (pedido[sku]||0)+delta;
  if(q<=0) delete pedido[sku]; else pedido[sku]=Math.min(99,q);
  salvarPedido(); atualizarBarra(); abrirPedido();
}
document.addEventListener("click", e=>{
  const add = e.target.closest("[data-add]");
  if(add){
    const sku=add.dataset.add, p=porSku(sku);
    if(temCores(p)){
      const sel=add.closest(".det-info") && add.closest(".det-info").querySelector(".cor-op.on");
      if(sel){ adicionar(sku, sel.dataset.cor); return; }
      escolherCor(sku); return;
    }
    adicionar(sku); return;
  }
  const op=e.target.closest(".cor-ops .cor-op[data-cor]");
  if(op){ op.parentNode.querySelectorAll(".cor-op").forEach(b=>b.classList.toggle("on",b===op&&!op.classList.contains("on"))); return; }
  const pk=e.target.closest("[data-pick]");
  if(pk){ adicionar(pk.dataset.sku, pk.dataset.pick); fecharCor(); return; }
  if(e.target.closest("[data-cor-fechar]") || e.target===document.getElementById("cor-fundo")){ fecharCor(); return; }
  if(e.target.closest("#barra-pedido")){ abrirPedido(); return; }
  if(e.target.closest("[data-fechar]") || e.target===document.getElementById("ped-fundo")){ fecharPedido(); return; }
  const mais=e.target.closest("[data-mais]"); if(mais){ mudar(mais.dataset.mais,1); return; }
  const menos=e.target.closest("[data-menos]"); if(menos){ mudar(menos.dataset.menos,-1); return; }
  const rem=e.target.closest("[data-rem]"); if(rem){ delete pedido[rem.dataset.rem]; salvarPedido(); atualizarBarra(); abrirPedido(); return; }
  if(e.target.closest("[data-limpar]")){ if(confirm("Limpar todo o pedido?")){ pedido={}; salvarPedido(); atualizarBarra(); fecharPedido(); } return; }
});
document.addEventListener("input", e=>{
  if(e.target.id==="ped-nome" || e.target.id==="ped-obs"){
    dadosCliente.nome = document.getElementById("ped-nome").value;
    dadosCliente.obs = document.getElementById("ped-obs").value;
    salvarPedido();
    const a = document.getElementById("ped-enviar"); if(a) a.href = wppLink(mensagemPedido());
  }
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !document.getElementById("ped-fundo").hidden) fecharPedido(); });
atualizarBarra();

/* ===== Compartilhar produto ===== */
function linkProduto(sku){
  return new URL("p/"+sku+"/", location.href.split("#")[0]).href;
}
async function copiar(texto){
  try{ await navigator.clipboard.writeText(texto); return true; }catch(e){}
  try{
    const t=document.createElement("textarea"); t.value=texto; t.style.cssText="position:fixed;opacity:0"; document.body.appendChild(t);
    t.select(); const ok=document.execCommand("copy"); t.remove(); return ok;
  }catch(e){ return false; }
}
async function compartilhar(sku){
  const p = porSku(sku); if(!p) return;
  const url = linkProduto(sku);
  const texto = p.nome;
  if(navigator.share){
    try{ await navigator.share({title:p.nome, text:texto, url}); return; }
    catch(e){ if(e && e.name==="AbortError") return; }
  }
  if(await copiar(url)) toast("Link copiado! Cole na conversa para enviar.");
  else window.prompt("Copie o link do produto:", url);
}
document.addEventListener("click", e=>{
  const c = e.target.closest("[data-comp]");
  if(c) compartilhar(c.dataset.comp);
});

montar();
window.addEventListener("hashchange", rota);
rota();

/* Estoque e preços ao vivo: o painel da LXL informa quais peças estão em pronta entrega e o preço de cada uma.
   Se o painel não responder, tudo continua como "Sob encomenda". */
/* Se mudar a pasta do painel, ajuste o caminho "../painel/estoque.php" abaixo. */
fetch("../painel/estoque.php",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{
  if(!d||!d.itens) return;
  let mudou=false;
  PRODUTOS.forEach(p=>{
    const n=d.itens[p.sku], v=d.precos&&d.precos[p.sku];
    if(n>0){ p.estoque=n; p.entrega="Pronta entrega"; mudou=true; }
    if(v>0 && v!==p.preco){ p.preco=v; mudou=true; }
    const cs=d.cores&&d.cores[p.sku];
    p.coresPronta = Array.isArray(cs) ? cs.filter(c=>c&&c.q>0).map(c=>({n:String(c.n||""),h:/^#[0-9a-fA-F]{6}$/.test(c.h)?c.h:"#cccccc",q:c.q|0})) : null;
    if(p.coresPronta&&p.coresPronta.length) mudou=true;
  });
  if(mudou){ const y=window.scrollY; montar(); rota(); if(document.getElementById("detalhe").hidden) window.scrollTo(0,y); }
}).catch(()=>{});

document.addEventListener("click", e=>{
  /* guarda a posição da lista para voltar no mesmo ponto */
  if(e.target.closest(".card-link") && document.getElementById("detalhe").hidden) { lastY = window.scrollY; veioDaLista = true; }

  if(e.target.closest("#voltar")){
    if(veioDaLista){ veioDaLista=false; history.back(); } else location.hash="";
    return;
  }
  const th = e.target.closest(".thumbs button");
  if(th){
    document.querySelectorAll(".thumbs button").forEach(b=>b.classList.toggle("on",b===th));
    const f = document.getElementById("foto-grande");
    f.querySelector("img")?.remove();
    f.insertAdjacentHTML("beforeend", foto(th.dataset.foto, "", false));
    return;
  }
  /* Tocar na foto grande da página abre em tela cheia. Tocar de novo fecha. */
  const img = e.target.closest("#foto-grande img");
  if(!img) return;
  const z = document.createElement("div");
  z.className = "zoom";
  z.innerHTML = '<img src="'+img.src+'" alt="'+(img.alt||"")+'"><span>Toque para fechar</span>';
  const fechar = ()=>{ z.remove(); document.removeEventListener("keydown", esc); };
  const esc = ev=>{ if(ev.key==="Escape") fechar(); };
  z.addEventListener("click", fechar);
  document.addEventListener("keydown", esc);
  document.body.appendChild(z);
});
