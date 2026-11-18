// Teste das contas da Calculadora de custo (teste/painel/calc.js). Rodar: node testes/calc.test.js
// Os valores esperados foram calculados à mão (veja a fórmula no começo do calc.js).
const assert = require('assert');
const { calcLinha, calcOrcamento, paraCima90 } = require('../teste/painel/calc.js');
const perto = (a, b, m) => assert.ok(Math.abs(a - b) < 0.005, m + ': esperado ' + b + ' e veio ' + a);

// preço sempre termina em ,90 e nunca fica abaixo do valor
assert.strictEqual(paraCima90(11.52), 11.9);
assert.strictEqual(paraCima90(11.9), 11.9);
assert.strictEqual(paraCima90(0), 0);
assert.ok(paraCima90(12) >= 12);

const P = { energia_kwh: 1, potencia_w: 200, valor_impressora: 2000, vida_util_h: 2000, margem_pct: 30, imposto_pct: 0, taxa_pct: 0, preco_kg_pla: 80, preco_kg_petg: 57 };
// 100 g de PLA com 10% de perda = 110 g x R$ 80/kg = 8,80. 2 h: energia 2x0,2x1 = 0,40 e desgaste 2x2000/2000 = 2,00. Custo = 11,20.
const l = calcLinha({ qtd: 3, materiais: [{ tipo: 'PLA', peso_g: 100 }], tempo_h: 2, perda_pct: 10 }, P);
perto(l.un.filamento, 8.8, 'filamento'); perto(l.un.energia, 0.4, 'energia'); perto(l.un.desgaste, 2, 'desgaste'); perto(l.un.total, 11.2, 'custo unitário');
// preço = custo / (1 - 30%) = 16,00
perto(l.sugerido_un, 16, 'preço sugerido');
// PETG usa o preço do PETG
perto(calcLinha({ qtd: 1, materiais: [{ tipo: 'PETG', peso_g: 100 }], perda_pct: 0 }, P).un.filamento, 5.7, 'PETG');
// preço digitado vence o sugerido
assert.strictEqual(calcLinha({ qtd: 1, materiais: [{ tipo: 'PLA', peso_g: 100 }], preco_un: 20 }, P).venda_un, 20);
// pedido com 3 peças a R$ 16: vende 48, custo 33,60, lucro 14,40
const o = calcOrcamento([{ qtd: 3, materiais: [{ tipo: 'PLA', peso_g: 100 }], tempo_h: 2, perda_pct: 10, preco_un: 16 }], 0, P);
perto(o.venda, 48, 'venda'); perto(o.custo, 33.6, 'custo'); perto(o.lucro, 14.4, 'lucro'); assert.strictEqual(o.pecas, 3);
// custo fixo entra no custo do pedido
perto(calcOrcamento([{ qtd: 1, materiais: [], preco_un: 10 }], 4, P).custo, 4, 'custo fixo');
// entradas ruins não quebram
assert.doesNotThrow(() => calcOrcamento([{}], 'abc', {}));
console.log('Calculadora: tudo certo.');
