#!/bin/sh
# Conferências rápidas (sem abrir navegador): sintaxe do PHP e do JavaScript, contas da calculadora e números de versão.
# Uso (na raiz do repositório):  sh testes/conferir.sh
set -e
cd "$(dirname "$0")/.."
for f in $(find teste painel -name '*.php'); do php -l "$f" >/dev/null || { echo "ERRO de PHP em $f"; exit 1; }; done
for f in $(find teste painel -name '*.js' -not -path '*/vendor/*'); do node --check "$f" || { echo "ERRO de JavaScript em $f"; exit 1; }; done
node testes/calc.test.js
python3 scripts/atualizar-versoes.py --conferir
echo "Conferências ok."
