<?php
// Funções comuns: resposta JSON, configuração (fora do public_html) e conexão com o banco.
declare(strict_types=1);

function out($d, int $code = 200): void {
    $GLOBALS['__saida'] = is_array($d) ? $d : [];   /* guardado para o histórico (seguranca.php) saber o resultado */
    http_response_code($code);
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}
function fail(string $m, int $code = 400): void { out(['erro' => $m], $code); }

/* ---------- configuração (fica FORA do public_html) ---------- */
/* O arquivo lxl-config.php (com a senha do banco) fica UM nível acima da pasta public_html, nunca dentro dela.
   O modelo está em config.example.php. Para trocar a senha do banco, edite só o lxl-config.php na Hostinger. */
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


/* ---------- FOTOS EXTRAS DOS PRODUTOS ----------
   As fotos ficam na pasta /fotos/ da raiz do site (fora de teste/ e de painel/), por isso valem para o teste e para a produção e não se perdem quando o site é atualizado.
   Cada produto tem a sua subpasta (fotos/ID/). O arquivo grande é ARQUIVO.jpg e a miniatura é ARQUIVO-m.jpg. */
const FOTOS_MAX = 6;
function fotosPasta(): string {
    $c = cfg();
    if (!empty($c['fotos_dir'])) return rtrim((string)$c['fotos_dir'], '/');
    $d = __DIR__;                                              /* pasta do painel (producao ou teste) */
    $raiz = basename(dirname($d)) === 'teste' ? dirname($d, 2) : dirname($d);
    return $raiz . '/fotos';
}
function fotoUrl(int $produtoId, string $arquivo, bool $mini = false): string {
    return '/fotos/' . $produtoId . '/' . ($mini ? preg_replace('/\.jpg$/', '-m.jpg', $arquivo) : $arquivo);
}
/* Lista de fotos extras por produto: [produto_id => [[id, arquivo], ...]] na ordem escolhida. */
function mapaDeFotos(): array {
    $m = [];
    try {
        foreach (db()->query('SELECT id, produto_id, arquivo FROM produto_fotos ORDER BY ordem, id')->fetchAll() as $x)
            $m[(int)$x['produto_id']][] = ['id' => (int)$x['id'], 'u' => fotoUrl((int)$x['produto_id'], $x['arquivo']), 'm' => fotoUrl((int)$x['produto_id'], $x['arquivo'], true)];
    } catch (Throwable $e) { /* tabela ainda não existe: sem fotos extras */ }
    return $m;
}
