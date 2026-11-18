# Teste automático do painel/site LXL. Veja testes/LEIA-ME.md para rodar.
import os
from playwright.sync_api import sync_playwright
import os
B=os.environ.get('LXL_URL','http://127.0.0.1:8166')
import sys
PRE=os.environ.get('LXL_PREFIXO','/teste')
RUIM=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for nome,url,painel_off in [(n,u.replace('/teste',PRE),o) for n,u,o in [('home','/teste/',False),('natal','/teste/natal/',False),('natal SEM painel','/teste/natal/',True),('religioso','/teste/religioso/',False),('religioso SEM painel','/teste/religioso/',True),('faq','/teste/faq/',False),('painel','/teste/painel/',False)]]:
        pg=b.new_context(viewport={'width':390,'height':844}).new_page(); pg.set_default_timeout(8000); errs=[]; falhas=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.on('response',lambda r: r.status>=400 and falhas.append(str(r.status)+' '+r.url.replace(B,'')))
        if painel_off: pg.route('**/painel/**',lambda r:r.abort())
        pg.add_init_script("window.__lcp=0;new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true})")
        pg.goto(B+url); pg.wait_for_timeout(1500)
        extra=''
        if nome.startswith('natal') or nome.startswith('religioso'): extra=' cartoes=%d'%len(pg.query_selector_all('.card, .prod, article'))
        if nome=='home': extra=' wa='+str(pg.get_attribute('#cta','href'))[:40]
        if nome=='faq': extra=' wa='+str(pg.get_attribute('#wpp','href'))[:40]
        ov=pg.evaluate("document.documentElement.scrollWidth>document.documentElement.clientWidth")
        errs=[e for e in errs if 'ERR_FAILED' not in e]   # o erro de rede aparece de propósito quando o painel é bloqueado
        if errs or [f for f in falhas if 'painel' not in f or not painel_off] or ov: RUIM.append(nome)
        print('%-18s LCP=%4dms overflowX=%s erros=%s falhas=%s%s'%(nome,pg.evaluate('window.__lcp'),ov,[e for e in errs if 'ERR_FAILED' not in e],[f for f in falhas if 'painel' not in f or not painel_off],extra))
    b.close()
if RUIM: print('PROBLEMA em:',RUIM); sys.exit(1)
