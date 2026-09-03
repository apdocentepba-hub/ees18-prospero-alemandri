const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps-script', 'solicitud-analitico-final');
const formPath = path.join(appDir, 'Formulario.html');
const codePath = path.join(appDir, 'Code.gs');
const manifestPath = path.join(appDir, 'appsscript.json');
const publicPagePath = path.join(root, 'certificado-analitico.html');
const tramitesPath = path.join(root, 'tramites.html');
const estudiantesPath = path.join(root, 'estudiantes-familias.html');

for (const file of [formPath, codePath, manifestPath, publicPagePath, tramitesPath, estudiantesPath]) {
  assert.ok(fs.existsSync(file), `Falta archivo requerido: ${path.relative(root, file)}`);
}

const form = fs.readFileSync(formPath, 'utf8');
const code = fs.readFileSync(codePath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const publicPage = fs.readFileSync(publicPagePath, 'utf8');
const tramites = fs.readFileSync(tramitesPath, 'utf8');
const estudiantes = fs.readFileSync(estudiantesPath, 'utf8');

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

// Para Analítico Final, 6.º año es el curso normal y no se ofrecen 1.º a 5.º.
assert.match(form, /name=["']ultimoCurso["'][^>]*value=["']6\.º año["']|value=["']6\.º año["'][^>]*name=["']ultimoCurso["']/i);
for (const year of ['1.º año', '2.º año', '3.º año', '4.º año', '5.º año']) {
  assert.doesNotMatch(form, new RegExp(`<option[^>]*value=["']${year.replace('.', '\\.')}["']`, 'i'));
}
assert.match(form, /División de 6\.º año/i);
assert.match(form, /Año en que cursaste 6\.º año/i);

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

const webAppUrl = 'https://script.google.com/macros/s/AKfycbwDmgBiDhJzv9i1sdB_Rk4aNox4pefXqH5ccV0QH2_ertG_F0xeodGlJQ2axevCIKPhnw/exec';
assert.ok(publicPage.includes(webAppUrl), 'La página pública debe enlazar al Web App productivo');
assert.match(publicPage, /Analítico Final/i);
assert.match(publicPage, /egresad/i);
assert.match(publicPage, /DNI[^<]*(frente|ambos lados)|DNI[^<]*dorso/i);
assert.match(publicPage, /Partida de Nacimiento/i);
assert.match(publicPage, /otra escuela/i);
assert.match(publicPage, /10 MB/i);
assert.match(publicPage, /PDF/i);
assert.match(publicPage, /JPG|JPEG/i);
assert.match(publicPage, /PNG/i);
assert.match(publicPage, /no necesit[aá]s iniciar sesi[oó]n|sin iniciar sesi[oó]n/i);
assert.match(publicPage, /no se env[ií]an por correo/i);
assert.match(publicPage, /solicitud.*queda registrada|queda registrada.*solicitud/i);
assert.doesNotMatch(publicPage, /constancia de solicitud de vacante/i);
assert.doesNotMatch(publicPage, /FINES/i);
assert.doesNotMatch(publicPage, /consultar estado por DNI/i);

for (const page of [tramites, estudiantes]) {
  assert.match(page, /Solicitar Analítico Final/i);
  assert.ok(page.includes('certificado-analitico.html'));
}

const parsed = JSON.parse(manifest);
assert.strictEqual(parsed.timeZone, 'America/Argentina/Buenos_Aires');

console.log('analitico-final.test.js: OK');
