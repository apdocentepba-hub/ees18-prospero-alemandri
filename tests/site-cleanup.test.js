const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const fullLayoutPages = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html',
  'historia.html',
  'plan-estudios.html',
  'tramites.html',
  'pases-equivalencias.html',
  'consultar-estado.html',
  'certificado-analitico.html',
  'boleto-estudiantil.html',
  'comunicados.html',
  'reservas-audiovisuales.html',
  'cancelar-reserva.html',
  'visitas-ees18.html',
  '404.html'
];

const normalPublicPages = fullLayoutPages.filter((file) => ![
  'cancelar-reserva.html',
  'visitas-ees18.html',
  '404.html'
].includes(file));

const primaryHrefs = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html'
];

const footerHrefs = [
  'index.html',
  'nuestra-escuela.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'contacto.html',
  'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'
];

const fullOriginalLogo = 'https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/Logo-Superior-863x1000.jpg';

function navHrefs(html) {
  const match = html.match(/<nav class="primary-nav"[\s\S]*?<\/nav>/i);
  assert(match, 'Falta primary-nav');
  return [...match[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

function footerLinks(html) {
  const match = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/i);
  assert(match, 'Falta site-footer');
  const nav = match[0].match(/<nav(?:\s+[^>]*)?>[\s\S]*?<\/nav>/i);
  assert(nav, 'Falta navegación del footer');
  return [...nav[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

for (const file of fullLayoutPages) {
  const html = read(file);
  assert.deepStrictEqual(navHrefs(html), primaryHrefs, `${file}: menú principal inconsistente`);
  assert(html.includes('assets/img/logo-ees18.jpg'), `${file}: debe conservar fallback/logo local`);
  if (file === 'index.html') {
    assert(html.includes(fullOriginalLogo), 'index.html: debe usar el logo completo original del Profesorado');
    assert(html.includes("this.src='assets/img/logo-ees18.jpg'"), 'index.html: debe conservar fallback local si falla el servidor del Profesorado');
  } else {
    assert(!/src="https:\/\/isfd100-bue\.infd\.edu\.ar/i.test(html), `${file}: no debe depender del logo remoto`);
  }

  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/i)[0];
  assert(footer.includes('Av. Manuel Belgrano 355 · Avellaneda'), `${file}: falta dirección en footer`);
  assert(footer.includes('secundaria18avellaneda@abc.gob.ar'), `${file}: falta correo en footer`);
  assert.deepStrictEqual(footerLinks(html), footerHrefs, `${file}: footer inconsistente`);
}

for (const file of normalPublicPages) {
  const html = read(file);
  for (const placeholder of ['A confirmar', 'Próximamente', 'Información en preparación']) {
    assert(!html.includes(placeholder), `${file}: conserva placeholder ${placeholder}`);
  }
}

const index = read('index.html');
assert(!index.includes('id="agenda-title"'), 'Inicio no debe conservar Agenda');
assert(index.includes('data-visitor-counter'), 'El contador de visitas debe conservarse');
assert(index.includes('assets/js/visitor-counter.js'), 'El script del contador debe conservarse');

const school = read('nuestra-escuela.html');
assert(school.includes('Motyl Nadezhda'), 'Debe figurar Motyl Nadezhda');

const contact = read('contacto.html');
assert(!contact.includes('<dt>Teléfono</dt>'), 'No debe mostrarse un teléfono inexistente');

const teachers = read('docentes.html');
assert(!/semanal/i.test(teachers), 'Docentes no debe prometer reservas semanales');
assert(!teachers.includes('1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw'), 'Debe eliminarse el Google Form viejo');
assert(!teachers.includes('Carro Tecnológico'), 'Debe ocultarse Carro Tecnológico hasta tener interfaz pública');
assert(teachers.includes('reservas-audiovisuales.html'), 'Debe mantenerse el sistema vigente de reservas');

const procedures = read('tramites.html');
assert(!procedures.includes('Constancias y certificados'), 'No mostrar trámite inexistente');
assert(!procedures.includes('Formularios escolares'), 'No mostrar formularios inexistentes');

const comms = read('comunicados.html');
for (const heading of ['Fecha visible', 'Mensaje completo', 'Canal institucional']) {
  assert(!comms.includes(`<h3>${heading}</h3>`), `Comunicados no debe conservar ${heading}`);
}
assert(comms.includes('data-news-section="comunicados"'), 'Debe mantenerse la lista dinámica');

const life = read('vida-escolar.html');
assert(/Archivo de actividades destacadas/i.test(life), 'Vida escolar debe distinguir el archivo');
assert(!life.includes('Nuevas publicaciones próximamente'), 'Vida escolar no debe tener categorías vacías');

const ingreso = read('ingreso-2027.html');
assert(ingreso.includes('https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'), 'Ingreso debe priorizar WhatsApp');
assert(ingreso.includes('contacto.html'), 'Ingreso debe ofrecer contacto institucional');
assert(ingreso.includes('plan-estudios.html'), 'Ingreso debe ofrecer plan de estudios');
assert(!ingreso.includes('href="visitas-ees18.html"'), 'Ingreso no debe promocionar visitas sin actividad confirmada');

for (const file of [
  'cancelar-reserva.html',
  'enspa-en-accion.html',
  'visitas-enspa.html',
  'solicitar-analitico.html',
  'visitas-ees18.html'
]) {
  assert(read(file).includes('name="robots" content="noindex,follow"'), `${file}: falta noindex,follow`);
}

const sitemap = read('sitemap.xml');
for (const forbidden of [
  'cancelar-reserva.html',
  'enspa-en-accion.html',
  'visitas-enspa.html',
  'solicitar-analitico.html',
  'visitas-ees18.html'
]) {
  assert(!sitemap.includes(forbidden), `sitemap no debe incluir ${forbidden}`);
}

console.log('site-cleanup.test.js: all assertions passed');
