/* CATÁLOGO DE NATAL: caixa de busca de peças. */
/* ===== Busca de peças ===== */
(function(){
  var q=document.getElementById("q"), limpar=document.getElementById("q-limpar"),
      res=document.getElementById("resultados"), secoes=document.getElementById("secoes"),
      como=document.getElementById("como-pedir");
  if(!q||!res) return;
  function norm(s){ return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim(); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function tituloSecao(id){ for(var i=0;i<SECOES.length;i++) if(SECOES[i].id===id) return SECOES[i].titulo; return ""; }
  var indice;
  function montarIndice(){
    indice=PRODUTOS.map(function(p){
      return {p:p,
        hn:" "+norm([p.sku,p.nome,p.tag,tituloSecao(p.secao),p.top?"mais vendido":""].join(" "))+" ",
        hd:" "+norm([p.desc,p.cor].join(" "))+" "};
    });
  }
  montarIndice();
  window.lxlReindexar=montarIndice;   /* o catalogo.js chama isto quando as categorias do painel mudam as seções */
  function termos(v){
    return norm(v).split(" ").filter(Boolean).map(function(t){ return t.length>3 && /s$/.test(t) ? t.slice(0,-1) : t; });
  }
  /* no nome/código vale o começo da palavra (digitando "arv" já acha "árvore"); na descrição só a palavra inteira */
  function noNome(it,t){ return it.hn.indexOf(" "+t)>-1; }
  function naDesc(it,t){ return it.hd.indexOf(" "+t+" ")>-1 || it.hd.indexOf(" "+t+"s ")>-1 || it.hd.indexOf(" "+t+"es ")>-1; }
  function buscar(v){
    var ts=termos(v); if(!ts.length) return [];
    var out=[];
    indice.forEach(function(it,i){
      var ok=ts.every(function(t){ return noNome(it,t)||naDesc(it,t); });
      if(ok) out.push({p:it.p,i:i,w:ts.every(function(t){return noNome(it,t);})?0:1});
    });
    return out.sort(function(a,b){return a.w-b.w||a.i-b.i;}).map(function(x){return x.p;});
  }
  function mostrarListas(sim){ secoes.hidden=!sim; if(como) como.hidden=!sim; res.hidden=sim; }
  function render(){
    var v=q.value, tem=norm(v).length>0;
    limpar.hidden=!v.length;
    if(!tem){ mostrarListas(true); res.innerHTML=""; return; }
    var achou=buscar(v);
    mostrarListas(false);
    var tit='<div class="sec-head"><h2>'+(achou.length? achou.length+(achou.length===1?" peça encontrada":" peças encontradas") : "Nada encontrado")+'</h2><p>Busca por &ldquo;'+esc(v.trim())+'&rdquo;</p></div>';
    if(achou.length){
      res.innerHTML=tit+'<div class="grid"></div>';
      var g=res.querySelector(".grid");
      achou.forEach(function(p){ var c=document.createElement("article"); c.className="card"; c.innerHTML=cardHTML(p); g.appendChild(c); });
    }else{
      var msg="Olá! Procurei "+v.trim()+" no catálogo de Natal da LXL Projetos e não encontrei. Vocês fazem?";
      var link="https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent(msg);
      var sug=SECOES.filter(function(s){return PRODUTOS.some(function(p){return p.secao===s.id;});}).map(function(s){return '<button type="button" data-sec="'+s.id+'">'+esc(s.titulo)+'</button>';}).join("");
      res.innerHTML=tit+'<div class="res-vazio"><p>Não achamos essa peça no catálogo. Pergunte pra gente e vamos te ajudar a encontrar o que você procura.</p>'+
        '<a class="btn btn-wpp" target="_blank" rel="noopener" href="'+link+'">Perguntar no WhatsApp</a>'+
        '<div class="res-sug">'+sug+'</div></div>';
    }
  }
  var t;
  q.addEventListener("input",function(){ clearTimeout(t); t=setTimeout(render,120); });
  q.addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); q.blur(); } });
  var area=document.getElementById("busca"), campo=document.getElementById("busca-campo"), fechar=document.getElementById("fechar-busca");
  function abrirBusca(){
    area.classList.add("aberta"); campo.hidden=false;
    q.focus();   /* no mesmo toque: abre o teclado no celular e o cursor no computador */
    area.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function fecharBusca(){
    q.value=""; render(); campo.hidden=true; area.classList.remove("aberta");
  }
  fechar.addEventListener("click",fecharBusca);
  limpar.addEventListener("click",function(){ q.value=""; render(); q.focus(); });
  q.addEventListener("keydown",function(e){ if(e.key==="Escape"){ if(q.value){ q.value=""; render(); } else fecharBusca(); } });
  res.addEventListener("click",function(e){
    var b=e.target.closest("[data-sec]"); if(!b) return;
    fecharBusca();
    var alvo=document.getElementById(b.dataset.sec); if(alvo) alvo.scrollIntoView({behavior:"smooth"});
  });
  /* atalho "Buscar" na barra de navegação */
  var nav=document.getElementById("nav");
  if(nav){
    nav.insertAdjacentHTML("afterbegin",'<a href="#busca" class="nav-busca" aria-label="Buscar peça"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>&nbsp;Buscar</a>');
    nav.addEventListener("click",function(e){
      if(e.target.closest(".nav-busca")){ e.preventDefault(); abrirBusca(); }
    });
  }
})();
