<?php
declare(strict_types=1);
/*
 * Estoque PÚBLICO para o catálogo do site.
 * Mostra SOMENTE código da peça e quantidade das peças de pronta entrega (estoque maior que 0).
 * Não mostra nome de cliente, pedido, preço de custo nem nada privado.
 */
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=20');
header('X-Robots-Tag: noindex, nofollow');
require __DIR__ . '/lib.php';

try {
    $r = db()->query("SELECT codigo, estoque FROM produtos WHERE ativo = 1 AND controla = 1 AND estoque > 0 AND codigo <> ''")->fetchAll();
} catch (Throwable $e) {
    $r = [];
}
$itens = [];
foreach ($r as $p) $itens[$p['codigo']] = (int)$p['estoque'];
echo json_encode(['itens' => (object)$itens], JSON_UNESCAPED_UNICODE);
