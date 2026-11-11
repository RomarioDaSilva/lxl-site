<?php
declare(strict_types=1);
/*
 * Estoque PÚBLICO para o catálogo do site.
 * Mostra SOMENTE o código da peça, a quantidade das peças de pronta entrega (estoque maior que 0)
 * o preço de venda e as cores em pronta entrega das peças ativas. Não mostra cliente, pedido, custo nem nada privado.
 */
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=20');
header('X-Robots-Tag: noindex, nofollow');
require __DIR__ . '/lib.php';

$itens = []; $precos = []; $cores = [];
try {
    $r = db()->query("SELECT codigo, estoque, controla, preco FROM produtos WHERE ativo = 1 AND codigo <> ''")->fetchAll();
    foreach ($r as $p) {
        if ((int)$p['controla'] === 1 && (int)$p['estoque'] > 0) $itens[$p['codigo']] = (int)$p['estoque'];
        if ((float)$p['preco'] > 0) $precos[$p['codigo']] = (float)$p['preco'];
    }
    $c = db()->query("SELECT p.codigo, c.nome, c.hex, pc.qtd FROM produto_cores pc JOIN produtos p ON p.id = pc.produto_id JOIN cores c ON c.id = pc.cor_id WHERE p.ativo = 1 AND p.controla = 1 AND p.usa_cores = 1 AND p.codigo <> '' AND pc.qtd > 0 ORDER BY c.nome")->fetchAll();
    foreach ($c as $x) $cores[$x['codigo']][] = ['n' => $x['nome'], 'h' => $x['hex'], 'q' => (int)$x['qtd']];
} catch (Throwable $e) {
    $itens = []; $precos = []; $cores = [];
}
echo json_encode(['itens' => (object)$itens, 'precos' => (object)$precos, 'cores' => (object)$cores], JSON_UNESCAPED_UNICODE);
