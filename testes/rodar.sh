#!/bin/sh
# Roda todos os testes. Uso (na raiz do repositório):  sh testes/rodar.sh
# Precisa de: php, node, python3 com "requests" e "playwright" (pip install requests playwright; playwright install chromium).
PORTA=8166
STATUS=0
cd "$(dirname "$0")/.."
rm -f /tmp/lxl-testes.db
LXL_CONFIG="$(pwd)/testes/config-teste.php" php -S 127.0.0.1:$PORTA -t "$(pwd)" >/tmp/lxl-php-testes.log 2>&1 &
SERVIDOR=$!
sleep 1
export LXL_URL="http://127.0.0.1:$PORTA"

passo() {   # passo "nome" comando...  (mostra só as linhas com problema; guarda o resultado)
  NOME="$1"; shift
  echo "== $NOME =="
  "$@" > /tmp/lxl-saida.txt 2>&1; COD=$?
  if [ $COD -ne 0 ]; then grep -v "^OK" /tmp/lxl-saida.txt | tail -15; STATUS=1; else tail -2 /tmp/lxl-saida.txt; fi
}

passo "Sintaxe, contas da calculadora e versões" sh testes/conferir.sh
passo "Migração dos códigos numéricos" php testes/migracao-codigos.php
passo "API (permissões, orçamentos, pagamento parcial, usuários, backup)" python3 testes/api-completo.py
rm -f /tmp/lxl-testes.db   # a API deixa o banco usado; as telas precisam de um novo
passo "Telas do painel no celular" python3 testes/telas-painel.py
passo "Site com o painel desligado" python3 testes/site-sem-painel.py

kill $SERVIDOR
[ $STATUS -eq 0 ] && echo "TUDO CERTO" || echo "ALGO FALHOU (veja acima)"
exit $STATUS
