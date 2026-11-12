<?php
declare(strict_types=1);
/*
 * Contador PRÓPRIO de visitas do site (sem cookies e sem dados pessoais).
 * Guarda só contagens por dia: tipo (visita, pagina, produto, add, enviar) e uma chave curta (ex.: PRE-001).
 */
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(['ok' => false], 405);
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 2000), true);
if (!is_array($in)) out(['ok' => false], 400);
$tipo = (string)($in['t'] ?? '');
$chave = (string)($in['k'] ?? '');
if (!in_array($tipo, ['visita', 'pagina', 'produto', 'add', 'enviar'], true)) out(['ok' => false], 400);
if (!preg_match('/^[A-Za-z0-9_-]{0,40}$/', $chave)) out(['ok' => false], 400);
if (!empty($in['teste'])) $tipo = 't_' . $tipo;

try {
    $db = db();
    $dia = date('Y-m-d');
    $sqlite = (cfg()['driver'] ?? 'mysql') === 'sqlite';
    $fim = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    $db->exec("CREATE TABLE IF NOT EXISTS metricas (dia VARCHAR(10) NOT NULL, tipo VARCHAR(20) NOT NULL, chave VARCHAR(40) NOT NULL, qtd INT NOT NULL DEFAULT 0, PRIMARY KEY (dia, tipo, chave))$fim");
    $u = $db->prepare('UPDATE metricas SET qtd = qtd + 1 WHERE dia = ? AND tipo = ? AND chave = ?');
    $u->execute([$dia, $tipo, $chave]);
    if ($u->rowCount() === 0) {
        try { $db->prepare('INSERT INTO metricas (dia, tipo, chave, qtd) VALUES (?,?,?,1)')->execute([$dia, $tipo, $chave]); }
        catch (Throwable $e) { $u->execute([$dia, $tipo, $chave]); }
    }
} catch (Throwable $e) { out(['ok' => false], 500); }
out(['ok' => true]);
