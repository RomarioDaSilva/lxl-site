/* PAINEL LXL | USUÁRIOS (só o administrador): convidar, mudar o tipo de acesso, desativar e gerar link de senha nova.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

const copiar = async t => { try { await navigator.clipboard.writeText(t); toast('Link copiado.'); } catch (e) { toast('Não consegui copiar. Selecione o link e copie.'); } };

async function telaUsuarios() {
  quadro('ajustes', '<p class="carregando">Carregando...</p>');
  let j; try { j = await api('usuarios'); } catch (e) { return toast(e.message); }
  const optPerfil = sel => Object.keys(j.perfis).map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(j.perfis[k]) + '</option>').join('');
  $('.wrap').innerHTML = '<a class="voltar-cat" href="#/ajustes">&larr; Ajustes</a><h1>Usuários</h1>' +
    '<p class="mut">Só você cria usuários. Convide pelo e-mail: a pessoa recebe um link e escolhe o próprio nome, login e senha. Você nunca vê a senha de ninguém.</p>' +
    '<div class="barra"><button class="btn o" id="uNovo" type="button">Convidar usuário</button></div>' +
    (j.convites.length ? '<h2>Convites aguardando</h2>' + j.convites.map(c => '<div class="card"><div class="hh"><b>' + esc(c.email) + '</b><span class="mut">' + esc(j.perfis[c.perfil] || c.perfil) + '</span></div><div class="mut">Vale até ' + esc(c.expira) + '</div><div class="acoes"><button class="btn s l" data-cc="' + c.id + '" type="button">Cancelar convite</button></div></div>').join('') : '') +
    '<h2>Quem tem acesso</h2>' + j.usuarios.map(u => '<div class="card' + (u.ativo ? '' : ' inativo') + '"><div class="hh"><b>' + esc(u.nome || u.usuario) + '</b><span class="pill ' + (u.ativo ? 'pago' : 'cancelado') + '">' + (u.ativo ? 'Ativo' : 'Desativado') + '</span></div>' +
      '<div class="mut">Login: ' + esc(u.usuario) + (u.email ? ' &middot; ' + esc(u.email) : ' &middot; sem e-mail') + '<br>Acesso: ' + esc(j.perfis[u.perfil] || u.perfil) + '</div>' +
      '<div class="acoes"><button class="btn s l" data-ed="' + u.id + '" type="button">Editar</button><button class="btn s l" data-ls="' + u.id + '" type="button">Link de senha nova</button></div></div>').join('');
  $('#uNovo').onclick = () => {
    const m = modal('<h2>Convidar usuário <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
      '<label>E-mail da pessoa</label><input type="email" id="ce" inputmode="email" autocomplete="off" placeholder="pessoa@exemplo.com">' +
      '<label>Tipo de acesso</label><select id="cp">' + optPerfil('pedidos') + '</select>' +
      '<p class="mut" style="font-size:13px">Pedidos: vê só pedidos, orçamentos e clientes. Não vê estoque, custos, relatórios, categorias, ajustes nem histórico.</p>' +
      '<div class="acoes"><button class="btn" id="cok" type="button">Enviar convite</button></div>');
    $('#cok', m).onclick = async () => {
      try {
        const r = await api('usuario_convidar', { email: $('#ce', m).value.trim(), perfil: $('#cp', m).value });
        m.fechar(); mostrarLink(r.enviado ? 'Convite enviado por e-mail.' : 'Não consegui enviar o e-mail, então mande o link abaixo para a pessoa (WhatsApp, por exemplo).', r.link, telaUsuarios);
      } catch (e) { toast(e.message); }
    };
  };
  document.querySelectorAll('[data-cc]').forEach(b => b.onclick = async () => { try { await api('convite_cancelar', { id: +b.dataset.cc }); telaUsuarios(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-ls]').forEach(b => b.onclick = async () => {
    if (!await confirmar('Link de senha nova', 'Gerar um link para essa pessoa criar uma senha nova? A senha atual continua valendo até ela usar o link.')) return;
    try { const r = await api('usuario_link_senha', { id: +b.dataset.ls }); mostrarLink(r.enviado ? 'Link enviado para o e-mail dela.' : 'Essa pessoa não tem e-mail ou o envio falhou. Mande o link abaixo para ela.', r.link, null); } catch (e) { toast(e.message); }
  });
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => {
    const u = j.usuarios.find(x => x.id === +b.dataset.ed);
    const m = modal('<h2>Editar ' + esc(u.usuario) + ' <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
      '<label>Nome</label><input type="text" id="en" value="' + esc(u.nome) + '"><label>E-mail</label><input type="email" id="ee" value="' + esc(u.email) + '">' +
      '<label>Tipo de acesso</label><select id="ep">' + optPerfil(u.perfil) + '</select>' +
      '<div class="ck"><input type="checkbox" id="ea"' + (u.ativo ? ' checked' : '') + '><label style="margin:0;color:inherit">Acesso ativo</label></div>' +
      '<div class="acoes"><button class="btn" id="eok" type="button">Salvar</button></div>');
    $('#eok', m).onclick = async () => {
      try { await api('usuario_editar', { id: u.id, nome: $('#en', m).value, email: $('#ee', m).value, perfil: $('#ep', m).value, ativo: $('#ea', m).checked ? 1 : 0 }); m.fechar(); toast('Salvo.'); telaUsuarios(); } catch (e) { toast(e.message); }
    };
  });
}

/* Mostra um link para copiar (convite ou senha nova). */
function mostrarLink(texto, link, depois) {
  const m = modal('<h2>Link pronto <button class="btn s l" data-fechar type="button">Fechar</button></h2><p>' + esc(texto) + '</p>' +
    '<input type="text" id="lk" readonly value="' + esc(link) + '" onfocus="this.select()"><div class="acoes"><button class="btn" id="lcp" type="button">Copiar link</button></div>' +
    '<p class="mut" style="font-size:13px">O link só funciona uma vez. Não publique em lugar aberto.</p>');
  $('#lcp', m).onclick = () => copiar(link);
  const f = m.fechar; m.fechar = () => { f(); if (depois) depois(); };
}
