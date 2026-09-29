const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps-script', 'preinscripcion-2027');
const requiredFiles = [
  path.join(appDir, 'Catalogos.gs'),
  path.join(appDir, 'Code.gs'),
  path.join(appDir, 'Setup.gs'),
  path.join(appDir, 'Formulario.html'),
  path.join(appDir, 'appsscript.json'),
  path.join(appDir, 'README.md'),
  path.join(root, 'data', 'preinscripcion-2027-distritos.json'),
  path.join(root, 'data', 'preinscripcion-2027-primarias.json'),
  path.join(root, 'ingreso-2027.html')
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(file), `Falta archivo requerido: ${path.relative(root, file)}`);
}

const distritos = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preinscripcion-2027-distritos.json'), 'utf8'));
const primarias = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preinscripcion-2027-primarias.json'), 'utf8'));
const form = fs.readFileSync(path.join(appDir, 'Formulario.html'), 'utf8');
const code = fs.readFileSync(path.join(appDir, 'Code.gs'), 'utf8');
const catalogs = fs.readFileSync(path.join(appDir, 'Catalogos.gs'), 'utf8');
const setup = fs.readFileSync(path.join(appDir, 'Setup.gs'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(appDir, 'appsscript.json'), 'utf8'));
const ingreso = fs.readFileSync(path.join(root, 'ingreso-2027.html'), 'utf8');

assert.strictEqual(distritos.length, 137, 'Debe haber exactamente 137 distritos');
assert.ok(distritos.some(d => d.codigo === 5 && d.nombre === 'AVELLANEDA'), 'Debe existir AVELLANEDA código 5');
assert.ok(primarias.length > 1000, 'El padrón de primarias debe contener una instantánea provincial real');
assert.ok(primarias.some(e => e.distritoCodigo === 5 && /Estatal/i.test(e.gestion)), 'Avellaneda debe tener primarias estatales');
assert.ok(primarias.some(e => e.distritoCodigo === 5 && /Privad/i.test(e.gestion)), 'Avellaneda debe tener primarias privadas');
assert.ok(primarias.every(e => Number.isInteger(e.distritoCodigo) && e.id && e.nombre && e.gestion), 'Cada primaria debe tener distrito, id, nombre y gestión');
assert.ok(new Set(primarias.map(e => e.distritoCodigo)).size >= 130, 'El padrón debe cubrir prácticamente toda la provincia');

for (const field of ['alumnoNombre','alumnoDni','distritoCodigo','escuelaId','adultoNombre','adultoDni','vinculo','telefono','email']) {
  assert.match(form, new RegExp(`name=["']${field}["']`), `Falta campo ${field}`);
}
for (const value of ['Padre', 'Madre', 'Tutor']) {
  assert.match(form, new RegExp(`value=["']${value}["']`), `Falta vínculo ${value}`);
}
assert.match(form, /OTRA \/ NO APARECE EN LA LISTA/);
assert.match(form, /escuelaManual\.required\s*=\s*esOtra/);
assert.match(form, /schoolSelect\.disabled\s*=\s*!codigo|escuela[^\n]+disabled/i);
assert.match(form, /button\.disabled\s*=\s*true|disabled\s*=\s*true/);
const warning = 'LA PREINSCRIPCIÓN NO IMPLICA LA ASIGNACIÓN AUTOMÁTICA DE UNA VACANTE';
assert.ok(form.includes(warning), 'Falta aviso de vacante en formulario');
assert.ok(ingreso.includes(warning), 'Falta aviso de vacante en página Ingreso 2027');

for (const token of [
  'PREINSCRIPCION_SPREADSHEET_ID',
  "'Preinscripciones 2027'",
  "'RECIBIDA'",
  'crearPreinscripcionDesdeFormulario',
  'LockService.getScriptLock',
  'MailApp.sendEmail',
  'DNI del ingresante',
  'Correo de recepción'
]) assert.ok(code.includes(token), `Falta contrato backend: ${token}`);

assert.match(code, /buscarDuplicadoDni_/);
assert.match(code, /resolverEscuela_/);
assert.match(code, /correoEnviado/);
assert.match(catalogs, /function getDistritos\s*\(/);
assert.match(catalogs, /function getPrimariasPorDistrito\s*\(/);
assert.match(catalogs, /function resolverEscuela_\s*\(/);
assert.match(setup, /function configurarPreinscripcion2027\s*\(/);
assert.match(setup, /function prepararHojaPreinscripciones2027\s*\(/);
assert.strictEqual(manifest.timeZone, 'America/Argentina/Buenos_Aires');

console.log('preinscripcion-2027.test.js: OK');
