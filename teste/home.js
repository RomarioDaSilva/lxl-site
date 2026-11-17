/* PÁGINA INICIAL: scripts.
   Parte 1: monta os links de WhatsApp (o número do WhatsApp está logo abaixo).
   Parte 2: busca de peças nos catálogos. */
  /* NÚMERO DO WHATSAPP: 55 + DDD + número, só dígitos (hoje 5538992214206). Se trocar, troque aqui (nas 3 linhas abaixo),
     no catálogo (CONFIG, em natal/dados.js), no FAQ (faq/index.html) e no painel (EMPRESA, em painel/app.js). */
  var wa = "https://wa.me/5538992214206?text=" + encodeURIComponent("Olá! Vi o site da LXL Projetos e quero fazer um orçamento.");
  document.getElementById("cta").href = wa;
  document.getElementById("cta-topo").href = wa;
  document.getElementById("h-perso").href = "https://wa.me/5538992214206?text=" + encodeURIComponent("Olá! Quero fazer uma peça personalizada. Vou explicar a minha ideia:");

/* ===== Busca nos catálogos ===== */
(function(){
  var abrir=document.getElementById("h-abrir"), campo=document.getElementById("h-campo"), q=document.getElementById("h-q"),
      limpar=document.getElementById("h-limpar"), fechar=document.getElementById("h-fechar"), res=document.getElementById("h-res"),
      destaque=document.getElementById("h-destaque"), breve=document.getElementById("sec-breve"), passos=document.getElementById("sec-passos");
  var dados=null, carregando=null, falhou=false;
  var BRL=function(v){ return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); };
  function norm(s){ return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim(); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function termos(v){ return norm(v).split(" ").filter(Boolean).map(function(t){ return t.length>3&&/s$/.test(t)?t.slice(0,-1):t; }); }
  function carregar(){
    if(dados||carregando) return carregando;
    carregando=fetch("natal/busca-indice.json").then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(j){
      dados=j.map(function(p){ return {p:p,
        hn:" "+norm([p.sku,p.nome,p.tag,p.secao,p.top?"mais vendido":""].join(" "))+" ",
        hd:" "+norm([p.desc,p.cor].join(" "))+" "}; });
    }).catch(function(){ falhou=true; });
    return carregando;
  }
  function noNome(it,t){ return it.hn.indexOf(" "+t)>-1; }
  function naDesc(it,t){ return it.hd.indexOf(" "+t+" ")>-1||it.hd.indexOf(" "+t+"s ")>-1||it.hd.indexOf(" "+t+"es ")>-1; }
  function buscar(v){
    var ts=termos(v), out=[];
    dados.forEach(function(it,i){
      if(ts.every(function(t){return noNome(it,t)||naDesc(it,t);})) out.push({p:it.p,i:i,w:ts.every(function(t){return noNome(it,t);})?0:1});
    });
    return out.sort(function(a,b){return a.w-b.w||a.i-b.i;}).map(function(x){return x.p;});
  }
  function lista(sim){ destaque.hidden=!sim; breve.hidden=!sim; passos.hidden=!sim; res.hidden=sim; }
  function render(){
    var v=q.value, tem=norm(v).length>0;
    limpar.hidden=!v.length;
    if(!tem){ lista(true); res.innerHTML=""; return; }
    lista(false);
    if(falhou){ res.innerHTML='<div class="h-vazio"><p>Não foi possível carregar a busca agora. Você pode procurar direto no catálogo.</p><a class="btn btn-main" href="natal/">Abrir catálogo de Natal</a></div>'; return; }
    if(!dados){ res.innerHTML='<p class="h-sub">Buscando...</p>'; carregar().then(render); return; }
    var a=buscar(v);
    var tit='<h3 class="h-tit">'+(a.length?a.length+(a.length===1?" peça encontrada":" peças encontradas"):"Nada encontrado")+'</h3><p class="h-sub">Busca por &ldquo;'+esc(v.trim())+'&rdquo;</p>';
    if(a.length){
      res.innerHTML=tit+'<div class="h-grid">'+a.map(function(p){
        return '<a class="h-card" href="'+p.u+'#/p/'+p.sku+'"><div class="f"><img src="'+p.u+'imagens/'+p.foto+'.jpg" alt="'+esc(p.nome)+'" loading="lazy" onerror="this.remove()"></div>'+
          '<div class="i"><span class="c">'+p.sku+'</span><span class="n">'+esc(p.nome)+'</span>'+(p.preco!==null?'<span class="p">'+BRL(p.preco)+'</span>':'<span class="p">Consulte o valor</span>')+'<span class="k">Ver peça</span></div></a>';
      }).join("")+'</div>';
    }else{
      var msg="Olá! Procurei "+v.trim()+" no site da LXL Projetos e não encontrei. Vocês fazem?";
      res.innerHTML=tit+'<div class="h-vazio"><p>Não achamos essa peça nos catálogos. Pergunte pra gente e vamos te ajudar a encontrar o que você procura.</p><a class="btn btn-wpp" target="_blank" rel="noopener" href="https://wa.me/5538992214206?text='+encodeURIComponent(msg)+'">Perguntar no WhatsApp</a></div>';
    }
  }
  function abrirBusca(){
    abrir.hidden=true; abrir.setAttribute("aria-expanded","true"); campo.hidden=false;
    q.focus();   /* no mesmo toque: teclado no celular e cursor no computador */
    campo.scrollIntoView({behavior:"smooth",block:"center"});
    carregar();
  }
  function fecharBusca(){
    q.value=""; render(); campo.hidden=true; abrir.hidden=false; abrir.setAttribute("aria-expanded","false");
  }
  var t;
  abrir.addEventListener("click",abrirBusca);
  fechar.addEventListener("click",fecharBusca);
  limpar.addEventListener("click",function(){ q.value=""; render(); q.focus(); });
  q.addEventListener("input",function(){ clearTimeout(t); t=setTimeout(render,120); });
  q.addEventListener("keydown",function(e){
    if(e.key==="Escape"){ if(q.value){ q.value=""; render(); } else fecharBusca(); }
    if(e.key==="Enter"){ e.preventDefault(); q.blur(); }
  });
})();
