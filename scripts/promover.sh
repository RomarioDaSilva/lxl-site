#!/bin/sh
# SUBIR PARA PRODUÇÃO: copia o que está em teste/ para o site de verdade, sem esquecer nenhum arquivo.
# SÓ RODE depois que o Romas disser "sobe para produção".
#   sh scripts/promover.sh             -> só MOSTRA o que vai mudar (não copia nada)
#   sh scripts/promover.sh --valendo   -> copia de verdade
#   sh scripts/promover.sh --valendo --google  -> copia e também libera o Google (tira o noindex das 3 páginas públicas, cria sitemap e robots)
# Depois: conferir o site no ar e fazer o commit/push (a Hostinger publica sozinha).
set -e
cd "$(dirname "$0")/.."
VALENDO=0; GOOGLE=0
for a in "$@"; do [ "$a" = "--valendo" ] && VALENDO=1; [ "$a" = "--google" ] && GOOGLE=1; done

echo "== O que é diferente entre teste/ e produção (arquivos que não são HTML) =="
for par in "teste/painel painel" "teste/natal natal" "teste/religioso religioso" "teste/chaveiros chaveiros" "teste/faq faq"; do
  set -- $par; diff -rq "$1" "$2" 2>/dev/null | grep -v "\.html" || true
done
for f in estilo.css home.js novo.css novo.js catalogo-novo.css catalogo-novo.js empresa.js; do cmp -s "teste/$f" "$f" 2>/dev/null || echo "Diferente: $f"; done

if [ "$VALENDO" -ne 1 ]; then echo; echo "Nada foi copiado. Para copiar de verdade: sh scripts/promover.sh --valendo"; exit 0; fi

# 1) tudo que é novo ou mudou vem de teste/ (cp -a mantém datas e NUNCA apaga nada do que já existe na produção)
cp -a teste/estilo.css teste/home.js teste/novo.css teste/novo.js teste/catalogo-novo.css teste/catalogo-novo.js teste/empresa.js .
cp -a teste/faq/. faq/
cp -a teste/natal/. natal/
mkdir -p religioso && cp -a teste/religioso/. religioso/
mkdir -p chaveiros && cp -a teste/chaveiros/. chaveiros/
cp -a teste/painel/. painel/
cp -a teste/index.html index.html

# 2) endereços: /teste/ vira / nas páginas HTML. Nas 3 páginas públicas também sai o aviso de "teste" (noindex,nofollow).
for f in index.html faq/index.html natal/index.html religioso/index.html chaveiros/index.html; do sed -i 's#/teste/#/#g; s#<meta name="robots" content="noindex,nofollow">##' "$f"; done
find natal religioso chaveiros -name '*.html' | while read -r f; do sed -i 's#/teste/#/#g' "$f"; done
sed -i 's#/teste/#/#g' painel/index.html

# 3) números de versão dos .css/.js
python3 scripts/atualizar-versoes.py --producao

# 4) conferências
RUIM=0
if grep -rln "/teste" index.html faq natal religioso chaveiros painel empresa.js home.js novo.js --include=*.html --include=*.js --include=*.php 2>/dev/null | grep -v "^painel/medir.js"; then echo "ATENÇÃO: sobrou /teste nos arquivos acima."; RUIM=1; fi
for f in $(find painel -name '*.php'); do php -l "$f" >/dev/null 2>&1 || { echo "ERRO de PHP em $f"; RUIM=1; }; done
for f in $(find painel/js natal religioso chaveiros home.js novo.js catalogo-novo.js empresa.js -name '*.js'); do node --check "$f" >/dev/null 2>&1 || { echo "ERRO de JavaScript em $f"; RUIM=1; }; done
echo "== Arquivos que existem em painel/ mas não existem mais em teste/painel/ (não apaguei; apague você se quiser) =="
(cd painel && find . -type f | sort) > /tmp/prod-painel.txt; (cd teste/painel && find . -type f | sort) > /tmp/teste-painel.txt
comm -23 /tmp/prod-painel.txt /tmp/teste-painel.txt || true

[ "$GOOGLE" -eq 1 ] && sh scripts/google-producao.sh
[ "$RUIM" -eq 0 ] && echo "Promoção concluída sem problemas. Agora confira o site e faça o commit." || echo "Promoção concluída COM AVISOS (veja acima)."
