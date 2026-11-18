#!/bin/sh
# Roda todos os testes. Uso (na raiz do repositório):  sh testes/rodar.sh
# Precisa de: php, python3 com "requests" e "playwright" (pip install requests playwright; playwright install chromium).
PORTA=8166
rm -f /tmp/lxl-testes.db
LXL_CONFIG="$(pwd)/testes/config-teste.php" php -S 127.0.0.1:$PORTA -t "$(pwd)" >/tmp/lxl-php-testes.log 2>&1 &
SERVIDOR=$!
sleep 1
export LXL_URL="http://127.0.0.1:$PORTA"
echo "== API (permissões, orçamentos, pagamento parcial, usuários, backup) =="
python3 testes/api-completo.py | grep -v "^OK" ; echo "(só aparecem as linhas com problema; FALHA = erro)"
rm -f /tmp/lxl-testes.db
echo "== Telas do painel (celular) =="
python3 testes/telas-painel.py | tail -4
echo "== Site com o painel desligado =="
python3 testes/site-sem-painel.py
kill $SERVIDOR
