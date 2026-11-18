<?php
declare(strict_types=1);
/* FUNÇÕES DE DADOS: leitura e montagem de produtos, categorias, clientes e pedidos. */
/* ---------- utilidades ---------- */
function txt($v, int $max): string {
    $v = trim((string)($v ?? ''));
    return mb_substr($v, 0, $max);
}
function num($v): float {
    if (is_string($v)) $v = str_replace(',', '.', $v);
    return is_numeric($v) ? round((float)$v, 2) : 0.0;
}
/* Link do modelo: só aceita endereço http ou https (qualquer outra coisa vira vazio). */
function linkOk($v): string {
    $v = txt($v, 500);
    return preg_match('#^https?://[^\s]+$#i', $v) ? $v : '';
}
function produtoOut(array $p, array $mapaCores = [], array $mapaCat = []): array {
    $r = [
        'categorias' => $mapaCat[(int)$p['id']] ?? [],
        'id' => (int)$p['id'], 'codigo' => $p['codigo'], 'nome' => $p['nome'],
        'preco' => (float)$p['preco'], 'controla' => (int)$p['controla'],
        'estoque' => (int)$p['estoque'], 'ativo' => (int)$p['ativo'], 'obs' => $p['obs'], 'link' => (string)($p['link'] ?? ''),
        'usa_cores' => (int)($p['usa_cores'] ?? 0),
        'cores' => $mapaCores[(int)$p['id']] ?? [],
        'peso_g' => (float)($p['peso_g'] ?? 0), 'tempo_min' => (int)($p['tempo_min'] ?? 0), 'material' => $p['material'] ?? 'PLA',
        'perda_pct' => (float)($p['perda_pct'] ?? 10), 'extras' => (float)($p['extras'] ?? 0),
        'embalagem' => (float)($p['embalagem'] ?? 0.8), 'custo' => (float)($p['custo'] ?? 0), 'preco_kg' => (float)($p['preco_kg'] ?? 0),
    ];
    if (!souAdmin()) foreach (['peso_g', 'tempo_min', 'perda_pct', 'extras', 'embalagem', 'custo', 'preco_kg'] as $k) $r[$k] = 0;   /* custos só o administrador vê */
    return $r;
}
function mapaDeCores(): array {
    $r = db()->query('SELECT pc.produto_id, pc.cor_id, pc.qtd, c.nome, c.hex FROM produto_cores pc JOIN cores c ON c.id = pc.cor_id ORDER BY c.nome')->fetchAll();
    $m = [];
    foreach ($r as $x) $m[(int)$x['produto_id']][] = ['cor_id' => (int)$x['cor_id'], 'nome' => $x['nome'], 'hex' => $x['hex'], 'qtd' => (int)$x['qtd']];
    return $m;
}
function mapaDeCategorias(): array {
    $m = [];
    foreach (db()->query('SELECT produto_id, categoria_id FROM produto_categorias')->fetchAll() as $x) $m[(int)$x['produto_id']][] = (int)$x['categoria_id'];
    return $m;
}
function listaDeCategorias(): array {
    $n = [];
    foreach (db()->query('SELECT categoria_id, COUNT(*) c FROM produto_categorias GROUP BY categoria_id')->fetchAll() as $x) $n[(int)$x['categoria_id']] = (int)$x['c'];
    return array_map(fn($c) => ['id' => (int)$c['id'], 'nome' => $c['nome'], 'parent_id' => $c['parent_id'] === null ? null : (int)$c['parent_id'], 'ordem' => (int)$c['ordem'], 'visivel' => (int)($c['ativo'] ?? 1), 'qtd' => $n[(int)$c['id']] ?? 0],
        db()->query('SELECT * FROM categorias ORDER BY ordem, nome')->fetchAll());
}
function categoriaGarantir(string $nome, ?int $pai): int {
    $db = db();
    $s = $pai === null ? $db->prepare('SELECT id FROM categorias WHERE nome = ? AND parent_id IS NULL') : $db->prepare('SELECT id FROM categorias WHERE nome = ? AND parent_id = ?');
    $s->execute($pai === null ? [$nome] : [$nome, $pai]);
    $id = $s->fetchColumn();
    if ($id) return (int)$id;
    if ($pai === null) { $o = $db->query('SELECT COALESCE(MAX(ordem),0)+1 FROM categorias WHERE parent_id IS NULL')->fetchColumn(); }
    else { $q = $db->prepare('SELECT COALESCE(MAX(ordem),0)+1 FROM categorias WHERE parent_id = ?'); $q->execute([$pai]); $o = $q->fetchColumn(); }
    $db->prepare('INSERT INTO categorias (nome, parent_id, ordem) VALUES (?,?,?)')->execute([$nome, $pai, (int)$o]);
    return (int)$db->lastInsertId();
}
/* Liga o nome da seção do catálogo antigo à subcategoria de Natal. Só é usado na criação inicial das categorias
   e quando se importa itens do catálogo. Mudar aqui não altera o que já está salvo. */
const SECOES_NATAL = ['Presépio' => 'Presépios', 'Árvores de Natal' => 'Árvores de Natal', 'Decoração de árvore' => 'Decoração de árvore', 'Feliz Natal' => 'Feliz Natal',
    'Mini Papais Noel' => 'Mini Papais Noel', 'Decorações de mesa' => 'Decoração de mesa', 'Bombonieri e lembrancinhas' => 'Bomboniere e lembrancinhas'];
/* Seção do catálogo religioso -> subcategoria de Religioso no painel */
const SECOES_RELIGIOSO = ['Imagens' => 'Imagens', 'Santos' => 'Santos', 'Cruzes' => 'Cruzes', 'Porta-textos' => 'Porta-textos'];
/* Seção do catálogo de chaveiros -> subcategoria de Chaveiros no painel */
const SECOES_CHAVEIROS = ['Patch' => 'Patch', 'Pet' => 'Pet', 'Heróis' => 'Heróis'];
/* Lê o índice de cada catálogo do site (natal, religioso e chaveiros): código => [catálogo, seção]. Catálogo novo: acrescente a pasta na lista. */
function secoesDoCatalogo(): array {
    $m = [];
    foreach (['natal', 'religioso', 'chaveiros'] as $cat) {
        $f = __DIR__ . '/../' . $cat . '/busca-indice.json';
        $d = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
        if (is_array($d)) foreach ($d as $x) { $k = strtoupper(trim((string)($x['sku'] ?? ''))); if ($k !== '') $m[$k] = ['cat' => $cat, 'sec' => trim((string)($x['secao'] ?? ''))]; }
    }
    return $m;
}
/* Próximo código livre (0001, 0002...): maior número já usado no painel OU nos catálogos do site, mais 1. Não reaproveita código. */
function proximoCodigo(): string {
    $max = 0;
    foreach (db()->query("SELECT codigo FROM produtos")->fetchAll(PDO::FETCH_COLUMN) as $c) if (preg_match('/^\d+$/', (string)$c)) $max = max($max, (int)$c);
    foreach (array_keys(secoesDoCatalogo()) as $c) if (preg_match('/^\d+$/', (string)$c)) $max = max($max, (int)$c);
    return str_pad((string)($max + 1), 4, '0', STR_PAD_LEFT);
}
/* coloca o produto nas categorias conforme a seção que ele tinha no catálogo (só junta, nunca tira) */
function ligarAoCatalogo(int $pid, string $codigo, array $secoes): void {
    $x = $secoes[strtoupper($codigo)] ?? null; if ($x === null) return;
    $alvos = [];
    if ($x['cat'] === 'religioso') {
        $alvos[] = categoriaGarantir(SECOES_RELIGIOSO[$x['sec']] ?? 'Imagens', categoriaGarantir('Religioso', null));
    } elseif ($x['cat'] === 'chaveiros') {
        $alvos[] = categoriaGarantir(SECOES_CHAVEIROS[$x['sec']] ?? 'Patch', categoriaGarantir('Chaveiros', null));
    } else {
        $sec = $x['sec']; $natal = categoriaGarantir('Natal', null);
        if (isset(SECOES_NATAL[$sec])) {
            $alvos[] = categoriaGarantir(SECOES_NATAL[$sec], $natal);
            if ($sec === 'Presépio') $alvos[] = categoriaGarantir('Presépios', categoriaGarantir('Religioso', null));
        } else $alvos[] = $natal;
    }
    foreach ($alvos as $cid) {
        $q = db()->prepare('SELECT 1 FROM produto_categorias WHERE produto_id = ? AND categoria_id = ?'); $q->execute([$pid, $cid]);
        if (!$q->fetch()) db()->prepare('INSERT INTO produto_categorias (produto_id, categoria_id) VALUES (?,?)')->execute([$pid, $cid]);
    }
}
/* Para recriar essa estrutura inicial depois de apagada: no phpMyAdmin, tabela "parametros", apague a linha com chave seed_cat
   e abra o painel de novo. Ela só ADICIONA o que faltar, não apaga nada. */
/* cria a estrutura inicial UMA vez só (depois disso, o que você apagar não volta) */
function semearCategorias(): void {
    $db = db();
    $q = $db->prepare('SELECT valor FROM parametros WHERE chave = ?'); $q->execute(['seed_cat']);
    if ($q->fetch()) return;
    $db->beginTransaction();
    try {
        $arvore = ['Natal' => array_values(array_unique(array_values(SECOES_NATAL))),
                   'Chaveiros' => ['Pet', 'Academia', 'Brinquedos', 'Sensoriais'], 'Brinquedos' => [], 'Decoração' => [],
                   'Religioso' => ['Santos', 'Cruzes', 'Imagens', 'Presépios', 'Porta-textos'], 'Peças personalizadas' => []];
        foreach ($arvore as $pai => $filhas) { $pid = categoriaGarantir($pai, null); foreach ($filhas as $f) categoriaGarantir($f, $pid); }
        $sec = secoesDoCatalogo();
        foreach ($db->query('SELECT id, codigo FROM produtos')->fetchAll() as $p) if ($p['codigo'] !== '') ligarAoCatalogo((int)$p['id'], $p['codigo'], $sec);
        $db->prepare('INSERT INTO parametros (chave, valor) VALUES (?, ?)')->execute(['seed_cat', '1']);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); }
}
function listaDeCores(): array {
    return array_map(fn($c) => ['id' => (int)$c['id'], 'nome' => $c['nome'], 'hex' => $c['hex']], db()->query('SELECT * FROM cores ORDER BY nome')->fetchAll());
}
/* Valores iniciais dos custos (energia, impressora, filamento...). O que você salvar na Calculadora tem prioridade sobre estes. */
const PARAMS_PADRAO = ['energia_kwh' => 1.17, 'potencia_w' => 100, 'valor_impressora' => 2461.04, 'vida_util_h' => 5000,
    'margem_pct' => 45, 'imposto_pct' => 0, 'preco_kg_pla' => 88, 'preco_kg_petg' => 57, 'embalagem_fixa' => 0.80, 'perda_pct' => 10];
function parametros(): array {
    $p = PARAMS_PADRAO;
    foreach (db()->query('SELECT chave, valor FROM parametros')->fetchAll() as $r) {
        if (array_key_exists($r['chave'], $p) && is_numeric($r['valor'])) $p[$r['chave']] = (float)$r['valor'];
    }
    return $p;
}
function produtoPorId(int $id): ?array {
    $s = db()->prepare('SELECT * FROM produtos WHERE id = ?'); $s->execute([$id]);
    $p = $s->fetch();
    return $p ? produtoOut($p, mapaDeCores(), mapaDeCategorias()) : null;
}
function clienteOut(array $c): array {
    return ['id' => (int)$c['id'], 'codigo' => 'CLI-' . sprintf('%04d', (int)$c['id']), 'nome' => $c['nome'], 'telefone' => $c['telefone'],
            'endereco' => $c['endereco'], 'cidade' => $c['cidade'], 'obs' => $c['obs'],
            'pedidos' => (int)($c['n_pedidos'] ?? 0), 'total' => (float)($c['total_pedidos'] ?? 0), 'ultima' => (string)($c['ultima_compra'] ?? '')];
}
function listaClientes(): array {
    $r = db()->query("SELECT c.*, (SELECT COUNT(*) FROM pedidos p WHERE p.cliente_id = c.id AND p.status <> 'cancelado') AS n_pedidos,
        (SELECT COALESCE(SUM(p.total),0) FROM pedidos p WHERE p.cliente_id = c.id AND p.status <> 'cancelado') AS total_pedidos,
        (SELECT MAX(p.data) FROM pedidos p WHERE p.cliente_id = c.id AND p.status <> 'cancelado') AS ultima_compra
        FROM clientes c ORDER BY c.nome")->fetchAll();
    return array_map('clienteOut', $r);
}
function pedidoOut(array $p, ?array $itens = null): array {
    $r = [
        'id' => (int)$p['id'], 'data' => $p['data'], 'cliente' => $p['cliente'], 'whatsapp' => $p['whatsapp'],
        'pagamento' => $p['pagamento'], 'pago' => (int)$p['pago'], 'entrega' => $p['entrega'],
        'endereco' => $p['endereco'], 'prazo' => $p['prazo'], 'obs' => (string)$p['obs'],
        'desconto' => (float)$p['desconto'], 'frete' => (float)$p['frete'], 'total' => (float)$p['total'],
        'status' => $p['status'], 'cliente_id' => empty($p['cliente_id']) ? null : (int)$p['cliente_id'],
    ];
    /* Pagamento parcial: pago_valor é o que já entrou (sinal) e saldo é o que falta. Pedido marcado como pago = saldo zero. */
    $tot = (float)$p['total']; $pv = !empty($p['pago']) ? $tot : min(max(0.0, (float)($p['pago_valor'] ?? 0)), $tot);
    $r['pago_valor'] = round($pv, 2); $r['saldo'] = round($tot - $pv, 2);
    if ($itens !== null) {
        $r['itens'] = array_map(fn($i) => [
            'produto_id' => $i['produto_id'] === null ? null : (int)$i['produto_id'],
            'cor_id' => empty($i['cor_id']) ? null : (int)$i['cor_id'], 'cor' => (string)($i['cor'] ?? ''),
            'descricao' => $i['descricao'], 'qtd' => (int)$i['qtd'], 'preco' => (float)$i['preco'],
            'tipo' => (string)($i['tipo'] ?? ''), 'detalhes' => (string)($i['detalhes'] ?? ''), 'custo' => souAdmin() ? (float)($i['custo'] ?? 0) : 0,
        ], $itens);
    }
    return $r;
}
function itensDoPedido(int $id): array {
    $s = db()->prepare('SELECT * FROM itens WHERE pedido_id = ? ORDER BY id');
    $s->execute([$id]);
    return $s->fetchAll();
}
function ajustarEstoque(array $itens, int $sinal): void {
    $db = db();
    foreach ($itens as $i) {
        if (empty($i['produto_id'])) continue;
        $db->prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ? AND controla = 1')
           ->execute([$sinal * (int)$i['qtd'], (int)$i['produto_id']]);
        if (!empty($i['cor_id'])) {
            $db->prepare('UPDATE produto_cores SET qtd = qtd + ? WHERE produto_id = ? AND cor_id = ?')
               ->execute([$sinal * (int)$i['qtd'], (int)$i['produto_id'], (int)$i['cor_id']]);
        }
    }
}


/* Confere os itens de um pedido ou orçamento (peça do estoque, com cor, ou item personalizado) e devolve a lista limpa. */
function montarItens($lista): array {
    $db = db(); $itens = [];
    foreach ($lista as $i) {
        $desc = txt($i['descricao'] ?? '', 200); $qtd = (int)($i['qtd'] ?? 0);
        if ($desc === '' || $qtd < 1) continue;
        $pid = !empty($i['produto_id']) ? (int)$i['produto_id'] : null;
        $cid = null; $corNome = '';
        if ($pid) {
            $s = $db->prepare('SELECT usa_cores, nome FROM produtos WHERE id = ?'); $s->execute([$pid]);
            $pr = $s->fetch();
            if ($pr && (int)$pr['usa_cores'] === 1) {
                $cid = (int)($i['cor_id'] ?? 0);
                if (!$cid) fail('Escolha a cor de ' . $pr['nome'] . '.');
                $s = $db->prepare('SELECT c.nome FROM produto_cores pc JOIN cores c ON c.id = pc.cor_id WHERE pc.produto_id = ? AND pc.cor_id = ?');
                $s->execute([$pid, $cid]);
                $cr = $s->fetch();
                if (!$cr) fail('A cor escolhida não existe em ' . $pr['nome'] . '.');
                $corNome = $cr['nome'];
            }
        }
        $itens[] = ['produto_id' => $pid, 'cor_id' => $cid, 'cor' => $corNome, 'descricao' => $desc, 'qtd' => min($qtd, 9999), 'preco' => max(0, num($i['preco'] ?? 0)),
            'tipo' => $pid ? '' : txt($i['tipo'] ?? '', 40), 'detalhes' => $pid ? '' : txt($i['detalhes'] ?? '', 255), 'custo' => $pid ? 0 : max(0, num($i['custo'] ?? 0))];
    }
    if (!$itens) fail('Adicione pelo menos um item.');
    return $itens;
}

/* Se o pedido veio sem cliente escolhido, mas o nome bate com UM cliente cadastrado, liga os dois (assim o histórico do cliente fica completo). */
function clientePorNome(string $nome): ?int {
    $s = db()->prepare('SELECT id FROM clientes WHERE LOWER(nome) = LOWER(?)'); $s->execute([trim($nome)]);
    $l = $s->fetchAll(PDO::FETCH_COLUMN);
    return count($l) === 1 ? (int)$l[0] : null;
}
