<?php
declare(strict_types=1);
/* AÇÕES: orçamentos. Um orçamento NÃO mexe no estoque nem nos relatórios de vendas.
   Só quando você clica em "Gerar pedido" ele vira um pedido de verdade (e aí baixa o estoque).
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). */

const STATUS_ORC = ['aberto', 'aprovado', 'recusado'];

function orcamentoOut(array $o, ?array $itens = null): array {
    $r = ['id' => (int)$o['id'], 'data' => $o['data'], 'validade' => (string)$o['validade'], 'cliente' => $o['cliente'], 'whatsapp' => $o['whatsapp'],
          'cliente_id' => empty($o['cliente_id']) ? null : (int)$o['cliente_id'], 'entrega' => $o['entrega'], 'endereco' => $o['endereco'], 'prazo' => $o['prazo'],
          'obs' => (string)$o['obs'], 'desconto' => (float)$o['desconto'], 'frete' => (float)$o['frete'], 'total' => (float)$o['total'],
          'status' => $o['status'], 'pedido_id' => empty($o['pedido_id']) ? null : (int)$o['pedido_id']];
    if ($itens !== null) $r['itens'] = array_map(fn($i) => [
        'produto_id' => $i['produto_id'] === null ? null : (int)$i['produto_id'], 'cor_id' => empty($i['cor_id']) ? null : (int)$i['cor_id'], 'cor' => (string)($i['cor'] ?? ''),
        'descricao' => $i['descricao'], 'codigo' => (string)($i['codigo'] ?? ''), 'qtd' => (int)$i['qtd'], 'preco' => (float)$i['preco'], 'tipo' => (string)($i['tipo'] ?? ''), 'detalhes' => (string)($i['detalhes'] ?? ''),
        'custo' => souAdmin() ? (float)($i['custo'] ?? 0) : 0], $itens);
    return $r;
}
function itensDoOrcamento(int $id): array {
    $s = db()->prepare('SELECT i.*, p.codigo AS codigo FROM orcamento_itens i LEFT JOIN produtos p ON p.id = i.produto_id WHERE i.orcamento_id = ? ORDER BY i.id'); $s->execute([$id]);
    return $s->fetchAll();
}

switch ($a) {

case 'orcamentos': {
    $st = txt($_GET['status'] ?? '', 20);
    $w = in_array($st, STATUS_ORC, true) ? 'WHERE status = ' . $db->quote($st) : '';
    $lista = array_map(function ($r) {
        $o = orcamentoOut($r);
        $it = itensDoOrcamento((int)$r['id']);
        $o['resumo'] = implode(', ', array_map(fn($i) => $i['qtd'] . 'x ' . $i['descricao'], array_slice($it, 0, 3))) . (count($it) > 3 ? '…' : '');
        return $o;
    }, $db->query("SELECT * FROM orcamentos $w ORDER BY id DESC LIMIT 300")->fetchAll());
    out(['orcamentos' => $lista]);
}

case 'orcamento': {
    $s = $db->prepare('SELECT * FROM orcamentos WHERE id = ?'); $s->execute([(int)($_GET['id'] ?? 0)]);
    $o = $s->fetch();
    if (!$o) fail('Orçamento não encontrado.', 404);
    out(['orcamento' => orcamentoOut($o, itensDoOrcamento((int)$o['id']))]);
}

case 'orcamento_salvar': {
    $id = (int)($in['id'] ?? 0);
    $cliente = txt($in['cliente'] ?? '', 120);
    if ($cliente === '') fail('Informe o nome do cliente.');
    $itens = montarItens($in['itens'] ?? []);
    $clienteId = !empty($in['cliente_id']) ? (int)$in['cliente_id'] : null;
    if ($clienteId) { $s = $db->prepare('SELECT id FROM clientes WHERE id = ?'); $s->execute([$clienteId]); if (!$s->fetch()) $clienteId = null; }
    if (!$clienteId) $clienteId = clientePorNome($cliente);
    $sub = 0.0; foreach ($itens as $i) $sub += $i['preco'] * $i['qtd'];
    $desc = max(0, num($in['desconto'] ?? 0)); $frete = max(0, num($in['frete'] ?? 0));
    $total = max(0, round($sub - $desc + $frete, 2));
    $data = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($in['data'] ?? '')) ? $in['data'] : date('Y-m-d');
    $val = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($in['validade'] ?? '')) ? $in['validade'] : date('Y-m-d', strtotime($data . ' +15 days'));   /* sem validade: 15 dias */
    $campos = [$data, $val, $cliente, $clienteId, preg_replace('/[^\d+() -]/', '', txt($in['whatsapp'] ?? '', 30)),
        in_array($in['entrega'] ?? '', ['Retirada', 'Entrega'], true) ? $in['entrega'] : 'Retirada', txt($in['endereco'] ?? '', 255), txt($in['prazo'] ?? '', 60),
        txt($in['obs'] ?? '', 1000), $desc, $frete, $total];
    $db->beginTransaction();
    try {
        if ($id) {
            $s = $db->prepare('SELECT status FROM orcamentos WHERE id = ?'); $s->execute([$id]); $velho = $s->fetch();
            if (!$velho) { $db->rollBack(); fail('Orçamento não encontrado.', 404); }
            if ($velho['status'] === 'aprovado') { $db->rollBack(); fail('Esse orçamento já virou pedido. Edite o pedido.'); }
            if (!souAdmin()) {   /* sem acesso a custo: mantém o que estava gravado */
                $velhos = []; foreach (itensDoOrcamento($id) as $o) $velhos[$o['descricao']] = (float)$o['custo'];
                foreach ($itens as &$it) if (!$it['produto_id']) $it['custo'] = $velhos[$it['descricao']] ?? 0; unset($it);
            }
            $db->prepare('UPDATE orcamentos SET data=?, validade=?, cliente=?, cliente_id=?, whatsapp=?, entrega=?, endereco=?, prazo=?, obs=?, desconto=?, frete=?, total=? WHERE id=?')->execute([...$campos, $id]);
            $db->prepare('DELETE FROM orcamento_itens WHERE orcamento_id = ?')->execute([$id]);
        } else {
            $db->prepare('INSERT INTO orcamentos (data, validade, cliente, cliente_id, whatsapp, entrega, endereco, prazo, obs, desconto, frete, total, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([...$campos, date('Y-m-d H:i:s')]);
            $id = (int)$db->lastInsertId();
        }
        foreach ($itens as $i) {
            $db->prepare('INSERT INTO orcamento_itens (orcamento_id, produto_id, cor_id, cor, descricao, qtd, preco, tipo, detalhes, custo) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute([$id, $i['produto_id'], $i['cor_id'], $i['cor'], $i['descricao'], $i['qtd'], $i['preco'], $i['tipo'], $i['detalhes'], $i['custo']]);
        }
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); fail('Não consegui salvar o orçamento.', 500); }
    out(['id' => $id]);
}

/* Recusar (ou reabrir) um orçamento. "Aprovado" só acontece pelo botão Gerar pedido. */
case 'orcamento_status': {
    $id = (int)($in['id'] ?? 0); $novo = (string)($in['status'] ?? '');
    if (!in_array($novo, ['aberto', 'recusado'], true)) fail('Status inválido.');
    $s = $db->prepare('SELECT status FROM orcamentos WHERE id = ?'); $s->execute([$id]); $o = $s->fetch();
    if (!$o) fail('Orçamento não encontrado.', 404);
    if ($o['status'] === 'aprovado') fail('Esse orçamento já virou pedido.');
    $db->prepare('UPDATE orcamentos SET status = ? WHERE id = ?')->execute([$novo, $id]);
    out(['ok' => true]);
}

/* Gerar pedido a partir do orçamento: copia cliente, itens e valores, baixa o estoque e liga os dois. */
case 'orcamento_gerar_pedido': {
    $id = (int)($in['id'] ?? 0);
    $s = $db->prepare('SELECT * FROM orcamentos WHERE id = ?'); $s->execute([$id]); $o = $s->fetch();
    if (!$o) fail('Orçamento não encontrado.', 404);
    if ($o['status'] === 'aprovado' || !empty($o['pedido_id'])) fail('Esse orçamento já virou o pedido PED-' . str_pad((string)$o['pedido_id'], 4, '0', STR_PAD_LEFT) . '.');
    $itens = itensDoOrcamento($id);
    if (!$itens) fail('O orçamento está sem itens.');
    $sinal = min(max(0, num($in['sinal'] ?? 0)), (float)$o['total']);
    $pago = ((float)$o['total'] > 0 && $sinal >= (float)$o['total']) ? 1 : 0;
    $db->beginTransaction();
    try {
        $db->prepare('INSERT INTO pedidos (data, cliente, whatsapp, pagamento, pago, entrega, endereco, prazo, obs, desconto, frete, total, status, cliente_id, pago_valor, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
           ->execute([date('Y-m-d'), $o['cliente'], $o['whatsapp'], 'Pix', $pago, $o['entrega'], $o['endereco'], $o['prazo'], $o['obs'], $o['desconto'], $o['frete'], $o['total'], 'novo', $o['cliente_id'], $sinal, date('Y-m-d H:i:s')]);
        $pid = (int)$db->lastInsertId();
        foreach ($itens as $i) $db->prepare('INSERT INTO itens (pedido_id, produto_id, cor_id, cor, descricao, qtd, preco, tipo, detalhes, custo) VALUES (?,?,?,?,?,?,?,?,?,?)')
            ->execute([$pid, $i['produto_id'], $i['cor_id'], $i['cor'], $i['descricao'], $i['qtd'], $i['preco'], $i['tipo'], $i['detalhes'], $i['custo']]);
        baixaDoPedido($pid, $itens, 'novo');
        $db->prepare("UPDATE orcamentos SET status = 'aprovado', pedido_id = ? WHERE id = ?")->execute([$pid, $id]);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); fail('Não consegui gerar o pedido.', 500); }
    $neg = [];
    foreach ($itens as $i) {
        if (empty($i['produto_id'])) continue;
        $q = $db->prepare('SELECT nome FROM produtos WHERE id = ? AND controla = 1 AND estoque < 0'); $q->execute([(int)$i['produto_id']]);
        if ($r = $q->fetch()) $neg[] = $r['nome'];
    }
    auditar('Orçamento virou pedido', 'orçamento #' . $id . ' ' . $o['cliente'], 'pedido #' . $pid . '; total ' . number_format((float)$o['total'], 2, ',', '.'));
    out(['pedido_id' => $pid, 'avisos' => array_values(array_unique($neg))]);
}

}
