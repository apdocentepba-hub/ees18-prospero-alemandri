const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

assert(fs.existsSync(path.join(root, 'index.html')), 'index.html must exist');
assert(fs.existsSync(path.join(root, 'assets/css/styles.css')), 'styles.css must exist');
assert(fs.existsSync(path.join(root, 'assets/js/main.js')), 'main.js must exist');

const html = read('index.html');
const css = read('assets/css/styles.css');
const js = read('assets/js/main.js');

assert(html.includes('ESCUELA DE EDUCACIÓN SECUNDARIA Nº 18'), 'official school name must be present');
assert(html.includes('PRÓSPERO ALEMANDRI'), 'school proper name must be present');
['inicio','institucion','novedades','calendario','orientaciones','comunidad','contacto'].forEach(id => {
  assert(new RegExp(`id=["']${id}["']`).test(html), `section #${id} must exist`);
});
assert(html.includes('assets/css/styles.css'), 'stylesheet must be linked');
assert(html.includes('assets/js/main.js'), 'script must be linked');
assert(/id=["']menu-toggle["']/.test(html), 'mobile menu button must exist');
assert(/aria-expanded=["']false["']/.test(html), 'mobile menu must expose aria-expanded');
assert(/id=["']primary-nav["']/.test(html), 'primary nav must have an id');
assert(css.includes('--sky:'), 'institutional sky color token must exist');
assert(css.includes('@media'), 'responsive rules must exist');
assert(js.includes('aria-expanded'), 'menu behavior must update aria-expanded');
assert(js.includes('prefers-reduced-motion'), 'motion preferences must be respected');
console.log('site.test.js: all assertions passed');
