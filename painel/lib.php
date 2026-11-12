<?php
// Funções comuns: resposta JSON, configuração (fora do public_html) e conexão com o banco.
declare(strict_types=1);

function out($d, int $code = 200): void {
    http_response_code($code);
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}
function fail(string $m, int $code = 400): void { out(['erro' => $m], $code); }

/* ---------- configuração (fica FORA do public_html) ---------- */
function cfg(): array {
    static $c = null;
    if ($c !== null) return $c;
    $cands = [];
    if (getenv('LXL_CONFIG')) $cands[] = getenv('LXL_CONFIG');
    $root = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($root !== '') $cands[] = dirname(rtrim($root, '/')) . '/lxl-config.php';
    foreach ($cands as $f) {
        if (is_file($f)) { $c = require $f; return $c; }
    }
    fail('Falta o arquivo de configuração (lxl-config.php) na hospedagem.', 500);
    return [];
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = cfg();
    try {
        if (($c['driver'] ?? 'mysql') === 'sqlite') {
            $pdo = new PDO('sqlite:' . $c['arquivo']);
            $pdo->exec('PRAGMA foreign_keys=ON');
        } else {
            $pdo = new PDO('mysql:host=' . $c['host'] . ';dbname=' . $c['db'] . ';charset=utf8mb4', $c['user'], $c['pass']);
            $pdo->exec("SET time_zone = '-03:00'");
        }
    } catch (Throwable $e) {
        fail('Não consegui conectar no banco de dados. Confira a senha no lxl-config.php.', 500);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}
