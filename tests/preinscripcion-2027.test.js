const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps-script', 'preinscripcion-2027');
const mode = process.argv[2] || 'all';
const has = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');

function checkCatalog() {
  const catalogPath = path.join(appDir, 'Catalogos.gs');
  const distritosPath = path.join(root, 'data', 'preinscripcion-2027-distritos.json');
  const primariasPath = path.join(root, 'data', 'preinscripcion-2027-primarias.json');
  for (const file of [catalogPath, distritosPath, primariasPath]) assert.ok(has(file), `Falta archivo requerido: ${path.relative(root, file)}`);
  const distritos = JSON.parse(read(distritosPath));
  const primarias = JSON.parse(read(primariasPath));
  const catalogs = read(catalogPath);
  assert.strictEqual(distritos.length, 137, 'Debe haber exactamente 137 distritos');
  assert.ok(distritos.some(d => d.codigo === 5 && d.nombre === 'AVELLANEDA'), 'Debe existir AVELLANEDA código 5');
  assert.ok(primarias.length > 1000, 'El padrón de primarias debe contener una instantánea provincial real');
  assert.ok(primarias.some(e => e.distritoCodigo === 5 && /Estatal/i.test(e.gestion)), 'Avellaneda debe tener primarias estatales');
  assert.ok(primarias.some(e => e.distritoCodigo === 5 && /Privad/i.test(e.gestion)), 'Avellaneda debe tener primarias privadas');
  assert.ok(primarias.every(e => Number.isInteger(e.distritoCodigo) && e.id && e.nombre && e.gestion), 'Cada primaria debe tener distrito, id, nombre y gestión');
  assert.ok(new Set(primarias.map(e => e.distritoCodigo)).size >= 130, 'El padrón debe cubrir prácticamente toda la provincia');
  assert.match(catalogs, /function getDistritos\s*\(/);
  assert.match(catalogs, /function getPrimariasPorDistrito\s*\(/);
  assert.match(catalogs, /function resolverEscuela_\s*\(/);
  assert.match(catalogs, /OTRA/);
}

function checkBackend() {
  const codePath = path.join(appDir, 'Code.gs');
  const setupPath = path.join(appDir, 'Setup.gs');
  const manifestPath = path.join(appDir, 'appsscript.json');
  const readmePath = path.join(appDir, 'README.md');
  for (const file of [codePath, setupPath, manifestPath, readmePath]) assert.ok(has(file), `Falta archivo requerido: ${path.relative(root, file)}`);
  const code = read(codePath);
  const setup = read(setupPath);
  const manifest = JSON.parse(read(manifestPath));
  for (const token of ['PREINSCRIPCION_SPREADSHEET_ID', "'Preinscripciones 2027'", "'RECIBIDA'", 'crearPreinscripcionDesdeFormulario', 'LockService.getScriptLock', 'MailApp.sendEmail', 'DNI del ingresante', 'Correo de recepción']) assert.ok(code.includes(token), `Falta contrato backend: ${token}`);
  assert.match(code, /buscarDuplicadoDni_/);
  assert.match(code, /resolverEscuela_/);
  assert.match(code, /correoEnviado/);
  assert.match(code, /normalizarDni_/);
  assert.match(code, /normalizarEmail_/);
  assert.match(setup, /function configurarPreinscripcion2027\s*\(/);
  assert.match(setup, /function prepararHojaPreinscripciones2027\s*\(/);
  assert.strictEqual(manifest.timeZone, 'America/Argentina/Buenos_Aires');
}

function checkForm() {
  const formPath = path.join(appDir, 'Formulario.html');
  assert.ok(has(formPath), `Falta archivo requerido: ${path.relative(root, formPath)}`);
  const form = read(formPath);
  for (const field of ['alumnoNombre','alumnoDni','distritoCodigo','escuelaId','adultoNombre','adultoDni','vinculo','telefono','email']) assert.match(form, new RegExp(`name=["']${field}["']`), `Falta campo ${field}`);
  for (const value of ['Padre', 'Madre', 'Tutor']) assert.match(form, new RegExp(`value=["']${value}["']`), `Falta vínculo ${value}`);
  assert.match(form, /OTRA \/ NO APARECE EN LA LISTA/);
  assert.match(form, /escuelaManual\.required\s*=\s*esOtra/);
  assert.match(form, /schoolSelect\.disabled\s*=\s*!codigo|escuela[^\n]+disabled/i);
  assert.match(form, /button\.disabled\s*=\s*true|disabled\s*=\s*true/);
  const warning = 'LA PREINSCRIPCIÓN NO IMPLICA LA ASIGNACIÓN AUTOMÁTICA DE UNA VACANTE';
  assert.ok(form.includes(warning), 'Falta aviso de vacante en formulario');
}

function checkPage() {
  const ingresoPath = path.join(root, 'ingreso-2027.html');
  assert.ok(has(ingresoPath), 'Falta ingreso-2027.html');
  const ingreso = read(ingresoPath);
  const warning = 'LA PREINSCRIPCIÓN NO IMPLICA LA ASIGNACIÓN AUTOMÁTICA DE UNA VACANTE';
  assert.ok(ingreso.includes(warning), 'Falta aviso de vacante en página Ingreso 2027');
  assert.match(ingreso, /Preinscripci[oó]n.*2027/i);
  assert.match(ingreso, /script\.google\.com\/macros\/s\/[^"']+\/exec|PREINSCRIPCION_WEB_APP_URL/);
}

if (mode === 'catalog') checkCatalog();
else if (mode === 'backend') { checkCatalog(); checkBackend(); }
else if (mode === 'form') { checkCatalog(); checkBackend(); checkForm(); }
else if (mode === 'page') { checkCatalog(); checkBackend(); checkForm(); checkPage(); }
else { checkCatalog(); checkBackend(); checkForm(); checkPage(); }

console.log(`preinscripcion-2027.test.js (${mode}): OK`);
