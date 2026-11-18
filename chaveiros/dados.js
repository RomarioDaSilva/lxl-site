/* CATÁLOGO DE CHAVEIROS: DADOS. É aqui que você edita à mão: seções e produtos.
   A lógica (montar a lista, pedido, WhatsApp, estoque ao vivo) fica em ../natal/catalogo.js e é a mesma dos outros catálogos.
   Carregado antes do catalogo.js. Não coloque lógica aqui. */
const CONFIG = {
  cores: [["#FFF1E2","#E8590C"],["#EFF0F2","#2A2D34"],["#FFEBCB","#FF9F1C"],["#F6F6F8","#C24A08"]],   /* faixas de cada seção: [fundo suave, cor de destaque] */
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
  {id:"pet", categoria:"Pet", titulo:"Pet", sub:"Bichinhos articulados para quem ama animais."},
  {id:"herois", categoria:"Heróis", titulo:"Heróis", sub:"Mini heróis para colecionar, enfeitar a mesa ou levar no chaveiro."},
  {id:"academia", categoria:"Academia", titulo:"Academia", sub:"Para quem vive a rotina de treino: kettlebell, halteres e mais."}
];

/* Produtos. A foto é imagens/CODIGO.jpg (ex.: imagens/0055.jpg). O código é o próximo número livre da sequência única 0001, 0002... (compartilhada com os outros catálogos).
   preco: deixe de fora para mostrar "Consulte o valor". entrega: "Pronta entrega" ou "Sob encomenda". */
const PRODUTOS = [
  {sku:"0055", secao:"pet", nome:"Crocodilo Articulado", desc:"Chaveiro de crocodilo articulado em PLA verde, com o corpo em gomos que se mexe e olhinhos pretos. Leve, divertido e ótimo para presentear.", cor:"Verde", preco:3.90, entrega:"Pronta entrega"},
  {sku:"0056", secao:"herois", nome:"Mini Batman", desc:"Mini Batman em estilo fofinho, impresso em PLA preto, com capa e detalhes no peito e no cinto. Para colecionar, enfeitar a mesa ou presentear.", cor:"Preto", preco:2.90, entrega:"Pronta entrega"},
  {sku:"0057", secao:"pet", nome:"Gato Articulado", desc:"Chaveiro de gatinho articulado em PLA vermelho, com o corpo em gomos que se mexe e rabinho curvado. Leve, divertido e perfeito para quem ama gatos.", cor:"Vermelho", preco:2.90, entrega:"Pronta entrega"},
  {sku:"0058", secao:"pet", nome:"Cachorro Salsicha Articulado", desc:"Chaveiro de cachorrinho salsicha (dachshund) articulado, com o corpo em gomos que se mexe, orelhas caídas e focinho preto. Leve, divertido e ótimo para quem ama pets.", cor:"Cinza e preto", preco:7.90, entrega:"Pronta entrega"},
  {sku:"0059", secao:"pet", nome:"Tubarão Esqueleto Articulado", desc:"Chaveiro de tubarão esqueleto articulado em PLA branco, com mandíbula, nadadeiras e cauda que se mexem. Divertido, cheio de detalhes e ótimo para presentear.", cor:"Branco", preco:6.90, entrega:"Pronta entrega"},
  {sku:"0060", secao:"academia", nome:"Kettlebell Academia (texto personalizável)", desc:"Chaveiro de kettlebell (o peso russo de treino) em PLA preto, com texto em branco no centro. Vai com GYM, 20KG ou o texto que você quiser. Presente perfeito para quem treina.", cor:"Preto", preco:4.90, entrega:"Pronta entrega"}
];
/* ===== FIM DA CONFIGURAÇÃO ===== */
