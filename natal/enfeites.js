/* CATÁLOGO DE NATAL: enfeites do topo (neve e pisca-pisca). Só decoração, não afeta pedido nem produtos. */
/* enfeites do topo: neve e pisca-pisca (leves, só no cabeçalho) */
(function(){
  var n=document.getElementById("neve"),l=document.getElementById("luzes");
  if(!n||!l)return;
  var cel=window.matchMedia&&matchMedia("(max-width:639px)").matches,q=cel?12:22,h="",i;
  for(i=0;i<q;i++){
    h+='<i style="left:'+(Math.random()*100).toFixed(1)+'%;--s:'+(2+Math.random()*4).toFixed(1)+'px;--d:'+(7+Math.random()*7).toFixed(1)+'s;--a:-'+(Math.random()*12).toFixed(1)+'s;--x:'+((Math.random()*60-30)|0)+'px;opacity:'+(.45+Math.random()*.45).toFixed(2)+'"></i>';
  }
  n.innerHTML=h;
  var c=cel?10:20,g="";
  for(i=0;i<c;i++)g+='<i style="--a:-'+(i*.37).toFixed(2)+'s"></i>';
  l.innerHTML=g;
})();
