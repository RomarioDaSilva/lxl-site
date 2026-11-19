#!/usr/bin/env python3
"""Coloca no HTML de cada catálogo uma lista de peças para o Google (dados estruturados, só nome, foto e link; SEM preço).
O cliente não vê nada: é um texto escondido no <head>. Sem preço, nunca fica desatualizado em relação ao painel.
Uso (na raiz do repositório):  python3 scripts/gerar-dados-estruturados.py <catalogo>   (natal, religioso ou chaveiros)
O gerar-paginas-produto.js chama este script no final, então normalmente você não precisa rodar à mão."""
import json, os, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://lxlprojetos.site/'
NOMES = {'natal': 'Catálogo de Natal 2026', 'religioso': 'Catálogo Religioso', 'chaveiros': 'Catálogo de Chaveiros'}
ini, fim = '<!--ld-itens-->', '<!--/ld-itens-->'
for c in sys.argv[1:]:
    pasta = os.path.join(RAIZ, 'teste', c)
    itens = json.load(open(os.path.join(pasta, 'busca-indice.json'), encoding='utf-8'))
    lista = [{'@type': 'ListItem', 'position': i + 1, 'name': p['nome'],
              'url': '%s%s/#/p/%s' % (SITE, c, p['sku']),
              'image': '%s%s/imagens/%s.jpg' % (SITE, c, p['foto'])} for i, p in enumerate(itens) if os.path.exists(os.path.join(pasta, 'imagens', p['foto'] + '.jpg'))]
    dado = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': NOMES.get(c, c), 'itemListElement': lista}
    bloco = ini + '<script type="application/ld+json">' + json.dumps(dado, ensure_ascii=False, separators=(',', ':')) + '</script>' + fim
    arq = os.path.join(pasta, 'index.html'); s = open(arq, encoding='utf-8').read()
    if ini in s: s = s[:s.index(ini)] + bloco + s[s.index(fim) + len(fim):]
    else: s = s.replace('</head>', bloco + '\n</head>', 1)
    open(arq, 'w', encoding='utf-8').write(s)
    print('%s: %d peças na lista para o Google (%d KB)' % (c, len(lista), len(bloco) // 1024))
