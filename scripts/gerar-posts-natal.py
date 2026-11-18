# Gera as imagens do catálogo de Natal para as redes sociais (1080 x 1350), uma sequência por seção.
# Uso: python3 scripts/gerar-posts-natal.py <pasta_de_saida>   (precisa de playwright e chromium)
import json, sys, os, html, math
from playwright.sync_api import sync_playwright
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAT = os.path.join(RAIZ, 'teste', 'natal')
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '/tmp/posts-natal'
os.makedirs(SAIDA, exist_ok=True)
SECOES = [  # (titulo no índice, nome do arquivo, texto curto)
 ('Presépio', 'presepio', 'Celebre o nascimento de Jesus em família.'),
 ('Árvores de Natal', 'arvores', 'Para mesa, balcão e estante.'),
 ('Decoração de árvore', 'decoracao-arvore', 'Enfeites para deixar a árvore ainda mais bonita.'),
 ('Mini Papais Noel', 'mini-papais-noel', 'Pequenos, charmosos e feitos para decorar qualquer cantinho.'),
 ('Decorações de mesa', 'decoracoes-mesa', 'Para enfeitar mesa, aparador e estante.'),
 ('Feliz Natal', 'feliz-natal', 'Letreiros e placas para decorar e presentear.'),
 ('Bombonieri e lembrancinhas', 'bombonieri', 'Para ceia, igreja, escola e família.'),
]
dados = json.load(open(os.path.join(NAT, 'busca-indice.json'), encoding='utf-8'))
dados = [d for d in dados if d['c'] == 'natal']
brl = lambda v: 'R$ ' + f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
e = html.escape
CSS = """
*{box-sizing:border-box;margin:0}
:root{--red:#B3202A;--green:#1F5B3F;--green-d:#143D2A;--gold:#C9A227;--cream:#FFF8EC;--ink:#2A1A14;--muted:#6B5A50}
body{width:1080px;height:1350px;background:var(--cream);font-family:Inter,system-ui,sans-serif;color:var(--ink);display:flex;flex-direction:column;overflow:hidden}
.top{height:240px;flex:none;color:#fff;padding:34px 48px 0;position:relative;
 background:radial-gradient(circle at 12% 20%,rgba(255,255,255,.35) 0 3px,transparent 4px),radial-gradient(circle at 78% 18%,rgba(255,255,255,.3) 0 3px,transparent 4px),radial-gradient(circle at 40% 80%,rgba(255,255,255,.25) 0 3px,transparent 4px),radial-gradient(circle at 92% 70%,rgba(255,255,255,.3) 0 3px,transparent 4px),radial-gradient(circle at 25% 92%,rgba(255,255,255,.25) 0 3px,transparent 4px),linear-gradient(160deg,var(--green),var(--green-d))}
.top img{position:absolute;left:44px;top:26px;width:150px}
.top .ano{position:absolute;right:48px;top:30px;font:700 30px Lora,Georgia,serif;letter-spacing:.08em;color:var(--gold)}
.top .pg{position:absolute;right:48px;top:70px;font-size:22px;opacity:.85}
.top h1{font:700 68px/1.05 Lora,Georgia,serif;text-align:center;padding-top:78px}
.top h1.l{font-size:58px}
.top h1 span{color:var(--gold)}
.top p{text-align:center;font-size:26px;opacity:.95;margin-top:10px}
.lista{flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px;padding:24px 40px}
.card{flex:none;background:#fff;border-radius:28px;box-shadow:0 6px 22px rgba(60,30,10,.12);display:flex;gap:28px;padding:14px;min-height:0}
.card .f{border-radius:20px;object-fit:cover;flex:none;background:#eee}
.card .t{flex:1;display:flex;flex-direction:column;min-width:0;padding:8px 14px 6px 0}
.um .card{flex-direction:column;gap:18px}.um .card .f{width:100%!important;height:600px!important}.um .card .t{padding:0 16px 10px}.um .card h2{font-size:44px}.um .card p{font-size:26px;-webkit-line-clamp:4}.um .pre{font-size:58px}
.card h2{font:700 36px/1.15 Lora,Georgia,serif;color:var(--green-d);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.card p{font-size:23px;line-height:1.38;color:var(--muted);margin-top:10px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical}
.card .b{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.cod{display:inline-block;background:#F1E9DA;color:var(--muted);border-radius:999px;padding:6px 16px;font-weight:700;font-size:21px}
.ent{display:block;margin-top:8px;font-size:20px;color:var(--green);font-weight:600}
.pre{font:700 50px/1 Lora,Georgia,serif;color:var(--red);white-space:nowrap}
.pre small{display:block;font:600 19px Inter,sans-serif;color:var(--muted);text-align:right;margin-bottom:4px}
.rod{height:112px;flex:none;background:var(--green-d);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 48px}
.rod b{font-size:30px;display:block}.rod span{font-size:22px;opacity:.9}
.rod .prazo{background:var(--red);border-radius:999px;padding:12px 26px;font-weight:700;font-size:25px;white-space:nowrap}
"""
def pagina(titulo, sub, itens, n, total):
    disp = 1350 - 240 - 112 - 48 - 20 * (len(itens) - 1)   # altura livre para os cards
    h = min(disp // len(itens), disp if len(itens) == 1 else 470); foto = h - 28
    cards = ''.join(f'''<div class="card" style="height:{h}px"><img class="f" style="width:{foto}px;height:{foto}px" src="file://{NAT}/imagens/{i["foto"]}.jpg"><div class="t"><h2>{e(i["nome"])}</h2><p>{e(i["desc"])}</p>
<div class="b"><div><span class="cod">Cód. {e(i["sku"])}</span><span class="ent">{e(i["entrega"])}</span></div><div class="pre">{brl(i["preco"]) if i["preco"] else "Consulte"}</div></div></div></div>''' for i in itens)
    return f'''<!doctype html><meta charset="utf-8"><style>{CSS}</style>
<div class="top"><img src="file://{NAT}/imagens/logo-branca.png"><div class="ano">NATAL 2026</div>{f'<div class="pg">{n} de {total}</div>' if total > 1 else ''}
<h1{' class="l"' if len(titulo) > 20 else ''}>{e(titulo)}</h1><p>{e(sub)}</p></div><div class="lista{' um' if len(itens) == 1 else ''}">{cards}</div>
<div class="rod"><div><b>Peça pelo WhatsApp (38) 99221-4206</b><span>@lxlprojetos &middot; lxlprojetos.site/natal</span></div><div class="prazo">Pedidos até 15/12</div></div>'''
arquivos = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1080, 'height': 1350})
    for k, (titulo, slug, sub) in enumerate(SECOES, 1):
        itens = [d for d in dados if d['secao'] == titulo]
        if not itens: continue
        total = math.ceil(len(itens) / 3); base, resto = divmod(len(itens), total); pos = 0
        for n in range(total):
            tam = base + (1 if n < resto else 0); parte = itens[pos:pos + tam]; pos += tam
            tmp = os.path.join(SAIDA, '_tmp.html'); open(tmp, 'w', encoding='utf-8').write(pagina(titulo, sub, parte, n + 1, total)); pg.goto('file://' + tmp); pg.wait_for_load_state('load')
            nome = f'natal_{k:02d}-{slug}_{n + 1}de{total}.png'; pg.screenshot(path=os.path.join(SAIDA, nome)); arquivos.append(nome)
    b.close()
os.remove(os.path.join(SAIDA, '_tmp.html'))
print(len(arquivos), 'imagens em', SAIDA); print('\n'.join(arquivos))
