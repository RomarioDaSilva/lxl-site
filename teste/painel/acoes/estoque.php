<?php
declare(strict_types=1);
/* AÇÕES: estoque, cores, custos e importação.
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Cada "case" é um endereço da API: api.php?a=NOME. */
switch ($a) {

case 'produtos': {
    semearCategorias();
    $r = $db->query('SELECT * FROM produtos ORDER BY ativo DESC, nome')->fetchAll();
    $m = mapaDeCores();
    $mc = mapaDeCategorias();
    out(['produtos' => array_map(fn($p) => produtoOut($p, $m, $mc), $r), 'cores' => listaDeCores(), 'params' => souAdmin() ? parametros() : [], 'categorias' => listaDeCategorias()]);
}

case 'produto_salvar': {
    $id = (int)($in['id'] ?? 0);
    $nome = txt($in['nome'] ?? '', 160);
    if ($nome === '') fail('Informe o nome do produto.');
    $codigo = strtoupper(txt($in['codigo'] ?? '', 40));
    if ($codigo !== '') {
        $s = $db->prepare('SELECT id FROM produtos WHERE codigo = ? AND id <> ?');
        $s->execute([$codigo, $id]);
        if ($s->fetch()) fail('Já existe um produto com esse código.');
    }
    $controla = empty($in['controla']) ? 0 : 1;
    $estoque = (int)($in['estoque'] ?? 0);
    $usa = ($controla && !empty($in['usa_cores'])) ? 1 : 0;
    $linhas = [];
    if ($usa) {
        $soma = 0; $vistas = [];
        foreach (($in['cores'] ?? []) as $c) {
            $cid = (int)($c['cor_id'] ?? 0); $q = (int)($c['qtd'] ?? 0);
            if ($cid < 1 || isset($vistas[$cid])) continue;
            if ($q < 0) fail('A quantidade de uma cor não pode ser negativa.');
            $s = $db->prepare('SELECT id FROM cores WHERE id = ?'); $s->execute([$cid]);
            if (!$s->fetch()) fail('Uma das cores escolhidas não existe mais. Atualize a página.');
            $vistas[$cid] = 1; $soma += $q; $linhas[] = [$cid, $q];
        }
        if (!$linhas) fail('Escolha pelo menos uma cor e a quantidade de cada uma.');
        if ($soma !== $estoque) fail('As cores somam ' . $soma . ', mas o estoque total é ' . $estoque . '. Ajuste para ficarem iguais.');
    }
    $material = ($in['material'] ?? 'PLA') === 'PETG' ? 'PETG' : 'PLA';
    $d = [$codigo, $nome, num($in['preco'] ?? 0), $controla, $estoque, empty($in['ativo']) ? 0 : 1, txt($in['obs'] ?? '', 255), $usa,
          max(0, num($in['peso_g'] ?? 0)), max(0, (int)($in['tempo_min'] ?? 0)), $material, max(0, num($in['perda_pct'] ?? 10)),
          max(0, num($in['extras'] ?? 0)), max(0, num($in['embalagem'] ?? 0)), max(0, num($in['custo'] ?? 0)), max(0, num($in['preco_kg'] ?? 0))];
    $db->beginTransaction();
    try {
        if ($id) {
            $db->prepare('UPDATE produtos SET codigo=?, nome=?, preco=?, controla=?, estoque=?, ativo=?, obs=?, usa_cores=?, peso_g=?, tempo_min=?, material=?, perda_pct=?, extras=?, embalagem=?, custo=?, preco_kg=? WHERE id=?')->execute([...$d, $id]);
        } else {
            $db->prepare('INSERT INTO produtos (codigo, nome, preco, controla, estoque, ativo, obs, usa_cores, peso_g, tempo_min, material, perda_pct, extras, embalagem, custo, preco_kg) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($d);
            $id = (int)$db->lastInsertId();
        }
        $db->prepare('DELETE FROM produto_cores WHERE produto_id = ?')->execute([$id]);
        foreach ($linhas as [$cid, $q]) $db->prepare('INSERT INTO produto_cores (produto_id, cor_id, qtd) VALUES (?,?,?)')->execute([$id, $cid, $q]);
        if (array_key_exists('categorias', $in) && is_array($in['categorias'])) {
            $db->prepare('DELETE FROM produto_categorias WHERE produto_id = ?')->execute([$id]);
            foreach (array_unique(array_map('intval', $in['categorias'])) as $cid) {
                $q = $db->prepare('SELECT id FROM categorias WHERE id = ?'); $q->execute([$cid]);
                if ($q->fetch()) $db->prepare('INSERT INTO produto_categorias (produto_id, categoria_id) VALUES (?,?)')->execute([$id, $cid]);
            }
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        fail('Não consegui salvar o produto.', 500);
    }
    out(['produto' => produtoPorId($id)]);
}

case 'parametros_salvar': {
    $novos = $in['params'] ?? [];
    if (!is_array($novos)) fail('Valores inválidos.');
    foreach (PARAMS_PADRAO as $k => $_) {
        if (!array_key_exists($k, $novos)) continue;
        $v = num($novos[$k]);
        if ($v < 0) fail('Os valores não podem ser negativos.');
        if (in_array($k, ['vida_util_h'], true) && $v <= 0) fail('A vida útil da impressora precisa ser maior que zero.');
        if ($k === 'margem_pct' && $v + num($novos['imposto_pct'] ?? 0) >= 100) fail('Margem mais imposto precisam ficar abaixo de 100%.');
        $db->prepare('DELETE FROM parametros WHERE chave = ?')->execute([$k]);
        $db->prepare('INSERT INTO parametros (chave, valor) VALUES (?, ?)')->execute([$k, (string)$v]);
    }
    out(['params' => parametros()]);
}

case 'cor_salvar': {
    $id = (int)($in['id'] ?? 0);
    $nome = txt($in['nome'] ?? '', 40);
    if ($nome === '') fail('Informe o nome da cor.');
    $hex = preg_match('/^#[0-9a-fA-F]{6}$/', (string)($in['hex'] ?? '')) ? strtolower($in['hex']) : '#cccccc';
    $s = $db->prepare('SELECT id FROM cores WHERE LOWER(nome) = LOWER(?) AND id <> ?'); $s->execute([$nome, $id]);
    if ($s->fetch()) fail('Já existe uma cor com esse nome.');
    if ($id) $db->prepare('UPDATE cores SET nome = ?, hex = ? WHERE id = ?')->execute([$nome, $hex, $id]);
    else { $db->prepare('INSERT INTO cores (nome, hex) VALUES (?, ?)')->execute([$nome, $hex]); $id = (int)$db->lastInsertId(); }
    out(['id' => $id, 'cores' => listaDeCores()]);
}

case 'cor_excluir': {
    $id = (int)($in['id'] ?? 0);
    $s = $db->prepare('SELECT COUNT(*) FROM produto_cores WHERE cor_id = ?'); $s->execute([$id]);
    if ((int)$s->fetchColumn() > 0) fail('Essa cor está em uso em alguma peça. Tire a cor da peça antes de excluir.');
    $db->prepare('DELETE FROM cores WHERE id = ?')->execute([$id]);
    out(['cores' => listaDeCores()]);
}

case 'produto_excluir': {
    $id = (int)($in['id'] ?? 0);
    $s = $db->prepare('SELECT id FROM produtos WHERE id = ?'); $s->execute([$id]);
    if (!$s->fetch()) fail('Produto não encontrado.', 404);
    /* peça que já foi vendida ou orçada não se exclui: apagar sumiria o nome dela do histórico. Nesse caso, desative. */
    $uso = 0;
    foreach (['itens', 'orcamento_itens'] as $t) { $q = $db->prepare("SELECT COUNT(*) FROM $t WHERE produto_id = ?"); $q->execute([$id]); $uso += (int)$q->fetchColumn(); }
    if ($uso > 0) fail('Essa peça já está em pedidos ou orçamentos. Para não perder o histórico, edite e desmarque "Produto ativo".');
    $db->beginTransaction();
    $db->prepare('DELETE FROM produto_cores WHERE produto_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM produto_categorias WHERE produto_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM produtos WHERE id = ?')->execute([$id]);
    $db->commit();
    out(['ok' => true]);
}

case 'produto_ajustar': {
    $id = (int)($in['id'] ?? 0); $delta = (int)($in['delta'] ?? 0);
    $s = $db->prepare('SELECT usa_cores FROM produtos WHERE id = ?'); $s->execute([$id]);
    $x = $s->fetch();
    if (!$x) fail('Produto não encontrado.', 404);
    if ((int)$x['usa_cores'] === 1) fail('Essa peça tem cores. Abra a peça para ajustar a quantidade de cada cor.');
    $db->prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?')->execute([$delta, $id]);
    out(['produto' => produtoPorId($id)]);
}

case 'custos_importar': {
    $lista = $in['lista'] ?? [];
    if (!is_array($lista)) fail('Lista inválida.');
    $P = parametros(); $ok = 0; $nao = [];
    $db->beginTransaction();
    foreach (array_slice($lista, 0, 500) as $l) {
        $cod = strtoupper(txt($l['codigo'] ?? '', 40));
        $s = $db->prepare('SELECT id FROM produtos WHERE codigo = ?'); $s->execute([$cod]);
        $row = $s->fetch();
        if (!$row) { $nao[] = $cod; continue; }
        $peso = max(0, num($l['peso_g'] ?? 0)); $h = max(0, num($l['tempo_h'] ?? 0));
        $mat = ($l['material'] ?? 'PLA') === 'PETG' ? 'PETG' : 'PLA';
        $perda = max(0, num($l['perda_pct'] ?? 10)); $ext = max(0, num($l['extras'] ?? 0)); $emb = max(0, num($l['embalagem'] ?? 0));
        $kg = max(0, num($l['preco_kg'] ?? 0));
        $kgUsado = $kg > 0 ? $kg : ($mat === 'PETG' ? $P['preco_kg_petg'] : $P['preco_kg_pla']);
        $custo = $peso * (1 + $perda / 100) * $kgUsado / 1000 + $h * $P['potencia_w'] / 1000 * $P['energia_kwh']
               + ($P['vida_util_h'] > 0 ? $h * $P['valor_impressora'] / $P['vida_util_h'] : 0) + $ext + $emb;
        $db->prepare('UPDATE produtos SET peso_g=?, tempo_min=?, material=?, perda_pct=?, extras=?, embalagem=?, preco_kg=?, custo=? WHERE id=?')
           ->execute([$peso, (int)round($h * 60), $mat, $perda, $ext, $emb, $kg, round($custo, 2), (int)$row['id']]);
        $ok++;
    }
    $db->commit();
    out(['atualizados' => $ok, 'nao_encontrados' => $nao]);
}

case 'produto_importar': {
    $lista = $in['lista'] ?? [];
    if (!is_array($lista)) fail('Lista inválida.');
    $novos = 0; $pulados = 0; $secImp = secoesDoCatalogo();
    $db->beginTransaction();
    foreach (array_slice($lista, 0, 500) as $p) {
        $cod = strtoupper(txt($p['codigo'] ?? '', 40)); $nome = txt($p['nome'] ?? '', 160);
        if ($nome === '') continue;
        if ($cod !== '') {
            $s = $db->prepare('SELECT id FROM produtos WHERE codigo = ?'); $s->execute([$cod]);
            if ($s->fetch()) { $pulados++; continue; }
        }
        $db->prepare('INSERT INTO produtos (codigo, nome, preco, controla, estoque, ativo, obs) VALUES (?,?,?,?,?,?,?)')
           ->execute([$cod, $nome, num($p['preco'] ?? 0), 0, 0, 1, 'Do catálogo (sob encomenda)']);
        if ($cod !== '') ligarAoCatalogo((int)$db->lastInsertId(), $cod, $secImp);
        $novos++;
    }
    $db->commit();
    out(['novos' => $novos, 'pulados' => $pulados]);
}

}
