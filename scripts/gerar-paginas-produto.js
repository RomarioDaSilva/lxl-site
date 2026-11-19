/* Uso (na raiz do repositório):  node scripts/gerar-paginas-produto.js natal     ou     node scripts/gerar-paginas-produto.js religioso
   Trabalha na pasta teste/<catálogo>/ (a promoção para produção copia depois).
   Gera as páginas de compartilhamento: <catálogo>/p/CODIGO/index.html
   Cada uma tem a foto, o nome e o preço para aparecer no WhatsApp, e leva para a página do produto.
   Rode de novo sempre que mudar preço, nome, descrição ou foto: node gerar-paginas-produto.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
const CAT=process.argv[2]||'natal';
const BASE="https://lxlprojetos.site/"+CAT+"/";   /* troque aqui se o endereço do site mudar */
const MES="novembro de 2026";   /* só usado no catálogo de Natal */
const raiz=path.join(__dirname,'..','teste',CAT);
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage();
  await pg.goto('file://'+path.join(raiz,'index.html'));
  const titulo=await pg.evaluate(()=>TITULO);
  const prods=await pg.evaluate(()=>PRODUTOS.map(p=>({sku:p.sku,antigo:p.antigo||'',nome:p.nome,desc:p.desc,preco:p.preco,foto:fotosDe(p)[0]})));
  /* índice usado pela busca da página inicial (<catálogo>/busca-indice.json) */
  const indice=await pg.evaluate(CAT=>PRODUTOS.map(p=>{const s=SECOES.find(x=>x.id===p.secao);return {c:CAT,u:CAT+'/',sku:p.sku,antigo:p.antigo||'',nome:p.nome,desc:p.desc||'',cor:p.cor||'',tag:p.tag||'',secao:s?s.titulo:'',top:!!p.top,preco:typeof p.preco==='number'?p.preco:null,entrega:p.entrega||'',foto:fotosDe(p)[0]};}),CAT);
  fs.writeFileSync(path.join(raiz,'busca-indice.json'),JSON.stringify(indice));
  await b.close();
  fs.rmSync(path.join(raiz,'p'),{recursive:true,force:true});
  let n=0;
  for(const p of prods){
    const temFoto=fs.existsSync(path.join(raiz,'imagens',p.foto+'.jpg'));
    const preco=typeof p.preco==='number'?brl(p.preco)+(CAT==='natal'?' (preço especial de '+MES+')':''):'Consulte o valor';
    const desc=preco+'. '+p.desc;
    const url=BASE+'p/'+p.sku+'/';
    const html=`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"><link rel="icon" type="image/png" sizes="512x512" href="/favicon-512.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(p.nome)} | ${esc(titulo)} | LXL Projetos</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="LXL Projetos">
<meta property="og:title" content="${esc(p.nome)} | ${esc(titulo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">${temFoto?`
<meta property="og:image" content="${BASE}imagens/${p.foto}.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="1200">
<meta name="twitter:card" content="summary_large_image">`:''}
<meta http-equiv="refresh" content="0;url=../../#/p/${p.sku}">
<script>location.replace("../../#/p/${p.sku}");</script></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:40px 16px"><p>Abrindo ${esc(p.nome)}...</p><p><a href="../../#/p/${p.sku}">Toque aqui se não abrir</a></p></body></html>`;
    fs.mkdirSync(path.join(raiz,'p',p.sku),{recursive:true});
    fs.writeFileSync(path.join(raiz,'p',p.sku,'index.html'),html); n++;
    /* página do código antigo (links já compartilhados no WhatsApp): leva ao código novo */
    if(p.antigo){ fs.mkdirSync(path.join(raiz,'p',p.antigo),{recursive:true}); fs.writeFileSync(path.join(raiz,'p',p.antigo,'index.html'),html.replace(BASE+'p/'+p.sku+'/',BASE+'p/'+p.antigo+'/')); }
  }
  try{ require('child_process').execFileSync('python3',[path.join(__dirname,'gerar-dados-estruturados.py'),path.basename(raiz)],{stdio:'inherit'}); }catch(e){ console.log('Aviso: não consegui gerar os dados estruturados do Google.'); }
  console.log(n+' páginas geradas;', prods.filter(p=>!fs.existsSync(path.join(raiz,'imagens',p.foto+'.jpg'))).map(p=>p.sku).join(',')||'todas com foto');
})();
