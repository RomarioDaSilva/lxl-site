<?php
declare(strict_types=1);
/* AÇÕES: categorias.
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Cada "case" é um endereço da API: api.php?a=NOME. */
switch ($a) {

case 'categorias': {
    semearCategorias();
    out(['categorias' => listaDeCategorias()]);
}
case 'categoria_salvar': {
    $id = (int)($in['id'] ?? 0);
    $nome = txt($in['nome'] ?? '', 80);
    if ($nome === '') fail('Informe o nome da categoria.');
    $pai = isset($in['parent_id']) && $in['parent_id'] !== '' ? (int)$in['parent_id'] : null;
    if ($pai !== null) {
        $q = $db->prepare('SELECT id FROM categorias WHERE id = ?'); $q->execute([$pai]);
        if (!$q->fetch()) fail('A categoria de cima não existe mais. Atualize a página.');
        if ($id) {
            $x = $pai; $g = 0;
            while ($x !== null && $g++ < 50) {
                if ($x === $id) fail('Uma categoria não pode ficar dentro dela mesma.');
                $q = $db->prepare('SELECT parent_id FROM categorias WHERE id = ?'); $q->execute([$x]);
                $v = $q->fetchColumn(); $x = ($v === false || $v === null) ? null : (int)$v;
            }
        }
    }
    $q = $pai === null ? $db->prepare('SELECT id FROM categorias WHERE nome = ? AND parent_id IS NULL AND id <> ?') : $db->prepare('SELECT id FROM categorias WHERE nome = ? AND parent_id = ? AND id <> ?');
    $q->execute($pai === null ? [$nome, $id] : [$nome, $pai, $id]);
    if ($q->fetch()) fail('Já existe uma categoria com esse nome nesse lugar.');
    $vis = (!array_key_exists('visivel', $in) || !empty($in['visivel'])) ? 1 : 0;
    if ($id) $db->prepare('UPDATE categorias SET nome = ?, parent_id = ?, ativo = ? WHERE id = ?')->execute([$nome, $pai, $vis, $id]);
    else { $id = categoriaGarantir($nome, $pai); $db->prepare('UPDATE categorias SET ativo = ? WHERE id = ?')->execute([$vis, $id]); }
    out(['categorias' => listaDeCategorias(), 'id' => $id]);
}
case 'categoria_ordenar': {
    /* sobe (-1) ou desce (1) uma categoria entre as irmãs (mesmo "pai"). Só muda a ordem, nada mais. */
    $id = (int)($in['id'] ?? 0); $dir = ((int)($in['dir'] ?? 0)) < 0 ? -1 : 1;
    $q = $db->prepare('SELECT parent_id FROM categorias WHERE id = ?'); $q->execute([$id]);
    $r = $q->fetch(); if (!$r) fail('Categoria não encontrada. Atualize a página.');
    $pai = $r['parent_id'] === null ? null : (int)$r['parent_id'];
    if ($pai === null) $q = $db->query('SELECT id FROM categorias WHERE parent_id IS NULL ORDER BY ordem, nome');
    else { $q = $db->prepare('SELECT id FROM categorias WHERE parent_id = ? ORDER BY ordem, nome'); $q->execute([$pai]); }
    $ids = array_map('intval', $q->fetchAll(PDO::FETCH_COLUMN));
    $i = array_search($id, $ids, true);
    $j = $i + $dir;
    if ($i !== false && $j >= 0 && $j < count($ids)) { $t = $ids[$i]; $ids[$i] = $ids[$j]; $ids[$j] = $t; }
    $db->beginTransaction();
    foreach ($ids as $n => $cid) $db->prepare('UPDATE categorias SET ordem = ? WHERE id = ?')->execute([$n + 1, $cid]);
    $db->commit();
    out(['categorias' => listaDeCategorias()]);
}
case 'categoria_visivel': {
    /* liga/desliga a categoria no site. Só muda a visibilidade: os itens continuam ligados a ela e nada é apagado. */
    $id = (int)($in['id'] ?? 0);
    $q = $db->prepare('SELECT id FROM categorias WHERE id = ?'); $q->execute([$id]);
    if (!$q->fetch()) fail('Categoria não encontrada. Atualize a página.');
    $db->prepare('UPDATE categorias SET ativo = ? WHERE id = ?')->execute([empty($in['visivel']) ? 0 : 1, $id]);
    out(['categorias' => listaDeCategorias()]);
}
case 'categoria_itens': {
    /* liga (add) ou desliga (remove) itens de uma categoria. Só mexe na ligação item-categoria, nunca no item. */
    $id = (int)($in['id'] ?? 0);
    $q = $db->prepare('SELECT id FROM categorias WHERE id = ?'); $q->execute([$id]);
    if (!$q->fetch()) fail('Categoria não encontrada. Atualize a página.');
    $db->beginTransaction();
    foreach (array_unique(array_map('intval', (array)($in['add'] ?? []))) as $pid) {
        $q = $db->prepare('SELECT id FROM produtos WHERE id = ?'); $q->execute([$pid]);
        if (!$q->fetch()) continue;
        $q = $db->prepare('SELECT 1 FROM produto_categorias WHERE produto_id = ? AND categoria_id = ?'); $q->execute([$pid, $id]);
        if (!$q->fetch()) $db->prepare('INSERT INTO produto_categorias (produto_id, categoria_id) VALUES (?,?)')->execute([$pid, $id]);
    }
    foreach (array_unique(array_map('intval', (array)($in['remove'] ?? []))) as $pid)
        $db->prepare('DELETE FROM produto_categorias WHERE produto_id = ? AND categoria_id = ?')->execute([$pid, $id]);
    $db->commit();
    out(['ok' => true]);
}
case 'categoria_excluir': {
    $id = (int)($in['id'] ?? 0);
    $q = $db->prepare('SELECT COUNT(*) FROM categorias WHERE parent_id = ?'); $q->execute([$id]);
    if ((int)$q->fetchColumn() > 0) fail('Essa categoria tem subcategorias. Apague ou mova as subcategorias primeiro.');
    $db->beginTransaction();
    $db->prepare('DELETE FROM produto_categorias WHERE categoria_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM categorias WHERE id = ?')->execute([$id]);
    $db->commit();
    out(['categorias' => listaDeCategorias()]);
}

}
