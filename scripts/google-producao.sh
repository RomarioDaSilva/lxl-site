#!/bin/sh
# LIBERAR O SITE PARA O GOOGLE (rodar SÓ na hora de subir para produção, depois que o Romas disser "sobe para produção").
# O que faz:
#   1) tira o aviso "noindex" das 3 páginas públicas (início, catálogo de Natal e FAQ)
#   2) cria o sitemap.xml com essas 3 páginas
#   3) deixa o robots.txt liberado, bloqueando /teste/ e /painel/ e apontando para o sitemap
# O que NÃO faz de propósito: o painel e a pasta /teste/ continuam escondidos do Google, e as páginas curtas /natal/p/CODIGO/
# (usadas só para a prévia do WhatsApp, elas redirecionam na hora) continuam com noindex e fora do sitemap.
# Uso (na raiz do repositório):  sh scripts/google-producao.sh
set -e
HOJE=$(date +%Y-%m-%d)
for f in index.html natal/index.html faq/index.html; do
  sed -i 's#<meta name="robots" content="noindex,nofollow">##; s#<meta name="robots" content="noindex">##' "$f"
done
cat > sitemap.xml <<XML
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://lxlprojetos.site/</loc><lastmod>$HOJE</lastmod><priority>1.0</priority></url>
  <url><loc>https://lxlprojetos.site/natal/</loc><lastmod>$HOJE</lastmod><priority>0.9</priority></url>
  <url><loc>https://lxlprojetos.site/faq/</loc><lastmod>$HOJE</lastmod><priority>0.5</priority></url>
</urlset>
XML
cat > robots.txt <<'TXT'
User-agent: *
Disallow: /teste/
Disallow: /painel/

Sitemap: https://lxlprojetos.site/sitemap.xml
TXT
echo "Pronto. Depois de publicar, no Google Search Console envie o sitemap: https://lxlprojetos.site/sitemap.xml"
