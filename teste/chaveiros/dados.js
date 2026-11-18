/* CATÁLOGO DE CHAVEIROS: DADOS. É aqui que você edita à mão: seções e produtos.
   A lógica (montar a lista, pedido, WhatsApp, estoque ao vivo) fica em ../natal/catalogo.js e é a mesma dos outros catálogos.
   Carregado antes do catalogo.js. Não coloque lógica aqui. */
const CONFIG = {
  whatsapp: LXL_EMPRESA.whatsapp,   /* vem do empresa.js */
  instagram: LXL_EMPRESA.instagram,
  prazo: "",
  mes: "",                           /* sem aviso de "preço especial do mês" */
  nome: "catálogo de chaveiros",
  titulo: "Chaveiros",
  chave: "lxl_chaveiros_pedido_v1",  /* memória do pedido no celular, separada das outras */
  raiz: "Chaveiros"                  /* categoria do painel que manda neste catálogo */
};

/* Seções na ordem em que aparecem. Só aparecem as que tiverem produtos.
   "categoria" = subcategoria de Chaveiros no painel (o nome precisa ser igual). Seção nova: copie uma linha, troque id, categoria, titulo e sub. */
const SECOES = [
  {id:"patch", categoria:"Patch", titulo:"Patch", sub:"Chaveiros articulados e divertidos para levar para todo lugar."},
  {id:"pet", categoria:"Pet", titulo:"Pet", sub:"Bichinhos articulados para quem ama animais."},
  {id:"herois", categoria:"Heróis", titulo:"Heróis", sub:"Mini heróis para colecionar, enfeitar a mesa ou levar no chaveiro."}
];

/* Produtos. A foto é imagens/CODIGO.jpg (ex.: imagens/0055.jpg). O código é o próximo número livre da sequência única 0001, 0002... (compartilhada com os outros catálogos).
   preco: deixe de fora para mostrar "Consulte o valor". entrega: "Pronta entrega" ou "Sob encomenda". */
const PRODUTOS = [
  {sku:"0055", secao:"patch", nome:"Crocodilo Articulado", desc:"Chaveiro de crocodilo articulado em PLA verde, com o corpo em gomos que se mexe e olhinhos pretos. Leve, divertido e ótimo para presentear.", cor:"Verde", preco:3.90, entrega:"Pronta entrega"},
  {sku:"0056", secao:"herois", nome:"Mini Batman", desc:"Mini Batman em estilo fofinho, impresso em PLA preto, com capa e detalhes no peito e no cinto. Para colecionar, enfeitar a mesa ou presentear.", cor:"Preto", preco:2.90, entrega:"Pronta entrega"},
  {sku:"0057", secao:"pet", nome:"Gato Articulado", desc:"Chaveiro de gatinho articulado em PLA vermelho, com o corpo em gomos que se mexe e rabinho curvado. Leve, divertido e perfeito para quem ama gatos.", cor:"Vermelho", preco:2.90, entrega:"Pronta entrega"},
  {sku:"0058", secao:"pet", nome:"Cachorro Salsicha Articulado", desc:"Chaveiro de cachorrinho salsicha (dachshund) articulado, com o corpo em gomos que se mexe, orelhas caídas e focinho preto. Leve, divertido e ótimo para quem ama pets.", cor:"Cinza e preto", preco:7.90, entrega:"Pronta entrega"},
  {sku:"0059", secao:"pet", nome:"Tubarão Esqueleto Articulado", desc:"Chaveiro de tubarão esqueleto articulado em PLA branco, com mandíbula, nadadeiras e cauda que se mexem. Divertido, cheio de detalhes e ótimo para presentear.", cor:"Branco", preco:6.90, entrega:"Pronta entrega"}
];
/* ===== FIM DA CONFIGURAÇÃO ===== */
