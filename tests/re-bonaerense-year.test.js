const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data', 'novedades-seed.json'), 'utf8'));
const re = seed.find((item) => item.ID === 're-bonaerense-2026');

assert(re, 'El seed editorial debe incluir RE Bonaerense');
assert.strictEqual(re['Fecha'], '', 'No se debe inventar una fecha exacta para RE Bonaerense');
assert.strictEqual(re['Fecha visible'], '2026', 'RE Bonaerense debe conservar 2026 como fecha visible');
assert.strictEqual(re['Tipo'], 'Proyecto institucional');
assert.strictEqual(re['Título'], '2.º Encuentro de RE Bonaerense');
assert.strictEqual(re['Vida escolar'], 'Sí');
assert.strictEqual(re['Inicio'], 'Sí');

console.log('re-bonaerense-year.test.js: all assertions passed');
