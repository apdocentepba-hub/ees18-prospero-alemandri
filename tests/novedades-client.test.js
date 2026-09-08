const assert = require('assert');
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '..', 'assets', 'js', 'novedades.js');
assert(fs.existsSync(clientPath), 'RED esperado: falta assets/js/novedades.js');

const rules = require(clientPath);

assert.strictEqual(rules.safeUrl('javascript:alert(1)'), '');
assert.strictEqual(rules.safeUrl('http://example.org/x'), '');
assert.strictEqual(rules.safeUrl('https://example.org/x'), 'https://example.org/x');
assert.strictEqual(
  rules.safeUrl('assets/img/re-bonaerense-2024.jpg'),
  'assets/img/re-bonaerense-2024.jpg'
);
assert.strictEqual(rules.safeUrl('../privado.html'), '');

const normalized = rules.normalizeItem({
  id: 'n-1',
  date: '2026-09-07',
  dateDisplay: '7 de septiembre de 2026',
  priority: '4',
  type: 'Institucional'.repeat(20),
  title: 'T'.repeat(220),
  summary: 'S'.repeat(500),
  body: 'B'.repeat(2600),
  image: 'javascript:alert(1)',
  buttonText: 'C'.repeat(140),
  buttonUrl: 'https://example.org/noticia',
  html: '<script>alert(1)</script>'
});
assert.strictEqual(normalized.title.length, 180);
assert.strictEqual(normalized.summary.length, 400);
assert.strictEqual(normalized.body.length, 2400);
assert.strictEqual(normalized.type.length, 80);
assert.strictEqual(normalized.buttonText.length, 100);
assert.strictEqual(normalized.image, '');
assert.strictEqual(normalized.buttonUrl, 'https://example.org/noticia');
assert.strictEqual(Object.prototype.hasOwnProperty.call(normalized, 'html'), false);
assert.strictEqual(normalized.priority, 4);

const sorted = rules.sortItems([
  { id: 'a', priority: 0, date: '2026-09-04' },
  { id: 'b', priority: 2, date: '2026-09-01' },
  { id: 'c', priority: 0, date: '2026-09-07' },
  { id: 'd', priority: 0, date: '' }
]);
assert.deepStrictEqual(sorted.map((item) => item.id), ['b', 'c', 'a', 'd']);

const state = rules.createCarouselState(3);
assert.strictEqual(state.current(), 0);
assert.strictEqual(state.next(), 1);
assert.strictEqual(state.next(), 2);
assert.strictEqual(state.next(), 0);
assert.strictEqual(state.previous(), 2);
assert.strictEqual(state.goTo(1), 1);
assert.strictEqual(state.goTo(99), 1, 'un índice inválido no debe cambiar el estado');

const emptyState = rules.createCarouselState(0);
assert.strictEqual(emptyState.current(), 0);
assert.strictEqual(emptyState.next(), 0);
assert.strictEqual(emptyState.previous(), 0);

assert.strictEqual(typeof rules.requestNews, 'function');

console.log('novedades-client.test.js: all assertions passed');
