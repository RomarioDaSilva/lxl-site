<?php
declare(strict_types=1);
/* AÇÕES: entrar, sair e primeiro acesso.
   Este arquivo é incluído pelo api.php (aqui já existem $a, $in e $db). Cada "case" é um endereço da API: api.php?a=NOME. */
switch ($a) {

case 'estado': {
    $temUser = (int)$db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0;
    $perfil = 'admin'; $nome = '';
    if (!empty($_SESSION['uid'])) {   /* perfil lido do banco: quem manda é o banco, não o navegador */
        $q = $db->prepare('SELECT perfil, ativo, nome FROM usuarios WHERE id = ?'); $q->execute([(int)$_SESSION['uid']]); $u = $q->fetch();
        if (!$u || (int)($u['ativo'] ?? 1) !== 1) $_SESSION = ['csrf' => bin2hex(random_bytes(24))];
        else { $perfil = isset(PERFIS_NOMES[$u['perfil'] ?? '']) ? $u['perfil'] : 'pedidos'; $nome = (string)($u['nome'] ?? ''); }
    }
    out(['logado' => !empty($_SESSION['uid']), 'usuario' => $_SESSION['usuario'] ?? '', 'nome' => $nome, 'perfil' => $perfil, 'permitidas' => acoesPermitidas($perfil),
         'setup' => !$temUser, 'csrf' => $_SESSION['csrf']]);
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
    $db->prepare("INSERT INTO usuarios (usuario, senha, criado_em, perfil, ativo) VALUES (?, ?, ?, 'admin', 1)")
       ->execute([$u, password_hash($s, PASSWORD_DEFAULT), date('Y-m-d H:i:s')]);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$db->lastInsertId(); $_SESSION['usuario'] = $u;
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
    auditar('Painel configurado', $u, 'primeiro usuário criado');
    registrarDispositivo($u);
    out(['ok' => true, 'csrf' => $_SESSION['csrf'], 'usuario' => $u]);
}

case 'login': {
    if (bloqueado()) fail('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
    $s = $db->prepare('SELECT * FROM usuarios WHERE usuario = ?');
    $s->execute([txt($in['usuario'] ?? '', 60)]);
    $u = $s->fetch();
    if ($u && (int)($u['ativo'] ?? 1) !== 1) { registrarFalha(); auditar('Login falhou', $u['usuario'], 'usuário desativado', 'visitante'); fail('Usuário ou senha incorretos.', 401); }
    if (!$u || !password_verify((string)($in['senha'] ?? ''), $u['senha'])) {
        registrarFalha();
        auditar('Login falhou', txt($in['usuario'] ?? '', 60), 'senha ou usuário incorretos', 'visitante');
        $n = falhasRecentes();   /* avisa no 3º erro seguido e quando o acesso é bloqueado (8º) */
        if ($n === 3 || $n === 8) enviarAviso($n === 8 ? 'Acesso bloqueado por muitas tentativas' : 'Tentativas erradas de entrar no painel', "Houve $n tentativas erradas de login em 15 minutos para o usuário \"" . txt($in['usuario'] ?? '', 60) . "\".");
        fail('Usuário ou senha incorretos.', 401);
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$u['id']; $_SESSION['usuario'] = $u['usuario'];
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
    auditar('Login', $u['usuario'], 'entrou no painel');
    if (registrarDispositivo($u['usuario'])) enviarAviso('Entrada de um aparelho novo', 'O usuário "' . $u['usuario'] . '" entrou no painel de um aparelho ou rede que nunca tinha usado. Se não foi você, troque a senha em Ajustes.');
    out(['ok' => true, 'csrf' => $_SESSION['csrf'], 'usuario' => $u['usuario']]);
}

case 'logout': {
    auditar('Saída', (string)($_SESSION['usuario'] ?? ''), 'saiu do painel');
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

/* ----- esqueci a senha, convite e recuperação do administrador (ações sem login) ----- */

/* "Esqueci minha senha": manda um link (vale 30 minutos, uso único) para o e-mail do usuário.
   A resposta é sempre a mesma, exista o usuário ou não, para ninguém descobrir quem tem conta. */
case 'senha_esqueci': {
    if (bloqueado()) fail('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
    registrarFalha();   /* conta como tentativa: impede disparar e-mails em massa */
    $q = txt($in['usuario'] ?? '', 120);
    if ($q !== '') {
        $s = $db->prepare('SELECT * FROM usuarios WHERE (usuario = ? OR (email <> \'\' AND email = ?)) AND ativo = 1 LIMIT 1'); $s->execute([$q, $q]); $u = $s->fetch();
        if ($u) {
            $para = filter_var($u['email'] ?? '', FILTER_VALIDATE_EMAIL) ? $u['email'] : ($u['perfil'] === 'admin' ? emailAvisos() : '');   /* admin sem e-mail próprio usa o e-mail de avisos */
            if ($para !== '') {
                $t = criarToken('reset', 1800, (int)$u['id']);
                $ok = enviarEmail($para, 'Trocar a senha do painel', "Olá!\n\nAlguém pediu para trocar a senha do usuário \"" . $u['usuario'] . "\" no painel da LXL.\nPara criar uma senha nova, abra o link abaixo (vale por 30 minutos e só funciona uma vez):\n\n" . enderecoDoPainel() . '#/senha/' . $t . "\n\nSe não foi você, ignore este e-mail.");
                auditar('Senha: link pedido', $u['usuario'], $ok ? 'e-mail enviado' : 'NÃO foi possível enviar o e-mail', 'visitante');
            } else auditar('Senha: link pedido', $u['usuario'], 'usuário sem e-mail cadastrado', 'visitante');
        }
    }
    out(['ok' => true, 'mensagem' => 'Se esse usuário existir e tiver e-mail cadastrado, o link chegou na caixa de entrada. Olhe também o spam. Vale por 30 minutos.']);
}

/* A tela do link pergunta aqui se o código ainda vale e que tipo de link é (convite ou troca de senha). */
case 'token_info': {
    $t = acharToken((string)($_GET['t'] ?? ''));
    if (!$t) fail('Esse link venceu ou já foi usado. Peça um novo.', 404);
    $nome = '';
    if ($t['tipo'] === 'reset') { $s = $db->prepare('SELECT usuario FROM usuarios WHERE id = ?'); $s->execute([(int)$t['usuario_id']]); $nome = (string)$s->fetchColumn(); }
    out(['tipo' => $t['tipo'], 'email' => $t['email'], 'usuario' => $nome]);
}

/* Usa o link: convite = a pessoa escolhe nome, login e senha; reset = escolhe a senha nova. */
case 'token_usar': {
    if (bloqueado()) fail('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
    $t = acharToken((string)($in['t'] ?? ''));
    if (!$t) { registrarFalha(); fail('Esse link venceu ou já foi usado. Peça um novo.', 404); }
    $senha = (string)($in['senha'] ?? '');
    if (mb_strlen($senha) < 10) fail('A senha precisa ter pelo menos 10 caracteres.');
    $db->beginTransaction();
    try {
        if ($t['tipo'] === 'convite') {
            $login = strtolower(txt($in['usuario'] ?? '', 60)); $nome = txt($in['nome'] ?? '', 80);
            if ($nome === '') { $db->rollBack(); fail('Escreva o seu nome.'); }
            if (!preg_match('/^[a-z0-9._-]{3,40}$/', $login)) { $db->rollBack(); fail('O login deve ter de 3 a 40 letras minúsculas, números, ponto, traço ou sublinhado, sem espaços.'); }
            $x = $db->prepare('SELECT 1 FROM usuarios WHERE usuario = ?'); $x->execute([$login]);
            if ($x->fetch()) { $db->rollBack(); fail('Esse login já está em uso. Escolha outro.'); }
            $db->prepare('INSERT INTO usuarios (usuario, senha, criado_em, nome, email, perfil, ativo) VALUES (?,?,?,?,?,?,1)')
               ->execute([$login, password_hash($senha, PASSWORD_DEFAULT), date('Y-m-d H:i:s'), $nome, $t['email'], isset(PERFIS_NOMES[$t['perfil']]) ? $t['perfil'] : 'pedidos']);
            auditar('Usuário criado pelo convite', $login, 'perfil: ' . $t['perfil'], $login);
        } else {
            $db->prepare('UPDATE usuarios SET senha = ? WHERE id = ?')->execute([password_hash($senha, PASSWORD_DEFAULT), (int)$t['usuario_id']]);
            $s = $db->prepare('SELECT usuario FROM usuarios WHERE id = ?'); $s->execute([(int)$t['usuario_id']]); $nomeU = (string)$s->fetchColumn();
            auditar('Senha redefinida pelo link', $nomeU, 'nova senha criada', $nomeU);
        }
        $db->prepare('UPDATE tokens SET usado = 1 WHERE id = ?')->execute([(int)$t['id']]);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); fail('Não consegui concluir. Tente de novo.', 500); }
    if ($t['tipo'] === 'reset') enviarAviso('Senha de um usuário redefinida', 'Uma senha do painel foi trocada pelo link de "esqueci minha senha". Se não foi você, entre no painel e confira o Histórico.');
    out(['ok' => true]);
}

/* PLANO B do administrador (bem difícil de propósito): precisa do código secreto que fica no lxl-config.php, na hospedagem.
   Passo a passo no LEIA-ME e na tela de Ajustes. Só funciona para usuário administrador. */
case 'recuperar_admin': {
    if (bloqueado()) fail('Muitas tentativas. Espere 15 minutos.', 429);
    $cod = (string)(cfg()['codigo_inicial'] ?? '');
    $s = $db->prepare("SELECT * FROM usuarios WHERE usuario = ? AND perfil = 'admin'"); $s->execute([txt($in['usuario'] ?? '', 60)]); $u = $s->fetch();
    $senha = (string)($in['senha'] ?? '');
    if ($cod === '' || str_starts_with($cod, 'ESCOLHA_') || mb_strlen($cod) < 8 || !$u || !hash_equals($cod, (string)($in['codigo'] ?? ''))) {
        registrarFalha(); auditar('Recuperação do admin falhou', txt($in['usuario'] ?? '', 60), 'código ou usuário incorretos', 'visitante');
        enviarAviso('Tentativa de recuperar o acesso de administrador', 'Alguém tentou usar o código secreto para redefinir a senha de administrador e errou.');
        fail('Código secreto ou usuário incorretos.', 403);
    }
    if (mb_strlen($senha) < 10) fail('A senha nova precisa ter pelo menos 10 caracteres.');
    $db->prepare('UPDATE usuarios SET senha = ?, ativo = 1 WHERE id = ?')->execute([password_hash($senha, PASSWORD_DEFAULT), (int)$u['id']]);
    auditar('Senha do admin recuperada', $u['usuario'], 'redefinida com o código secreto', $u['usuario']);
    enviarAviso('Senha de administrador redefinida pelo código secreto', 'A senha do administrador "' . $u['usuario'] . '" foi redefinida usando o código secreto do arquivo de configuração. Se não foi você, troque o código no lxl-config.php.');
    out(['ok' => true]);
}

}
