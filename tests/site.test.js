const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const principalPages = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'tramites.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html'
];

const detailPages = [
  'historia.html',
  'plan-estudios.html',
  'comunicados.html',
  'pases-equivalencias.html',
  'consultar-estado.html',
  'certificado-analitico.html',
  'boleto-estudiantil.html',
  '404.html'
];

[...principalPages, ...detailPages, 'visitas-ees18.html', 'enspa-en-accion.html', 'visitas-enspa.html'].forEach((file) => {
  assert(fs.existsSync(path.join(root, file)), `${file} must exist`);
});
assert(fs.existsSync(path.join(root, 'assets/css/styles.css')), 'styles.css must exist');
assert(fs.existsSync(path.join(root, 'assets/js/main.js')), 'main.js must exist');
assert(fs.existsSync(path.join(root, 'assets/img/re-bonaerense-2024.jpg')), 'RE Bonaerense image must exist');

const html = read('index.html');
const css = read('assets/css/styles.css');
const js = read('assets/js/main.js');

assert(html.includes('ESCUELA DE EDUCACIÓN SECUNDARIA Nº 18'), 'official school name must be present');
assert(html.includes('PRÓSPERO ALEMANDRI'), 'school proper name must be present');
assert(html.includes('assets/css/styles.css'), 'stylesheet must be linked');
assert(html.includes('assets/js/main.js'), 'script must be linked');
assert(/id=["']menu-toggle["']/.test(html), 'mobile menu button must exist');
assert(/aria-expanded=["']false["']/.test(html), 'mobile menu must expose aria-expanded');
assert(/id=["']primary-nav["']/.test(html), 'primary nav must have an id');
assert(css.includes('--celeste:'), 'institutional celeste color token must exist');
assert(css.includes('@media'), 'responsive rules must exist');
assert(js.includes('aria-expanded'), 'menu behavior must update aria-expanded');
assert(js.includes('prefers-reduced-motion'), 'motion preferences must be respected');

const expectedNavLinks = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'tramites.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html'
];

for (const page of [...principalPages, ...detailPages]) {
  const source = read(page);
  for (const href of expectedNavLinks) {
    assert(source.includes(`href="${href}"`), `${page} must link to ${href}`);
  }
  assert(!source.includes('target="_blank"'), `${page} must not open links in a new tab`);
}

assert(html.includes('2.º Encuentro de RE Bonaerense'), 'home must feature RE Bonaerense');
assert(html.includes('assets/img/re-bonaerense-2024.jpg'), 'home must show RE Bonaerense image');
assert(html.includes('vida-escolar.html'), 'home must visibly link to Vida escolar');
assert(html.includes('tramites.html'), 'home must link to the procedures hub');
assert(html.includes('nuestra-escuela.html'), 'home must link to Nuestra escuela');
assert(html.includes('propuesta-educativa.html'), 'home must link to Propuesta educativa');

const vida = read('vida-escolar.html');
assert(vida.includes('2.º Encuentro de RE Bonaerense'), 'Vida escolar must contain RE Bonaerense');
assert(vida.includes('Estudiantes hacen memoria'), 'Vida escolar must contain project name');
assert(vida.includes('assets/img/re-bonaerense-2024.jpg'), 'Vida escolar must use the local image');

const oldAction = read('enspa-en-accion.html');
assert(oldAction.includes('vida-escolar.html'), 'old ENSPA action URL must redirect to Vida escolar');
const oldVisit = read('visitas-enspa.html');
assert(oldVisit.includes('visitas-ees18.html') || oldVisit.includes('ingreso-2027.html'), 'old visits URL must redirect to current visit/ingreso page');

console.log('site.test.js: all assertions passed');
