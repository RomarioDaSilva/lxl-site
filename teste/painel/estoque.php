<?php
declare(strict_types=1);
/*
 * Estoque PÚBLICO para o catálogo do site.
 * Mostra SOMENTE o código da peça, a quantidade das peças de pronta entrega (estoque maior que 0)
 * e o preço de venda das peças ativas. Não mostra cliente, pedido, custo nem nada privado.
 */
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=20');
header('X-Robots-Tag: noindex, nofollow');
require __DIR__ . '/lib.php';

$itens = []; $precos = [];
try {
    $r = db()->query("SELECT codigo, estoque, controla, preco FROM produtos WHERE ativo = 1 AND codigo <> ''")->fetchAll();
    foreach ($r as $p) {
        if ((int)$p['controla'] === 1 && (int)$p['estoque'] > 0) $itens[$p['codigo']] = (int)$p['estoque'];
        if ((float)$p['preco'] > 0) $precos[$p['codigo']] = (float)$p['preco'];
    }
} catch (Throwable $e) {
    $itens = []; $precos = [];
}
echo json_encode(['itens' => (object)$itens, 'precos' => (object)$precos], JSON_UNESCAPED_UNICODE);
