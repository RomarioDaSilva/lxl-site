# Teste automático do painel/site LXL. Veja testes/LEIA-ME.md para rodar.
import requests, json, re
import os
B=os.environ.get('LXL_URL','http://127.0.0.1:8166')+os.environ.get('LXL_PREFIXO','/teste')+'/painel/api.php'
def S(): 
    s=requests.Session(); s.csrf=''; return s
def call(s,a,body=None,q=''):
    h={'X-CSRF':s.csrf}
    r=s.post(B+'?a='+a+q,json=body,headers=h) if body is not None else s.get(B+'?a='+a+q,headers=h)
    try: return r.status_code, r.json()
    except Exception: return r.status_code, r.text[:300]
import sys
FALHAS=[]
def ok(c,m):
    print(('OK   ' if c else 'FALHA'),m)
    if not c: FALHAS.append(m)
adm=S(); st,j=call(adm,'estado'); adm.csrf=j['csrf']
st,j=call(adm,'setup',{'codigo':'segredo123','usuario':'romas','senha':'senha12345'}); adm.csrf=j['csrf']
st,j=call(adm,'estado'); ok(j['perfil']=='admin' and j['permitidas'] is None,'estado admin')
# importar do catálogo: peça do catálogo religioso entra na categoria Religioso > Imagens, peça de Natal em Natal
st,j=call(adm,'produto_importar',{'lista':[{'codigo':'0054','nome':'Nossa Senhora das Graças','preco':6.9},{'codigo':'0001','nome':'Presépio','preco':14.9}]}); ok(j.get('novos')==2,'importar do catálogo (2 peças)')
st,j=call(adm,'produtos'); cats={c['id']:c for c in j['categorias']}
def nomes(cod):
    p=[x for x in j['produtos'] if x['codigo']==cod][0]; ids=p.get('categorias') or p.get('cats') or []
    return [ (cats[i if isinstance(i,int) else i.get('id')]['nome']) for i in ids if (i if isinstance(i,int) else i.get('id')) in cats]
ok('Imagens' in nomes('0054') and 'Natal' not in nomes('0054'),'0054 cai em Religioso > Imagens, não em Natal')
ok('Presépios' in nomes('0001'),'0001 continua em Presépios')
id_rel=[x for x in j['produtos'] if x['codigo']=='0054'][0]['id']
st,j2=call(adm,'produto_excluir',{'id':id_rel}); ok(st==200,'excluir produto sem uso')
st,j2=call(adm,'produtos'); ok(not [x for x in j2['produtos'] if x['codigo']=='0054'],'produto excluído sumiu da lista')
# produto + cliente
st,j=call(adm,'produto_salvar',{'nome':'Peca X','codigo':'XX-1','preco':20,'controla':1,'estoque':5,'ativo':1,'custo':7}); pid=j['produto']['id']
st,j=call(adm,'cliente_salvar',{'nome':'Maria','telefone':'38999990000'}); cid=j['cliente']['id']
# orcamento
orc={'cliente':'Maria','cliente_id':cid,'itens':[{'produto_id':pid,'descricao':'Peca X','qtd':2,'preco':20},{'descricao':'Topo de bolo','qtd':1,'preco':50,'custo':10,'tipo':'Topo de bolo'}],'frete':10,'desconto':0,'validade':'2026-12-01'}
st,j=call(adm,'orcamento_salvar',orc); oid=j['id']; ok(st==200,'orcamento salvo')
st,j=call(adm,'orcamento',q='&id=%d'%oid); ok(j['orcamento']['total']==100 and len(j['orcamento']['itens'])==2,'total 100 (%s)'%j['orcamento']['total'])
st,j=call(adm,'produtos'); ok([p for p in j['produtos'] if p['id']==pid][0]['estoque']==5,'estoque intacto com orcamento')
st,j=call(adm,'orcamento_gerar_pedido',{'id':oid,'sinal':30}); ped=j['pedido_id']; ok(st==200,'virou pedido #%s'%ped)
st,j=call(adm,'orcamento_gerar_pedido',{'id':oid}); ok(st==400,'nao gera 2x: '+j['erro'])
st,j=call(adm,'produtos'); ok([p for p in j['produtos'] if p['id']==pid][0]['estoque']==3,'estoque baixou 5->3')
st,j=call(adm,'produto_excluir',{'id':pid}); ok(st>=400 and 'histórico' in str(j),'produto com pedido não pode ser excluído (só desativar)')
st,j=call(adm,'pedido',q='&id=%d'%ped); p=j['pedido']; ok(p['pago_valor']==30 and p['saldo']==70 and not p['pago'],'sinal 30 saldo 70')
st,j=call(adm,'pedidos'); ok(j['resumo']['a_receber']==70,'a receber 70 (%s)'%j['resumo']['a_receber'])
st,j=call(adm,'pedido_receber',{'id':ped,'valor':20}); ok(j['saldo']==50,'recebeu 20 saldo 50')
st,j=call(adm,'pedido_receber',{'id':ped,'valor':500}); ok(j['saldo']==0 and j['pago']==1,'quitou')
st,j=call(adm,'pedido_receber',{'id':ped,'valor':5}); ok(st==400,'ja pago')
st,j=call(adm,'orcamento_salvar',dict(orc,id=oid)); ok(st==400,'nao edita aprovado')
# historico do cliente
st,j=call(adm,'cliente',q='&id=%d'%cid); ok(j['cliente']['pedidos']==1 and j['cliente']['ultima']!='' and len(j['pedidos'])==1 and j['cliente']['deve']==0,'historico cliente: ultima %s'%j['cliente']['ultima'])
# pedido novo com sinal pelo salvar
st,j=call(adm,'pedido_salvar',{'cliente':'Maria','cliente_id':cid,'itens':[{'descricao':'Algo','qtd':1,'preco':100}],'pago_valor':40}); p2=j['id']
st,j=call(adm,'cliente',q='&id=%d'%cid); ok(j['cliente']['deve']==60,'cliente deve 60 (%s)'%j['cliente']['deve'])
# recusar
st,j=call(adm,'orcamento_salvar',orc); o2=j['id']; st,j=call(adm,'orcamento_status',{'id':o2,'status':'recusado'}); ok(st==200,'recusou')
# usuarios
st,j=call(adm,'usuario_convidar',{'email':'func@exemplo.com','perfil':'pedidos'}); link=j['link']; ok(st==200 and '#/convite/' in link,'convite: '+link[:60]+' enviado=%s'%j['enviado'])
tok=link.split('/')[-1]
pub=S(); st,j=call(pub,'estado'); pub.csrf=j['csrf']
st,j=call(pub,'token_info',q='&t='+tok); ok(j.get('tipo')=='convite','token_info convite')
st,j=call(pub,'token_usar',{'t':tok,'senha':'curta','usuario':'ana','nome':'Ana'}); ok(st==400,'senha curta recusada')
st,j=call(pub,'token_usar',{'t':tok,'senha':'senhaforte123','usuario':'ana','nome':'Ana'}); ok(st==200,'convite aceito')
st,j=call(pub,'token_usar',{'t':tok,'senha':'senhaforte123','usuario':'ana2','nome':'Ana'}); ok(st==404,'link nao reutiliza')
fu=S(); st,j=call(fu,'estado'); fu.csrf=j['csrf']
st,j=call(fu,'login',{'usuario':'ana','senha':'senhaforte123'}); fu.csrf=j['csrf']
st,j=call(fu,'estado'); ok(j['perfil']=='pedidos' and 'pedidos' in j['permitidas'],'perfil pedidos')
for a in ['relatorios','backup','historico','usuarios','categorias','parametros_salvar','produto_salvar','cliente_excluir','email_teste']:
    st,j=call(fu,a,{} if a not in('relatorios','backup','historico','usuarios','categorias') else None); ok(st==403,'bloqueado '+a)
for a in ['pedidos','clientes','orcamentos','produtos','ajustes']:
    st,j=call(fu,a); ok(st==200,'permitido '+a)
st,j=call(fu,'produtos'); pr=[p for p in j['produtos'] if p['id']==pid][0]; ok(pr['custo']==0 and not j['params'],'custo escondido do perfil pedidos')
st,j=call(fu,'orcamento',q='&id=%d'%oid); ok(all(i['custo']==0 for i in j['orcamento']['itens']),'custo item escondido')
st,j=call(fu,'pedido_salvar',{'cliente':'Z','itens':[{'descricao':'Topo','qtd':1,'preco':50,'custo':999}]}); ok(st==200,'func cria pedido')
# admin ve custo do item
# editar usuario
st,j=call(adm,'usuarios'); ana=[u for u in j['usuarios'] if u['usuario']=='ana'][0]; me=[u for u in j['usuarios'] if u['usuario']=='romas'][0]
st,j=call(adm,'usuario_editar',{'id':me['id'],'ativo':0}); ok(st==400,'nao desativa a si: '+j['erro'])
st,j=call(adm,'usuario_editar',{'id':me['id'],'perfil':'pedidos'}); ok(st==400,'nao rebaixa a si')
# reset admin gerado
st,j=call(adm,'usuario_link_senha',{'id':ana['id']}); l2=j['link']; t2=l2.split('/')[-1]
st,j=call(pub,'token_info',q='&t='+t2); ok(j.get('tipo')=='reset' and j['usuario']=='ana','reset info')
st,j=call(pub,'token_usar',{'t':t2,'senha':'outrasenha456'}); ok(st==200,'ana redefiniu')
st,j=call(S(),'login',{'usuario':'ana','senha':'senhaforte123'}); ok(st==401,'senha velha nao entra')
fu2=S(); st,j=call(fu2,'estado'); fu2.csrf=j['csrf']; st,j=call(fu2,'login',{'usuario':'ana','senha':'outrasenha456'}); ok(st==200,'senha nova entra')
# desativar ana: sessao cai
st,j=call(adm,'usuario_editar',{'id':ana['id'],'ativo':0}); ok(st==200,'ana desativada')
fu2.csrf=fu2.csrf; st,j=call(fu2,'pedidos'); ok(st==401,'sessao da ana caiu (%s)'%st)
st,j=call(S(),'login',{'usuario':'ana','senha':'outrasenha456'}); ok(st==401,'ana desativada nao entra')
# esqueci senha: resposta generica
x=S(); st,j=call(x,'estado'); x.csrf=j['csrf']
a1=call(x,'senha_esqueci',{'usuario':'romas'}); a2=call(x,'senha_esqueci',{'usuario':'naoexiste'}); ok(a1[1]==a2[1],'resposta igual existe/nao existe')
# plano B
y=S(); st,j=call(y,'estado'); y.csrf=j['csrf']
st,j=call(y,'recuperar_admin',{'codigo':'errado','usuario':'romas','senha':'novissima12345'}); ok(st==403,'codigo errado')
st,j=call(y,'recuperar_admin',{'codigo':'segredo123','usuario':'ana','senha':'novissima12345'}); ok(st==403,'nao serve p/ nao-admin')
st,j=call(y,'recuperar_admin',{'codigo':'segredo123','usuario':'romas','senha':'novissima12345'}); ok(st==200,'plano B ok')
z=S(); st,j=call(z,'estado'); z.csrf=j['csrf']; st,j=call(z,'login',{'usuario':'romas','senha':'novissima12345'}); ok(st==200,'admin entra com senha nova')
z.csrf=j['csrf']
st,j=call(z,'historico'); print([ (i['acao'],i['alvo'][:30]) for i in j['itens']][:12])
st,j=call(z,'backup'); ok('orcamentos' in j['tabelas'] and 'usuarios' not in j['tabelas'] and 'tokens' not in j['tabelas'],'backup com orcamentos e sem usuarios')

if FALHAS:
    print('FALHARAM:',FALHAS); sys.exit(1)
