/* Medidor próprio da LXL Projetos: conta visitas, peças vistas, "adicionar ao pedido" e envios pelo WhatsApp.
   Não usa cookies e não guarda nada pessoal. Visitas da pasta /teste/ são marcadas como teste. */
(function () {
  var sc = document.currentScript;
  if (!sc || !sc.src) return;
  var url = sc.src.replace(/medir\.js(\?.*)?$/, "track.php");
  var teste = /^\/teste(\/|$)/.test(location.pathname);
  function enviar(t, k) {
    try {
      var corpo = JSON.stringify({ t: t, k: k || "", teste: teste ? 1 : 0 });
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([corpo], { type: "text/plain" }));
      else fetch(url, { method: "POST", body: corpo, keepalive: true });
    } catch (e) {}
  }
  var p = location.pathname.replace(/^\/teste/, "");
  var pag = /^\/natal/.test(p) ? "natal" : /^\/faq/.test(p) ? "faq" : "home";
  enviar("pagina", pag);
  try {
    var d = new Date().toISOString().slice(0, 10), k = "lxl_visita";
    if (localStorage.getItem(k) !== d) { localStorage.setItem(k, d); enviar("visita", ""); }
  } catch (e) {}
  var ultimo = "";
  function peca() {
    var m = location.hash.match(/^#\/p\/([A-Za-z0-9_-]{1,40})/);
    if (m && m[1] !== ultimo) { ultimo = m[1]; enviar("produto", m[1]); }
    if (!m) ultimo = "";
  }
  peca(); window.addEventListener("hashchange", peca);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-add]");
    if (a) { enviar("add", String(a.getAttribute("data-add")).slice(0, 40)); return; }
    var w = e.target.closest && e.target.closest("a[href]");
    if (w && /wa\.me|whatsapp\.com/.test(w.getAttribute("href") || "")) enviar("enviar", w.id === "ped-enviar" ? "pedido" : "contato");
  }, true);
})();
