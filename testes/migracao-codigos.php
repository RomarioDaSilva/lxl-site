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
exit($falhas ? 1 : 0);
