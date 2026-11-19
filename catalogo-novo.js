/* CATÁLOGOS (visual novo): coloca o número do WhatsApp no botão da barra do topo. O número vem do empresa.js. */
(function () {
  var a = document.getElementById('wa-topo'); if (!a || !window.LXL_EMPRESA) return;
  a.href = 'https://wa.me/' + LXL_EMPRESA.whatsapp + '?text=' + encodeURIComponent('Olá! Vi o catálogo da LXL Projetos e quero fazer um pedido.');
})();
