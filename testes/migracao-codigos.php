<?php
/* Testa a migração 'codigos-numericos': banco antigo (PRE-001...) vira 0001... e o código velho fica em codigo_antigo. */
putenv('LXL_CONFIG=' . __DIR__ . '/config-teste.php');
require __DIR__ . '/../teste/painel/lib.php';
require __DIR__ . '/../teste/painel/bd.php';
@unlink('/tmp/lxl-migracao.db');
$GLOBALS['__cfg_teste'] = true;
$f = '/tmp/lxl-migracao-cfg.php';
file_put_contents($f, "<?php return ['driver'=>'sqlite','arquivo'=>'/tmp/lxl-migracao.db','codigo_inicial'=>'segredo123'];");
putenv('LXL_CONFIG=' . $f);
$falhas = 0;
function t(bool $c, string $m): void { global $falhas; echo ($c ? 'OK   ' : 'FALHA') . " $m\n"; if (!$c) $falhas++; }
instalar();
$db = db();
$db->exec("DELETE FROM migracoes WHERE id = 'codigos-numericos'");
foreach (['PRE-001', 'REL-001', 'XYZ-9'] as $c) $db->prepare('INSERT INTO produtos (codigo, nome) VALUES (?,?)')->execute([$c, "p $c"]);
$db->exec("INSERT INTO produtos (codigo, nome) VALUES ('0002','ja novo')");
instalar();
$m = $db->query('SELECT codigo, codigo_antigo FROM produtos')->fetchAll(PDO::FETCH_KEY_PAIR);
t(($m['0001'] ?? '') === 'PRE-001', 'PRE-001 virou 0001 e guardou o antigo');
t(($m['0054'] ?? '') === 'REL-001', 'REL-001 virou 0054');
t(isset($m['XYZ-9']), 'código fora do mapa fica como estava');
t(isset($m['0002']) && $m['0002'] === '', 'código já novo não é mexido');
instalar();
t(count($db->query("SELECT 1 FROM migracoes WHERE id='codigos-numericos'")->fetchAll()) === 1, 'migração registrada uma vez só');
/* Migração 'croc-para-pet': crocodilo 0055 sai de Chaveiros > Patch e vai para Chaveiros > Pet, sem apagar nada */
$db->exec("INSERT INTO categorias (nome, parent_id) VALUES ('Chaveiros', NULL)");
$raiz = (int)$db->query("SELECT id FROM categorias WHERE nome='Chaveiros'")->fetchColumn();
$db->exec("INSERT INTO categorias (nome, parent_id) VALUES ('Patch', $raiz)");
$patch = (int)$db->query("SELECT id FROM categorias WHERE nome='Patch'")->fetchColumn();
$db->exec("INSERT INTO produtos (codigo, nome) VALUES ('0055','Croc')");
$pid = (int)$db->query("SELECT id FROM produtos WHERE codigo='0055'")->fetchColumn();
$db->exec("INSERT INTO produto_categorias (produto_id, categoria_id) VALUES ($pid, $patch)");
$db->exec("DELETE FROM migracoes WHERE id = 'croc-para-pet'");
instalar();
$cats = $db->query("SELECT c.nome FROM produto_categorias pc JOIN categorias c ON c.id = pc.categoria_id WHERE pc.produto_id = $pid")->fetchAll(PDO::FETCH_COLUMN);
t($cats === ['Pet'], 'crocodilo ficou só em Pet: ' . implode(',', $cats));
t((int)$db->query("SELECT COUNT(*) FROM categorias WHERE nome='Patch'")->fetchColumn() === 1, 'categoria Patch não foi apagada');
exit($falhas ? 1 : 0);
