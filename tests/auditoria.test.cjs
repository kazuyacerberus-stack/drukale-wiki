const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function carregar(relativo) {
  const filename = path.resolve(__dirname, '..', relativo);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(js, filename);
  return mod.exports;
}

const { projetarMapaPlano } = carregar('app/lib/cartografia.ts');
const { lerRascunhoFicha } = carregar('app/lib/rascunhoFicha.ts');
const campos = { name: 'Ária', epithet: '', faction: 'Olympia', status: 'Vivo', race: '', affiliation: '', quote: '', description: 'Linha um\nLinha dois' };
const rascunho = { versao: 1, campos, secoes: [{ titulo: 'Origem', texto: 'Um parágrafo.\n\nOutro parágrafo.' }] };

test('projeção mantém hemisférios, equador e meridiano central', () => {
  assert.deepEqual(projetarMapaPlano(0, 0), { x: 50, y: 50 });
  assert.deepEqual(projetarMapaPlano(90, -180), { x: 0, y: 0 });
  assert.deepEqual(projetarMapaPlano(-90, 180), { x: 100, y: 100 });
  const olympia = projetarMapaPlano(9.77, 103.24);
  assert.ok(olympia.x > 50 && olympia.y < 50);
});

test('coordenadas inválidas não inventam marcadores na origem', () => {
  for (const [lat, lon] of [[NaN, 0], [0, Infinity], [91, 0], [0, -181]]) {
    assert.equal(projetarMapaPlano(lat, lon), null);
  }
});

test('rascunho preserva acentos, parágrafos e ordem dos capítulos', () => {
  assert.deepEqual(lerRascunhoFicha(JSON.stringify(rascunho)), rascunho);
});

test('armazenamento ausente, corrompido ou de versão incompatível não restaura dados', () => {
  for (const bruto of [null, '', '{', 'null', '[]', JSON.stringify({ ...rascunho, versao: 2 })]) {
    assert.equal(lerRascunhoFicha(bruto), null);
  }
});

test('rascunhos incompletos ou com capítulos inválidos são rejeitados', () => {
  for (const valor of [
    { ...rascunho, campos: { name: 'Só um campo' } },
    { ...rascunho, campos: { ...campos, status: 12 } },
    { ...rascunho, secoes: [null] },
    { ...rascunho, secoes: Array(21).fill({ titulo: 'A', texto: 'B' }) },
  ]) assert.equal(lerRascunhoFicha(JSON.stringify(valor)), null);
});

test('propriedades estranhas não se tornam campos do formulário', () => {
  const bruto = JSON.stringify({ ...rascunho, campos: { ...campos, inesperado: 'ignorar' } });
  assert.deepEqual(lerRascunhoFicha(bruto).campos, campos);
});
