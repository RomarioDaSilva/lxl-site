/* PAINEL LXL | AJUSTES: backup, e-mail de avisos, trocar senha e histórico.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* ---------- ajustes: backup, avisos por e-mail, senha e histórico ---------- */
const dataHoraBR = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : String(s || ''); };

async function telaAjustes() {
  quadro('ajustes', '<p class="carregando">Carregando...</p>');
  let a; try { a = await api('ajustes'); } catch (e) { return toast(e.message); }
  if (a.perfil !== 'admin') {   /* quem não é administrador só troca a própria senha */
    $('.wrap').innerHTML = '<h1>Ajustes</h1><p class="mut">Você entrou como <b>' + esc(a.usuario) + '</b>.</p>' + cartaoSenha();
    return ligarSenha();
  }
  const dias = a.ult_backup ? Math.floor((Date.now() - new Date(a.ult_backup.replace(' ', 'T')).getTime()) / 86400000) : null;
  const aviso = dias === null ? '<span class="selo-oculta">nunca foi feito</span>' : dias > 7 ? '<span class="selo-oculta">há ' + dias + ' dias</span>' : '<span class="mut">' + dataHoraBR(a.ult_backup) + '</span>';
  $('.wrap').innerHTML = '<h1>Ajustes</h1>' +
    '<div class="card sec-aj"><h2>Backup</h2><p class="mut">Baixa um arquivo com tudo do painel: pedidos, clientes, estoque, categorias, custos e histórico. As senhas não vão no arquivo. Guarde num lugar seguro e nunca coloque no GitHub. Faça uma cópia de vez em quando, por exemplo toda semana.</p>' +
    '<p>Último backup: ' + aviso + '</p><button class="btn o" id="bk" type="button">Baixar backup agora</button></div>' +
    '<div class="card sec-aj"><h2>Avisos de segurança por e-mail</h2><p class="mut">Você recebe um e-mail quando alguém erra a senha várias vezes, quando entra de um aparelho novo ou quando a senha é trocada.</p>' +
    '<label>E-mail que recebe os avisos</label><input type="email" id="em" inputmode="email" autocomplete="email" value="' + esc(a.email_avisos) + '" placeholder="voce@exemplo.com">' +
    '<div class="barra" style="margin-top:8px"><button class="btn" id="emOk" type="button">Salvar e-mail</button><button class="btn l" id="emTeste" type="button">Enviar e-mail de teste</button></div>' +
    '<p class="mut" style="font-size:13px">Se o teste não chegar, olhe a caixa de spam. Se mesmo assim não chegar, a hospedagem pode estar bloqueando o envio. Os avisos continuam registrados no Histórico.</p></div>' +
    '<div class="card sec-aj"><h2>Usuários e permissões</h2><p class="mut">Convide pessoas, escolha o que cada uma pode ver (por exemplo, só pedidos), desative acessos e gere link de senha nova.</p><a class="btn l" href="#/usuarios" style="display:inline-block;text-align:center">Gerenciar usuários</a></div>' +
    cartaoSenha() +
    '<div class="card sec-aj"><h2>Aparelhos que já entraram</h2>' + (a.dispositivos.length ? a.dispositivos.map(d => '<div class="d" style="padding:6px 0;border-bottom:1px solid var(--line)">' + dataHoraBR(d.ultimo) + ' &middot; IP ' + esc(d.ip) + '<br><span class="mut" style="font-size:12px">' + esc(d.agente) + '</span></div>').join('') : '<p class="mut">Nenhum registro ainda.</p>') + '</div>' +
    '<div class="card sec-aj"><h2>Perdi o acesso</h2><p class="mut">Guarde estas instruções. Se esquecer a senha, primeiro use "Esqueci minha senha" na tela de login (chega um link no e-mail). Se o e-mail não chegar, use o plano B abaixo.</p>' +
    '<ol class="mut" style="padding-left:20px;line-height:1.5"><li>Entre no painel da Hostinger, em Arquivos &rarr; Gerenciador de arquivos.</li><li>Abra a pasta que fica um nível acima de <b>public_html</b> (a mesma onde está o arquivo <b>lxl-config.php</b>).</li><li>Abra o <b>lxl-config.php</b> e copie o valor de <b>codigo_inicial</b>. Não mostre esse código para ninguém.</li><li>No painel, na tela de login, toque em "Esqueci minha senha" e depois em "Sou o administrador e o e-mail não chega".</li><li>Cole o código, escreva o seu usuário e uma senha nova (mínimo 10 caracteres).</li><li>Depois de entrar, se quiser, troque o <b>codigo_inicial</b> por um novo no mesmo arquivo.</li></ol></div>' +
    '<div class="card sec-aj"><h2>Histórico de mudanças</h2><p class="mut">Tudo o que foi alterado no painel, com data, hora e quem fez.</p><a class="btn l" href="#/historico" style="display:inline-block;text-align:center">Ver histórico</a></div>';
  $('#bk').onclick = async () => {
    const b = $('#bk'); b.disabled = true; b.textContent = 'Gerando...';
    try {
      const j = await api('backup');
      const url = URL.createObjectURL(new Blob([JSON.stringify(j)], { type: 'application/json' }));
      const l = document.createElement('a'); l.href = url; l.download = 'lxl-backup-' + hoje() + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Backup baixado. Guarde o arquivo em um lugar seguro.'); telaAjustes();
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Baixar backup agora'; }
  };
  $('#emOk').onclick = async () => { try { await api('email_salvar', { email: $('#em').value.trim() }); toast('E-mail salvo.'); } catch (e) { toast(e.message); } };
  $('#emTeste').onclick = async () => {
    try { await api('email_salvar', { email: $('#em').value.trim() }); const j = await api('email_teste', {}); toast(j.enviado ? 'E-mail de teste enviado. Confira a caixa de entrada e o spam.' : 'Não consegui enviar. A hospedagem pode estar bloqueando e-mails.'); } catch (e) { toast(e.message); }
  };
  ligarSenha();
}

/* Cartão "Trocar senha" (aparece para todos os perfis). */
function cartaoSenha() {
  return '<div class="card sec-aj"><h2>Trocar senha</h2><label>Senha atual</label><input type="password" id="s0" autocomplete="current-password">' +
    '<label>Nova senha (mínimo 10 caracteres)</label><input type="password" id="s1" autocomplete="new-password"><label>Repita a nova senha</label><input type="password" id="s2" autocomplete="new-password">' +
    '<div style="margin-top:8px"><button class="btn" id="sOk" type="button">Trocar senha</button></div></div>';
}
function ligarSenha() {
  $('#sOk').onclick = async () => {
    if ($('#s1').value !== $('#s2').value) return toast('As duas senhas novas não são iguais.');
    try { await api('senha_trocar', { atual: $('#s0').value, nova: $('#s1').value }); ['#s0', '#s1', '#s2'].forEach(i => { $(i).value = ''; }); toast('Senha trocada.'); } catch (e) { toast(e.message); }
  };
}

async function telaHistorico() {
  quadro('ajustes', '<p class="carregando">Carregando...</p>');
  let itens = [], mais = false, q = '';
  const carrega = async (depois) => {
    const j = await api('historico', null, '&q=' + encodeURIComponent(q) + (depois ? '&antes=' + depois : ''));
    itens = depois ? itens.concat(j.itens) : j.itens; mais = j.tem_mais;
  };
  try { await carrega(0); } catch (e) { return toast(e.message); }
  $('.wrap').innerHTML = '<a class="voltar-cat" href="#/ajustes">&larr; Ajustes</a><h1>Histórico de mudanças</h1>' +
    '<input type="search" id="hq" placeholder="Buscar (ex.: preço, Presépio, login)"><div class="card" id="hl" style="margin-top:10px"></div><div id="hm"></div>';
  const desenha = () => {
    $('#hl').innerHTML = itens.length ? itens.map(i => '<div class="hist"><div class="hh"><b>' + esc(i.acao) + '</b><span class="mut">' + dataHoraBR(i.quando) + '</span></div>' +
      (i.alvo ? '<div class="ha">' + esc(i.alvo) + '</div>' : '') + (i.detalhe ? '<div class="hd">' + esc(i.detalhe) + '</div>' : '') +
      '<div class="mut" style="font-size:12px">' + esc(i.usuario || 'sistema') + (i.ip ? ' &middot; IP ' + esc(i.ip) : '') + '</div></div>').join('') : '<div class="vazio">Nada registrado ainda.</div>';
    $('#hm').innerHTML = mais ? '<button class="btn l" id="hmais" type="button" style="margin-top:10px">Mostrar mais</button>' : '';
    if (mais) $('#hmais').onclick = async () => { try { await carrega(itens[itens.length - 1].id); desenha(); } catch (e) { toast(e.message); } };
  };
  let t; $('#hq').oninput = e => { clearTimeout(t); t = setTimeout(async () => { q = e.target.value.trim(); try { await carrega(0); desenha(); } catch (er) { toast(er.message); } }, 300); };
  desenha();
}

