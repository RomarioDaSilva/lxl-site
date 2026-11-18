<?php
declare(strict_types=1);
/* AÇÕES: clientes.
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Cada "case" é um endereço da API: api.php?a=NOME. */
switch ($a) {

case 'clientes':
    out(['clientes' => listaClientes()]);

/* Histórico do cliente: todos os pedidos dele, última compra, quanto já comprou e quanto ainda deve. */
case 'cliente': {
    $id = (int)($_GET['id'] ?? 0);
    $um = null; foreach (listaClientes() as $c) if ($c['id'] === $id) $um = $c;
    if (!$um) fail('Cliente não encontrado.', 404);
    $s = $db->prepare('SELECT * FROM pedidos WHERE cliente_id = ? ORDER BY data DESC, id DESC'); $s->execute([$id]);   /* só os pedidos ligados a este cliente */
    $peds = []; $deve = 0.0;
    foreach ($s->fetchAll() as $r) {
        $o = pedidoOut($r);
        $it = itensDoPedido((int)$r['id']);
        $o['resumo'] = implode(', ', array_map(fn($i) => $i['qtd'] . 'x ' . $i['descricao'], array_slice($it, 0, 3))) . (count($it) > 3 ? '…' : '');
        if ($r['status'] !== 'cancelado') $deve += $o['saldo'];
        $peds[] = $o;
    }
    $um['deve'] = round($deve, 2);
    out(['cliente' => $um, 'pedidos' => $peds]);
}

case 'cliente_salvar': {
    $id = (int)($in['id'] ?? 0);
    $nome = txt($in['nome'] ?? '', 120);
    if ($nome === '') fail('Informe o nome do cliente.');
    $tel = preg_replace('/[^\d+() -]/', '', txt($in['telefone'] ?? '', 30));
    $f = [$nome, $tel, txt($in['endereco'] ?? '', 255), txt($in['cidade'] ?? '', 80), txt($in['obs'] ?? '', 255)];
    if ($id) {
        $db->prepare('UPDATE clientes SET nome=?, telefone=?, endereco=?, cidade=?, obs=? WHERE id=?')->execute([...$f, $id]);
    } else {
        $digs = preg_replace('/\D/', '', $tel);
        if (strlen($digs) >= 8) {
            foreach ($db->query('SELECT id, nome, telefone FROM clientes')->fetchAll() as $c) {
                if (preg_replace('/\D/', '', $c['telefone']) === $digs) fail('Já existe um cliente com esse telefone: ' . $c['nome'] . '.');
            }
        }
        $db->prepare('INSERT INTO clientes (nome, telefone, endereco, cidade, obs, criado_em) VALUES (?,?,?,?,?,?)')->execute([...$f, date('Y-m-d H:i:s')]);
        $id = (int)$db->lastInsertId();
    }
    $todos = listaClientes();
    $um = null; foreach ($todos as $c) if ($c['id'] === $id) $um = $c;
    out(['cliente' => $um, 'clientes' => $todos]);
}

case 'cliente_excluir': {
    $id = (int)($in['id'] ?? 0);
    $db->prepare('UPDATE pedidos SET cliente_id = NULL WHERE cliente_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM clientes WHERE id = ?')->execute([$id]);
    out(['clientes' => listaClientes()]);
}

}
