<?php
declare(strict_types=1);
/* AÇÕES: relatórios.
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Cada "case" é um endereço da API: api.php?a=NOME. */
switch ($a) {

case 'relatorios': {
    $de = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['de'] ?? '')) ? $_GET['de'] : '2000-01-01';
    $ate = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['ate'] ?? '')) ? $_GET['ate'] : '2999-12-31';
    $um = function (string $sql, array $p = []) use ($db) { $s = $db->prepare($sql); $s->execute($p); return $s->fetch(); };
    $todos = function (string $sql, array $p = []) use ($db) { $s = $db->prepare($sql); $s->execute($p); return $s->fetchAll(); };
    $per = [$de, $ate];
    $r = $um("SELECT COUNT(*) n, COALESCE(SUM(total),0) fat, COALESCE(SUM(frete),0) frete, COALESCE(SUM(desconto),0) desc_ FROM pedidos WHERE status <> 'cancelado' AND data BETWEEN ? AND ?", $per);
    $recebido = $um("SELECT COALESCE(SUM(total),0) v FROM pedidos WHERE status <> 'cancelado' AND pago = 1 AND data BETWEEN ? AND ?", $per)['v'];
    $canc = $um("SELECT COUNT(*) n FROM pedidos WHERE status = 'cancelado' AND data BETWEEN ? AND ?", $per)['n'];
    $it = $um("SELECT COALESCE(SUM(i.qtd * CASE WHEN i.produto_id IS NULL THEN COALESCE(i.custo,0) ELSE COALESCE(pr.custo,0) END),0) custo,
        COALESCE(SUM(CASE WHEN (i.produto_id IS NULL AND COALESCE(i.custo,0) = 0) OR (i.produto_id IS NOT NULL AND COALESCE(pr.custo,0) = 0) THEN i.qtd ELSE 0 END),0) sem_custo,
        COALESCE(SUM(i.qtd),0) pecas
        FROM itens i JOIN pedidos pd ON pd.id = i.pedido_id LEFT JOIN produtos pr ON pr.id = i.produto_id
        WHERE pd.status <> 'cancelado' AND pd.data BETWEEN ? AND ?", $per);
    $n = (int)$r['n']; $fat = (float)$r['fat'];
    $resumo = ['pedidos' => $n, 'faturamento' => $fat, 'ticket' => $n ? round($fat / $n, 2) : 0, 'recebido' => (float)$recebido, 'a_receber' => round($fat - (float)$recebido, 2),
        'cancelados' => (int)$canc, 'custo' => round((float)$it['custo'], 2), 'lucro' => round($fat - (float)$it['custo'], 2),
        'sem_custo' => (int)$it['sem_custo'], 'pecas' => (int)$it['pecas'], 'frete' => (float)$r['frete'], 'desconto' => (float)$r['desc_']];
    $dias = $todos("SELECT data, COUNT(*) n, SUM(total) v FROM pedidos WHERE status <> 'cancelado' AND data BETWEEN ? AND ? GROUP BY data ORDER BY data", $per);
    $topProd = $todos("SELECT COALESCE(pr.codigo,'') codigo, i.descricao nome, SUM(i.qtd) q, SUM(i.qtd * i.preco) v, SUM(i.qtd * CASE WHEN i.produto_id IS NULL THEN COALESCE(i.custo,0) ELSE COALESCE(pr.custo,0) END) c
        FROM itens i JOIN pedidos pd ON pd.id = i.pedido_id LEFT JOIN produtos pr ON pr.id = i.produto_id
        WHERE pd.status <> 'cancelado' AND pd.data BETWEEN ? AND ? GROUP BY pr.codigo, i.descricao ORDER BY q DESC, v DESC LIMIT 10", $per);
    $perso = $todos("SELECT CASE WHEN i.tipo = '' THEN 'Sem tipo' ELSE i.tipo END nome, SUM(i.qtd) q, SUM(i.qtd * i.preco) v, SUM(i.qtd * COALESCE(i.custo,0)) c
        FROM itens i JOIN pedidos pd ON pd.id = i.pedido_id WHERE pd.status <> 'cancelado' AND i.produto_id IS NULL AND pd.data BETWEEN ? AND ? GROUP BY nome ORDER BY v DESC", $per);
    $topCor = $todos("SELECT i.cor nome, SUM(i.qtd) q FROM itens i JOIN pedidos pd ON pd.id = i.pedido_id
        WHERE pd.status <> 'cancelado' AND i.cor <> '' AND pd.data BETWEEN ? AND ? GROUP BY i.cor ORDER BY q DESC LIMIT 8", $per);
    $topCli = $todos("SELECT cliente nome, COUNT(*) n, SUM(total) v FROM pedidos WHERE status <> 'cancelado' AND data BETWEEN ? AND ? GROUP BY cliente ORDER BY v DESC LIMIT 10", $per);
    $porStatus = $todos("SELECT status, COUNT(*) n, SUM(total) v FROM pedidos WHERE data BETWEEN ? AND ? GROUP BY status", $per);
    $porPag = $todos("SELECT pagamento nome, COUNT(*) n, SUM(total) v FROM pedidos WHERE status <> 'cancelado' AND data BETWEEN ? AND ? GROUP BY pagamento ORDER BY v DESC", $per);
    $porEnt = $todos("SELECT entrega nome, COUNT(*) n FROM pedidos WHERE status <> 'cancelado' AND data BETWEEN ? AND ? GROUP BY entrega", $per);
    $abertos = $um("SELECT COUNT(*) n, COALESCE(SUM(total),0) v FROM pedidos WHERE status IN ('novo','producao','pronto')");
    $est = $um("SELECT COUNT(*) n, COALESCE(SUM(estoque * custo),0) vc, COALESCE(SUM(estoque * preco),0) vv, COALESCE(SUM(estoque),0) q FROM produtos WHERE ativo = 1 AND controla = 1 AND estoque > 0");
    $zer = $todos("SELECT codigo, nome, estoque FROM produtos WHERE ativo = 1 AND controla = 1 AND estoque <= 1 ORDER BY estoque, nome LIMIT 40");
    $enc = $um("SELECT COUNT(*) n FROM produtos WHERE ativo = 1 AND controla = 0")['n'];
    $semCustoProd = $um("SELECT COUNT(*) n FROM produtos WHERE ativo = 1 AND COALESCE(custo,0) = 0")['n'];
    $mt = $todos("SELECT tipo, chave, SUM(qtd) q FROM metricas WHERE dia BETWEEN ? AND ? GROUP BY tipo, chave", $per);
    $site = ['visitas' => 0, 'paginas' => [], 'produtos' => [], 'adds' => [], 'enviar_pedido' => 0, 'enviar_contato' => 0, 'teste' => 0];
    foreach ($mt as $m) {
        $q = (int)$m['q'];
        if (strpos($m['tipo'], 't_') === 0) { $site['teste'] += $q; continue; }
        if ($m['tipo'] === 'visita') $site['visitas'] += $q;
        elseif ($m['tipo'] === 'pagina') $site['paginas'][$m['chave']] = $q;
        elseif ($m['tipo'] === 'produto') $site['produtos'][] = ['k' => $m['chave'], 'q' => $q];
        elseif ($m['tipo'] === 'add') $site['adds'][] = ['k' => $m['chave'], 'q' => $q];
        elseif ($m['tipo'] === 'enviar') { if ($m['chave'] === 'pedido') $site['enviar_pedido'] += $q; else $site['enviar_contato'] += $q; }
    }
    $nomes = [];
    foreach ($db->query("SELECT codigo, nome FROM produtos WHERE codigo <> ''")->fetchAll() as $pr) $nomes[$pr['codigo']] = $pr['nome'];
    $rot = function (array $l) use ($nomes) { usort($l, fn($a, $b) => $b['q'] <=> $a['q']); return array_map(fn($x) => ['codigo' => $x['k'], 'nome' => $nomes[$x['k']] ?? $x['k'], 'q' => $x['q']], array_slice($l, 0, 10)); };
    $site['produtos'] = $rot($site['produtos']); $site['adds'] = $rot($site['adds']);
    out(['resumo' => $resumo, 'dias' => $dias, 'top_produtos' => $topProd, 'top_cores' => $topCor, 'personalizados' => $perso, 'top_clientes' => $topCli, 'por_status' => $porStatus,
         'por_pagamento' => $porPag, 'por_entrega' => $porEnt, 'abertos' => ['n' => (int)$abertos['n'], 'v' => (float)$abertos['v']],
         'estoque' => ['n' => (int)$est['n'], 'pecas' => (int)$est['q'], 'valor_custo' => (float)$est['vc'], 'valor_venda' => (float)$est['vv'], 'baixo' => $zer, 'sob_encomenda' => (int)$enc, 'sem_custo' => (int)$semCustoProd],
         'site' => $site]);
}

}
