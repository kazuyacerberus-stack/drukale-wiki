const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const antes = require.extensions['.ts'];
require.extensions['.ts'] = (mod, nome) => mod._compile(ts.transpileModule(fs.readFileSync(nome, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, nome);
after(() => { if (antes) require.extensions['.ts'] = antes; else delete require.extensions['.ts']; });
const { BIOMA, ampliarVistaCarta, ancoraLocalCarta, prepararTerrenoCarta, planejarLocaisCarta, regiaoNaCarta } = require(path.resolve(__dirname, '../app/components/mundo/cartografiaArtistica.ts'));
const local = { id: 'cidade-teste', nome: 'Cidade de teste', tipo: 'cidade', lat: -12, lon: 45, raio: 3, statusAprovacao: 'aprovado' };

test('o zoom mantém o ponto sob o cursor e o centro da região observada', () => {
  const vista = { zoom: 2.5, x: -700, y: 90 };
  for (const ancora of [{ x: 0, y: 0 }, { x: 230, y: -80 }]) {
    const mundo = { x: (ancora.x - vista.x) / vista.zoom, y: (ancora.y - vista.y) / vista.zoom };
    const nova = ampliarVistaCarta(vista, 1.25, .8, ancora);
    assert.ok(Math.abs(mundo.x * nova.zoom + nova.x - ancora.x) < 1e-8);
    assert.ok(Math.abs(mundo.y * nova.zoom + nova.y - ancora.y) < 1e-8);
  }
  assert.equal(ampliarVistaCarta(vista, 20, .8).zoom, 5);
  assert.equal(ampliarVistaCarta(vista, .01, .8).zoom, .8);
});
test('o alvo clicável usa a mesma posição do desenho junto aos polos', () => {
  const terreno = { largura: 720, altura: 360 };
  for (const lat of [-89.9, 89.9]) {
    const [plano] = planejarLocaisCarta([{ ...local, lat }]);
    const ancora = ancoraLocalCarta(plano, terreno);
    assert.ok(ancora.y >= plano.tamanho * 2.3 && ancora.y <= terreno.altura - plano.tamanho * 1.5);
    assert.equal(plano.y, (90 - lat) / 180);
  }
});

test('a paisagem natural não cria cidades e o cadastro produz um assentamento ilustrado', () => {
  assert.deepEqual(planejarLocaisCarta([]), []);
  const [cidade] = planejarLocaisCarta([local]);
  assert.equal(cidade.id, local.id);
  assert.ok(cidade.casas.length > 20 && cidade.casas.length < 100);
  assert.ok(cidade.regiao.length && cidade.regiao[0].length > 50);
  assert.equal(cidade.x, (local.lon + 180) / 360);
  assert.equal(cidade.y, (90 - local.lat) / 180);
  assert.deepEqual(planejarLocaisCarta([]), []);
});
test('renomear não troca a arquitetura; editar as coordenadas e o raio atualiza a região', () => {
  const [a] = planejarLocaisCarta([local]), [nome] = planejarLocaisCarta([{ ...local, nome: 'Outro nome' }]);
  assert.deepEqual(a, nome);
  const [b] = planejarLocaisCarta([{ ...local, lat: 40, lon: -90, raio: 8 }]);
  assert.notDeepEqual(a.regiao, b.regiao);
  assert.notEqual(a.x, b.x); assert.notEqual(a.y, b.y); assert.deepEqual(a.casas, b.casas);
  assert.deepEqual(a, planejarLocaisCarta([{ ...local, id: 'outra-cidade' }, local])[1]);
});
test('cada tipo tem sua ilustração e coordenadas inválidas não criam assentamentos', () => {
  for (const tipo of ['capital', 'cidade', 'base', 'quartel', 'ruina', 'orbital', 'serpente']) {
    const [a] = planejarLocaisCarta([{ ...local, tipo }]);
    assert.equal(a.tipo, tipo);
    if (tipo === 'orbital' || tipo === 'serpente') { assert.equal(a.casas.length, 0); assert.equal(a.regiao.length, 0); }
    assert.ok(a.casas.every(c => Object.values(c).every(Number.isFinite)));
  }
  assert.deepEqual(planejarLocaisCarta([{ ...local, lat: 91 }, { ...local, lon: NaN }]), []);
  assert.equal(planejarLocaisCarta([{ ...local, statusAprovacao: 'pendente' }])[0].pendente, true);
});
test('regiões que cruzam a emenda ou os polos não desenham uma linha atravessando o mundo', () => {
  for (const [lat, lon, raio] of [[0, 179, 8], [88, -10, 5], [-88, 170, 4]]) {
    const partes = regiaoNaCarta(lat, lon, raio);
    assert.ok(partes.length);
    for (const parte of partes) for (let i = 0; i < parte.length; i++) {
      assert.ok(parte[i].x >= 0 && parte[i].x <= 1 && parte[i].y >= 0 && parte[i].y <= 1);
      if (i) assert.ok(Math.abs(parte[i].x - parte[i - 1].x) <= .5);
    }
  }
  assert.deepEqual(regiaoNaCarta(0, 0, 0), []);
});
test('biomas, litoral e desenhos naturais são determinísticos e não alteram as fontes do 3D', () => {
  const L = 72, A = 36, cor = new Uint8ClampedArray(L * A * 4), mascara = new Uint8ClampedArray(L * A * 4);
  for (let y = 0; y < A; y++) for (let x = 0; x < L; x++) {
    const k = (y * L + x) * 4;
    const paleta = x < 12 ? [8, 20, 45] : x < 24 ? [30, 65, 25] : x < 36 ? [210, 170, 115] : x < 48 ? [110, 105, 100] : [230, 235, 240];
    cor.set([...paleta, 255], k); mascara.set([x < 12 ? 255 : 0, x >= 48 ? 255 : 0, 0, 255], k);
  }
  const c = cor.slice(), m = mascara.slice(), a = prepararTerrenoCarta(cor, mascara, L, A, 144);
  assert.deepEqual(a, prepararTerrenoCarta(cor, mascara, L, A, 144));
  assert.deepEqual(cor, c); assert.deepEqual(mascara, m);
  assert.ok(a.costas.length && a.isobatas.some(i => i.length));
  for (const bioma of [BIOMA.mar, BIOMA.floresta, BIOMA.deserto, BIOMA.serra, BIOMA.neve]) assert.ok(a.biomas.includes(bioma));
  assert.ok(a.detalhes.every(d => d.x >= 0 && d.x < a.largura && d.y >= 0 && d.y < a.altura));
  assert.equal(prepararTerrenoCarta(new Uint8ClampedArray(1), mascara, L, A), null);
});
