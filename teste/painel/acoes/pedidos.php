<?php
declare(strict_types=1);
/* AÇÕES: pedidos.
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Cada "case" é um endereço da API: api.php?a=NOME. */
switch ($a) {

case 'pedidos': {
    $w = []; $p = [];
    $st = txt($_GET['status'] ?? '', 20);
    if ($st === 'abertos') { $w[] = "status IN ('novo','producao','pronto')"; }
    elseif (in_array($st, STATUS, true)) { $w[] = 'status = ?'; $p[] = $st; }
    $q = txt($_GET['q'] ?? '', 60);
    if ($q !== '') { $w[] = '(cliente LIKE ? OR whatsapp LIKE ? OR CAST(id AS CHAR) = ?)'; $p[] = "%$q%"; $p[] = "%$q%"; $p[] = ltrim($q, '#0'); }
    $sql = 'SELECT * FROM pedidos' . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . ' ORDER BY id DESC LIMIT 300';
    $s = $db->prepare($sql); $s->execute($p);
    $lista = array_map(function ($r) {
        $o = pedidoOut($r);
        $it = itensDoPedido((int)$r['id']);
        $o['resumo'] = implode(', ', array_map(fn($i) => $i['qtd'] . 'x ' . $i['descricao'], array_slice($it, 0, 3))) . (count($it) > 3 ? '…' : '');
        return $o;
    }, $s->fetchAll());
    $mes = date('Y-m');
    $r = $db->prepare("SELECT COALESCE(SUM(total),0) t, COUNT(*) n FROM pedidos WHERE status <> 'cancelado' AND data LIKE ?");
    $r->execute([$mes . '%']);
    $m = $r->fetch();
    $ab = (int)$db->query("SELECT COUNT(*) FROM pedidos WHERE status IN ('novo','producao','pronto')")->fetchColumn();
    $ap = (float)$db->query("SELECT COALESCE(SUM(total - COALESCE(pago_valor,0)),0) FROM pedidos WHERE pago = 0 AND status NOT IN ('cancelado')")->fetchColumn();
    out(['pedidos' => $lista, 'resumo' => ['mes_total' => (float)$m['t'], 'mes_qtd' => (int)$m['n'], 'abertos' => $ab, 'a_receber' => $ap]]);
}

case 'pedido': {
    $s = $db->prepare('SELECT * FROM pedidos WHERE id = ?'); $s->execute([(int)($_GET['id'] ?? 0)]);
    $p = $s->fetch();
    if (!$p) fail('Pedido não encontrado.', 404);
    out(['pedido' => pedidoOut($p, itensDoPedido((int)$p['id']))]);
}

case 'pedido_salvar': {
    $id = (int)($in['id'] ?? 0);
    $cliente = txt($in['cliente'] ?? '', 120);
    if ($cliente === '') fail('Informe o nome do cliente.');
    $itens = montarItens($in['itens'] ?? []);   /* confere e limpa os itens (função em dados.php) */
    $clienteId = !empty($in['cliente_id']) ? (int)$in['cliente_id'] : null;
    if ($clienteId) { $s = $db->prepare('SELECT id FROM clientes WHERE id = ?'); $s->execute([$clienteId]); if (!$s->fetch()) $clienteId = null; }
    if (!$clienteId) $clienteId = clientePorNome($cliente);
    $sub = 0.0; foreach ($itens as $i) $sub += $i['preco'] * $i['qtd'];
    $desc = max(0, num($in['desconto'] ?? 0)); $frete = max(0, num($in['frete'] ?? 0));
    $total = max(0, round($sub - $desc + $frete, 2));
    $pagoValor = max(0, num($in['pago_valor'] ?? 0)); $pago = empty($in['pago']) ? 0 : 1;
    if ($pago || ($total > 0 && $pagoValor >= $total)) { $pago = 1; $pagoValor = $total; }   /* pagou tudo = pedido pago */
    $pagoValor = min($pagoValor, $total);
    $status = in_array($in['status'] ?? '', STATUS, true) ? $in['status'] : 'novo';
    $data = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($in['data'] ?? '')) ? $in['data'] : date('Y-m-d');
    $campos = [$data, $cliente, preg_replace('/[^\d+() -]/', '', txt($in['whatsapp'] ?? '', 30)), txt($in['pagamento'] ?? '', 30),
        $pago, in_array($in['entrega'] ?? '', ['Retirada', 'Entrega'], true) ? $in['entrega'] : 'Retirada',
        txt($in['endereco'] ?? '', 255), txt($in['prazo'] ?? '', 60), txt($in['obs'] ?? '', 1000), $desc, $frete, $total, $status, $clienteId, $pagoValor];
    $db->beginTransaction();
    try {
        if ($id) {
            $s = $db->prepare('SELECT status FROM pedidos WHERE id = ?'); $s->execute([$id]);
            $velho = $s->fetch();
            if (!$velho) { $db->rollBack(); fail('Pedido não encontrado.', 404); }
            if ($velho['status'] !== 'cancelado') ajustarEstoque(itensDoPedido($id), +1, true);   /* volta ao estado de antes do pedido (inclui desfazer a entrada de "pronto") */
            $db->prepare('UPDATE pedidos SET data=?, cliente=?, whatsapp=?, pagamento=?, pago=?, entrega=?, endereco=?, prazo=?, obs=?, desconto=?, frete=?, total=?, status=?, cliente_id=?, pago_valor=? WHERE id=?')->execute([...$campos, $id]);
            if (!souAdmin()) {   /* quem não é admin não vê custo: mantém o custo que já estava gravado em cada item personalizado */
                $velhos = []; foreach (itensDoPedido($id) as $o) $velhos[$o['descricao']] = (float)$o['custo'];
                foreach ($itens as &$it) if (!$it['produto_id']) $it['custo'] = $velhos[$it['descricao']] ?? 0; unset($it);
            }
            $db->prepare('DELETE FROM itens WHERE pedido_id = ?')->execute([$id]);
        } else {
            $db->prepare('INSERT INTO pedidos (data, cliente, whatsapp, pagamento, pago, entrega, endereco, prazo, obs, desconto, frete, total, status, cliente_id, pago_valor, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([...$campos, date('Y-m-d H:i:s')]);
            $id = (int)$db->lastInsertId();
        }
        foreach ($itens as $i) {
            $db->prepare('INSERT INTO itens (pedido_id, produto_id, cor_id, cor, descricao, qtd, preco, tipo, detalhes, custo) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute([$id, $i['produto_id'], $i['cor_id'], $i['cor'], $i['descricao'], $i['qtd'], $i['preco'], $i['tipo'], $i['detalhes'], $i['custo']]);
        }
        if ($status !== 'cancelado') baixaDoPedido($id, $itens, $status);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        fail('Não consegui salvar o pedido.', 500);
    }
    $neg = [];
    foreach ($itens as $i) {
        if (!$i['produto_id']) continue;
        $s = $db->prepare('SELECT nome, estoque FROM produtos WHERE id = ? AND controla = 1 AND estoque < 0'); $s->execute([$i['produto_id']]);
        if ($r = $s->fetch()) $neg[] = $r['nome'];
        if ($i['cor_id']) {
            $s = $db->prepare('SELECT p.nome, c.nome AS cor FROM produto_cores pc JOIN produtos p ON p.id = pc.produto_id JOIN cores c ON c.id = pc.cor_id WHERE pc.produto_id = ? AND pc.cor_id = ? AND pc.qtd < 0');
            $s->execute([$i['produto_id'], $i['cor_id']]);
            if ($r = $s->fetch()) $neg[] = $r['nome'] . ' (' . $r['cor'] . ')';
        }
    }
    out(['id' => $id, 'avisos' => array_values(array_unique($neg))]);
}

/* Recebimento de uma parte (sinal) ou do saldo. Soma ao que já foi pago; se completar o total, o pedido vira "pago". */
case 'pedido_receber': {
    $id = (int)($in['id'] ?? 0); $v = num($in['valor'] ?? 0);
    $s = $db->prepare('SELECT * FROM pedidos WHERE id = ?'); $s->execute([$id]); $p = $s->fetch();
    if (!$p) fail('Pedido não encontrado.', 404);
    if ($v <= 0) fail('Informe quanto o cliente pagou.');
    $o = pedidoOut($p);
    if ($o['saldo'] <= 0) fail('Esse pedido já está todo pago.');
    $novo = round(min($o['total'], $o['pago_valor'] + $v), 2);
    $quitou = $novo >= $o['total'] ? 1 : 0;
    $db->prepare('UPDATE pedidos SET pago_valor = ?, pago = ? WHERE id = ?')->execute([$novo, $quitou, $id]);
    auditar('Pagamento recebido', 'pedido #' . $id . ' ' . $p['cliente'], 'recebido: ' . number_format($v, 2, ',', '.') . '; ' . ($quitou ? 'pedido quitado' : 'falta: ' . number_format($o['total'] - $novo, 2, ',', '.')));
    out(['ok' => true, 'pago_valor' => $novo, 'saldo' => round($o['total'] - $novo, 2), 'pago' => $quitou]);
}

case 'pedido_status': {
    $id = (int)($in['id'] ?? 0);
    $s = $db->prepare('SELECT * FROM pedidos WHERE id = ?'); $s->execute([$id]);
    $p = $s->fetch();
    if (!$p) fail('Pedido não encontrado.', 404);
    $novo = $in['status'] ?? $p['status'];
    if (!in_array($novo, STATUS, true)) fail('Status inválido.');
    $pago = array_key_exists('pago', $in) ? (empty($in['pago']) ? 0 : 1) : (int)$p['pago'];
    $db->beginTransaction();
    $ant = $p['status'];
    if ($ant !== 'cancelado' && $novo === 'cancelado') { ajustarEstoque(itensDoPedido($id), +1); zerarFaltas($id); }   /* peças voltam ao estoque */
    elseif ($ant === 'cancelado' && $novo !== 'cancelado') baixaDoPedido($id, itensDoPedido($id), $novo);
    elseif ($ant !== 'cancelado') {
        $eraP = in_array($ant, STATUS_PRODUZIDO, true); $viraP = in_array($novo, STATUS_PRODUZIDO, true);
        if ($viraP && !$eraP) creditarProducao($id);        /* ficou pronto: o que faltava entra no estoque */
        if (!$viraP && $eraP) desfazerProducao($id);        /* voltou para antes de pronto: tira a entrada */
    }
    $pv = $pago ? (float)$p['total'] : ((int)$p['pago'] ? 0 : (float)($p['pago_valor'] ?? 0));   /* marcou pago: recebeu tudo; desmarcou: zera */
    $db->prepare('UPDATE pedidos SET status = ?, pago = ?, pago_valor = ? WHERE id = ?')->execute([$novo, $pago, $pv, $id]);
    $db->commit();
    out(['ok' => true]);
}

}
