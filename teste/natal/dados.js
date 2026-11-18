/* CATÁLOGO DE NATAL: DADOS. É aqui que você edita à mão: prazo, seções e produtos.
   Carregado antes do catalogo.js (que usa CONFIG, SECOES e PRODUTOS). Não coloque lógica aqui. */
/* ===== CONFIGURAÇÃO: edite só esta parte ===== */
const CONFIG = {
  whatsapp: LXL_EMPRESA.whatsapp,   /* vem do empresa.js (WhatsApp e Instagram se mudam lá) */
  instagram: LXL_EMPRESA.instagram,
  prazo: "",                   /* Ex.: "Pedidos até 15/12". Deixe vazio para não mostrar */
  limitePedido: {ate:"2026-12-15", texto:"Pedidos até 15/12"},   /* aparece no card e na página de cada peça; some sozinho depois da data. Para desligar, apague esta linha */
  mes: "novembro de 2026"              /* Mês de validade dos preços. Em dezembro troque para "dezembro" ou deixe vazio para esconder o aviso */
};

/* Seções na ordem em que aparecem. Se o painel tiver as categorias de Natal, a ORDEM, o NOME e as PEÇAS de cada seção passam a vir do painel
   (campo "categoria" = nome da subcategoria de Natal no painel). Este texto "sub" continua daqui. Subcategorias novas criadas no painel aparecem sozinhas.
   Se o painel estiver fora do ar, vale tudo o que está escrito aqui. */
/* Seções na ordem em que aparecem. Só aparecem as que tiverem produtos. */
/* Cada linha abaixo é uma seção do catálogo. O "id" precisa ser igual ao campo "secao" dos produtos (lista PRODUTOS mais abaixo).
   Para criar uma seção nova: copie uma linha, troque id, titulo e sub, e use o mesmo id nos produtos dela. */
const SECOES = [
  {id:"presepio", categoria:"Presépios",    titulo:"Presépio",                sub:"Celebre o nascimento de Jesus em família. Peças delicadas para montar o seu presépio e preparar o coração para o Natal."},
  {id:"anjos", categoria:"Anjos", titulo:"Anjos", sub:"Anjos para iluminar e abençoar a casa no Natal."},
  {id:"arvores", categoria:"Árvores de Natal",     titulo:"Árvores de Natal",        sub:"Para mesa, balcão e estante."},
  {id:"enfeites-arvore", categoria:"Decoração de árvore", titulo:"Decoração de árvore", sub:"Enfeites para pendurar e deixar a árvore de Natal ainda mais bonita."},
  {id:"papai-noel", categoria:"Mini Papais Noel",  titulo:"Mini Papais Noel",        sub:"Pequenos, charmosos e feitos para decorar qualquer cantinho."},
  {id:"decoracoes-mesa", categoria:"Decoração de mesa", titulo:"Decorações de mesa",  sub:"Rena, boneco de neve, gnomo e mais para enfeitar mesa, aparador e estante."},
  {id:"feliz-natal", categoria:"Feliz Natal", titulo:"Feliz Natal",             sub:"Letreiros e placas para decorar e presentear."},
  {id:"bombonieri", categoria:"Bomboniere e lembrancinhas",  titulo:"Bombonieri e lembrancinhas", sub:"Para ceia de empresa, igreja, escola e família. Quanto mais unidades, melhor o valor."},
  {id:"kits", categoria:"Kits de Natal",        titulo:"Kits de Natal",           sub:"Peças que combinam entre si. No kit você paga menos do que comprando separado."}
];

/* Produtos. A foto é imagens/CODIGO.jpg (ex.: imagens/0001.jpg).
   Códigos: 0001, 0002... em sequência única para TODOS os catálogos (não depende de categoria). "antigo" = código usado antes de 18/11/2026, guardado só para links e buscas antigas continuarem funcionando.
   Peça nova: use o próximo número livre (veja scripts/mapa-codigos.json e o fim de teste/religioso/dados.js) e dê o nome 00NN.jpg à foto.
   preco: deixe de fora para mostrar "Consulte o valor".
   entrega: "Pronta entrega" ou "Sob encomenda" (pode escrever o prazo, ex.: "Sob encomenda, 3 dias").
   Campos opcionais: tag (etiqueta), antes (preço separado, usado nos kits). */
/* ATENÇÃO: o preço e o estoque que aparecem no site vêm do PAINEL (aba Estoque) e substituem os valores daqui.
   Para mudar preço ou quantidade, mude no painel. Os preços escritos aqui só valem se o painel estiver fora do ar.
   top:true coloca o selo dourado de destaque na peça. */
const PRODUTOS = [
  {sku:"0001", antigo:"PRE-001", secao:"presepio", nome:"Presépio Sagrada Família Tricô",
   desc:"Sagrada Família com textura de tricô, um presépio aconchegante e diferente.", cor:"Branco", medidas:"7 x 6 x 8 cm", preco:14.90, entrega:"Sob encomenda"},
  {sku:"0002", antigo:"PRE-002", secao:"presepio", nome:"Presépio Estábulo de Luz",
   desc:"Maria, José e o Menino Jesus sob o estábulo, com a estrela no alto.", cor:"Branco", medidas:"11 x 3 x 12 cm", preco:9.90, entrega:"Sob encomenda"},
  {sku:"0003", antigo:"PRE-003", top:true, secao:"presepio", nome:"Presépio Estrela Guia",
   desc:"Presépio completo sob o arco, com a estrela guia, os Reis Magos e os animais.", cor:"Branco", medidas:"18 x 8 x 15 cm", preco:29.90, tag:"Peça completa", entrega:"Sob encomenda"},
  {sku:"0004", antigo:"PRE-004", secao:"presepio", nome:"Presépio Sagrada Família Serenidade",
   desc:"Kit com 3 peças: Maria, José e o Menino Jesus em figuras suaves e delicadas.", cor:"Branco", medidas:"14 x 5 x 11 cm", preco:14.90, entrega:"Sob encomenda"},
  {sku:"0005", antigo:"PRE-005", secao:"presepio", nome:"Presépio Adoração dos Reis",
   desc:"Sagrada Família, os três Reis Magos e os animais sob um grande arco, uma peça de destaque para a mesa de Natal.", cor:"Branco", medidas:"16,7 x 15,1 x 14,8 cm", preco:47.90, tag:"Peça de destaque", entrega:"Sob encomenda"},
  {sku:"0006", antigo:"PRE-006", top:true, secao:"presepio", nome:"Presépio Sagrada Família Acolhida",
   desc:"José e Maria com o Menino Jesus nos braços, em um abraço de fé e ternura.", cor:"Branco", medidas:"8,4 x 8,0 x 11,5 cm", preco:15.90, entrega:"Sob encomenda"},
  {sku:"0007", antigo:"PRE-007", top:true, secao:"presepio", nome:"Presépio Gruta de Belém",
   desc:"Sagrada Família e os adoradores reunidos sob a gruta, com a estrela de Belém no alto.", cor:"Branco", medidas:"16,3 x 16,4 x 11,6 cm", preco:48.90, tag:"Peça de destaque", entrega:"Sob encomenda"},
  {sku:"0008", antigo:"PRE-008", secao:"presepio", nome:"Presépio Sagrada Família Ternura",
   desc:"José protege Maria e o Menino Jesus em um abraço cheio de ternura.", cor:"Branco", medidas:"9,2 x 11,8 x 15,0 cm", preco:32.90, entrega:"Sob encomenda"},
  {sku:"0009", antigo:"PRE-009", secao:"presepio", nome:"Presépio Arco da Estrela",
   desc:"Maria, José e o Menino Jesus sob um arco elegante, com a estrela de Belém no alto.", cor:"Branco", medidas:"14,1 x 10,7 x 14,5 cm", preco:20.90, entrega:"Sob encomenda"},
  {sku:"0010", antigo:"PRE-010", secao:"presepio", nome:"Presépio Estrela Entalhada",
   desc:"Maria, José e o Menino Jesus dentro de uma estrela com folhagens delicadas, ótima para qualquer cantinho.", medidas:"9,4 x 4,0 x 9,7 cm", preco:9.90, entrega:"Sob encomenda"},
  {sku:"0011", antigo:"ARV-001", fotos:["0011","0011-2"], secao:"arvores", nome:"Árvore de Natal Plissada", preco:13.90,
   desc:"Árvore em camadas plissadas, com a estrela no alto e a base em detalhe. Um enfeite elegante para mesa, balcão ou estante. Disponível em verde e em tom claro.", cor:"Verde ou tom claro", entrega:"Sob encomenda"},
  {sku:"0012", antigo:"ARV-003", top:true, secao:"arvores", nome:"Árvore de Natal Drapeada Vermelha",
   desc:"Árvore de formas suaves e onduladas, com a estrela no alto. Um toque moderno e delicado para a decoração de Natal.", cor:"Vermelho", medidas:"8,7 x 8,8 x 13,0 cm", preco:9.90, entrega:"Sob encomenda"},
  {sku:"0013", antigo:"ARV-004", top:true, secao:"arvores", nome:"Árvore de Natal Cone Canelado", cor:"Verde e dourado", preco:11.90,
   desc:"Árvore em camadas de linhas finas e uniformes, com a estrela dourada no alto. Visual limpo e elegante.", entrega:"Sob encomenda"},
  {sku:"0014", antigo:"ARV-005", secao:"arvores", nome:"Árvore de Natal Estrelas Vazadas", cor:"Branco", preco:13.90,
   desc:"Árvore com estrelinhas vazadas, que ganha um brilho especial com uma luz por dentro.", entrega:"Sob encomenda"},
  {sku:"0015", antigo:"ARV-006", secao:"arvores", nome:"Árvore de Natal Espiral", cor:"Bege", preco:35.90,
   desc:"Árvore de curvas em espiral, moderna e delicada, uma peça de decoração diferente.", entrega:"Sob encomenda"},
  {sku:"0016", antigo:"ARV-007", secao:"arvores", nome:"Árvore de Natal Luminária da Rena", cor:"Branco", preco:20.90,
   desc:"Árvore vazada com fita de estrelas, uma rena e pinheirinhos na base. Encanta com uma luz por dentro.", entrega:"Sob encomenda"},
  {sku:"0017", antigo:"ARV-008", secao:"arvores", nome:"Árvore de Natal Tricô", cor:"Branco", preco:15.90,
   desc:"Árvore com textura de tricô em camadas, aconchegante e cheia de carinho. Linda com uma luz por dentro.", entrega:"Sob encomenda"},
  {sku:"0018", antigo:"ARV-009", secao:"arvores", nome:"Árvore de Natal Rendada", cor:"Branco", preco:11.90,
   desc:"Árvore em formato de cone com desenho vazado e estrela dourada no alto, leve e sofisticada.", entrega:"Sob encomenda"},
  {sku:"0019", antigo:"ENF-001", fotos:["0019","0019-2","0019-3","0019-4"], secao:"enfeites-arvore", nome:"Decoração para Árvore de Natal (10 peças)", tag:"Kit com 10 peças",
   desc:"Kit com 10 enfeites vazados para pendurar na árvore: estrela, floco de neve, bola, árvore, rena, sino, anjo, coração, meia e estrela de oito pontas. Cada peça tem cerca de 6 x 5 cm. Disponível em branco, verde e vermelho. O valor é do kit com as 10 peças.", cor:"Branco, verde e vermelho", medidas:"Cada peça tem cerca de 6 x 5 cm", preco:10.00, entrega:"Sob encomenda"},
  {sku:"0037", antigo:"FEL-001", secao:"feliz-natal", nome:"Feliz Natal Gorro do Papai Noel",
   desc:"Letreiro com NATAL em vermelho e Feliz em branco, com um gorrinho de Papai Noel no alto.", preco:14.90, entrega:"Sob encomenda"},
  {sku:"0038", antigo:"FEL-002", secao:"feliz-natal", nome:"Feliz Natal Floco de Neve", medidas:"17,0 x 10,3 x 1,5 cm", preco:9.90,
   desc:"Letreiro vermelho com um grande floco de neve branco e base reta para apoiar em qualquer lugar.", entrega:"Sob encomenda"},
  {sku:"0039", antigo:"FEL-003", top:true, secao:"feliz-natal", nome:"Feliz Natal Árvore e Estrela", medidas:"16,6 x 16,7 x 1,5 cm", preco:9.90,
   desc:"Letreiro de letras em curvas, com árvore, estrela e bolinha de Natal nas pontas.", entrega:"Sob encomenda"},
  {sku:"0040", antigo:"FEL-004", secao:"feliz-natal", nome:"Feliz Natal Rena", medidas:"16,0 x 11,7 x 1,5 cm", cor:"Branco, vermelho e verde", preco:14.90,
   desc:"Letreiro colorido em vermelho e verde com uma rena de cachecol, ótimo para presentear.", entrega:"Sob encomenda"},
  {sku:"0041", antigo:"FEL-005", secao:"feliz-natal", nome:"Feliz Natal Neve Vermelha", medidas:"8,5 x 9,1 x 1,3 cm", preco:9.90,
   desc:"Letreiro em relevo com um floco de neve vazado no alto, em vermelho clássico de Natal.", entrega:"Sob encomenda"},

  /* ---- Mini Papais Noel ---- */
  {sku:"0020", antigo:"PAP-001", secao:"papai-noel", nome:"Mini Papai Noel Barbudo", medidas:"4,5 x 3,9 x 7,0 cm", cor:"Pintado à mão", preco:14.90, desc:"Papai Noel de corpo arredondado, barba grande com frisos e gorro vermelho com pompom.", entrega:"Sob encomenda"},
  {sku:"0021", antigo:"PAP-002", top:true, secao:"papai-noel", nome:"Mini Papai Noel Tricô Sentadinho", cor:"Vermelho, branco, preto e pele", preco:9.90, desc:"Papai Noel sentadinho com textura de tricô no gorro, na barba e na roupa.", entrega:"Sob encomenda"},
  {sku:"0022", antigo:"PAP-003", secao:"papai-noel", nome:"Mini Papai Noel Sentadinho com Cinto", cor:"Vermelho, branco, preto e pele", preco:19.90, desc:"Papai Noel sentadinho com cinto preto, sorriso e gorro com pompom.", entrega:"Sob encomenda"},
  {sku:"0023", antigo:"PAP-004", secao:"papai-noel", nome:"Mini Papai Noel com Saco de Presentes", medidas:"4,7 x 4,4 x 7,0 cm", preco:9.90, desc:"Papai Noel em pé, de cinto com fivela dourada e saco de presentes nas costas.", entrega:"Sob encomenda"},
  {sku:"0024", antigo:"PAP-005", secao:"papai-noel", nome:"Mini Papai Noel Gnomo com Presente", medidas:"5,1 x 4,4 x 8,0 cm", cor:"Pintado à mão", preco:9.90, desc:"Papai Noel de gorro longo, barba volumosa e um presente com laço nas mãos.", entrega:"Sob encomenda"},

  /* ---- Decorações de mesa ---- */
  {sku:"0025", antigo:"DEC-001", secao:"decoracoes-mesa", nome:"Casal de Renas Tricô e Liso", desc:"Duas renas em pé: uma com textura de tricô e outra de acabamento liso, no mesmo tom claro. Casal R$ 19,90. Também vendemos avulsas: rena tricô R$ 10,90 e rena lisa R$ 9,90.", medidas:"12 cm de altura (cada rena)", cor:"Branco", preco:19.90, entrega:"Sob encomenda"},
  {sku:"0026", antigo:"DEC-002", secao:"decoracoes-mesa", nome:"Gatinho de Gorro de Natal", desc:"Gatinho branco de textura fofa, olhos pretos e gorro vermelho de Papai Noel.", cor:"Branco, vermelho e preto", preco:19.90, entrega:"Sob encomenda"},
  {sku:"0027", antigo:"DEC-003", secao:"decoracoes-mesa", nome:"Corças com Laço", desc:"Corças deitadas com laço na orelha, uma com textura de tricô e outra lisa. O valor é de 1 unidade (cada corça).", cor:"Bege", preco:9.90, tag:"Preço de 1 unidade", entrega:"Sob encomenda"},
  {sku:"0028", antigo:"DEC-004", secao:"decoracoes-mesa", nome:"Papai Noel e Boneco de Neve Tricô", desc:"Dupla de bonecos com textura de tricô e gorro vermelho de pompom. O valor é da dupla (Papai Noel e boneco de neve juntos).", cor:"Vermelho, branco, preto e detalhes", preco:24.90, entrega:"Sob encomenda"},
  {sku:"0029", antigo:"DEC-005", secao:"decoracoes-mesa", nome:"Renas Listradas", desc:"Renas com relevo em listras verticais, em tamanhos diferentes e cores à escolha. O valor é de 1 unidade (cada rena).", cor:"Bege e vinho", preco:11.90, tag:"Preço de 1 unidade", entrega:"Sob encomenda"},
  {sku:"0030", antigo:"DEC-006", top:true, secao:"decoracoes-mesa", nome:"Trio Gnomo, Boneco de Neve e Rena", desc:"Trio de bonecos com relevo canelado: gnomo vermelho, boneco de neve e rena. O valor é do trio (os três juntos).", cor:"Vermelho, branco e bege", preco:21.90, entrega:"Sob encomenda"},
  {sku:"0031", antigo:"DEC-007", secao:"decoracoes-mesa", nome:"Trio de Renas Sentadinhas", desc:"Três renas sentadinhas com cachecol vermelho: uma com protetor de orelha, uma com gorro e uma com pompom. O valor é de 1 unidade (cada rena).", cor:"Marrom, branco e vermelho", preco:21.90, tag:"Preço de 1 unidade", entrega:"Sob encomenda"},
  {sku:"0032", antigo:"DEC-008", secao:"decoracoes-mesa", nome:"Renas Geométricas", desc:"Renas em estilo geométrico, em pé, em várias cores. Ótimas para aparador e lareira. O valor é de 1 unidade (cada rena).", cor:"À escolha: vermelho, verde, branco ou dourado", preco:9.90, tag:"Preço de 1 unidade", entrega:"Sob encomenda"},
  {sku:"0033", antigo:"DEC-009", top:true, secao:"decoracoes-mesa", nome:"Par de Renas Elegantes", desc:"Rena em pé e rena deitada de linhas suaves e acabamento delicado. O valor é de 1 unidade (cada rena).", cor:"Branco", preco:9.90, tag:"Preço de 1 unidade", entrega:"Sob encomenda"},
  {sku:"0034", antigo:"DEC-010", secao:"decoracoes-mesa", nome:"Boneco de Neve Tricô Marrom", desc:"Boneco de neve sorridente com gorro, cachecol e botões em tom marrom.", cor:"Branco e marrom", preco:19.90, entrega:"Sob encomenda"},
  {sku:"0035", antigo:"DEC-011", secao:"decoracoes-mesa", nome:"Renas Fofinhas", desc:"Renas de corpo arredondado e acabamento liso, em branco ou cinza. O valor é de 1 unidade (cada rena).", cor:"Branco ou cinza", preco:9.90, tag:"Preço de 1 unidade", entrega:"Sob encomenda"},
  {sku:"0036", antigo:"DEC-012", secao:"decoracoes-mesa", nome:"Boneco de Neve Tricô Grande", desc:"Boneco de neve com textura de tricô grosso, protetor de orelha, cachecol e coração vermelho.", cor:"Branco, vermelho, preto e laranja", preco:77.90, tag:"Peça de destaque", entrega:"Sob encomenda"},

  /* ---- Bombonieri e lembrancinhas ---- */
  {sku:"0042", antigo:"BOM-001", secao:"bombonieri", nome:"Potinho Cinto do Papai Noel", cor:"Vermelho, branco, preto e amarelo", preco:65.90, desc:"Potinho vermelho com a faixa preta e a fivela dourada do Papai Noel. Ótimo para chocolates e doces.", entrega:"Sob encomenda"},
  {sku:"0043", antigo:"BOM-002", secao:"bombonieri", nome:"Caixa Chaminé do Papai Noel", medidas:"13 x 13 x 16 cm (aproximadas)", cor:"Vermelho, branco, preto e amarelo", preco:81.90, desc:"Caixa em formato de chaminé de tijolinhos com o Papai Noel descendo. Surpresa certa na ceia.", entrega:"Sob encomenda"},
  {sku:"0044", antigo:"BOM-003", secao:"bombonieri", nome:"Papai Noel e o Trenó de Doces", desc:"Trenó vermelho com o Papai Noel, pronto para ser recheado de balas e doces.", medidas:"14,2 x 6,5 x 7,2 cm", cor:"Vermelho e branco", preco:19.90, entrega:"Sob encomenda"},
  {sku:"0045", antigo:"BOM-004", secao:"bombonieri", nome:"Bandeja Árvore de Natal", cor:"Verde", preco:36.90, desc:"Bandeja em formato de árvore de Natal para servir doces, biscoitos e lembrancinhas.", entrega:"Sob encomenda"},
  {sku:"0046", antigo:"BOM-005", secao:"bombonieri", nome:"Porta Panetone Cinto do Papai Noel", cor:"Vermelho, preto, branco e amarelo", preco:64.90, desc:"Cesto redondo com o cinto do Papai Noel, feito para apresentar panetones e cestas de Natal.", entrega:"Sob encomenda"},
  {sku:"0047", antigo:"BOM-006", secao:"bombonieri", nome:"Caixa Vila de Natal com Tampa de Floco de Neve", cor:"Vermelho e branco", preco:83.90, desc:"Caixa redonda vermelha com a vila de Natal em relevo e tampa branca com floco de neve.", entrega:"Sob encomenda"},
  {sku:"0048", antigo:"BOM-007", secao:"bombonieri", nome:"Cesto Cinto Tricô do Papai Noel", cor:"Vermelho, branco, preto e amarelo", preco:33.90, desc:"Cesto com textura de tricô e o cinto do Papai Noel. Para doces, pães e presentes.", entrega:"Sob encomenda"},
  {sku:"0049", antigo:"BOM-008", secao:"bombonieri", nome:"Potinho Calça do Papai Noel", desc:"Potinho vermelho com borda branca de tricô, inspirado na calça do Papai Noel.", cor:"Vermelho, preto, branco e amarelo", preco:28.90, entrega:"Sob encomenda"},
  {sku:"0050", antigo:"BOM-009", top:true, secao:"bombonieri", nome:"Cestinha Rena com Alça", desc:"Cestinha com a carinha da rena e alça para carregar. Lembrancinha fofa para as crianças.", cor:"Vermelho", preco:14.90, entrega:"Sob encomenda"},
  {sku:"0051", antigo:"BOM-010", secao:"bombonieri", nome:"Potinho Rosto do Papai Noel", desc:"Potinho com o rosto sorridente do Papai Noel, de barba e gorro.", cor:"Branco", preco:39.90, entrega:"Sob encomenda"},
  {sku:"0052", antigo:"BOM-011", top:true, secao:"bombonieri", nome:"Potinho Papai Noel com Botas", desc:"Potinho com borda branca ondulada e as botas do Papai Noel. Combina com biscoitos e doces.", cor:"Vermelho, branco, amarelo e preto", preco:33.90, entrega:"Sob encomenda"},
  {sku:"0053", antigo:"BOM-012", secao:"bombonieri", nome:"Saquinho do Papai Noel", desc:"Peça em formato do saco de presentes do Papai Noel, para lembrancinhas e mimos.", cor:"Vermelho", preco:19.90, entrega:"Sob encomenda"},
  {sku:"0061", secao:"anjos", nome:"Anjo Lanterna Rendada", desc:"Anjo de estrutura toda vazada, como uma renda. Coloque uma vela de LED por dentro e ele vira uma luminária que desenha sombras lindas na parede. Acompanha vela de LED.", cor:"Branco", preco:11.90, entrega:"Sob encomenda"},
  {sku:"0062", secao:"anjos", nome:"Anjo da Prece", desc:"Anjo de mãos postas com o vestido e as asas rendados. Acompanha vela de LED: acesa por dentro, a luz atravessa os desenhos e enche a mesa de brilho dourado.", cor:"Branco", preco:13.90, entrega:"Sob encomenda"},
  {sku:"0063", secao:"anjos", nome:"Anjinha de Tricô", desc:"Anjinha em tricô, de cabelos trançados e asas macias. Acompanha vela de LED: acesa por dentro, a luz atravessa o vestido e deixa a peça com cara de lã iluminada.", cor:"Branco", preco:28.90, entrega:"Sob encomenda"},
  {sku:"0064", secao:"anjos", nome:"Anjo Treliça", desc:"Anjo de corpo em treliça com auréola dourada. Acompanha vela de LED: a luz atravessa os losangos e desenha sombras lindas na mesa e na parede.", cor:"Branco e dourado", preco:17.90, entrega:"Sob encomenda"},
  {sku:"0065", secao:"anjos", nome:"Anjinho Celestial", desc:"Anjinho de mãos postas, todo branco, com ar de escultura. Uma peça delicada para a mesa, o aparador ou a estante.", cor:"Branco", preco:4.90, entrega:"Sob encomenda"},
  {sku:"0066", secao:"anjos", nome:"Anjo Renda de Fio", desc:"Anjo de asas e saia rendadas, com cara de crochê. Um enfeite delicado para a mesa, a estante ou a árvore.", cor:"Branco", preco:10.90, entrega:"Sob encomenda"},
  {sku:"0067", secao:"anjos", nome:"Anjo Trança de Lã", desc:"Anjo com saia de tranças e asas em camadas, com cara de tricô. Uma peça aconchegante para a mesa ou o aparador.", cor:"Branco", preco:9.90, entrega:"Sob encomenda"},
  {sku:"0068", secao:"anjos", nome:"Anjinho Tímido", desc:"Anjinho de olhar tímido, mãos para trás e asas bem marcadas. Pequeno e fofo para a mesa de Natal.", cor:"Branco", preco:6.90, entrega:"Sob encomenda"},
  {sku:"0069", secao:"anjos", nome:"Anjo Leque de Renda", desc:"Anjo de saia em leque e asas de renda, com aspecto de crochê. Uma peça delicada e elegante para a mesa ou o aparador.", cor:"Branco", preco:9.90, entrega:"Sob encomenda"}
];
/* ===== FIM DA CONFIGURAÇÃO ===== */
