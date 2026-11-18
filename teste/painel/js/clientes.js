/* PAINEL LXL | CLIENTES: lista e cadastro.
   Os arquivos da pasta js/ são carregados na ordem do index.html e compartilham as mesmas variáveis. */
'use strict';

/* ---------- clientes ---------- */
let fCli = '';
async function telaClientes() {
  quadro('clientes', '<p class="carregando">Carregando...</p>');
  try { await carregarClientes(true); } catch (e) { return toast(e.message); }
  $('.wrap').innerHTML = '<h1>Clientes</h1><div class="barra"><button class="btn o" id="cNovo" type="button">Novo cliente</button></div>' +
    '<input type="search" id="cBusca" placeholder="Buscar por nome, telefone ou código" value="' + esc(fCli) + '" style="margin-bottom:12px"><div id="cLista"></div>';
  const desenha = () => {
    const q = fCli.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    const l = clientes.filter(c => !q || c.nome.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q) || (qd.length >= 3 && c.telefone.replace(/\D/g, '').includes(qd)));
    $('#cLista').innerHTML = l.length ? l.map(c => '<div class="card cli" data-id="' + c.id + '"><div><b>' + esc(c.nome) + '</b><small>' + esc(c.codigo) + (c.telefone ? ' &middot; ' + esc(c.telefone) : '') + (c.cidade ? ' &middot; ' + esc(c.cidade) : '') + '</small></div><div class="cr">' + c.pedidos + ' pedido(s)<small>' + brl(c.total) + (c.ultima ? ' &middot; última ' + dataBR(c.ultima) : '') + '</small></div></div>').join('')
      : '<div class="vazio">' + (clientes.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Toque em "Novo cliente".') + '</div>';
    document.querySelectorAll('.cli').forEach(el => el.onclick = () => { location.hash = '#/cliente/' + el.dataset.id; });
  };
  $('#cBusca').addEventListener('input', e => { fCli = e.target.value; desenha(); });
  $('#cNovo').onclick = () => formCliente({ id: 0, nome: '', telefone: '', endereco: '', cidade: '', obs: '' }, () => telaClientes());
  desenha();
}
/* Histórico do cliente: resumo, todos os pedidos dele e atalhos para pedido/orçamento novo. */
async function telaCliente(id) {
  quadro('clientes', '<p class="carregando">Carregando...</p>');
  let j; try { j = await api('cliente', null, '&id=' + id); } catch (e) { toast(e.message); return telaClientes(); }
  const c = j.cliente;
  $('.wrap').innerHTML = '<a class="voltar-cat" href="#/clientes">&larr; Clientes</a><h1>' + esc(c.nome) + '</h1>' +
    '<p class="mut">' + esc(c.codigo) + (c.telefone ? ' &middot; ' + esc(c.telefone) : '') + (c.cidade ? ' &middot; ' + esc(c.cidade) : '') + (c.endereco ? '<br>' + esc(c.endereco) : '') + (c.obs ? '<br>' + esc(c.obs) : '') + '</p>' +
    '<div class="resumo"><div class="card"><small>Pedidos</small><b>' + c.pedidos + '</b></div><div class="card"><small>Já comprou</small><b>' + brl(c.total) + '</b></div>' +
    '<div class="card"><small>Última compra</small><b>' + (c.ultima ? dataBR(c.ultima) : '-') + '</b></div><div class="card"><small>Ainda deve</small><b' + (c.deve > 0 ? ' class="neg"' : '') + '>' + brl(c.deve) + '</b></div></div>' +
    '<div class="barra"><button class="btn" id="cdPed" type="button">Novo pedido</button><button class="btn o" id="cdOrc" type="button">Novo orçamento</button><button class="btn l" id="cdEd" type="button">Editar cliente</button>' +
    (c.telefone && pode('pedidos') ? '<a class="btn l" target="_blank" rel="noopener" href="https://wa.me/55' + c.telefone.replace(/\D/g, '').replace(/^55/, '') + '">WhatsApp</a>' : '') + '</div>' +
    '<h2>Pedidos deste cliente</h2>' + (j.pedidos.length ? j.pedidos.map(p => '<a class="card ped" href="#/nota/' + p.id + '" style="display:block;text-decoration:none;color:inherit"><div class="hh"><b>PED-' + numPed(p.id) + ' &middot; ' + dataBR(p.data) + '</b><span class="pill ' + p.status + '">' + STATUS[p.status] + '</span></div>' +
      '<div class="mut">' + esc(p.resumo) + '</div><div class="hh"><b>' + brl(p.total) + '</b><span class="pill ' + (p.pago ? 'pago' : 'apagar') + '">' + (p.pago ? 'Pago' : p.pago_valor > 0 ? 'Falta ' + brl(p.saldo) : 'A receber') + '</span></div></a>').join('') : '<div class="vazio">Esse cliente ainda não tem pedidos.</div>');
  const comCliente = modo => { const base = modo === 'orcamento' ? orcVazio() : pedidoVazio(); P = { ...base, cliente_id: c.id, cliente: c.nome, whatsapp: c.telefone || '', endereco: c.endereco || '' }; location.hash = modo === 'orcamento' ? '#/orcamento-novo' : '#/novo'; };
  $('#cdPed').onclick = () => comCliente('pedido'); $('#cdOrc').onclick = () => comCliente('orcamento');
  $('#cdEd').onclick = () => formCliente(c, () => telaCliente(id));
}

function formCliente(c, aoSalvar) {
  const m = modal('<h2>' + (c.id ? 'Editar cliente ' + esc(c.codigo) : 'Novo cliente') + ' <button class="btn s l" data-fechar type="button">Fechar</button></h2>' +
    '<label>Nome *</label><input type="text" id="cn" value="' + esc(c.nome) + '">' +
    '<label>Telefone / WhatsApp</label><input type="tel" id="ct" value="' + esc(c.telefone) + '" placeholder="(38) 9....">' +
    '<label>Endereço</label><input type="text" id="ce" value="' + esc(c.endereco) + '" placeholder="Rua, número, bairro">' +
    '<label>Cidade</label><input type="text" id="cc" value="' + esc(c.cidade) + '" placeholder="Montes Claros">' +
    '<label>Observações</label><input type="text" id="co" value="' + esc(c.obs) + '">' +
    '<div class="acoes"><button class="btn" id="ok" type="button">Salvar</button>' + (c.id ? '<button class="btn s r" id="ex" type="button">Excluir</button>' : '') + '</div>');
  $('#ok', m).onclick = async () => {
    try {
      const j = await api('cliente_salvar', { id: c.id, nome: $('#cn', m).value, telefone: $('#ct', m).value, endereco: $('#ce', m).value, cidade: $('#cc', m).value, obs: $('#co', m).value });
      clientes = j.clientes; m.fechar(); toast('Cliente salvo.'); if (aoSalvar) aoSalvar(j.cliente);
    } catch (e) { toast(e.message); }
  };
  if (c.id) $('#ex', m).onclick = async () => {
    if (!await confirmar('Excluir cliente', 'Tem certeza que deseja excluir o cliente "' + c.nome + '"? Os pedidos dele continuam salvos.')) return;
    try { const j = await api('cliente_excluir', { id: c.id }); clientes = j.clientes; m.fechar(); toast('Cliente excluído.'); if (aoSalvar) aoSalvar(null); } catch (e) { toast(e.message); }
  };
}

