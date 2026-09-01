const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'tramites.html',
  'contacto.html',
  'consultar-estado.html',
  'comunicados.html',
  'boleto-estudiantil.html',
  'reservas-audiovisuales.html',
  'cancelar-reserva.html',
  'assets/css/styles.css',
  'assets/css/multipage.css',
  'assets/css/reservas-audiovisuales.css',
  'assets/js/main.js',
  'assets/js/status-config.js',
  'assets/js/estado-publico.js',
  'assets/js/reservas-config.js',
  'assets/js/reservas-audiovisuales.js',
  'assets/js/cancelar-reserva.js',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
];
for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `missing ${file}`);
}

const pages = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'tramites.html',
  'contacto.html',
  'consultar-estado.html',
  'comunicados.html',
  'boleto-estudiantil.html',
  'reservas-audiovisuales.html',
  'cancelar-reserva.html',
];

for (const page of pages) {
  const content = read(page);
  assert(/<html\s+lang="es"/i.test(content), `${page} must declare Spanish`);
  assert(/<meta\s+name="viewport"/i.test(content), `${page} must have viewport meta`);
  assert(/<meta\s+name="description"/i.test(content), `${page} must have description`);
  assert(/<title>[^<]+<\/title>/i.test(content), `${page} must have title`);
  assert(content.includes('assets/css/styles.css'), `${page} must use global styles`);
  assert(content.includes('assets/js/main.js'), `${page} must use main JS`);
  assert(content.includes('class="skip-link"'), `${page} must expose skip navigation`);
  assert(content.includes('id="contenido"'), `${page} must expose main content target`);
  assert(content.includes('E.E.S. Nº 18'), `${page} must preserve school identity`);
  assert(!/placeholder\.com|example\.com|lorem ipsum/i.test(content), `${page} contains placeholder content`);
  assert(!/href="#"/i.test(content), `${page} contains dead # links`);
}

const html = read('index.html');
assert(html.includes('estudiantes-familias.html'), 'home must visibly link to Estudiantes y familias');
assert(html.includes('docentes.html'), 'home must visibly link to Docentes');
assert(html.includes('nuestra-escuela.html'), 'home must visibly link to Nuestra escuela');
assert(html.includes('propuesta-educativa.html'), 'home must visibly link to Propuesta educativa');
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
assert(docentes.includes('Reservar Salón de Audiovisuales'), 'teacher hub must expose audiovisual booking');
assert(docentes.includes('reservas-audiovisuales.html'), 'teacher hub must link to the active audiovisual booking page');
assert(docentes.includes('1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw/viewform'), 'teacher hub must retain the audiovisual contingency form');
assert(docentes.includes('Carro Tecnológico'), 'teacher hub must expose technological cart access');
assert(!docentes.includes('Continuidad pedagógica por curso - ENSPA'), 'teacher hub must not expose internal spreadsheet names');

const tramites = read('tramites.html');
assert(tramites.includes('estudiantes-familias.html'), 'procedures must be nested under students and families');
assert(tramites.includes('docentes.html'), 'procedures page must keep the new primary navigation');

const vida = read('vida-escolar.html');
assert(vida.includes('2.º Encuentro de RE Bonaerense'), 'Vida escolar must contain RE Bonaerense');
assert(vida.includes('22 de agosto de 2025'), 'Vida escolar must contain RE Bonaerense date');
assert(vida.includes('assets/img/vida-escolar/encuentro-re-bonaerense.jpg'), 'Vida escolar must use local RE Bonaerense image');
assert(vida.includes('formato full-width'), 'Vida escolar must mention the new native video treatment');
assert(vida.includes('video class="school-story-media"'), 'Vida escolar must render the approved full-width native video');
assert(vida.includes('controls preload="metadata" playsinline'), 'Vida escolar native video must expose controls and mobile-safe playback');
assert(vida.includes('poster="assets/img/vida-escolar/presentacion-escuela-poster.jpg"'), 'Vida escolar video must use local poster');
assert(vida.includes('source src="assets/video/presentacion-escuela.mp4" type="video/mp4"'), 'Vida escolar video must use local MP4 source');
assert(!vida.includes('video-showcase__device'), 'Vida escolar must no longer use device mockup video chrome');
assert(!vida.includes('video-showcase__play'), 'Vida escolar must no longer use fake play button');

const css = read('assets/css/styles.css');
assert(css.includes('.video-showcase__media'), 'global CSS must define full-width video media');
assert(css.includes('.school-story-media'), 'global CSS must define native school-story video');
assert(css.includes('prefers-reduced-motion'), 'global CSS must respect reduced motion');

const mainJs = read('assets/js/main.js');
assert(mainJs.includes('aria-expanded'), 'menu JS must manage aria-expanded');
assert(mainJs.includes('current-year'), 'main JS must update current year');

console.log('site.test.js: all assertions passed');
