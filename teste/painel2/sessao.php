<?php
declare(strict_types=1);
/* SESSÃO E LOGIN: cookie, CSRF, bloqueio por tentativas. */
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

/* PERFIS DE ACESSO: o que cada tipo de usuário pode fazer.
   'admin' = tudo. Os outros perfis só podem as ações listadas (os nomes são os do api.php?a=NOME).
   Para criar um perfil novo, acrescente uma linha aqui e o nome dele em PERFIS_NOMES (e em app.js, no mesmo nome). */
const PERFIS_NOMES = ['admin' => 'Administrador', 'pedidos' => 'Pedidos (só pedidos, orçamentos e clientes)'];
const PERFIS_ACOES = [
    'pedidos' => ['estado', 'logout', 'ajustes', 'senha_trocar', 'produtos', 'clientes', 'cliente', 'cliente_salvar',
                  'pedidos', 'pedido', 'pedido_salvar', 'pedido_status', 'pedido_receber',
                  'orcamentos', 'orcamento', 'orcamento_salvar', 'orcamento_status', 'orcamento_gerar_pedido'],
];
function perfilAtual(): string { return (string)($GLOBALS['__perfil'] ?? 'admin'); }
function souAdmin(): bool { return perfilAtual() === 'admin'; }
function acoesPermitidas(string $perfil): ?array { return PERFIS_ACOES[$perfil] ?? null; }   /* null = tudo */

/* Confere a cada pedido se o usuário ainda existe e está ativo (se o admin desativar, a sessão cai na hora). */
function exigirLogin(): void {
    if (empty($_SESSION['uid'])) fail('Faça login para continuar.', 401);
    $s = db()->prepare('SELECT usuario, perfil, ativo FROM usuarios WHERE id = ?'); $s->execute([(int)$_SESSION['uid']]);
    $u = $s->fetch();
    if (!$u || (int)($u['ativo'] ?? 1) !== 1) { $_SESSION = []; fail('Seu acesso foi desativado.', 401); }
    $GLOBALS['__perfil'] = isset(PERFIS_NOMES[$u['perfil'] ?? '']) ? $u['perfil'] : 'pedidos';   /* perfil desconhecido = o mais restrito */
    $_SESSION['usuario'] = $u['usuario'];
}
function exigirPermissao(string $a): void {
    $p = acoesPermitidas(perfilAtual());
    if ($p !== null && !in_array($a, $p, true)) fail('Seu perfil não tem acesso a isso.', 403);
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
