# Gera os vídeos animados (1080 x 1920, formato story/reels) do catálogo de Natal, um por seção, com todas as peças.
# Uso: python3 scripts/gerar-videos-natal.py <pasta_de_saida> [slug ...]    (sem slug = todas as seções)
# Precisa de playwright, chromium e ffmpeg. Cada quadro é desenhado por uma função do tempo (sem depender de relógio), então o resultado é sempre igual.
import json, sys, os, html, subprocess
from playwright.sync_api import sync_playwright
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAT = os.path.join(RAIZ, 'teste', 'natal')
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '/tmp/videos-natal'
ESCOLHA = sys.argv[2:]
os.makedirs(SAIDA, exist_ok=True)
FPS = int(os.environ.get('FPS', '30'))
SECOES = [  # (titulo no índice, slug, frase de abertura, curta e direta; o | marca a quebra de linha)
 ('Presépio', 'presepio', 'Leve a tradição|do Natal para sua casa'),
 ('Árvores de Natal', 'arvores', 'Sem espaço para|árvore grande?|Temos uma para você'),
 ('Decoração de árvore', 'decoracao-arvore', 'Deixe sua árvore|de Natal ainda|mais bonita'),
 ('Mini Papais Noel', 'mini-papais-noel', 'O Papai Noel mais fofo|da sua decoração'),
 ('Decorações de mesa', 'decoracoes-mesa', 'Decoração de Natal|para sua casa, sua loja|ou sua clínica'),
 ('Feliz Natal', 'feliz-natal', 'Letreiros para|decorar e presentear'),
 ('Bombonieri e lembrancinhas', 'bombonieri', 'Lembrancinhas de Natal|que encantam'),
]
dados = [d for d in json.load(open(os.path.join(NAT, 'busca-indice.json'), encoding='utf-8')) if d['c'] == 'natal']

PAGINA = r'''<!doctype html><meta charset="utf-8"><title>video</title>
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#0F3A28;font-family:Inter,system-ui,sans-serif}
canvas{position:absolute;left:0;top:0}
.abs{position:absolute;left:0;top:0;width:1080px;height:1920px;pointer-events:none}
.serif{font-family:Lora,Georgia,serif;font-weight:700}
#cab{position:absolute;left:0;top:0;width:1080px}
#cab img{position:absolute;left:48px;top:150px;width:120px}
#cab .ano{position:absolute;right:52px;top:158px;font:700 32px Lora,Georgia,serif;letter-spacing:.1em;color:#E8C547}
#cab .sec{position:absolute;left:0;width:1080px;top:232px;text-align:center}
#cab .sec span{display:inline-block;background:rgba(255,255,255,.12);border:2px solid rgba(232,197,71,.7);color:#FFF8EC;border-radius:999px;padding:10px 30px;font:600 28px Inter,sans-serif}
#card{position:absolute;left:60px;top:330px;width:960px;height:1170px;background:#FFF8EC;border-radius:48px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden}
#card .foto{position:absolute;left:36px;top:36px;width:888px;height:888px;border-radius:32px;overflow:hidden;background:#eee}
#card .foto img{width:100%;height:100%;object-fit:cover;display:block}
#card .nome{position:absolute;left:44px;top:950px;width:872px;font:700 54px/1.1 Lora,Georgia,serif;color:#143D2A}
#card .tags{position:absolute;left:44px;top:1090px;display:flex;gap:16px;align-items:center}
#card .cod{background:#F1E9DA;color:#6B5A50;border-radius:999px;padding:8px 22px;font:700 26px Inter,sans-serif}
#card .ent{color:#1F5B3F;font:700 28px Inter,sans-serif}
#preco{position:absolute;right:44px;top:800px;background:#B3202A;color:#fff;border:5px solid #E8C547;border-radius:30px;padding:14px 34px;font:700 76px/1 Lora,Georgia,serif;white-space:nowrap;box-shadow:0 10px 26px rgba(0,0,0,.4)}
#barra{position:absolute;left:60px;top:1528px;width:960px;height:10px;border-radius:9px;background:rgba(255,255,255,.18)}
#barra i{display:block;height:100%;border-radius:9px;background:#E8C547}
#rod{position:absolute;left:0;width:1080px;top:1568px;text-align:center;color:#fff}
#rod b{display:block;font:700 34px Inter,sans-serif}
#rod span{display:block;font:500 25px Inter,sans-serif;opacity:.9;margin-top:6px}
#intro{position:absolute;left:0;top:0;width:1080px;height:1920px;color:#fff;text-align:center}
#intro .logo{position:absolute;left:48px;top:150px;width:120px}
#intro .ano{position:absolute;left:0;width:1080px;top:690px;font:700 104px Lora,Georgia,serif;letter-spacing:.14em;color:#E8C547;text-shadow:0 0 40px rgba(232,197,71,.55)}
#intro .fio{position:absolute;left:390px;width:300px;top:840px;height:6px;border-radius:6px;background:linear-gradient(90deg,transparent,#E8C547,transparent)}
#intro h1{position:absolute;left:40px;width:1000px;top:910px;font:700 80px/1.16 Lora,Georgia,serif}
#intro h1 .l{display:block}
#intro h1 .w{display:inline-block;margin:0 .13em}
#grade{position:absolute;left:0;top:0;width:1080px;height:1920px}
#grade .tit{position:absolute;left:0;width:1080px;top:270px;text-align:center;color:#fff;font:700 62px Lora,Georgia,serif}
#grade .g{position:absolute;width:300px;height:300px;border-radius:26px;overflow:hidden;border:5px solid #FFF8EC;background:#eee;box-shadow:0 10px 26px rgba(0,0,0,.4)}
#grade .g img{width:100%;height:100%;object-fit:cover;display:block}
#grade .g b{position:absolute;left:10px;bottom:10px;background:#B3202A;color:#fff;border-radius:14px;padding:5px 14px;font:700 28px Inter,sans-serif}
#cta{position:absolute;left:0;top:0;width:1080px;height:1920px;color:#fff;text-align:center}
#cta img{position:absolute;left:340px;top:330px;width:400px}
#cta .l1{position:absolute;left:0;width:1080px;top:640px;font:700 76px/1.1 Lora,Georgia,serif;color:#fff}
#cta .zap{position:absolute;left:130px;width:820px;top:860px;background:#25D366;color:#073B1B;border-radius:999px;padding:34px 20px;font:800 56px Inter,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.45)}
#cta .l3{position:absolute;left:0;width:1080px;top:1090px;font:600 40px Inter,sans-serif}
#cta .l4{position:absolute;left:0;width:1080px;top:1170px;font:500 36px Inter,sans-serif;opacity:.92}
#cta .prazo{position:absolute;left:0;width:1080px;top:1300px}
#cta .prazo span{display:inline-block;background:#B3202A;border:4px solid #E8C547;border-radius:999px;padding:16px 44px;font:700 44px Inter,sans-serif}
</style>
<canvas id="bg" width="1080" height="1920"></canvas>
<div id="cab"><img src="file://__NAT__/imagens/logo-branca.png"><div class="ano">NATAL 2026</div><div class="sec"><span id="secTxt"></span></div></div>
<div id="card"><div class="foto"><img id="fImg"></div><div class="nome" id="fNome"></div><div class="tags"><span class="cod" id="fCod"></span><span class="ent" id="fEnt"></span></div><div id="preco"></div></div>
<div id="barra"><i id="barraI"></i></div>
<div id="rod"><b>Peça pelo WhatsApp (38) 99221-4206</b><span>@lxlprojetos &middot; lxlprojetos.site/natal</span></div>
<div id="intro"><img class="logo" src="file://__NAT__/imagens/logo-branca.png"><div class="ano">NATAL 2026</div><div class="fio"></div><h1 id="iTit"></h1></div>
<div id="grade"><div class="tit">Todas as peças</div></div>
<div id="cta"><img src="file://__NAT__/imagens/logo-branca.png"><div class="l1">Gostou?<br>Peça a sua!</div><div class="zap">(38) 99221-4206</div><div class="l3">Chame no WhatsApp</div><div class="l4">@lxlprojetos &middot; lxlprojetos.site/natal</div><div class="prazo"><span>Pedidos até 15/12</span></div></div>
<script>
const D = __DADOS__;
const W=1080, H=1920;
const IT=2.4, INTRO=2.2, GRADE=D.itens.length>=4?2.8:0, CTA=3.2;
const total = INTRO + D.itens.length*IT + GRADE + CTA;
window.DURACAO = total;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const easeOut=x=>1-Math.pow(1-clamp(x),3), easeIn=x=>Math.pow(clamp(x),3);
const back=x=>{x=clamp(x);const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const seg=(t,a,b)=>clamp((t-a)/(b-a));
function rnd(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}}
// flocos de neve e brilhos, sempre os mesmos
const r=rnd(7);
const neve=[...Array(90)].map(()=>({x:r()*W,y:r()*H,v:70+r()*140,s:2+r()*7,f:r()*6.28,a:.4+r()*.6,d:20+r()*50}));
const brilhos=[...Array(26)].map(()=>({x:60+r()*(W-120),y:300+r()*1300,p:1.5+r()*2.5,o:r()*6.28,s:10+r()*18}));
const cores=['#FF4B4B','#FFD54A','#4CD964','#4DA3FF','#FF8AD8'];
const cv=document.getElementById('bg'), cx=cv.getContext('2d');
function estrela(x,y,s,a){cx.save();cx.translate(x,y);cx.globalAlpha=a;cx.fillStyle='#FFE08A';cx.beginPath();
 for(let i=0;i<8;i++){const ang=i*Math.PI/4, rr=i%2?s*.28:s;cx.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr)}cx.closePath();cx.fill();cx.restore()}
function pinheiro(x,base,h,w){cx.fillStyle='#0A2A1C';for(let k=0;k<3;k++){const y0=base-h*(k+1)/3, y1=base-h*k/3;cx.beginPath();cx.moveTo(x,y0-h*.12);cx.lineTo(x-w*(1-k*.22)/2,y1);cx.lineTo(x+w*(1-k*.22)/2,y1);cx.closePath();cx.fill()}
 cx.fillStyle='rgba(255,255,255,.85)';cx.beginPath();cx.moveTo(x,base-h*1.12);cx.lineTo(x-w*.1,base-h*.9);cx.lineTo(x+w*.1,base-h*.9);cx.closePath();cx.fill()}
function fundo(t){
 const g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0B2E20');g.addColorStop(.5,'#17543A');g.addColorStop(1,'#0B2E20');cx.fillStyle=g;cx.fillRect(0,0,W,H);
 const gl=cx.createRadialGradient(540,900,50,540,900,900);gl.addColorStop(0,'rgba(255,224,138,.18)');gl.addColorStop(1,'rgba(255,224,138,0)');cx.fillStyle=gl;cx.fillRect(0,0,W,H);
 // morros e pinheiros no rodapé
 cx.fillStyle='#0A2A1C';[[120,1860,60,150],[330,1880,70,170],[560,1850,60,140],[800,1875,70,170],[990,1855,60,150],[40,1900,40,100],[700,1900,40,100]].forEach(a=>pinheiro(a[0],a[1]+60,a[2]*2.2,a[3]));
 cx.fillStyle='#F4F7F2';cx.beginPath();cx.moveTo(0,1890);cx.quadraticCurveTo(300,1850,540,1885);cx.quadraticCurveTo(800,1920,1080,1870);cx.lineTo(1080,1920);cx.lineTo(0,1920);cx.fill();
 brilhos.forEach(b=>{const a=.25+.75*Math.max(0,Math.sin(t*b.p+b.o));estrela(b.x,b.y,b.s*(.6+.4*a),a*.8)});
 // pisca-pisca no topo
 cx.strokeStyle='#0A2A1C';cx.lineWidth=5;cx.beginPath();for(let i=0;i<=40;i++){const x=i*27, y=40+Math.sin(i/40*Math.PI*5)*0+((i%8)<4?0:0)}cx.stroke();
 const N=15;cx.lineWidth=4;cx.strokeStyle='#0A1F16';cx.beginPath();
 for(let i=0;i<N;i++){const x0=i*(W/N),x1=(i+1)*(W/N);cx.moveTo(x0,34);cx.quadraticCurveTo((x0+x1)/2,92,x1,34)}cx.stroke();
 for(let i=0;i<=N;i++){const x=i*(W/N), y=34;const c=cores[i%5], on=.55+.45*Math.sin(t*4+i*1.7);
  cx.save();cx.shadowColor=c;cx.shadowBlur=30*on;cx.globalAlpha=.55+.45*on;cx.fillStyle=c;cx.beginPath();cx.ellipse(x,y+22,13,19,0,0,6.28);cx.fill();cx.restore();
  if(i<N){const xm=x+W/N/2, ym=34+29;const c2=cores[(i+2)%5],on2=.55+.45*Math.sin(t*4+i*1.7+2);cx.save();cx.shadowColor=c2;cx.shadowBlur=30*on2;cx.globalAlpha=.55+.45*on2;cx.fillStyle=c2;cx.beginPath();cx.ellipse(xm,ym+22,13,19,0,0,6.28);cx.fill();cx.restore()}}
 // neve
 neve.forEach(f=>{const y=((f.y+f.v*t)%(H+60))-30, x=f.x+Math.sin(t*.9+f.f)*f.d;cx.globalAlpha=f.a;cx.fillStyle='#fff';cx.beginPath();cx.arc(x,y,f.s,0,6.28);cx.fill()});cx.globalAlpha=1;
}
const $=id=>document.getElementById(id);
const cab=$('cab'),card=$('card'),barra=$('barra'),rod=$('rod'),intro=$('intro'),grade=$('grade'),cta=$('cta'),preco=$('preco');
$('secTxt').textContent=D.titulo;
let _k=0;$('iTit').innerHTML=D.sub.split('|').map(l=>'<span class="l">'+l.split(' ').map(p=>'<span class="w" data-i="'+(_k++)+'">'+p+'</span>').join(' ')+'</span>').join('');
// grade
(function(){const n=D.itens.length;const cols=3, tam=300, gap=24;const rows=Math.ceil(n/cols);const hTot=rows*tam+(rows-1)*gap;const y0=Math.max(380,(H-hTot)/2+40);
 D.itens.forEach((it,i)=>{const lin=Math.floor(i/cols), col=i%cols, noLin=Math.min(cols,n-lin*cols);const x0=(W-(noLin*tam+(noLin-1)*gap))/2;
  const d=document.createElement('div');d.className='g';d.style.left=(x0+col*(tam+gap))+'px';d.style.top=(y0+lin*(tam+gap))+'px';
  d.innerHTML='<img src="file://'+D.nat+'/imagens/'+it.foto+'.jpg"><b>'+it.pr+'</b>';grade.appendChild(d)})})();
let atual=-1;
function render(t){
 fundo(t);
 const tIntro=t, tItens=t-INTRO, tGrade=t-INTRO-D.itens.length*IT, tCta=tGrade-GRADE;
 // intro (rápido: NATAL 2026 com brilho e a frase palavra por palavra)
 let vi=t<INTRO;intro.style.display=vi?'block':'none';
 if(vi){intro.style.opacity=1-easeIn(seg(t,INTRO-.3,INTRO));
  const lg=intro.querySelector('.logo');lg.style.opacity=easeOut(seg(t,0,.3));
  const an=intro.querySelector('.ano'),pa=back(seg(t,.05,.55));an.style.opacity=clamp(pa*2);an.style.transform='scale('+(.6+.4*pa)+')';
  const fi=intro.querySelector('.fio');fi.style.opacity=easeOut(seg(t,.35,.7));fi.style.transform='scaleX('+easeOut(seg(t,.35,.8))+')';
  intro.querySelectorAll('.w').forEach((w,i)=>{const p=back(seg(t,.5+i*.09,.95+i*.09));w.style.opacity=clamp(p*2);w.style.transform='translateY('+(50*(1-p))+'px) scale('+(.7+.3*p)+')'});}
 // itens
 const emItens=tItens>=0&&tItens<D.itens.length*IT;
 cab.style.display=card.style.display=barra.style.display=rod.style.display=emItens?'block':'none';
 if(emItens){const i=Math.floor(tItens/IT), l=tItens-i*IT;const it=D.itens[i];
  if(i!==atual){atual=i;$('fImg').src='file://'+D.nat+'/imagens/'+it.foto+'.jpg';$('fNome').textContent=it.nome;$('fCod').textContent='Cód. '+it.sku;$('fEnt').textContent=it.entrega;preco.textContent=it.pr;
   $('secTxt').textContent=D.titulo+'  ·  '+(i+1)+' de '+D.itens.length}
  const ent=back(seg(l,0,.6)), sai=easeIn(seg(l,IT-.35,IT));
  const dx=(1-ent)*1150-sai*1150, rot=(1-ent)*7-sai*7;
  card.style.transform='translateX('+dx+'px) rotate('+rot+'deg)';card.style.opacity=1;
  $('fImg').style.transform='scale('+(1.02+.08*seg(l,0,IT))+')';
  const nm=easeOut(seg(l,.4,.8));$('fNome').style.opacity=nm;$('fNome').style.transform='translateY('+(30*(1-nm))+'px)';
  const tg=easeOut(seg(l,.55,.95));document.querySelector('#card .tags').style.opacity=tg;
  const pp=back(seg(l,.7,1.15));preco.style.transform='scale('+(.2+.8*pp)+') rotate('+(-5+(1-pp)*-12)+'deg)';preco.style.opacity=clamp(pp*2)*(1-sai);
  cab.style.opacity=rod.style.opacity=barra.style.opacity=1-(i===D.itens.length-1?easeIn(seg(l,IT-.35,IT)):0);
  const bi=barra.firstElementChild;bi.style.width=((i+clamp(l/IT))/D.itens.length*100)+'%';
  const ci=cab.querySelector('.sec span');ci.style.transform='scale('+(1+.06*Math.sin(l*6)*Math.exp(-l*3))+')';
 }
 // grade
 const vg=GRADE>0&&tGrade>=0&&tGrade<GRADE;grade.style.display=vg?'block':'none';
 if(vg){const o=easeOut(seg(tGrade,0,.3))*(1-easeIn(seg(tGrade,GRADE-.35,GRADE)));grade.style.opacity=o;
  const tt=grade.querySelector('.tit');tt.style.transform='translateY('+(40*(1-easeOut(seg(tGrade,0,.4))))+'px)';
  grade.querySelectorAll('.g').forEach((g,i)=>{const p=back(seg(tGrade,.2+i*.09,.65+i*.09));g.style.opacity=clamp(p*2);g.style.transform='scale('+(.3+.7*p)+') rotate('+((1-p)*(i%2?10:-10))+'deg)'})}
 // chamada final
 const vc=tCta>=0;cta.style.display=vc?'block':'none';
 if(vc){cta.style.opacity=easeOut(seg(tCta,0,.4));
  cta.querySelector('img').style.transform='scale('+(.4+.6*back(seg(tCta,0,.6)))+')';
  const l1=cta.querySelector('.l1'),p1=back(seg(tCta,.3,.9));l1.style.opacity=clamp(p1*2);l1.style.transform='translateY('+(50*(1-p1))+'px)';
  const z=cta.querySelector('.zap'),pz=back(seg(tCta,.7,1.3));z.style.opacity=clamp(pz*2);z.style.transform='scale('+((.5+.5*pz)*(1+.035*Math.sin(tCta*7)))+')';
  [['.l3',1.1],['.l4',1.3],['.prazo',1.5]].forEach(([s,a])=>{const e=cta.querySelector(s),p=easeOut(seg(tCta,a,a+.4));e.style.opacity=p;e.style.transform='translateY('+(30*(1-p))+'px)'});}
}
window.render=render;
</script>'''

def brl(v): return 'R$ ' + f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.') if v else 'Consulte'
def gerar(pg, titulo, slug, sub, k):
    itens = [d for d in dados if d['secao'] == titulo]
    if not itens: return None
    pacote = {'titulo': titulo, 'sub': sub, 'nat': NAT, 'itens': [{'sku': i['sku'], 'nome': i['nome'], 'foto': i['foto'], 'entrega': i['entrega'], 'pr': brl(i['preco'])} for i in itens]}
    tmp = os.path.join(SAIDA, f'_tmp_{slug}.html')
    open(tmp, 'w', encoding='utf-8').write(PAGINA.replace('__DADOS__', json.dumps(pacote, ensure_ascii=False)).replace('__NAT__', NAT))
    pg.goto('file://' + tmp); pg.wait_for_load_state('load'); pg.wait_for_timeout(400)
    dur = pg.evaluate('window.DURACAO'); n = int(dur * FPS)
    saida = os.path.join(SAIDA, f'natal_{k:02d}-{slug}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', saida], stdin=subprocess.PIPE)
    for f in range(n):
        pg.evaluate('t=>window.render(t)', f / FPS)
        ff.stdin.write(pg.screenshot(type='jpeg', quality=92))
    ff.stdin.close(); ff.wait(); os.remove(tmp)
    return saida, dur
with sync_playwright() as p:
    b = p.chromium.launch(args=['--allow-file-access-from-files']); pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    for k, (titulo, slug, sub) in enumerate(SECOES, 1):
        if ESCOLHA and slug not in ESCOLHA: continue
        r = gerar(pg, titulo, slug, sub, k)
        if r: print(r[0], f'{r[1]:.1f}s', flush=True)
    b.close()
