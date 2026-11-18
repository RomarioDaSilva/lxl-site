# Testes

Rode tudo com `sh testes/rodar.sh` (na raiz do repositório).

- `api-completo.py`: testa a API do painel (login, perfis, orçamento virando pedido, sinal e saldo, histórico do cliente, convite, esqueci a senha, plano B, backup). Linha com `FALHA` = algo quebrou.
- `telas-painel.py`: abre as telas do painel no tamanho de celular e confere que não há erro no console.
- `site-sem-painel.py`: mede o site e o catálogo e prova que o catálogo funciona mesmo com o painel desligado.
- `config-teste.php`: configuração de mentira (banco temporário) só para os testes.

Os testes nunca tocam no banco da Hostinger.
