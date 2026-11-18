/* PAINEL LXL | ACESSO: entrar, primeiro acesso, esqueci a senha, convite e recuperação do administrador.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* Moldura simples das telas sem login (logo + título + cartão). */
function telaSemLogin(titulo, texto, formHTML) {
  app.innerHTML = '<div class="wrap login"><img src="/natal/imagens/logo-colorida.png" alt="LXL Projetos"><h1>' + titulo + '</h1>' + (texto ? '<p class="mut">' + texto + '</p>' : '') + '<form id="f" class="card">' + formHTML + '</form></div>';
}

/* ---------- login / primeira configuração ---------- */
function telaLogin(setup) {
  logado = false;
  app.innerHTML =
    '<div class="wrap login"><img src="/natal/imagens/logo-colorida.png" alt="LXL Projetos">' +
    '<h1>' + (setup ? 'Primeiro acesso' : 'Entrar no painel') + '</h1>' +
    (setup ? '<p class="mut">Crie o seu usuário e a sua senha. Você vai precisar do código secreto que colocou no arquivo de configuração.</p>' : '') +
    '<form id="f" class="card">' +
    (setup ? '<label>Código secreto</label><input type="password" id="cod" autocomplete="off">' : '') +
    '<label>Usuário</label><input type="text" id="u" autocomplete="username" autocapitalize="none">' +
    '<label>Senha' + (setup ? ' (mínimo 8 caracteres)' : '') + '</label><input type="password" id="s" autocomplete="' + (setup ? 'new-password' : 'current-password') + '">' +
    '<div class="erro" id="e" role="alert"></div>' +
    '<button class="btn" style="width:100%;margin-top:8px" type="submit">' + (setup ? 'Criar e entrar' : 'Entrar') + '</button>' +
    (setup ? '' : '<p class="logl"><a href="#/esqueci">Esqueci minha senha</a></p>') + '</form></div>';
  $('#f').onsubmit = async ev => {
    ev.preventDefault();
    $('#e').textContent = '';
    try {
      const body = { usuario: $('#u').value, senha: $('#s').value };
      if (setup) body.codigo = $('#cod').value;
      await api(setup ? 'setup' : 'login', body);
      location.hash = ''; iniciar();   /* recarrega o estado para saber o perfil (o que esse usuário pode ver) */
    } catch (e) { $('#e').textContent = e.message; }
  };
}

/* ---------- "Esqueci minha senha": pede o link por e-mail ---------- */
function telaEsqueci() {
  telaSemLogin('Esqueci minha senha', 'Digite o seu usuário (ou o e-mail cadastrado). Vamos mandar um link para criar uma senha nova. O link vale 30 minutos.',
    '<label>Usuário ou e-mail</label><input type="text" id="u" autocomplete="username" autocapitalize="none"><div class="erro" id="e" role="alert"></div>' +
    '<button class="btn" style="width:100%;margin-top:8px" type="submit">Enviar o link</button>' +
    '<p class="logl"><a href="#/">Voltar para o login</a></p><p class="logl"><a href="#/recuperar">Sou o administrador e o e-mail não chega</a></p>');
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); $('#e').textContent = '';
    try { const j = await api('senha_esqueci', { usuario: $('#u').value }); $('#f').innerHTML = '<p>' + esc(j.mensagem) + '</p><p class="logl"><a href="#/">Voltar para o login</a></p>'; }
    catch (e) { $('#e').textContent = e.message; }
  };
}

/* ---------- link de convite (#/convite/CODIGO) e de senha nova (#/senha/CODIGO) ---------- */
async function telaToken(tipoNaURL, codigo) {
  telaSemLogin('Um instante...', '', '<p class="carregando">Conferindo o link...</p>');
  let info;
  try { info = await (await fetch('api.php?a=token_info&t=' + encodeURIComponent(codigo), { credentials: 'same-origin' })).json(); } catch (e) { info = { erro: 'Sem conexão com o servidor.' }; }
  if (info.erro) return telaSemLogin('Link inválido', info.erro, '<p class="logl"><a href="#/esqueci">Pedir um link novo</a></p><p class="logl"><a href="#/">Ir para o login</a></p>');
  const convite = info.tipo === 'convite';
  telaSemLogin(convite ? 'Bem-vindo ao painel' : 'Criar uma senha nova', convite ? 'Escolha o seu nome, o login e a senha.' : 'Usuário: <b>' + esc(info.usuario) + '</b>',
    (convite ? '<label>Seu nome</label><input type="text" id="n" autocomplete="name">' +
      '<label>Login (para entrar; sem espaços, ex: ana)</label><input type="text" id="u" autocomplete="username" autocapitalize="none">' : '') +
    '<label>Senha (mínimo 10 caracteres)</label><input type="password" id="s" autocomplete="new-password">' +
    '<label>Repita a senha</label><input type="password" id="s2" autocomplete="new-password"><div class="erro" id="e" role="alert"></div>' +
    '<button class="btn" style="width:100%;margin-top:8px" type="submit">' + (convite ? 'Criar meu acesso' : 'Salvar a senha') + '</button>');
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); $('#e').textContent = '';
    if ($('#s').value !== $('#s2').value) return ($('#e').textContent = 'As duas senhas não são iguais.');
    try {
      await api('token_usar', { t: codigo, senha: $('#s').value, usuario: convite ? $('#u').value : '', nome: convite ? $('#n').value : '' });
      toast(convite ? 'Acesso criado. Agora é só entrar.' : 'Senha salva. Agora é só entrar.'); location.hash = ''; iniciar();
    } catch (e) { $('#e').textContent = e.message; }
  };
}

/* ---------- plano B do administrador: código secreto do lxl-config.php ---------- */
function telaRecuperar() {
  telaSemLogin('Recuperar acesso de administrador', 'Só use se o e-mail não chegar. Você precisa do código secreto que está no arquivo lxl-config.php, na hospedagem (o mesmo do primeiro acesso). O passo a passo está em Ajustes, no cartão "Perdi o acesso", e no arquivo LEIA-ME.',
    '<label>Código secreto</label><input type="password" id="cod" autocomplete="off"><label>Usuário administrador</label><input type="text" id="u" autocapitalize="none">' +
    '<label>Senha nova (mínimo 10 caracteres)</label><input type="password" id="s" autocomplete="new-password"><div class="erro" id="e" role="alert"></div>' +
    '<button class="btn" style="width:100%;margin-top:8px" type="submit">Redefinir a senha</button><p class="logl"><a href="#/">Voltar para o login</a></p>');
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); $('#e').textContent = '';
    try { await api('recuperar_admin', { codigo: $('#cod').value, usuario: $('#u').value, senha: $('#s').value }); toast('Senha redefinida. Agora é só entrar.'); location.hash = ''; iniciar(); }
    catch (e) { $('#e').textContent = e.message; }
  };
}
