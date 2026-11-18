#!/usr/bin/env python3
"""Atualiza sozinho o "?v=" dos arquivos .css e .js nos HTML (o número vira um código do conteúdo do arquivo).
Assim, mexeu no arquivo, o número muda sozinho e o navegador baixa a versão nova. Não precisa lembrar de aumentar à mão.
Uso (na raiz do repositório):
  python3 scripts/atualizar-versoes.py            # atualiza
  python3 scripts/atualizar-versoes.py --conferir # só confere (a rotina automática usa isto; sai com erro se algo estiver desatualizado)
  python3 scripts/atualizar-versoes.py --producao # mesma coisa, mas na produção (o script promover.sh usa isto depois de copiar)
Por padrão mexe só na pasta teste/: a produção só muda quando você manda subir.
"""
import hashlib, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PADRAO = re.compile(r'((?:src|href)=")([^"?#:]+\.(?:css|js))\?v=([A-Za-z0-9]+)(")')
conferir = '--conferir' in sys.argv
producao = '--producao' in sys.argv
desatualizados = []

for pasta, dirs, arquivos in os.walk(RAIZ):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'vendor', 'imagens') and (producao or pasta != RAIZ or d == 'teste') and not (producao and pasta == RAIZ and d == 'teste')]
    if os.sep + 'natal' + os.sep + 'p' in pasta + os.sep:   # páginas curtas de prévia do WhatsApp: não têm .css/.js
        continue
    for nome in arquivos:
        if not nome.endswith('.html'):
            continue
        html = os.path.join(pasta, nome)
        texto = open(html, encoding='utf-8').read()

        def troca(m):
            alvo = os.path.normpath(os.path.join(pasta, m.group(2)))
            if m.group(2).startswith('/') or not os.path.isfile(alvo):
                return m.group(0)   # endereço absoluto ou arquivo que não está aqui: deixa como está
            h = hashlib.md5(open(alvo, 'rb').read()).hexdigest()[:8]
            return m.group(1) + m.group(2) + '?v=' + h + m.group(4) if h != m.group(3) else m.group(0)

        novo = PADRAO.sub(troca, texto)
        if novo != texto:
            desatualizados.append(os.path.relpath(html, RAIZ))
            if not conferir:
                open(html, 'w', encoding='utf-8').write(novo)

if conferir and desatualizados:
    print('Versões desatualizadas em:', ', '.join(desatualizados), '\nRode: python3 scripts/atualizar-versoes.py')
    sys.exit(1)
print('Versões em dia.' if conferir or not desatualizados else 'Versões atualizadas em: ' + ', '.join(desatualizados))
