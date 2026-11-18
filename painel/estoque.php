<?php
declare(strict_types=1);
/*
 * Estoque PÚBLICO para o catálogo do site.
 * Mostra SOMENTE o código da peça, a quantidade das peças de pronta entrega (estoque maior que 0)
 * o preço de venda, as cores em pronta entrega e as categorias das peças ativas. Não mostra cliente, pedido, custo nem nada privado.
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
/* Categorias (para o catálogo se organizar sozinho): a árvore e, para cada código de peça ativa, os ids das categorias dela. */
$categorias = []; $cats = [];
try {
    $todas = db()->query('SELECT id, nome, parent_id, ordem, ativo FROM categorias ORDER BY ordem, nome')->fetchAll();
    $pais = []; $off = [];
    foreach ($todas as $c) { $pais[(int)$c['id']] = $c['parent_id'] === null ? null : (int)$c['parent_id']; $off[(int)$c['id']] = (int)$c['ativo'] === 0; }
    foreach ($todas as $c) {
        /* "oculta" = a própria categoria ou alguma categoria de cima foi desmarcada em "Mostrar no site" */
        $oculta = false; $x = (int)$c['id']; $g = 0;
        while ($x !== null && $g++ < 50) { if (!empty($off[$x])) { $oculta = true; break; } $x = $pais[$x] ?? null; }
        $categorias[] = ['id' => (int)$c['id'], 'nome' => $c['nome'], 'pai' => $pais[(int)$c['id']], 'oculta' => $oculta];
    }
    foreach (db()->query("SELECT p.codigo, pc.categoria_id FROM produto_categorias pc JOIN produtos p ON p.id = pc.produto_id WHERE p.ativo = 1 AND p.codigo <> ''")->fetchAll() as $x)
        $cats[$x['codigo']][] = (int)$x['categoria_id'];
    /* peça ativa sem nenhuma categoria entra com lista vazia (assim o catálogo sabe que ela existe no painel) */
    foreach (db()->query("SELECT p.codigo FROM produtos p WHERE p.ativo = 1 AND p.codigo <> ''")->fetchAll() as $x) if (!isset($cats[$x['codigo']])) $cats[$x['codigo']] = [];
} catch (Throwable $e) { $categorias = []; $cats = []; }
/* Apelido: o catálogo em produção ainda usa os códigos antigos (PRE-001...). Repete os dados também sob o código antigo para ele continuar funcionando até a promoção. */
try {
    foreach (db()->query("SELECT codigo, codigo_antigo FROM produtos WHERE ativo = 1 AND codigo <> '' AND codigo_antigo <> ''")->fetchAll() as $x) {
        $n = (string)$x['codigo']; $v = (string)$x['codigo_antigo'];
        foreach (['itens', 'precos', 'cores', 'cats'] as $k) if (isset($$k[$n])) $$k[$v] = $$k[$n];
    }
} catch (Throwable $e) { /* coluna ainda não existe: sem apelidos */ }
echo json_encode(['itens' => (object)$itens, 'precos' => (object)$precos, 'cores' => (object)$cores, 'categorias' => $categorias, 'cats' => (object)$cats], JSON_UNESCAPED_UNICODE);
