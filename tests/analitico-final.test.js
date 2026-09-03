const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps-script', 'solicitud-analitico-final');
const formPath = path.join(appDir, 'Formulario.html');
const codePath = path.join(appDir, 'Code.gs');
const manifestPath = path.join(appDir, 'appsscript.json');

for (const file of [formPath, codePath, manifestPath]) {
  assert.ok(fs.existsSync(file), `Falta archivo requerido: ${path.relative(root, file)}`);
}

const form = fs.readFileSync(formPath, 'utf8');
const code = fs.readFileSync(codePath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');

for (const field of [
  'apellido', 'nombre', 'dni', 'fechaNacimiento', 'localidadNacimiento',
  'email', 'telefono', 'motivo', 'orientacion', 'ultimoCurso', 'division',
  'turno', 'anioCursado', 'anioUltimaMateria', 'cursoOtraEscuela'
]) {
  assert.match(form, new RegExp(`name=["']${field}["']`), `Falta campo ${field}`);
}

for (const option of [
  'Comunicación', 'Ciencias Sociales', 'Lenguas Extranjeras',
  'Ciencias Naturales', 'Otra / No recuerdo'
]) {
  assert.ok(form.includes(option), `Falta opción de orientación: ${option}`);
}

assert.match(form, /value=["']Mañana["']/);
assert.match(form, /value=["']Tarde["']/);
assert.doesNotMatch(form, /value=["']Noche["']/);

for (const fileField of ['dniFrente', 'dniDorso', 'partida']) {
  assert.match(
    form,
    new RegExp(`<input[^>]*name=["']${fileField}["'][^>]*required|<input[^>]*required[^>]*name=["']${fileField}["']`, 'i'),
    `${fileField} debe ser obligatorio`
  );
}
assert.match(form, /name=["']analiticoAnterior["']/);
assert.match(form, /analiticoAnterior\.required\s*=\s*otraEscuela/);
assert.match(form, /10\s*\*\s*1024\s*\*\s*1024/);
assert.match(form, /application\/pdf/);
assert.match(form, /image\/jpeg/);
assert.match(form, /image\/png/);
assert.match(form, /Tu solicitud fue recibida/);

for (const token of [
  'PENDING_SPREADSHEET_ID', 'PENDING_SHEET_NAME', 'REQUESTS_FOLDER_ID',
  '01 - DNI FRENTE', '02 - DNI DORSO', '03 - PARTIDA NACIMIENTO',
  '04 - ANALITICO PARCIAL ESCUELA ANTERIOR', "'RECIBIDA'",
  'SOL-', 'MailApp.sendEmail'
]) {
  assert.ok(code.includes(token), `Falta contrato backend: ${token}`);
}

assert.match(code, /motivo === 'otro'/);
assert.match(code, /cursoOtraEscuela === 'si'/);
assert.match(code, /correoEnviado/);
assert.doesNotMatch(code, /attachments\s*:/, 'El correo no debe adjuntar archivos');

const mailStart = code.indexOf('function enviarConfirmacion_');
assert.ok(mailStart >= 0, 'Falta helper enviarConfirmacion_');
const mailEnd = code.indexOf('\n}', mailStart);
const mailBlock = code.slice(mailStart, mailEnd + 2);
for (const sensitive of ['dni', 'apellido', 'nombreArchivo', 'dniFrente', 'dniDorso', 'partida', 'analiticoAnterior']) {
  assert.doesNotMatch(mailBlock, new RegExp(`\\b${sensitive}\\b`), `El correo no debe usar ${sensitive}`);
}
assert.match(mailBlock, /fechaRecepcion/);
assert.match(mailBlock, /Secretaría revisará la documentación/);

const parsed = JSON.parse(manifest);
assert.strictEqual(parsed.timeZone, 'America/Argentina/Buenos_Aires');

console.log('analitico-final.test.js: OK');
