const COMPLETA_CARRERA_SPREADSHEET_ID = '1dv8GYdzfP5QW1q6aBisE0S1H4bJNEUSq6Klw1qNsyAk';
const COMPLETA_CARRERA_SHEET_NAME = 'Solicitudes';
const COMPLETA_CARRERA_ROOT_FOLDER_ID = '1TLq7nh_GGnji54JbN3cG3sXA57WFIN-j';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ORIENTACIONES = ['Ciencias Naturales', 'Ciencias Sociales', 'Comunicación', 'Lenguas Extranjeras', 'Otra'];
const TURNOS = ['Mañana', 'Tarde'];
const ANIOS = ['1º', '2º', '3º', '4º', '5º', '6º'];
const SOLICITUD_HEADERS = [
  'ID solicitud', 'Fecha recepción', 'Estado', 'Apellido', 'Nombre', 'DNI',
  'Teléfono / WhatsApp', 'Correo electrónico', 'Último año cursado', 'Turno',
  'Año de egreso', 'Orientación', 'Otra orientación', 'Plan de estudios',
  'Materia 1 año', 'Materia 1', 'Materia 2 año', 'Materia 2', 'Materia 3 año', 'Materia 3',
  'DNI frente adjunto', 'DNI dorso adjunto', 'Carpeta Drive', 'Observaciones',
  'Fecha revisión', 'Revisado por'
];

function doGet() {
  return HtmlService
    .createTemplateFromFile('Formulario')
    .evaluate()
    .setTitle('Completa Carrera · E.E.S. Nº 18')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function requestId_() {
  const year = new Date().getFullYear();
  return 'CC-' + year + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
}

function normalizeEmail_(value) {
  const email = normalizeText_(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo electrónico inválido.');
  return email;
}

function normalizeOptionalYear_(value) {
  const raw = normalizeText_(value, 10);
  if (!raw) return '';
  const year = Number(raw.replace(/\D/g, ''));
  const max = new Date().getFullYear() + 1;
  if (!Number.isInteger(year) || year < 1950 || year > max) throw new Error('Año de egreso inválido.');
  return year;
}

function sanitizeFileName_(value) {
  return normalizeText_(value || 'archivo', 160).replace(/[\\/:*?"<>|]/g, '_');
}

function validateBlob_(blob, label) {
  if (!blob || typeof blob.getBytes !== 'function') throw new Error('Falta adjuntar ' + label + '.');
  const type = String(blob.getContentType() || '').toLowerCase();
  if (ALLOWED_FILE_TYPES.indexOf(type) === -1) throw new Error(label + ': formato no permitido. Usá PDF, JPG o PNG.');
  const bytes = blob.getBytes();
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error(label + ': el archivo está vacío o supera 10 MB.');
  return blob;
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(COMPLETA_CARRERA_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(COMPLETA_CARRERA_SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la pestaña de solicitudes.');
  const headers = sheet.getRange(1, 1, 1, SOLICITUD_HEADERS.length).getDisplayValues()[0];
  SOLICITUD_HEADERS.forEach(function(header, index) {
    if (String(headers[index] || '').trim() !== header) {
      throw new Error('Encabezado inválido en columna ' + (index + 1) + ': se esperaba “' + header + '”.');
    }
  });
  return sheet;
}

function getOrCreateStudentFolder_(dni, apellido, nombre) {
  const root = DriveApp.getFolderById(COMPLETA_CARRERA_ROOT_FOLDER_ID);
  const folderName = buildStudentFolderName_(dni, apellido, nombre);
  const existing = root.getFoldersByName(folderName);
  return existing.hasNext() ? existing.next() : root.createFolder(folderName);
}

function saveFile_(folder, blob, label, idSolicitud) {
  validateBlob_(blob, label);
  const original = sanitizeFileName_(blob.getName());
  blob.setName(idSolicitud + ' - ' + label.toUpperCase() + ' - ' + original);
  return folder.createFile(blob);
}

function crearSolicitudCompletaCarrera(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const fechaRecepcion = new Date();
    const idSolicitud = requestId_();
    const apellido = normalizeText_(form.apellido, 100);
    const nombre = normalizeText_(form.nombre, 100);
    const dni = normalizeDni_(form.dni);
    const telefono = normalizeText_(form.telefono, 80);
    const email = normalizeEmail_(form.email);
    const ultimoAnio = normalizeText_(form.ultimoAnio, 20);
    const turno = normalizeText_(form.turno, 20);
    const anioEgreso = normalizeOptionalYear_(form.anioEgreso);
    const orientacion = normalizeText_(form.orientacion, 80);
    const otraOrientacion = normalizeText_(form.otraOrientacion, 160);
    const plan = normalizePlan_(form.planTipo, form.planOtro);

    if (!apellido || !nombre || !telefono) throw new Error('Faltan datos personales obligatorios.');
    if (ANIOS.indexOf(ultimoAnio) === -1) throw new Error('Último año cursado inválido.');
    if (TURNOS.indexOf(turno) === -1) throw new Error('Turno inválido.');
    if (ORIENTACIONES.indexOf(orientacion) === -1) throw new Error('Orientación inválida.');
    if (orientacion === 'Otra' && !otraOrientacion) throw new Error('Escribí la orientación.');

    const materias = normalizeMaterias_([
      { anio: form.materia1Anio, materia: form.materia1 },
      { anio: form.materia2Anio, materia: form.materia2 },
      { anio: form.materia3Anio, materia: form.materia3 }
    ]);

    validateBlob_(form.dniFrente, 'DNI frente');
    validateBlob_(form.dniDorso, 'DNI dorso');

    const folder = getOrCreateStudentFolder_(dni, apellido, nombre);
    saveFile_(folder, form.dniFrente, 'DNI frente', idSolicitud);
    saveFile_(folder, form.dniDorso, 'DNI dorso', idSolicitud);

    const m1 = materias[0] || { anio: '', materia: '' };
    const m2 = materias[1] || { anio: '', materia: '' };
    const m3 = materias[2] || { anio: '', materia: '' };

    getSheet_().appendRow([
      idSolicitud,
      fechaRecepcion,
      'RECIBIDA',
      apellido,
      nombre,
      dni,
      telefono,
      email,
      ultimoAnio,
      turno,
      anioEgreso,
      orientacion,
      otraOrientacion,
      plan,
      m1.anio,
      m1.materia,
      m2.anio,
      m2.materia,
      m3.anio,
      m3.materia,
      'Sí',
      'Sí',
      folder.getUrl(),
      '',
      '',
      ''
    ]);

    return {
      ok: true,
      idSolicitud: idSolicitud,
      message: 'Inscripción recibida correctamente.'
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: error.message || 'No se pudo registrar la inscripción.' };
  } finally {
    lock.releaseLock();
  }
}
