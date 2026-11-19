/* AVISO DE COOKIES (LGPD) da LXL Projetos.
   Só aparece se em empresa.js estiver  anuncios: true  (ligue quando for usar Meta Pixel ou Google Analytics).
   A escolha fica salva no aparelho (localStorage "lxl-cookies"). Os scripts de anúncio devem esperar o evento "lxl-consent"
   e só rodar se window.LXL_CONSENT === "sim" (o analytics.js já faz isso). */
(function () {
  var K = "lxl-cookies", E = window.LXL_EMPRESA || {};
  function ler() { try { return localStorage.getItem(K); } catch (e) { return null; } }
  window.LXL_CONSENT = ler();
  if (!E.anuncios || window.LXL_CONSENT) return;
  var base = (document.currentScript && document.currentScript.src || "").replace(/cookies\.js.*$/, "");
  var d = document.createElement("div");
  d.id = "aviso-cookies"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Aviso de cookies");
  d.innerHTML = '<style>#aviso-cookies{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;max-width:620px;margin:0 auto;background:#fff;color:#1E1E1C;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:16px;font:14.5px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '#aviso-cookies p{margin:0 0 12px}#aviso-cookies a{color:#1F4036;font-weight:700}#aviso-cookies .bt{display:flex;gap:8px;flex-wrap:wrap}' +
    '#aviso-cookies button{flex:1;min-width:120px;min-height:44px;border-radius:12px;border:0;font:inherit;font-weight:700;cursor:pointer;touch-action:manipulation}' +
    '#aviso-cookies .sim{background:#1F5B3F;color:#fff}#aviso-cookies .nao{background:#F4EBDA;color:#1F4036}#aviso-cookies button:focus-visible{outline:3px solid #D9734E;outline-offset:2px}</style>' +
    '<p>Usamos cookies para entender como o site é usado e melhorar nossos anúncios. Você pode aceitar ou recusar, e o site funciona igual nos dois casos. <a href="' + base + 'privacidade/">Política de privacidade</a></p>' +
    '<div class="bt"><button type="button" class="sim">Aceitar</button><button type="button" class="nao">Recusar</button></div>';
  function escolher(v) {
    try { localStorage.setItem(K, v); } catch (e) {}
    window.LXL_CONSENT = v; d.remove();
    window.dispatchEvent(new Event("lxl-consent"));
  }
  d.querySelector(".sim").onclick = function () { escolher("sim"); };
  d.querySelector(".nao").onclick = function () { escolher("nao"); };
  function mostrar() { document.body.appendChild(d); }
  if (document.body) mostrar(); else document.addEventListener("DOMContentLoaded", mostrar);
})();
