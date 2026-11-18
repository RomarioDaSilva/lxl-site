<?php
declare(strict_types=1);
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

/* Etapas do pedido, na ordem. Se mudar aqui, mude também os nomes na tela (STATUS e PROXIMO em app.js). */
const STATUS = ['novo', 'producao', 'pronto', 'entregue', 'cancelado'];

require __DIR__ . '/lib.php';
require __DIR__ . '/seguranca.php';   /* histórico, avisos por e-mail e aparelhos conhecidos */
require __DIR__ . '/backup.php';      /* cópia de segurança do banco */
require __DIR__ . '/bd.php';          /* criação das tabelas */
require __DIR__ . '/sessao.php';      /* sessão, login, CSRF */
require __DIR__ . '/dados.php';       /* funções que montam produtos, clientes, pedidos... */

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

$publicas = ['estado', 'login', 'setup', 'senha_esqueci', 'token_info', 'token_usar', 'recuperar_admin'];   /* ações que não exigem login */
if (!in_array($a, $publicas, true)) {
    exigirLogin();
    exigirPermissao($a);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') exigirCsrf();
}
$db = db();
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset(ROTULOS_ACAO[$a])) {
    register_shutdown_function('auditarRequisicao', $a, $in, lerAlvo($a, $in));   /* grava no histórico, depois que a ação termina com sucesso */
}


/* Cada arquivo de acoes/ cuida de um assunto. Para achar uma ação, procure o nome dela (ex.: pedido_salvar) nessa pasta. */
foreach (['acesso', 'ajustes', 'usuarios', 'estoque', 'relatorios', 'clientes', 'categorias', 'pedidos', 'orcamentos'] as $arq) require __DIR__ . "/acoes/$arq.php";
fail('Ação desconhecida.', 404);
