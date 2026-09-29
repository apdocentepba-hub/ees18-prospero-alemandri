const PREINSCRIPCION_SHEET_NAME = 'Preinscripciones 2027';
const PREINSCRIPCION_HEADERS = [
  'Fecha y hora de recepción',
  'Apellido y nombre del ingresante',
  'DNI del ingresante',
  'Código de distrito',
  'Distrito',
  'ID escuela',
  'Escuela de procedencia',
  'Gestión de la escuela',
  'Localidad de la escuela',
  'Apellido y nombre del adulto responsable',
  'DNI del adulto responsable',
  'Vínculo',
  'Teléfono',
  'Correo electrónico',
  'Estado',
  'Observaciones internas',
  'Correo de recepción'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Formulario')
    .setTitle('Preinscripción 1.º año 2027 · E.E.S. Nº 18')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getPreinscripcionConfig_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('PREINSCRIPCION_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('La preinscripción todavía no fue configurada por Secretaría.');
  return {
    spreadsheetId: spreadsheetId,
    sheetName: props.getProperty('PREINSCRIPCION_SHEET_NAME') || PREINSCRIPCION_SHEET_NAME,
    catalogSheetName: props.getProperty('PREINSCRIPCION_CATALOGO_SHEET_NAME') || 'CatalogoPrimarias'
  };
}

function getPreinscripcionSheet_() {
  const config = getPreinscripcionConfig_();
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  if (!sheet) throw new Error('No se encontró la hoja de preinscripciones.');
  return sheet;
}

function normalizarTexto_(value, maxLength) {
  const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return text.slice(0, maxLength || 200);
}

function normalizarDni_(value) {
  const dni = String(value == null ? '' : value).replace(/\D/g, '');
  if (!/^\d{6,9}$/.test(dni)) throw new Error('Ingresá un DNI válido, solo con números.');
  return dni;
}

function normalizarEmail_(value) {
  const email = normalizarTexto_(value, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Ingresá un correo electrónico válido.');
  return email;
}

function normalizarTelefono_(value) {
  const phone = normalizarTexto_(value, 40);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) throw new Error('Ingresá un teléfono válido.');
  return phone;
}

function normalizarNombre_(value, label) {
  const text = normalizarTexto_(value, 120);
  if (text.length < 3) throw new Error('Completá ' + label + '.');
  return text;
}

function normalizarVinculo_(value) {
  const vinculo = normalizarTexto_(value, 20);
  if (['Padre', 'Madre', 'Tutor'].indexOf(vinculo) === -1) {
    throw new Error('Seleccioná el vínculo con el/la estudiante.');
  }
  return vinculo;
}

function validarFormularioPreinscripcion_(form) {
  if (!form) throw new Error('No se recibieron datos del formulario.');
  const escuela = resolverEscuela_(form.distritoCodigo, form.escuelaId, form.escuelaManual);
  return {
    alumnoNombre: normalizarNombre_(form.alumnoNombre, 'el apellido y nombre del ingresante'),
    alumnoDni: normalizarDni_(form.alumnoDni),
    escuela: escuela,
    adultoNombre: normalizarNombre_(form.adultoNombre, 'el apellido y nombre del adulto responsable'),
    adultoDni: normalizarDni_(form.adultoDni),
    vinculo: normalizarVinculo_(form.vinculo),
    telefono: normalizarTelefono_(form.telefono),
    email: normalizarEmail_(form.email)
  };
}

function headerIndex_(header) {
  const index = PREINSCRIPCION_HEADERS.indexOf(header);
  if (index === -1) throw new Error('No se encontró la columna “' + header + '”.');
  return index + 1;
}

function buscarDuplicadoDni_(sheet, dni) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const dniColumn = headerIndex_('DNI del ingresante');
  const values = sheet.getRange(2, dniColumn, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i += 1) {
    const existing = String(values[i][0] || '').replace(/\D/g, '');
    if (existing === dni) return i + 2;
  }
  return null;
}

function crearPreinscripcionDesdeFormulario(form) {
  const data = validarFormularioPreinscripcion_(form);
  const sheet = getPreinscripcionSheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let rowNumber;
  try {
    const duplicateRow = buscarDuplicadoDni_(sheet, data.alumnoDni);
    if (duplicateRow) {
      return {
        ok: false,
        code: 'DUPLICATE',
        message: 'Ya existe una preinscripción registrada para ese DNI. Si necesitás corregir algún dato, comunicate con Secretaría.'
      };
    }

    const now = new Date();
    const row = [
      now,
      data.alumnoNombre,
      data.alumnoDni,
      data.escuela.distritoCodigo,
      data.escuela.distrito,
      data.escuela.id,
      data.escuela.nombre,
      data.escuela.gestion,
      data.escuela.localidad || '',
      data.adultoNombre,
      data.adultoDni,
      data.vinculo,
      data.telefono,
      data.email,
      'RECIBIDA',
      '',
      'PENDIENTE'
    ];
    sheet.appendRow(row);
    rowNumber = sheet.getLastRow();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  let correoEnviado = false;
  try {
    enviarCorreoRecepcion_(data.email, data.alumnoNombre);
    correoEnviado = true;
  } catch (error) {
    console.error('No se pudo enviar el correo de recepción: ' + error.message);
  }

  try {
    sheet.getRange(rowNumber, headerIndex_('Correo de recepción')).setValue(correoEnviado ? 'ENVIADO' : 'NO ENVIADO');
  } catch (error) {
    console.error('No se pudo actualizar el estado del correo: ' + error.message);
  }

  return {
    ok: true,
    correoEnviado: correoEnviado,
    message: correoEnviado
      ? 'La preinscripción fue recibida. También enviamos un aviso al correo informado.'
      : 'La preinscripción fue recibida. No pudimos enviar el correo de aviso, pero el registro quedó guardado correctamente.'
  };
}

function enviarCorreoRecepcion_(email, alumnoNombre) {
  const subject = 'Preinscripción 1.º año 2027 recibida · E.E.S. Nº 18';
  const warning = 'LA PREINSCRIPCIÓN NO IMPLICA LA ASIGNACIÓN AUTOMÁTICA DE UNA VACANTE.';
  const body = [
    'E.E.S. Nº 18 “Próspero Alemandri”',
    '',
    'Recibimos la preinscripción para 1.º año 2027 correspondiente a ' + alumnoNombre + '.',
    '',
    warning,
    'La institución informará posteriormente cómo continuar con el proceso de inscripción.',
    '',
    'Este correo es únicamente un acuse de recepción.'
  ].join('\n');

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    name: 'E.E.S. Nº 18 “Próspero Alemandri”'
  });
}
