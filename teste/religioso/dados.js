/* CATÁLOGO RELIGIOSO: DADOS. É aqui que você edita à mão: seções e produtos.
   A lógica (montar a lista, pedido, WhatsApp, estoque ao vivo) fica em ../natal/catalogo.js e é a mesma do catálogo de Natal.
   Carregado antes do catalogo.js. Não coloque lógica aqui. */
const CONFIG = {
  whatsapp: LXL_EMPRESA.whatsapp,   /* vem do empresa.js */
  instagram: LXL_EMPRESA.instagram,
  prazo: "",
  mes: "",                           /* sem aviso de "preço especial do mês" */
  nome: "catálogo religioso",
  titulo: "Religioso",
  chave: "lxl_religioso_pedido_v1",  /* memória do pedido no celular, separada da do Natal */
  raiz: "Religioso"                  /* categoria do painel que manda neste catálogo */
};

/* Seções na ordem em que aparecem. Só aparecem as que tiverem produtos, então já ficam prontas para quando você cadastrar peças nelas.
   "categoria" = subcategoria de Religioso no painel (o nome precisa ser igual). Seção nova: copie uma linha, troque id, categoria, titulo e sub. */
const SECOES = [
  {id:"imagens", categoria:"Imagens", titulo:"Imagens", sub:"Nossa Senhora e outras imagens para o oratório, o altar da família e para presentear com fé."},
  {id:"santos", categoria:"Santos", titulo:"Santos", sub:"Imagens de santos de devoção para a sua casa."},
  {id:"cruzes", categoria:"Cruzes", titulo:"Cruzes", sub:"Cruzes para parede, mesa e presente."},
  {id:"porta-textos", categoria:"Porta-textos", titulo:"Porta-textos", sub:"Para apoiar o texto da oração, o salmo ou a mensagem do dia."}
];

/* Produtos. A foto é imagens/CODIGO.jpg (ex.: imagens/0054.jpg). O código é o próximo número livre da sequência única 0001, 0002... (compartilhada com o catálogo de Natal).
   preco: deixe de fora para mostrar "Consulte o valor". entrega: "Pronta entrega" ou "Sob encomenda". */
const PRODUTOS = [
  {sku:"0054", antigo:"REL-001", secao:"imagens", nome:"Nossa Senhora das Graças", desc:"Imagem de Nossa Senhora das Graças com os braços abertos, em acabamento branco liso e base redonda. Para o oratório, a estante ou um presente de fé.", cor:"Branco", preco:6.90, entrega:"Sob encomenda"}
];
/* ===== FIM DA CONFIGURAÇÃO ===== */
