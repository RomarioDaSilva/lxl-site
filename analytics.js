/* Google Analytics 4 da LXL Projetos.
   Para ligar: cole abaixo o ID de medição (começa com G-). Vazio = desligado, nada é enviado.
   Não conta visitas da pasta /teste/, nem de localhost. */
(function () {
  var GA_ID = "";   /* ex.: "G-ABC123DEF4" */

  if (!GA_ID) return;
  if (/^\/teste(\/|$)/.test(location.pathname) || location.hostname === "localhost" || location.protocol === "file:") return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
  document.head.appendChild(s);
  gtag("js", new Date());
  gtag("config", GA_ID);

  function ev(nome, params) { try { gtag("event", nome, params || {}); } catch (e) {} }
  function txt(el) { return (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60); }

  /* cliques: WhatsApp, redes sociais, adicionar ao pedido */
  document.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) { ev("add_to_cart", { item_id: add.getAttribute("data-add") }); return; }
    var a = e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (h.indexOf("wa.me") > -1 || h.indexOf("whatsapp.com") > -1) ev("whatsapp_click", { botao: txt(a), pagina: location.pathname });
    else if (h.indexOf("instagram.com") > -1 || h.indexOf("tiktok.com") > -1) ev("social_click", { rede: h.indexOf("tiktok") > -1 ? "tiktok" : "instagram" });
  }, true);

  /* peça aberta no catálogo (#/p/CODIGO) */
  function peca() {
    var m = location.hash.match(/^#\/p\/([\w-]+)/);
    if (m) ev("view_item", { item_id: m[1] });
  }
  window.addEventListener("hashchange", peca);
  peca();

  /* buscas (espera a pessoa parar de digitar) */
  var t;
  document.addEventListener("input", function (e) {
    if (e.target && (e.target.id === "q" || e.target.id === "h-q")) {
      clearTimeout(t);
      var v = e.target.value.trim();
      t = setTimeout(function () { if (v.length > 1) ev("search", { search_term: v.slice(0, 60) }); }, 1500);
    }
  });

  /* perguntas abertas na página de FAQ */
  document.addEventListener("toggle", function (e) {
    var d = e.target;
    if (d && d.matches && d.matches("details.q") && d.open) ev("faq_open", { pergunta: txt(d.querySelector("summary")) });
  }, true);
})();
