<?php
declare(strict_types=1);
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

const STATUS = ['novo', 'producao', 'pronto', 'entregue', 'cancelado'];

require __DIR__ . '/lib.php';

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
    $db->exec("CREATE TABLE IF NOT EXISTS cores (id $pk, nome VARCHAR(40) NOT NULL, hex VARCHAR(7) DEFAULT '#cccccc')$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS produto_cores (id $pk, produto_id INT NOT NULL, cor_id INT NOT NULL, qtd INT DEFAULT 0)$fim");
    /* colunas novas em tabelas que já existiam (banco criado antes das cores) */
    $db->exec("CREATE TABLE IF NOT EXISTS clientes (id $pk, nome VARCHAR(120) NOT NULL, telefone VARCHAR(30) DEFAULT '', endereco VARCHAR(255) DEFAULT '', cidade VARCHAR(80) DEFAULT '', obs VARCHAR(255) DEFAULT '', criado_em VARCHAR(19))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS parametros (chave VARCHAR(40) NOT NULL PRIMARY KEY, valor VARCHAR(40) NOT NULL)$fim");
    foreach ([['produtos', 'usa_cores', 'TINYINT DEFAULT 0'], ['itens', 'cor_id', 'INT NULL'], ['itens', 'cor', "VARCHAR(40) DEFAULT ''"],
              ['produtos', 'peso_g', 'DECIMAL(10,2) DEFAULT 0'], ['produtos', 'tempo_min', 'INT DEFAULT 0'], ['produtos', 'material', "VARCHAR(10) DEFAULT 'PLA'"],
              ['produtos', 'perda_pct', 'DECIMAL(5,2) DEFAULT 10'], ['produtos', 'extras', 'DECIMAL(10,2) DEFAULT 0'],
              ['produtos', 'embalagem', 'DECIMAL(10,2) DEFAULT 0.80'], ['produtos', 'custo', 'DECIMAL(10,2) DEFAULT 0'], ['produtos', 'preco_kg', 'DECIMAL(10,2) DEFAULT 0'], ['pedidos', 'cliente_id', 'INT NULL']] as [$tab, $col, $def]) {
        try { $db->query("SELECT $col FROM $tab LIMIT 1")->fetchAll(); }
        catch (Throwable $e) { $db->exec("ALTER TABLE $tab ADD COLUMN $col $def"); }
    }
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
function produtoOut(array $p, array $mapaCores = []): array {
    return [
        'id' => (int)$p['id'], 'codigo' => $p['codigo'], 'nome' => $p['nome'],
        'preco' => (float)$p['preco'], 'controla' => (int)$p['controla'],
        'estoque' => (int)$p['estoque'], 'ativo' => (int)$p['ativo'], 'obs' => $p['obs'],
        'usa_cores' => (int)($p['usa_cores'] ?? 0),
        'cores' => $mapaCores[(int)$p['id']] ?? [],
        'peso_g' => (float)($p['peso_g'] ?? 0), 'tempo_min' => (int)($p['tempo_min'] ?? 0), 'material' => $p['material'] ?? 'PLA',
        'perda_pct' => (float)($p['perda_pct'] ?? 10), 'extras' => (float)($p['extras'] ?? 0),
        'embalagem' => (float)($p['embalagem'] ?? 0.8), 'custo' => (float)($p['custo'] ?? 0), 'preco_kg' => (float)($p['preco_kg'] ?? 0),
    ];
}
function mapaDeCores(): array {
    $r = db()->query('SELECT pc.produto_id, pc.cor_id, pc.qtd, c.nome, c.hex FROM produto_cores pc JOIN cores c ON c.id = pc.cor_id ORDER BY c.nome')->fetchAll();
    $m = [];
    foreach ($r as $x) $m[(int)$x['produto_id']][] = ['cor_id' => (int)$x['cor_id'], 'nome' => $x['nome'], 'hex' => $x['hex'], 'qtd' => (int)$x['qtd']];
    return $m;
}
function listaDeCores(): array {
    return array_map(fn($c) => ['id' => (int)$c['id'], 'nome' => $c['nome'], 'hex' => $c['hex']], db()->query('SELECT * FROM cores ORDER BY nome')->fetchAll());
}
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
    return $p ? produtoOut($p, mapaDeCores()) : null;
}
function clienteOut(array $c): array {
    return ['id' => (int)$c['id'], 'codigo' => 'CLI-' . sprintf('%03d', (int)$c['id']), 'nome' => $c['nome'], 'telefone' => $c['telefone'],
            'endereco' => $c['endereco'], 'cidade' => $c['cidade'], 'obs' => $c['obs'],
            'pedidos' => (int)($c['n_pedidos'] ?? 0), 'total' => (float)($c['total_pedidos'] ?? 0)];
}
function listaClientes(): array {
    $r = db()->query("SELECT c.*, (SELECT COUNT(*) FROM pedidos p WHERE p.cliente_id = c.id AND p.status <> 'cancelado') AS n_pedidos,
        (SELECT COALESCE(SUM(p.total),0) FROM pedidos p WHERE p.cliente_id = c.id AND p.status <> 'cancelado') AS total_pedidos
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
    if ($itens !== null) {
        $r['itens'] = array_map(fn($i) => [
            'produto_id' => $i['produto_id'] === null ? null : (int)$i['produto_id'],
            'cor_id' => empty($i['cor_id']) ? null : (int)$i['cor_id'], 'cor' => (string)($i['cor'] ?? ''),
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
        if (!empty($i['cor_id'])) {
            $db->prepare('UPDATE produto_cores SET qtd = qtd + ? WHERE produto_id = ? AND cor_id = ?')
               ->execute([$sinal * (int)$i['qtd'], (int)$i['produto_id'], (int)$i['cor_id']]);
        }
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
    $m = mapaDeCores();
    out(['produtos' => array_map(fn($p) => produtoOut($p, $m), $r), 'cores' => listaDeCores(), 'params' => parametros()]);
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

case 'produto_ajustar': {
    $id = (int)($in['id'] ?? 0); $delta = (int)($in['delta'] ?? 0);
    $s = $db->prepare('SELECT usa_cores FROM produtos WHERE id = ?'); $s->execute([$id]);
    $x = $s->fetch();
    if (!$x) fail('Produto não encontrado.', 404);
    if ((int)$x['usa_cores'] === 1) fail('Essa peça tem cores. Abra a peça para ajustar a quantidade de cada cor.');
    $db->prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?')->execute([$delta, $id]);
    out(['produto' => produtoPorId($id)]);
}

case 'clientes':
    out(['clientes' => listaClientes()]);

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
        $itens[] = ['produto_id' => $pid, 'cor_id' => $cid, 'cor' => $corNome, 'descricao' => $desc, 'qtd' => min($qtd, 9999), 'preco' => max(0, num($i['preco'] ?? 0))];
    }
    if (!$itens) fail('Adicione pelo menos um item.');
    $clienteId = !empty($in['cliente_id']) ? (int)$in['cliente_id'] : null;
    if ($clienteId) { $s = $db->prepare('SELECT id FROM clientes WHERE id = ?'); $s->execute([$clienteId]); if (!$s->fetch()) $clienteId = null; }
    $sub = 0.0; foreach ($itens as $i) $sub += $i['preco'] * $i['qtd'];
    $desc = max(0, num($in['desconto'] ?? 0)); $frete = max(0, num($in['frete'] ?? 0));
    $total = max(0, round($sub - $desc + $frete, 2));
    $status = in_array($in['status'] ?? '', STATUS, true) ? $in['status'] : 'novo';
    $data = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($in['data'] ?? '')) ? $in['data'] : date('Y-m-d');
    $campos = [$data, $cliente, preg_replace('/[^\d+() -]/', '', txt($in['whatsapp'] ?? '', 30)), txt($in['pagamento'] ?? '', 30),
        empty($in['pago']) ? 0 : 1, in_array($in['entrega'] ?? '', ['Retirada', 'Entrega'], true) ? $in['entrega'] : 'Retirada',
        txt($in['endereco'] ?? '', 255), txt($in['prazo'] ?? '', 60), txt($in['obs'] ?? '', 1000), $desc, $frete, $total, $status, $clienteId];
    $db->beginTransaction();
    try {
        if ($id) {
            $s = $db->prepare('SELECT status FROM pedidos WHERE id = ?'); $s->execute([$id]);
            $velho = $s->fetch();
            if (!$velho) { $db->rollBack(); fail('Pedido não encontrado.', 404); }
            if ($velho['status'] !== 'cancelado') ajustarEstoque(itensDoPedido($id), +1);
            $db->prepare('UPDATE pedidos SET data=?, cliente=?, whatsapp=?, pagamento=?, pago=?, entrega=?, endereco=?, prazo=?, obs=?, desconto=?, frete=?, total=?, status=?, cliente_id=? WHERE id=?')->execute([...$campos, $id]);
            $db->prepare('DELETE FROM itens WHERE pedido_id = ?')->execute([$id]);
        } else {
            $db->prepare('INSERT INTO pedidos (data, cliente, whatsapp, pagamento, pago, entrega, endereco, prazo, obs, desconto, frete, total, status, cliente_id, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([...$campos, date('Y-m-d H:i:s')]);
            $id = (int)$db->lastInsertId();
        }
        foreach ($itens as $i) {
            $db->prepare('INSERT INTO itens (pedido_id, produto_id, cor_id, cor, descricao, qtd, preco) VALUES (?,?,?,?,?,?,?)')->execute([$id, $i['produto_id'], $i['cor_id'], $i['cor'], $i['descricao'], $i['qtd'], $i['preco']]);
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
        if ($i['cor_id']) {
            $s = $db->prepare('SELECT p.nome, c.nome AS cor FROM produto_cores pc JOIN produtos p ON p.id = pc.produto_id JOIN cores c ON c.id = pc.cor_id WHERE pc.produto_id = ? AND pc.cor_id = ? AND pc.qtd < 0');
            $s->execute([$i['produto_id'], $i['cor_id']]);
            if ($r = $s->fetch()) $neg[] = $r['nome'] . ' (' . $r['cor'] . ')';
        }
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
