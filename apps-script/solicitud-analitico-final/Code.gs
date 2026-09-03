const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ORIENTACIONES = [
  'Comunicación',
  'Ciencias Sociales',
  'Lenguas Extranjeras',
  'Ciencias Naturales',
  'Otra / No recuerdo'
];
const TURNOS = ['Mañana', 'Tarde'];
const SOLICITUD_HEADERS = [
  'ID solicitud',
  'Fecha recepción',
  'Estado revisión',
  'Apellido',
  'Nombre',
  'DNI',
  'Fecha nacimiento',
  'Localidad nacimiento',
  'Correo electrónico',
  'Celular / WhatsApp',
  'Motivo',
  'Otro motivo',
  'Orientación / modalidad',
  'Otra orientación / aclaración',
  'Último curso',
  'División',
  'Turno',
  'Año cursado',
  'Año aprobación última materia',
  'Cursó en otra escuela',
  'DNI frente adjunto',
  'DNI dorso adjunto',
  'Partida adjunta',
  'Analítico anterior adjunto',
  'Carpeta Drive',
  'Correo de recepción'
];

function doGet() {
  return HtmlService
    .createTemplateFromFile('Formulario')
    .evaluate()
    .setTitle('Solicitud de Analítico Final · E.E.S. Nº 18')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    pendingSpreadsheetId: props.getProperty('PENDING_SPREADSHEET_ID'),
    pendingSheetName: props.getProperty('PENDING_SHEET_NAME') || 'Solicitudes',
    requestsFolderId: props.getProperty('REQUESTS_FOLDER_ID')
  };

  if (!config.pendingSpreadsheetId || !config.requestsFolderId) {
    throw new Error('Falta configurar PENDING_SPREADSHEET_ID o REQUESTS_FOLDER_ID en Script Properties.');
  }
  return config;
}

function normalizeText_(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 300);
}

function normalizeDni_(value) {
  const dni = String(value || '').replace(/\D/g, '');
  if (dni.length < 6 || dni.length > 10) throw new Error('DNI inválido.');
  return dni;
}

function normalizeEmail_(value) {
  const email = normalizeText_(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo electrónico inválido.');
  return email;
}

function normalizeYear_(value, label) {
  const year = Number(String(value || '').replace(/\D/g, ''));
  const max = new Date().getFullYear() + 1;
  if (!Number.isInteger(year) || year < 1950 || year > max) {
    throw new Error(label + ' inválido.');
  }
  return year;
}

function requestId_() {
  const year = new Date().getFullYear();
  const shortId = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  return 'SOL-' + year + '-' + shortId;
}

function sanitizeFileName_(value) {
  return normalizeText_(value || 'archivo', 160).replace(/[\\/:*?"<>|]/g, '_');
}

function validateBlob_(blob, label) {
  if (!blob || typeof blob.getBytes !== 'function') {
    throw new Error('Falta adjuntar ' + label + '.');
  }
  const type = String(blob.getContentType() || '').toLowerCase();
  if (ALLOWED_FILE_TYPES.indexOf(type) === -1) {
    throw new Error(label + ': formato no permitido.');
  }
  const bytes = blob.getBytes();
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) {
    throw new Error(label + ': el archivo está vacío o supera 10 MB.');
  }
  return blob;
}

function saveFile_(folder, blob, prefix) {
  validateBlob_(blob, prefix);
  const safeOriginal = sanitizeFileName_(blob.getName());
  blob.setName(prefix + ' - ' + safeOriginal);
  return folder.createFile(blob);
}

function getSheet_(config) {
  const spreadsheet = SpreadsheetApp.openById(config.pendingSpreadsheetId);
  const sheet = spreadsheet.getSheetByName(config.pendingSheetName);
  if (!sheet) throw new Error('No se encontró la pestaña ' + config.pendingSheetName + '. Ejecutá prepararHojaSolicitudes().');

  const lastColumn = sheet.getLastColumn();
  if (lastColumn < SOLICITUD_HEADERS.length) {
    throw new Error('La hoja de solicitudes no tiene todos los encabezados requeridos.');
  }
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  SOLICITUD_HEADERS.forEach(function(header, index) {
    if (String(headers[index] || '').trim() !== header) {
      throw new Error('Encabezado inválido en columna ' + (index + 1) + ': se esperaba “' + header + '”.');
    }
  });
  return sheet;
}

function enviarConfirmacion_(email, fechaRecepcion) {
  const fecha = Utilities.formatDate(
    fechaRecepcion,
    Session.getScriptTimeZone() || 'America/Argentina/Buenos_Aires',
    'dd/MM/yyyy HH:mm'
  );
  const subject = 'E.E.S. Nº 18 · Tu solicitud fue recibida';
  const textBody = [
    'Tu solicitud fue recibida.',
    'Fecha de recepción: ' + fecha + '.',
    'Secretaría revisará la documentación y se comunicará por los datos de contacto informados si necesita alguna aclaración o documentación adicional.',
    'Este mensaje confirma únicamente la recepción del formulario.'
  ].join('\n\n');
  const htmlBody = '<p><strong>Tu solicitud fue recibida.</strong></p>' +
    '<p>Fecha de recepción: ' + fecha + '.</p>' +
    '<p>Secretaría revisará la documentación y se comunicará por los datos de contacto informados si necesita alguna aclaración o documentación adicional.</p>' +
    '<p>Este mensaje confirma únicamente la recepción del formulario.</p>';

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: textBody,
    htmlBody: htmlBody
  });
}

function crearSolicitudDesdeFormulario(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let folder = null;

  try {
    const config = getConfig_();
    const fechaRecepcion = new Date();
    const idSolicitud = requestId_();

    const apellido = normalizeText_(form.apellido, 100);
    const nombre = normalizeText_(form.nombre, 100);
    const dni = normalizeDni_(form.dni);
    const fechaNacimiento = normalizeText_(form.fechaNacimiento, 20);
    const localidadNacimiento = normalizeText_(form.localidadNacimiento, 140);
    const email = normalizeEmail_(form.email);
    const telefono = normalizeText_(form.telefono, 80);
    const motivo = normalizeText_(form.motivo, 80);
    const otroMotivo = normalizeText_(form.otroMotivo, 300);
    const orientacion = normalizeText_(form.orientacion, 80);
    const otraOrientacion = normalizeText_(form.otraOrientacion, 200);
    const ultimoCurso = normalizeText_(form.ultimoCurso, 30);
    const division = normalizeText_(form.division, 30);
    const turno = normalizeText_(form.turno, 20);
    const anioCursado = normalizeYear_(form.anioCursado, 'Año cursado');
    const anioUltimaMateria = normalizeYear_(form.anioUltimaMateria, 'Año de aprobación de la última materia');
    const cursoOtraEscuela = normalizeText_(form.cursoOtraEscuela, 10).toLowerCase();

    if (!apellido || !nombre || !fechaNacimiento || !localidadNacimiento || !telefono || !ultimoCurso || !division) {
      throw new Error('Faltan datos obligatorios.');
    }
    if (motivo === 'otro' && !otroMotivo) {
      throw new Error('Aclarar el otro motivo.');
    }
    if (ORIENTACIONES.indexOf(orientacion) === -1) {
      throw new Error('Orientación / modalidad inválida.');
    }
    if (TURNOS.indexOf(turno) === -1) {
      throw new Error('Turno inválido.');
    }
    if (cursoOtraEscuela !== 'si' && cursoOtraEscuela !== 'no') {
      throw new Error('Indicá si cursaste algún año en otra escuela.');
    }

    validateBlob_(form.dniFrente, 'DNI frente');
    validateBlob_(form.dniDorso, 'DNI dorso');
    validateBlob_(form.partida, 'Partida de nacimiento');
    if (cursoOtraEscuela === 'si') {
      validateBlob_(form.analiticoAnterior, 'Analítico parcial de la escuela anterior');
    }

    const root = DriveApp.getFolderById(config.requestsFolderId);
    const safeFolderName = (idSolicitud + ' - ' + dni + ' - ' + apellido + ' ' + nombre)
      .replace(/[\\/:*?"<>|]/g, '_');
    folder = root.createFolder(safeFolderName);

    saveFile_(folder, form.dniFrente, '01 - DNI FRENTE');
    saveFile_(folder, form.dniDorso, '02 - DNI DORSO');
    saveFile_(folder, form.partida, '03 - PARTIDA NACIMIENTO');
    let analiticoAnteriorGuardado = false;
    if (cursoOtraEscuela === 'si') {
      saveFile_(folder, form.analiticoAnterior, '04 - ANALITICO PARCIAL ESCUELA ANTERIOR');
      analiticoAnteriorGuardado = true;
    }

    const sheet = getSheet_(config);
    const row = [
      idSolicitud,
      fechaRecepcion,
      'RECIBIDA',
      apellido,
      nombre,
      dni,
      fechaNacimiento,
      localidadNacimiento,
      email,
      telefono,
      motivo,
      otroMotivo,
      orientacion,
      otraOrientacion,
      ultimoCurso,
      division,
      turno,
      anioCursado,
      anioUltimaMateria,
      cursoOtraEscuela === 'si' ? 'Sí' : 'No',
      'Sí',
      'Sí',
      'Sí',
      analiticoAnteriorGuardado ? 'Sí' : 'No requerido',
      folder.getUrl(),
      'PENDIENTE'
    ];
    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();

    let correoEnviado = true;
    try {
      enviarConfirmacion_(email, fechaRecepcion);
      sheet.getRange(rowNumber, SOLICITUD_HEADERS.indexOf('Correo de recepción') + 1).setValue('ENVIADO');
    } catch (mailError) {
      correoEnviado = false;
      console.error('No se pudo enviar el correo de recepción:', mailError);
      sheet.getRange(rowNumber, SOLICITUD_HEADERS.indexOf('Correo de recepción') + 1).setValue('NO ENVIADO');
    }

    return {
      ok: true,
      idSolicitud: idSolicitud,
      correoEnviado: correoEnviado,
      message: 'Tu solicitud fue recibida.'
    };
  } catch (error) {
    console.error(error);
    if (folder) {
      try {
        folder.setTrashed(true);
      } catch (cleanupError) {
        console.error('No se pudo limpiar la carpeta incompleta:', cleanupError);
      }
    }
    return { ok: false, message: error.message || 'No se pudo registrar la solicitud.' };
  } finally {
    lock.releaseLock();
  }
}
