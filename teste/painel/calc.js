/* Motor de cálculo da Calculadora de custo (puro, sem tela). Usado pelo painel e testado no Node. */
(function (raiz) {
  'use strict';
  var n = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; };

  /* Arredonda para cima até terminar em ,90 (ex.: 11,52 -> 11,90). Nunca fica abaixo do valor pedido. */
  function paraCima90(x) {
    if (!(x > 0)) return 0;
    var s = Math.ceil(x) - 0.1;
    if (s < x - 1e-9) s = Math.ceil(x);
    return Math.round(s * 100) / 100;
  }

  /* l: { qtd, materiais:[{nome,tipo,peso_g,preco_kg}], tempo_h, perda_pct, extras, embalagem, mao_h, mao_valor, preco_un, nome }
     P: parâmetros { energia_kwh, potencia_w, valor_impressora, vida_util_h, margem_pct, imposto_pct, taxa_pct, preco_kg_pla, preco_kg_petg } */
  function calcLinha(l, P) {
    var perda = n(l.perda_pct);
    var mats = (l.materiais || []).map(function (m) {
      var tipo = m.tipo === 'PETG' ? 'PETG' : 'PLA';
      var kg = n(m.preco_kg) > 0 ? n(m.preco_kg) : (tipo === 'PETG' ? n(P.preco_kg_petg) : n(P.preco_kg_pla));
      var g = n(m.peso_g) * (1 + perda / 100); // gramas por peça, já com a perda
      return { nome: m.nome || tipo, tipo: tipo, peso_g: n(m.peso_g), g_un: g, preco_kg: kg, custo_un: g * kg / 1000 };
    });
    var h = n(l.tempo_h);
    var filamento = mats.reduce(function (s, m) { return s + m.custo_un; }, 0);
    var energia = h * n(P.potencia_w) / 1000 * n(P.energia_kwh);
    var desgaste = n(P.vida_util_h) > 0 ? h * n(P.valor_impressora) / n(P.vida_util_h) : 0;
    var mao = n(l.mao_h) * n(l.mao_valor);
    var extras = n(l.extras), emb = n(l.embalagem);
    var unit = filamento + energia + desgaste + mao + extras + emb;
    var den = 1 - (n(P.margem_pct) + n(P.imposto_pct) + n(P.taxa_pct)) / 100;
    var sug = den > 0 && unit > 0 ? paraCima90(unit / den) : 0;
    var qtd = Math.max(0, Math.floor(n(l.qtd))) || 0;
    var vendaUn = n(l.preco_un) > 0 ? n(l.preco_un) : sug;
    return {
      nome: l.nome || '', qtd: qtd, mats: mats, horas_un: h,
      un: { filamento: filamento, energia: energia, desgaste: desgaste, mao: mao, extras: extras, embalagem: emb, total: unit },
      sugerido_un: sug, venda_un: vendaUn, venda_manual: n(l.preco_un) > 0,
      total: { custo: unit * qtd, venda: vendaUn * qtd, horas: h * qtd }
    };
  }

  /* linhas: array de l; fixos: custos fixos do pedido (frete, design...) em R$ */
  function calcOrcamento(linhas, fixos, P) {
    var ls = linhas.map(function (l) { return calcLinha(l, P); });
    var det = { filamento: 0, energia: 0, desgaste: 0, mao: 0, extras: 0, embalagem: 0 };
    var custoItens = 0, venda = 0, horas = 0, pecas = 0;
    var porTipo = { PLA: 0, PETG: 0 }, porMat = {};
    ls.forEach(function (x) {
      det.filamento += x.un.filamento * x.qtd; det.energia += x.un.energia * x.qtd; det.desgaste += x.un.desgaste * x.qtd;
      det.mao += x.un.mao * x.qtd; det.extras += x.un.extras * x.qtd; det.embalagem += x.un.embalagem * x.qtd;
      custoItens += x.total.custo; venda += x.total.venda; horas += x.total.horas; pecas += x.qtd;
      x.mats.forEach(function (m) {
        var g = m.g_un * x.qtd;
        porTipo[m.tipo] += g;
        var k = m.tipo + '|' + m.nome;
        porMat[k] = porMat[k] || { nome: m.nome, tipo: m.tipo, g: 0, liquido: 0 };
        porMat[k].g += g; porMat[k].liquido += m.peso_g * x.qtd;
      });
    });
    var fx = n(fixos);
    var custo = custoItens + fx;
    var pct = (n(P.imposto_pct) + n(P.taxa_pct)) / 100;
    var descontos = venda * pct;
    var lucro = venda - descontos - custo;
    var den = 1 - (n(P.margem_pct) + n(P.imposto_pct) + n(P.taxa_pct)) / 100;
    return {
      linhas: ls, pecas: pecas, detalhe: det, fixos: fx, custo_itens: custoItens, custo: custo,
      venda: venda, descontos: descontos, lucro: lucro, margem_real: venda > 0 ? lucro / venda * 100 : 0,
      sugerido_total: den > 0 && custo > 0 ? custo / den : 0,
      producao: { horas: horas, gramas_pla: porTipo.PLA, gramas_petg: porTipo.PETG, kg_pla: porTipo.PLA / 1000, kg_petg: porTipo.PETG / 1000,
        bobinas_pla: Math.ceil(porTipo.PLA / 1000 - 1e-9), bobinas_petg: Math.ceil(porTipo.PETG / 1000 - 1e-9),
        por_material: Object.keys(porMat).map(function (k) { return porMat[k]; }).sort(function (a, b) { return b.g - a.g; }) }
    };
  }

  var api = { calcLinha: calcLinha, calcOrcamento: calcOrcamento, paraCima90: paraCima90 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.LXLCalc = api;
})(typeof window !== 'undefined' ? window : this);
