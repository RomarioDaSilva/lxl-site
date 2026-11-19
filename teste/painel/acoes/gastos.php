<?php
declare(strict_types=1);
/* AÇÕES: custos e investimentos (tabela "gastos"). Só o administrador usa (não está na lista do perfil "Pedidos").
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Os gastos NÃO entram no histórico, para não aparecerem para ninguém. */
const GASTO_TIPOS = ['investimento', 'variavel', 'fixo'];

function gastoLinha(array $r): array {
    return ['id' => (int)$r['id'], 'data' => $r['data'], 'tipo' => $r['tipo'], 'categoria' => $r['categoria'], 'descricao' => $r['descricao'], 'fornecedor' => $r['fornecedor'],
            'qtd' => (float)$r['qtd'], 'valor_unit' => (float)$r['valor_unit'], 'total' => round((float)$r['qtd'] * (float)$r['valor_unit'], 2), 'pagamento' => $r['pagamento'], 'obs' => (string)$r['obs']];
}
function gastoLer(array $in): array {
    $data = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($in['data'] ?? '')) ? $in['data'] : date('Y-m-d');
    $tipo = in_array($in['tipo'] ?? '', GASTO_TIPOS, true) ? $in['tipo'] : 'variavel';
    $desc = txt($in['descricao'] ?? '', 255);
    if ($desc === '') fail('Escreva o que foi comprado.');
    $qtd = max(0.01, num($in['qtd'] ?? 1)); $v = max(0, num($in['valor_unit'] ?? 0));
    return [$data, $tipo, txt($in['categoria'] ?? '', 60), $desc, txt($in['fornecedor'] ?? '', 120), $qtd, $v, txt($in['pagamento'] ?? '', 40), txt($in['obs'] ?? '', 2000)];
}
switch ($a) {

case 'gastos': {
    $linhas = array_map('gastoLinha', $db->query('SELECT * FROM gastos ORDER BY data DESC, id DESC')->fetchAll());
    $tot = 0.0; $porTipo = []; $porCat = []; $porMes = [];
    foreach ($linhas as $g) {
        $tot += $g['total'];
        $porTipo[$g['tipo']] = ($porTipo[$g['tipo']] ?? 0) + $g['total'];
        $c = $g['categoria'] !== '' ? $g['categoria'] : 'Sem categoria'; $porCat[$c] = ($porCat[$c] ?? 0) + $g['total'];
        $m = substr($g['data'], 0, 7); $porMes[$m] = ($porMes[$m] ?? 0) + $g['total'];
    }
    arsort($porCat); ksort($porMes);
    /* dinheiro que já entrou: o que foi pago nos pedidos que não estão cancelados */
    $rec = 0.0; $aRec = 0.0;
    foreach ($db->query("SELECT total, pago, pago_valor FROM pedidos WHERE status <> 'cancelado'")->fetchAll() as $p) {
        $t = (float)$p['total']; $pv = !empty($p['pago']) ? $t : min(max(0.0, (float)$p['pago_valor']), $t);
        $rec += $pv; $aRec += $t - $pv;
    }
    out(['gastos' => $linhas, 'resumo' => ['total' => round($tot, 2), 'por_tipo' => array_map(fn($x) => round($x, 2), $porTipo), 'por_categoria' => array_map(fn($x) => round($x, 2), $porCat),
         'por_mes' => array_map(fn($x) => round($x, 2), $porMes), 'recebido' => round($rec, 2), 'a_receber' => round($aRec, 2), 'qtd' => count($linhas)]]);
}
case 'gasto_salvar': {
    $id = (int)($in['id'] ?? 0);
    [$data, $tipo, $cat, $desc, $forn, $qtd, $v, $pag, $obs] = gastoLer($in);
    if ($id) {
        $s = $db->prepare('SELECT id FROM gastos WHERE id = ?'); $s->execute([$id]); if (!$s->fetch()) fail('Esse custo não existe mais. Atualize a página.', 404);
        $db->prepare('UPDATE gastos SET data=?, tipo=?, categoria=?, descricao=?, fornecedor=?, qtd=?, valor_unit=?, pagamento=?, obs=? WHERE id=?')->execute([$data, $tipo, $cat, $desc, $forn, $qtd, $v, $pag, $obs, $id]);
    } else {
        $db->prepare('INSERT INTO gastos (data, tipo, categoria, descricao, fornecedor, qtd, valor_unit, pagamento, obs, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute([$data, $tipo, $cat, $desc, $forn, $qtd, $v, $pag, $obs, date('Y-m-d H:i:s')]);
        $id = (int)$db->lastInsertId();
    }
    out(['id' => $id]);
}
case 'gasto_excluir': {
    $db->prepare('DELETE FROM gastos WHERE id = ?')->execute([(int)($in['id'] ?? 0)]);
    out(['ok' => true]);
}
case 'gastos_importar': {
    /* Importa a lista do CSV do projeto. Não duplica: se já existir um custo com a mesma data, descrição, quantidade e valor, pula. */
    $lista = $in['lista'] ?? [];
    if (!is_array($lista)) fail('Lista inválida.');
    $novos = 0; $pulados = 0;
    $db->beginTransaction();
    foreach (array_slice($lista, 0, 1000) as $l) {
        if (!is_array($l)) continue;
        [$data, $tipo, $cat, $desc, $forn, $qtd, $v, $pag, $obs] = gastoLer($l);
        $s = $db->prepare('SELECT id FROM gastos WHERE data = ? AND descricao = ? AND qtd = ? AND valor_unit = ?'); $s->execute([$data, $desc, $qtd, $v]);
        if ($s->fetch()) { $pulados++; continue; }
        $db->prepare('INSERT INTO gastos (data, tipo, categoria, descricao, fornecedor, qtd, valor_unit, pagamento, obs, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute([$data, $tipo, $cat, $desc, $forn, $qtd, $v, $pag, $obs, date('Y-m-d H:i:s')]);
        $novos++;
    }
    $db->commit();
    out(['novos' => $novos, 'pulados' => $pulados]);
}

}
