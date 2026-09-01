const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const principalPages = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html'
];

const detailPages = [
  'tramites.html',
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

// Navegación institucional moderna: superficie suave, pestaña activa clara y CTA separado.
assert(css.includes('--nav-surface:'), 'navigation must define a soft institutional surface token');
assert(css.includes('.primary-nav a[aria-current="page"]'), 'navigation must style the current page');
assert(css.includes('background: var(--nav-active);'), 'current navigation tab must use a soft active background');
assert(css.includes('box-shadow: inset 0 0 0 1px'), 'navigation shell must have a subtle inset border');
assert(css.includes('.primary-nav a:not(.nav-cta):hover'), 'navigation tabs must have a dedicated hover treatment');
assert(css.includes('.nav-cta:hover'), 'contact CTA must have a dedicated hover treatment');

const expectedNavLinks = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html'
];

for (const page of principalPages) {
  const source = read(page);
  for (const href of expectedNavLinks) {
    assert(source.includes(`href="${href}"`), `${page} must link to ${href}`);
  }
  assert(!source.includes('target="_blank"'), `${page} must not open links in a new tab`);
}

for (const page of detailPages) {
  const source = read(page);
  assert(!source.includes('target="_blank"'), `${page} must not open links in a new tab`);
}

assert(html.includes('2.º Encuentro de RE Bonaerense'), 'home must feature RE Bonaerense');
assert(html.includes('assets/img/re-bonaerense-2024.jpg'), 'home must show RE Bonaerense image');
assert(html.includes('vida-escolar.html'), 'home must visibly link to Vida escolar');
assert(html.includes('estudiantes-familias.html'), 'home must link to Estudiantes y familias');
assert(html.includes('docentes.html'), 'home must link to Docentes');
assert(html.includes('nuestra-escuela.html'), 'home must link to Nuestra escuela');
assert(html.includes('propuesta-educativa.html'), 'home must link to Propuesta educativa');

const estudiantes = read('estudiantes-familias.html');
assert(estudiantes.includes('Estudiantes y familias'), 'student hub must identify its audience');
assert(estudiantes.includes('tramites.html'), 'student hub must link to procedures');
assert(estudiantes.includes('consultar-estado.html'), 'student hub must link to DNI status lookup');
assert(estudiantes.includes('boleto-estudiantil.html'), 'student hub must link to student transport');
assert(estudiantes.includes('ingreso-2027.html'), 'student hub must link to admission information');

const docentes = read('docentes.html');
assert(docentes.includes('Docentes'), 'teacher hub must identify its audience');
assert(docentes.includes('Reservar Salón de Audiovisuales'), 'teacher hub must expose active audiovisual booking');
assert(docentes.includes('reservas-audiovisuales.html'), 'teacher hub must link to active audiovisual booking');
assert(docentes.includes('1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw/viewform'), 'teacher hub must retain audiovisual contingency form');
assert(docentes.includes('Carro Tecnológico'), 'teacher hub must expose technological cart access');
assert(!docentes.includes('Continuidad pedagógica por curso - ENSPA'), 'teacher hub must not expose internal spreadsheet names');

const tramites = read('tramites.html');
assert(tramites.includes('estudiantes-familias.html'), 'procedures must be nested under students and families');
assert(tramites.includes('docentes.html'), 'procedures page must keep the new primary navigation');

const vida = read('vida-escolar.html');
assert(vida.includes('2.º Encuentro de RE Bonaerense'), 'Vida escolar must contain RE Bonaerense');
assert(vida.includes('Estudiantes hacen memoria'), 'Vida escolar must contain project name');
assert(vida.includes('assets/img/re-bonaerense-2024.jpg'), 'Vida escolar must use the local image');

const oldAction = read('enspa-en-accion.html');
assert(oldAction.includes('vida-escolar.html'), 'old ENSPA action URL must redirect to Vida escolar');
const oldVisit = read('visitas-enspa.html');
assert(oldVisit.includes('visitas-ees18.html') || oldVisit.includes('ingreso-2027.html'), 'old visits URL must redirect to current visit/ingreso page');

console.log('site.test.js: all assertions passed');
