/* CATÁLOGO DE IMAGENS RELIGIOSAS: DADOS. É aqui que você edita à mão: seções e produtos.
   A lógica (montar a lista, pedido, WhatsApp, estoque ao vivo) fica em ../natal/catalogo.js e é a mesma do catálogo de Natal.
   Carregado antes do catalogo.js. Não coloque lógica aqui. */
const CONFIG = {
  whatsapp: LXL_EMPRESA.whatsapp,   /* vem do empresa.js */
  instagram: LXL_EMPRESA.instagram,
  prazo: "",
  mes: "",                           /* sem aviso de "preço especial do mês" */
  nome: "catálogo de imagens religiosas",
  titulo: "Imagens religiosas",
  chave: "lxl_religioso_pedido_v1",  /* memória do pedido no celular, separada da do Natal */
  raiz: "Religioso"                  /* categoria do painel que manda neste catálogo */
};

/* Seções na ordem em que aparecem (só aparecem as que tiverem produtos). "categoria" = subcategoria de Religioso no painel. */
const SECOES = [
  {id:"imagens", categoria:"Imagens", titulo:"Imagens religiosas", sub:"Imagens para o oratório, o altar da família e para presentear com fé."}
];

/* Produtos. A foto é imagens/CODIGO.jpg (ex.: imagens/REL-001.jpg). Código: REL + número.
   preco: deixe de fora para mostrar "Consulte o valor". entrega: "Pronta entrega" ou "Sob encomenda". */
const PRODUTOS = [
  {sku:"REL-001", secao:"imagens", nome:"Nossa Senhora das Graças", desc:"Imagem de Nossa Senhora das Graças com os braços abertos, em acabamento branco liso e base redonda. Para o oratório, a estante ou um presente de fé.", cor:"Branco", preco:6.90, entrega:"Sob encomenda"}
];
/* ===== FIM DA CONFIGURAÇÃO ===== */
