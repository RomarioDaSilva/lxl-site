<?php
declare(strict_types=1);
/* AÇÕES: usuários e permissões (só o administrador usa; o perfil "pedidos" não chega aqui, ver PERFIS_ACOES em sessao.php).
   Quem cria usuário é só o administrador: ele manda um CONVITE por e-mail, e a pessoa escolhe nome, login e senha pelo link.
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). */

function usuariosOut(): array {
    $db = db();
    $us = array_map(fn($u) => ['id' => (int)$u['id'], 'usuario' => $u['usuario'], 'nome' => (string)($u['nome'] ?? ''), 'email' => (string)($u['email'] ?? ''),
        'perfil' => $u['perfil'] ?? 'admin', 'ativo' => (int)($u['ativo'] ?? 1), 'criado_em' => (string)$u['criado_em']], $db->query('SELECT * FROM usuarios ORDER BY id')->fetchAll());
    $cv = array_map(fn($t) => ['id' => (int)$t['id'], 'email' => $t['email'], 'perfil' => $t['perfil'], 'expira' => date('d/m/Y H:i', (int)$t['expira'])],
        $db->query("SELECT * FROM tokens WHERE tipo = 'convite' AND usado = 0 AND expira > " . time() . ' ORDER BY id DESC')->fetchAll());
    return ['usuarios' => $us, 'convites' => $cv, 'perfis' => PERFIS_NOMES];
}
function totalAdminsAtivos(int $exceto = 0): int {
    $s = db()->prepare("SELECT COUNT(*) FROM usuarios WHERE perfil = 'admin' AND ativo = 1 AND id <> ?"); $s->execute([$exceto]);
    return (int)$s->fetchColumn();
}

switch ($a) {

case 'usuarios':
    out(usuariosOut());

/* Convite: gera o link (vale 7 dias, uso único), tenta mandar por e-mail e devolve o link para você copiar se o e-mail falhar. */
case 'usuario_convidar': {
    $email = txt($in['email'] ?? '', 120); $perfil = (string)($in['perfil'] ?? 'pedidos');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Digite um e-mail válido para a pessoa.');
    if (!isset(PERFIS_NOMES[$perfil])) fail('Escolha o tipo de acesso.');
    $x = $db->prepare('SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER(?)'); $x->execute([$email]);
    if ($x->fetch()) fail('Já existe um usuário com esse e-mail.');
    $db->prepare("UPDATE tokens SET usado = 1 WHERE tipo = 'convite' AND LOWER(email) = LOWER(?)")->execute([$email]);   /* convite novo cancela o anterior */
    $t = criarToken('convite', 7 * 86400, null, $email, $perfil);
    $link = enderecoDoPainel() . '#/convite/' . $t;
    $ok = enviarEmail($email, 'Convite para o painel da LXL', "Olá!\n\nVocê foi convidado para usar o painel da LXL Projetos.\nAbra o link abaixo para escolher o seu nome, login e senha (vale por 7 dias e só funciona uma vez):\n\n$link\n");
    auditar('Convite enviado', $email, 'perfil: ' . $perfil . '; ' . ($ok ? 'e-mail enviado' : 'e-mail NÃO enviado (link copiado na tela)'));
    out(['link' => $link, 'enviado' => $ok] + usuariosOut());
}

case 'convite_cancelar': {
    $db->prepare("UPDATE tokens SET usado = 1 WHERE id = ? AND tipo = 'convite'")->execute([(int)($in['id'] ?? 0)]);
    auditar('Convite cancelado', '', '');
    out(usuariosOut());
}

/* Muda nome, e-mail, tipo de acesso ou desativa. Não deixa desativar a si mesmo nem tirar o último administrador. */
case 'usuario_editar': {
    $id = (int)($in['id'] ?? 0);
    $s = $db->prepare('SELECT * FROM usuarios WHERE id = ?'); $s->execute([$id]); $u = $s->fetch();
    if (!$u) fail('Usuário não encontrado.', 404);
    $perfil = (string)($in['perfil'] ?? $u['perfil']); $ativo = array_key_exists('ativo', $in) ? (empty($in['ativo']) ? 0 : 1) : (int)$u['ativo'];
    if (!isset(PERFIS_NOMES[$perfil])) fail('Tipo de acesso inválido.');
    $email = txt($in['email'] ?? $u['email'], 120);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Esse e-mail não parece certo.');
    if ($id === (int)$_SESSION['uid'] && ($ativo === 0 || $perfil !== 'admin')) fail('Você não pode desativar nem rebaixar o seu próprio acesso.');
    if ($u['perfil'] === 'admin' && ($perfil !== 'admin' || $ativo === 0) && totalAdminsAtivos($id) < 1) fail('Precisa sobrar pelo menos um administrador ativo.');
    $db->prepare('UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ? WHERE id = ?')->execute([txt($in['nome'] ?? $u['nome'], 80), $email, $perfil, $ativo, $id]);
    $mud = [];
    if ($perfil !== $u['perfil']) $mud[] = 'perfil: ' . $u['perfil'] . ' -> ' . $perfil;
    if ($ativo !== (int)$u['ativo']) $mud[] = $ativo ? 'reativado' : 'desativado';
    auditar('Usuário alterado', $u['usuario'], implode('; ', $mud) ?: 'dados atualizados');
    out(usuariosOut());
}

/* Redefinir a senha de alguém: gera um link de 24 horas, manda para o e-mail dele e mostra o link aqui também. Você nunca vê a senha de ninguém. */
case 'usuario_link_senha': {
    $s = $db->prepare('SELECT * FROM usuarios WHERE id = ?'); $s->execute([(int)($in['id'] ?? 0)]); $u = $s->fetch();
    if (!$u) fail('Usuário não encontrado.', 404);
    $t = criarToken('reset', 86400, (int)$u['id']);
    $link = enderecoDoPainel() . '#/senha/' . $t;
    $ok = false;
    if (filter_var($u['email'] ?? '', FILTER_VALIDATE_EMAIL)) $ok = enviarEmail($u['email'], 'Nova senha do painel', "Olá!\n\nO administrador pediu para você criar uma senha nova no painel da LXL.\nAbra o link abaixo (vale por 24 horas e só funciona uma vez):\n\n$link\n");
    auditar('Link de senha gerado', $u['usuario'], $ok ? 'e-mail enviado' : 'e-mail não enviado (link mostrado ao administrador)');
    out(['link' => $link, 'enviado' => $ok]);
}

}
