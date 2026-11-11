<?php
declare(strict_types=1);
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

const STATUS = ['novo', 'producao', 'pronto', 'entregue', 'cancelado'];

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

function instalar(): void {
    $c = cfg();
    $sqlite = ($c['driver'] ?? 'mysql') === 'sqlite';
    $pk = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $fim = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    $db = db();
    $db->exec("CREATE TABLE IF NOT EXISTS usuarios (id $pk, usuario VARCHAR(60) NOT NULL, senha VARCHAR(255) NOT NULL, criado_em VARCHAR(19))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS tentativas (id $pk, ip VARCHAR(45), quando INT)$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS produtos (id $pk, codigo VARCHAR(40) DEFAULT '', nome VARCHAR(160) NOT NULL, preco DECIMAL(10,2) DEFAULT 0, controla TINYINT DEFAULT 1, estoque INT DEFAULT 0, ativo TINYINT DEFAULT 1, obs VARCHAR(255) DEFAULT '')$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS pedidos (id $pk, data VARCHAR(10), cliente VARCHAR(120), whatsapp VARCHAR(30) DEFAULT '', pagamento VARCHAR(30) DEFAULT '', pago TINYINT DEFAULT 0, entrega VARCHAR(20) DEFAULT 'Retirada', endereco VARCHAR(255) DEFAULT '', prazo VARCHAR(60) DEFAULT '', obs TEXT, desconto DECIMAL(10,2) DEFAULT 0, frete DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'novo', criado_em VARCHAR(19))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS itens (id $pk, pedido_id INT NOT NULL, produto_id INT NULL, descricao VARCHAR(200), qtd INT DEFAULT 1, preco DECIMAL(10,2) DEFAULT 0)$fim");
}

/* ---------- sessão e segurança ---------- */
function iniciarSessao(): void {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('lxlpainel');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 14,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.gc_maxlifetime', (string)(60 * 60 * 24 * 14));
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
}

function exigirLogin(): void {
    if (empty($_SESSION['uid'])) fail('Faça login para continuar.', 401);
}
function exigirCsrf(): void {
    $t = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($t) || !hash_equals($_SESSION['csrf'], $t)) fail('Sessão expirada. Atualize a página.', 403);
}
function ipCliente(): string { return substr($_SERVER['REMOTE_ADDR'] ?? '0', 0, 45); }

function bloqueado(): bool {
    $db = db();
    $db->prepare('DELETE FROM tentativas WHERE quando < ?')->execute([time() - 86400]);
    $s = $db->prepare('SELECT COUNT(*) FROM tentativas WHERE ip = ? AND quando > ?');
    $s->execute([ipCliente(), time() - 900]);
    return (int)$s->fetchColumn() >= 8;
}
function registrarFalha(): void {
    db()->prepare('INSERT INTO tentativas (ip, quando) VALUES (?, ?)')->execute([ipCliente(), time()]);
}

/* ---------- utilidades ---------- */
function txt($v, int $max): string {
    $v = trim((string)($v ?? ''));
    return mb_substr($v, 0, $max);
}
function num($v): float {
    if (is_string($v)) $v = str_replace(',', '.', $v);
    return is_numeric($v) ? round((float)$v, 2) : 0.0;
}
function produtoOut(array $p): array {
    return [
        'id' => (int)$p['id'], 'codigo' => $p['codigo'], 'nome' => $p['nome'],
        'preco' => (float)$p['preco'], 'controla' => (int)$p['controla'],
        'estoque' => (int)$p['estoque'], 'ativo' => (int)$p['ativo'], 'obs' => $p['obs'],
    ];
}
function pedidoOut(array $p, ?array $itens = null): array {
    $r = [
        'id' => (int)$p['id'], 'data' => $p['data'], 'cliente' => $p['cliente'], 'whatsapp' => $p['whatsapp'],
        'pagamento' => $p['pagamento'], 'pago' => (int)$p['pago'], 'entrega' => $p['entrega'],
        'endereco' => $p['endereco'], 'prazo' => $p['prazo'], 'obs' => (string)$p['obs'],
        'desconto' => (float)$p['desconto'], 'frete' => (float)$p['frete'], 'total' => (float)$p['total'],
        'status' => $p['status'],
    ];
    if ($itens !== null) {
        $r['itens'] = array_map(fn($i) => [
            'produto_id' => $i['produto_id'] === null ? null : (int)$i['produto_id'],
            'descricao' => $i['descricao'], 'qtd' => (int)$i['qtd'], 'preco' => (float)$i['preco'],
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
    }
}

/* ---------- roteamento ---------- */
iniciarSessao();
$a = $_GET['a'] ?? '';
$in = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $in = json_decode($raw ?: '[]', true);
    if (!is_array($in)) fail('Pedido inválido.');
}
instalar();

$publicas = ['estado', 'login', 'setup'];
if (!in_array($a, $publicas, true)) {
    exigirLogin();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') exigirCsrf();
}
$db = db();

switch ($a) {

case 'estado': {
    $temUser = (int)$db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0;
    out(['logado' => !empty($_SESSION['uid']), 'usuario' => $_SESSION['usuario'] ?? '', 'setup' => !$temUser, 'csrf' => $_SESSION['csrf']]);
}

case 'setup': {
    if ((int)$db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0) fail('O painel já foi configurado.', 403);
    if (bloqueado()) fail('Muitas tentativas. Espere 15 minutos.', 429);
    $cod = (string)(cfg()['codigo_inicial'] ?? '');
    if ($cod === '' || str_starts_with($cod, 'ESCOLHA_') || !hash_equals($cod, (string)($in['codigo'] ?? ''))) {
        registrarFalha(); fail('Código inicial incorreto.', 403);
    }
    $u = txt($in['usuario'] ?? '', 60); $s = (string)($in['senha'] ?? '');
    if ($u === '' || mb_strlen($s) < 8) fail('Escolha um usuário e uma senha com no mínimo 8 caracteres.');
    $db->prepare('INSERT INTO usuarios (usuario, senha, criado_em) VALUES (?, ?, ?)')
       ->execute([$u, password_hash($s, PASSWORD_DEFAULT), date('Y-m-d H:i:s')]);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$db->lastInsertId(); $_SESSION['usuario'] = $u;
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
    out(['ok' => true, 'csrf' => $_SESSION['csrf'], 'usuario' => $u]);
}

case 'login': {
    if (bloqueado()) fail('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
    $s = $db->prepare('SELECT * FROM usuarios WHERE usuario = ?');
    $s->execute([txt($in['usuario'] ?? '', 60)]);
    $u = $s->fetch();
    if (!$u || !password_verify((string)($in['senha'] ?? ''), $u['senha'])) {
        registrarFalha(); fail('Usuário ou senha incorretos.', 401);
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$u['id']; $_SESSION['usuario'] = $u['usuario'];
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
    out(['ok' => true, 'csrf' => $_SESSION['csrf'], 'usuario' => $u['usuario']]);
}

case 'logout': {
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

/* ----- produtos ----- */
case 'produtos': {
    $r = $db->query('SELECT * FROM produtos ORDER BY ativo DESC, nome')->fetchAll();
    out(['produtos' => array_map('produtoOut', $r)]);
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
    $d = [$codigo, $nome, num($in['preco'] ?? 0), empty($in['controla']) ? 0 : 1, (int)($in['estoque'] ?? 0), empty($in['ativo']) ? 0 : 1, txt($in['obs'] ?? '', 255)];
    if ($id) {
        $db->prepare('UPDATE produtos SET codigo=?, nome=?, preco=?, controla=?, estoque=?, ativo=?, obs=? WHERE id=?')->execute([...$d, $id]);
    } else {
        $db->prepare('INSERT INTO produtos (codigo, nome, preco, controla, estoque, ativo, obs) VALUES (?,?,?,?,?,?,?)')->execute($d);
        $id = (int)$db->lastInsertId();
    }
    $s = $db->prepare('SELECT * FROM produtos WHERE id = ?'); $s->execute([$id]);
    out(['produto' => produtoOut($s->fetch())]);
}

case 'produto_ajustar': {
    $id = (int)($in['id'] ?? 0); $delta = (int)($in['delta'] ?? 0);
    $db->prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?')->execute([$delta, $id]);
    $s = $db->prepare('SELECT * FROM produtos WHERE id = ?'); $s->execute([$id]);
    $p = $s->fetch();
    if (!$p) fail('Produto não encontrado.', 404);
    out(['produto' => produtoOut($p)]);
}

case 'produto_importar': {
    $lista = $in['lista'] ?? [];
    if (!is_array($lista)) fail('Lista inválida.');
    $novos = 0; $pulados = 0;
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
        $novos++;
    }
    $db->commit();
    out(['novos' => $novos, 'pulados' => $pulados]);
}

/* ----- pedidos ----- */
case 'pedidos': {
    $w = []; $p = [];
    $st = txt($_GET['status'] ?? '', 20);
    if ($st === 'abertos') { $w[] = "status IN ('novo','producao','pronto')"; }
    elseif (in_array($st, STATUS, true)) { $w[] = 'status = ?'; $p[] = $st; }
    $q = txt($_GET['q'] ?? '', 60);
    if ($q !== '') { $w[] = '(cliente LIKE ? OR whatsapp LIKE ? OR CAST(id AS CHAR) = ?)'; $p[] = "%$q%"; $p[] = "%$q%"; $p[] = ltrim($q, '#0'); }
    $sql = 'SELECT * FROM pedidos' . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . ' ORDER BY id DESC LIMIT 300';
    $s = $db->prepare($sql); $s->execute($p);
    $lista = array_map(function ($r) {
        $o = pedidoOut($r);
        $it = itensDoPedido((int)$r['id']);
        $o['resumo'] = implode(', ', array_map(fn($i) => $i['qtd'] . 'x ' . $i['descricao'], array_slice($it, 0, 3))) . (count($it) > 3 ? '…' : '');
        return $o;
    }, $s->fetchAll());
    $mes = date('Y-m');
    $r = $db->prepare("SELECT COALESCE(SUM(total),0) t, COUNT(*) n FROM pedidos WHERE status <> 'cancelado' AND data LIKE ?");
    $r->execute([$mes . '%']);
    $m = $r->fetch();
    $ab = (int)$db->query("SELECT COUNT(*) FROM pedidos WHERE status IN ('novo','producao','pronto')")->fetchColumn();
    $ap = (float)$db->query("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE pago = 0 AND status NOT IN ('cancelado')")->fetchColumn();
    out(['pedidos' => $lista, 'resumo' => ['mes_total' => (float)$m['t'], 'mes_qtd' => (int)$m['n'], 'abertos' => $ab, 'a_receber' => $ap]]);
}

case 'pedido': {
    $s = $db->prepare('SELECT * FROM pedidos WHERE id = ?'); $s->execute([(int)($_GET['id'] ?? 0)]);
    $p = $s->fetch();
    if (!$p) fail('Pedido não encontrado.', 404);
    out(['pedido' => pedidoOut($p, itensDoPedido((int)$p['id']))]);
}

case 'pedido_salvar': {
    $id = (int)($in['id'] ?? 0);
    $cliente = txt($in['cliente'] ?? '', 120);
    if ($cliente === '') fail('Informe o nome do cliente.');
    $itens = [];
    foreach (($in['itens'] ?? []) as $i) {
        $desc = txt($i['descricao'] ?? '', 200); $qtd = (int)($i['qtd'] ?? 0);
        if ($desc === '' || $qtd < 1) continue;
        $pid = !empty($i['produto_id']) ? (int)$i['produto_id'] : null;
        $itens[] = ['produto_id' => $pid, 'descricao' => $desc, 'qtd' => min($qtd, 9999), 'preco' => max(0, num($i['preco'] ?? 0))];
    }
    if (!$itens) fail('Adicione pelo menos um item.');
    $sub = 0.0; foreach ($itens as $i) $sub += $i['preco'] * $i['qtd'];
    $desc = max(0, num($in['desconto'] ?? 0)); $frete = max(0, num($in['frete'] ?? 0));
    $total = max(0, round($sub - $desc + $frete, 2));
    $status = in_array($in['status'] ?? '', STATUS, true) ? $in['status'] : 'novo';
    $data = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($in['data'] ?? '')) ? $in['data'] : date('Y-m-d');
    $campos = [$data, $cliente, preg_replace('/[^\d+() -]/', '', txt($in['whatsapp'] ?? '', 30)), txt($in['pagamento'] ?? '', 30),
        empty($in['pago']) ? 0 : 1, in_array($in['entrega'] ?? '', ['Retirada', 'Entrega'], true) ? $in['entrega'] : 'Retirada',
        txt($in['endereco'] ?? '', 255), txt($in['prazo'] ?? '', 60), txt($in['obs'] ?? '', 1000), $desc, $frete, $total, $status];
    $db->beginTransaction();
    try {
        if ($id) {
            $s = $db->prepare('SELECT status FROM pedidos WHERE id = ?'); $s->execute([$id]);
            $velho = $s->fetch();
            if (!$velho) { $db->rollBack(); fail('Pedido não encontrado.', 404); }
            if ($velho['status'] !== 'cancelado') ajustarEstoque(itensDoPedido($id), +1);
            $db->prepare('UPDATE pedidos SET data=?, cliente=?, whatsapp=?, pagamento=?, pago=?, entrega=?, endereco=?, prazo=?, obs=?, desconto=?, frete=?, total=?, status=? WHERE id=?')->execute([...$campos, $id]);
            $db->prepare('DELETE FROM itens WHERE pedido_id = ?')->execute([$id]);
        } else {
            $db->prepare('INSERT INTO pedidos (data, cliente, whatsapp, pagamento, pago, entrega, endereco, prazo, obs, desconto, frete, total, status, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([...$campos, date('Y-m-d H:i:s')]);
            $id = (int)$db->lastInsertId();
        }
        foreach ($itens as $i) {
            $db->prepare('INSERT INTO itens (pedido_id, produto_id, descricao, qtd, preco) VALUES (?,?,?,?,?)')->execute([$id, $i['produto_id'], $i['descricao'], $i['qtd'], $i['preco']]);
        }
        if ($status !== 'cancelado') ajustarEstoque($itens, -1);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        fail('Não consegui salvar o pedido.', 500);
    }
    $neg = [];
    foreach ($itens as $i) {
        if (!$i['produto_id']) continue;
        $s = $db->prepare('SELECT nome, estoque FROM produtos WHERE id = ? AND controla = 1 AND estoque < 0'); $s->execute([$i['produto_id']]);
        if ($r = $s->fetch()) $neg[] = $r['nome'];
    }
    out(['id' => $id, 'avisos' => array_values(array_unique($neg))]);
}

case 'pedido_status': {
    $id = (int)($in['id'] ?? 0);
    $s = $db->prepare('SELECT * FROM pedidos WHERE id = ?'); $s->execute([$id]);
    $p = $s->fetch();
    if (!$p) fail('Pedido não encontrado.', 404);
    $novo = $in['status'] ?? $p['status'];
    if (!in_array($novo, STATUS, true)) fail('Status inválido.');
    $pago = array_key_exists('pago', $in) ? (empty($in['pago']) ? 0 : 1) : (int)$p['pago'];
    $db->beginTransaction();
    if ($p['status'] !== 'cancelado' && $novo === 'cancelado') ajustarEstoque(itensDoPedido($id), +1);
    if ($p['status'] === 'cancelado' && $novo !== 'cancelado') ajustarEstoque(itensDoPedido($id), -1);
    $db->prepare('UPDATE pedidos SET status = ?, pago = ? WHERE id = ?')->execute([$novo, $pago, $id]);
    $db->commit();
    out(['ok' => true]);
}

default:
    fail('Ação desconhecida.', 404);
}
