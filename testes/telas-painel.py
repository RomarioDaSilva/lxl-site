# Teste automático do painel/site LXL. Veja testes/LEIA-ME.md para rodar.
import os
from playwright.sync_api import sync_playwright
import re
import os
P=os.environ.get('LXL_URL','http://127.0.0.1:8166')+os.environ.get('LXL_PREFIXO','/teste')+'/painel/'
def novo(b):
    ctx=b.new_context(viewport={'width':420,'height':900}); pg=ctx.new_page(); pg.set_default_timeout(8000)
    pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and 'Failed to load resource' not in m.text and pg.errs.append(m.text))
    return pg
with sync_playwright() as p:
    b=p.chromium.launch(); pg=novo(b)
    pg.goto(P); pg.wait_for_timeout(500)
    i=pg.query_selector_all('input'); i[0].fill('segredo123'); i[1].fill('romas'); i[2].fill('senha12345'); pg.click('button.btn'); pg.wait_for_timeout(900)
    print('menu:',pg.inner_text('.menu').replace('\n',' | '))
    # cliente + peca via API pela pagina
    pg.evaluate("""async()=>{await api('cliente_salvar',{nome:'Maria Souza',telefone:'38999990000'});await api('produto_salvar',{nome:'Bola azul',codigo:'ARV-9',preco:20,controla:1,estoque:5,ativo:1});}""")
    # orcamento novo
    pg.goto(P+'#/orcamento-novo'); pg.wait_for_timeout(800); print('titulo:',pg.inner_text('h1'))
    soltos=pg.evaluate("[...document.querySelectorAll('label:not([for])')].filter(l=>!l.querySelector('input,select,textarea')&&[l.nextElementSibling,l.previousElementSibling].some(x=>x&&x.matches&&x.matches('input,select,textarea'))).length")
    print('rotulos sem ligacao:',soltos)
    if soltos: pg.errs.append('rotulos sem for/id: %d'%soltos)
    print('tem sinal?',pg.query_selector('#pago_valor') is not None,'tem validade?',pg.query_selector('#validade') is not None)
    pg.screenshot(path='/tmp/orc_form.png',full_page=True)
    pg.click('#avulso'); pg.wait_for_timeout(300)
    pg.fill('.desc','Miniatura da Ana'); pg.select_option('.ptipo',index=1); pg.fill('.preco','45'); 
    pg.fill('#cliente','Maria Souza') if pg.query_selector('#cliente') else None
    print('validade padrao:',pg.input_value('#validade'),'| rotulo data:',pg.inner_text('label[for=data], .l2 label:last-of-type') if False else '')
    pg.fill('#validade','2026-12-30'); pg.click('#salvar'); pg.wait_for_timeout(900)
    print('depois salvar:',pg.inner_text('.wrap')[:200].replace('\n',' | '))
    pg.screenshot(path='/tmp/orc_lista.png',full_page=True)
    pg.click('text=Ver orçamento'); pg.wait_for_timeout(1200); print('ver orcamento:',pg.inner_text('.nota .tit').replace('\n',' '),'| msg:',pg.input_value('#msg')[:60].replace('\n',' / '),'| wa:',pg.get_attribute('#wa','href')[:40])
    pg.screenshot(path='/tmp/orc_ver.png',full_page=True)
    with pg.expect_download(timeout=15000) as dl: pg.click('#png')
    print('download imagem:',dl.value.suggested_filename)
    pg.goto(P+'#/orcamentos'); pg.wait_for_timeout(800)
    pg.click('[data-ger]'); pg.wait_for_timeout(300); pg.fill('#gs','15'); pg.click('#gok'); pg.wait_for_timeout(1000)
    print('nota:',pg.inner_text('.pg')); 
    print('card pag:',pg.inner_text('#rec'))
    pg.click('#rec'); pg.wait_for_timeout(300); pg.fill('#rv','10'); pg.click('#rok'); pg.wait_for_timeout(800); print('apos receber:',pg.inner_text('.pg'))
    pg.goto(P+'#/pedidos'); pg.wait_for_timeout(700); print('lista:',pg.inner_text('.wrap')[:260].replace('\n',' | '))
    pg.screenshot(path='/tmp/ped_lista.png',full_page=True)
    pg.goto(P+'#/clientes'); pg.wait_for_timeout(700); pg.click('.cli'); pg.wait_for_timeout(900); print('cliente:',pg.inner_text('.wrap')[:330].replace('\n',' | '))
    pg.screenshot(path='/tmp/cli.png',full_page=True)
    # usuarios
    pg.goto(P+'#/usuarios'); pg.wait_for_timeout(700); pg.click('#uNovo'); pg.fill('#ce','ana@exemplo.com'); pg.click('#cok'); pg.wait_for_timeout(1000)
    link=pg.input_value('#lk'); print('link:',link[:70]); pg.screenshot(path='/tmp/usu.png',full_page=True)
    # novo navegador: aceita convite
    pg2=novo(b); pg2.goto(link); pg2.wait_for_timeout(1000)
    pg2.fill('#n','Ana'); pg2.fill('#u','ana'); pg2.fill('#s','senhaforte123'); pg2.fill('#s2','senhaforte123'); pg2.screenshot(path='/tmp/convite.png'); pg2.click('button[type=submit]'); pg2.wait_for_timeout(1000)
    pg2.fill('#u','ana'); pg2.fill('#s','senhaforte123'); pg2.click('button[type=submit]'); pg2.wait_for_timeout(1200)
    print('ana menu:',pg2.inner_text('.menu').replace('\n',' | '))
    pg2.goto(P+'#/estoque'); pg2.wait_for_timeout(700); print('ana tenta estoque ->',pg2.inner_text('h1'))
    pg2.goto(P+'#/novo'); pg2.wait_for_timeout(800); pg2.click('#avulso'); pg2.wait_for_timeout(300); print('ana ve custo?',pg2.query_selector('.pcusto') is not None)
    pg2.goto(P+'#/ajustes'); pg2.wait_for_timeout(700); print('ana ajustes:',pg2.inner_text('.wrap')[:120].replace('\n',' | '))
    # esqueci
    pg3=novo(b); pg3.goto(P+'#/esqueci'); pg3.wait_for_timeout(800); print('esqueci:',pg3.inner_text('h1')); pg3.fill('#u','ana'); pg3.click('button[type=submit]'); pg3.wait_for_timeout(800); print(pg3.inner_text('#f')[:140].replace('\n',' '))
    pg3.screenshot(path='/tmp/esqueci.png')
    pg3.goto(P+'#/recuperar'); pg3.wait_for_timeout(500); print('recuperar:',pg3.inner_text('h1'))
    pg3.goto(P+'#/senha/abc'); pg3.wait_for_timeout(800); print('token ruim:',pg3.inner_text('h1'),'|',pg3.inner_text('.login p'))
    for x in (pg,pg2,pg3): print('ERROS',x.errs)
    b.close()
    import sys
    if any(x.errs for x in (pg,pg2,pg3)): sys.exit(1)
