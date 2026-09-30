const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&ordm;/g, 'º')
  .replace(/\s+/g, ' ')
  .trim();

const pagePath = path.join(root, 'mesas-completa-carrera-octubre-2026.html');
assert(fs.existsSync(pagePath), 'the October 2026 Completa Carrera schedule page must exist');

const page = read('mesas-completa-carrera-octubre-2026.html');
const text = strip(page);
const home = read('index.html');
const estudiantes = read('estudiantes-familias.html');

assert(text.includes('Mesas de examen Completa Carrera'), 'schedule page must identify Completa Carrera exams');
assert(text.includes('Octubre 2026'), 'schedule page must identify October 2026');
assert(text.includes('Turno Mañana'), 'schedule page must include morning shift');
assert(text.includes('Turno Tarde'), 'schedule page must include afternoon shift');
assert(text.includes('Materia Año Día Horario Profesor'), 'schedule tables must expose the five official columns');

const morningRows = [
  'LITERATURA 6º 5/10 7:30 TESOURO',
  'PORTUGUES III 6º 5/10 7:30 GIL',
  'TALLER DE PRODUCCION DE LENGUAJE 6º 5/10 9:50 DIMOLA',
  'AMBIENTE, DESARROLLO Y SOCIEDAD 6º 6/10 7:30 LUZZI',
  'CONSTRUCCION DE LA CIUDADANIA 1º 6/10 7:30 JAUME',
  'EDUCACION FISICA 6º 6/10 9:00 VIEYTES',
  'FISICA CLASICA Y MODERNA 6º 6/10 9:50 FILIPIAK',
  'GEOGRAFIA 4º 6/10 7:30 ALVARELLOS',
  'INTRODUCCIÒN A LA QUIMICA 5º 6/10 7:30 CANAY',
  'TALLER DE COMUN INST Y COMUNITARIA 6º 6/10 7:30 CARBONARO',
  'CS DE LA TIERRA 5º 7/10 7:30 LEAL',
  'GEOGRAFIA 5º 7/10 7:30 LEAL',
  'MATEMATICA 3º 7/10 7:30 PLATERO',
  'TRAB Y CIUDADANIA 6º 7/10 9:50 ACOSTA',
  'ARTE 6º 8/10 7:30 SUREDA',
  'EST INTERCULTURALES II 6º 8/10 9:50 FERRARE',
  'FISICA 5º 8/10 7:30 FRANCISCO',
  'INGLES 6º 8/10 7:30 REQUEIJO',
  'MATEMATICA 4º 9/10 7:30 BERDOTE',
  'MATEMATICA 6º 9/10 7:30 BERTOTTO'
];

const afternoonRows = [
  'BIOLOGIA 6º 5/10 15:20 LUZZI',
  'GEOGRAFIA 5º 5/10 15:20 WOHLGEMUTH',
  'FRANCES III 6º 6/10 16:20 LOMBAN',
  'FUNDAMENTOS DE LA QUIMICA 5º 6/10 15:20 CURA',
  'EST INTERCULTURALES I 5º 6/10 13:00 CORRADINO',
  'HISTORIA 4º/5º 7/10 13:00 GILIBERTO',
  'LITERATURA 6º 7/10 15:20 LYALL',
  'CS DE LA TIERRA 5º 8/10 13:00 AVILA',
  'FILOSOFIA 6º 8/10 13:00 CHARABATYN',
  'MATEMATICA 4º 8/10 15:20 MARTINEZ FIGUEREDO',
  'MATEMATICA 6º 8/10 13:00 BIBEL',
  'LITERATURA 5º 8/10 13:00 PEREZ',
  'OBS. DE COMUNICACIÒN, CULTURA Y SOCIEDAD 5º 9/10 15:20 MILLAN',
  'SOCIOLOGIA 5º 9/10 15:20 ENDRIGO',
  'TRABAJO Y CIUDADANIA 6º 9/10 13:00 LOPEZ'
];

for (const row of [...morningRows, ...afternoonRows]) {
  assert(text.includes(row), `schedule page must preserve official row: ${row}`);
}

assert(home.includes('mesas-completa-carrera-octubre-2026.html'), 'home must link to the published schedule');
assert(estudiantes.includes('mesas-completa-carrera-octubre-2026.html'), 'student/family hub must link to the published schedule');
assert(home.includes('Cronograma publicado'), 'home must announce that the schedule is published');
assert(estudiantes.includes('Cronograma publicado'), 'student/family hub must announce that the schedule is published');
assert(!home.includes('Próximamente se publicarán los días y horarios de las mesas de examen.'), 'home must remove the old upcoming-schedule message');
assert(!estudiantes.includes('Próximamente se publicarán los días y horarios de las mesas de examen.'), 'student/family hub must remove the old upcoming-schedule message');
assert(!/Imprimir|Guardar como PDF/i.test(text), 'schedule page must not include print/PDF controls');

console.log('completa-carrera-octubre-2026.test.js: all assertions passed');
