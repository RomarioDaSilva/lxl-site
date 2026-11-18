<?php
declare(strict_types=1);
/* AÇÕES: Ajustes (backup, histórico, e-mail de avisos, trocar senha).
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Cada "case" é um endereço da API: api.php?a=NOME. */
switch ($a) {

case 'ajustes': {
    if (!souAdmin()) out(['usuario' => $_SESSION['usuario'], 'perfil' => perfilAtual()]);   /* quem não é admin só vê o básico (trocar a senha) */
    $s = $db->prepare('SELECT valor FROM parametros WHERE chave = ?'); $s->execute(['ult_backup']);
    $ub = $s->fetchColumn();
    $d = $db->query('SELECT primeiro, ultimo, ip, agente FROM dispositivos WHERE usuario = ' . $db->quote((string)$_SESSION['usuario']) . ' ORDER BY ultimo DESC LIMIT 8')->fetchAll(PDO::FETCH_ASSOC);
    out(['usuario' => $_SESSION['usuario'], 'perfil' => 'admin', 'email_avisos' => emailAvisos(), 'ult_backup' => $ub ?: '', 'dispositivos' => $d]);
}
case 'backup': {
    $b = montarBackup();
    $agora = date('Y-m-d H:i');
    $s = $db->prepare('SELECT 1 FROM parametros WHERE chave = ?'); $s->execute(['ult_backup']);
    if ($s->fetch()) $db->prepare('UPDATE parametros SET valor = ? WHERE chave = ?')->execute([$agora, 'ult_backup']);
    else $db->prepare('INSERT INTO parametros (chave, valor) VALUES (?, ?)')->execute(['ult_backup', $agora]);
    auditar('Backup baixado', '', 'linhas por tabela: ' . json_encode($b['contagem']));
    out($b);
}
case 'historico': {
    $q = txt($_GET['q'] ?? '', 60); $antes = (int)($_GET['antes'] ?? 0);
    $w = []; $p = [];
    if ($q !== '') { $w[] = '(acao LIKE ? OR alvo LIKE ? OR detalhe LIKE ? OR usuario LIKE ?)'; array_push($p, "%$q%", "%$q%", "%$q%", "%$q%"); }
    if ($antes > 0) { $w[] = 'id < ?'; $p[] = $antes; }
    $st = $db->prepare('SELECT id, quando, usuario, ip, acao, alvo, detalhe FROM auditoria' . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . ' ORDER BY id DESC LIMIT 101');
    $st->execute($p); $r = $st->fetchAll(PDO::FETCH_ASSOC);
    $mais = count($r) > 100; if ($mais) array_pop($r);
    out(['itens' => $r, 'tem_mais' => $mais]);
}
case 'email_salvar': {
    $e = txt($in['email'] ?? '', 40);
    if ($e !== '' && !filter_var($e, FILTER_VALIDATE_EMAIL)) fail('Esse e-mail não parece certo. Confira e tente de novo.');
    $s = $db->prepare('SELECT 1 FROM parametros WHERE chave = ?'); $s->execute(['email_avisos']);
    if ($s->fetch()) $db->prepare('UPDATE parametros SET valor = ? WHERE chave = ?')->execute([$e, 'email_avisos']);
    else $db->prepare('INSERT INTO parametros (chave, valor) VALUES (?, ?)')->execute(['email_avisos', $e]);
    auditar('E-mail de avisos alterado', '', $e === '' ? 'removido' : 'definido');
    out(['email_avisos' => emailAvisos()]);
}
case 'email_teste': {
    if (emailAvisos() === '') fail('Digite e salve um e-mail primeiro.');
    $ok = enviarAviso('Teste de aviso', 'Se você recebeu esta mensagem, os avisos de segurança do painel estão funcionando.');
    out(['enviado' => $ok]);
}
case 'senha_trocar': {
    $atual = (string)($in['atual'] ?? ''); $nova = (string)($in['nova'] ?? '');
    $s = $db->prepare('SELECT * FROM usuarios WHERE id = ?'); $s->execute([(int)$_SESSION['uid']]);
    $u = $s->fetch();
    if (!$u || !password_verify($atual, $u['senha'])) { auditar('Troca de senha falhou', (string)$_SESSION['usuario'], 'senha atual incorreta'); fail('A senha atual não confere.', 400); }
    if (mb_strlen($nova) < 10) fail('A nova senha precisa ter pelo menos 10 caracteres.');
    if ($nova === $atual) fail('A nova senha precisa ser diferente da atual.');
    $db->prepare('UPDATE usuarios SET senha = ? WHERE id = ?')->execute([password_hash($nova, PASSWORD_DEFAULT), (int)$u['id']]);
    auditar('Senha alterada', (string)$_SESSION['usuario'], 'senha trocada pelo painel');
    enviarAviso('Senha do painel alterada', 'A senha do usuário "' . $u['usuario'] . '" foi trocada. Se não foi você, entre em contato com a hospedagem e restaure o acesso.');
    out(['ok' => true]);
}

}
