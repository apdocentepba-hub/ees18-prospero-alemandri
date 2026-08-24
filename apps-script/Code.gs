const PUBLIC_PENDING_STATUS = 'Solicitud recibida, pendiente de validación';

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    pendingSpreadsheetId: props.getProperty('PENDING_SPREADSHEET_ID'),
    pendingSheetName: props.getProperty('PENDING_SHEET_NAME') || 'Solicitudes',
    requestsFolderId: props.getProperty('REQUESTS_FOLDER_ID'),
    officialSpreadsheetId: props.getProperty('OFFICIAL_SPREADSHEET_ID'),
    officialSheetName: props.getProperty('OFFICIAL_SHEET_NAME') || 'Seguimiento'
  };
  if (!config.pendingSpreadsheetId || !config.requestsFolderId) {
    throw new Error('Falta configurar PENDING_SPREADSHEET_ID o REQUESTS_FOLDER_ID en Script Properties.');
  }
  return config;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (payload.action === 'crearSolicitud') {
      return jsonResponse_(crearSolicitud(payload));
    }
    if (payload.action === 'consultarEstado') {
      return jsonResponse_(consultarEstado(payload.dni, payload.codigoSeguimiento));
    }
    return jsonResponse_({ ok: false, message: 'Acción no válida.' });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, message: 'No se pudo procesar la solicitud.' });
  }
}

function normalizeDni_(value) {
  const dni = String(value || '').replace(/\D/g, '');
  if (dni.length < 6 || dni.length > 10) throw new Error('DNI inválido.');
  return dni;
}

function normalizeText_(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength || 300);
}

function assertEmail_(value) {
  const email = normalizeText_(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo electrónico inválido.');
  return email;
}

function hashTrackingCode_(code) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(code || '').trim().toUpperCase(),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(byte) {
    const n = byte < 0 ? byte + 256 : byte;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function randomTrackingCode_() {
  const clean = Utilities.getUuid().replace(/-/g, '').toUpperCase();
  return 'E18-' + clean.slice(0, 4) + '-' + clean.slice(4, 8);
}

function requestId_() {
  const year = new Date().getFullYear();
  const shortId = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  return 'SOL-' + year + '-' + shortId;
}

function getSheetAndHeaders_(spreadsheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('No se encontró la hoja ' + sheetName + '.');
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) throw new Error('La hoja no tiene encabezados.');
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const index = {};
  headers.forEach(function(header, i) { index[String(header).trim()] = i; });
  return { ss: ss, sheet: sheet, headers: headers, index: index };
}

function requireHeaders_(index, required) {
  required.forEach(function(header) {
    if (index[header] === undefined) throw new Error('Falta la columna interna: ' + header);
  });
}

function safeFile_(filePayload, prefix) {
  if (!filePayload) return null;
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.indexOf(filePayload.type) === -1) throw new Error('Tipo de archivo no permitido.');
  const size = Number(filePayload.size || 0);
  if (!size || size > 10 * 1024 * 1024) throw new Error('Archivo inválido o demasiado grande.');
  const bytes = Utilities.base64Decode(String(filePayload.base64 || ''));
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Archivo demasiado grande.');
  const original = normalizeText_(filePayload.name, 160).replace(/[\\/:*?"<>|]/g, '_');
  const blob = Utilities.newBlob(bytes, filePayload.type, prefix + ' - ' + original);
  return blob;
}

function saveFiles_(folder, archivos) {
  const refs = {};
  const definitions = [
    ['dni', '01 - DNI'],
    ['partida', '02 - PARTIDA NACIMIENTO'],
    ['documentoDestino', '03 - DOCUMENTO DESTINO'],
    ['analiticoAnterior', '04 - ANALITICO ANTERIOR'],
    ['otraDocumentacion', '05 - OTRA DOCUMENTACION']
  ];
  definitions.forEach(function(def) {
    const payload = archivos && archivos[def[0]];
    if (!payload) return;
    const blob = safeFile_(payload, def[1]);
    const file = folder.createFile(blob);
    refs[def[0]] = file.getId();
  });
  return refs;
}

function crearSolicitud(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const config = getConfig_();
    const estudiante = payload.estudiante || {};
    const solicitante = payload.solicitante || {};
    const dni = normalizeDni_(estudiante.dni);
    const apellido = normalizeText_(estudiante.apellido, 100);
    const nombre = normalizeText_(estudiante.nombre, 100);
    const fechaNacimiento = normalizeText_(estudiante.fechaNacimiento, 20);
    const localidadNacimiento = normalizeText_(estudiante.localidadNacimiento, 140);
    const motivo = normalizeText_(payload.motivo, 60);
    const institucionDestino = normalizeText_(payload.institucionDestino, 220);
    const telefono = normalizeText_(solicitante.telefono, 80);
    const email = assertEmail_(solicitante.email);

    if (!apellido || !nombre || !fechaNacimiento || !localidadNacimiento || !motivo || !institucionDestino || !telefono) {
      throw new Error('Faltan datos obligatorios.');
    }
    if (!payload.archivos || !payload.archivos.dni || !payload.archivos.partida) {
      throw new Error('DNI y Partida de Nacimiento son obligatorios.');
    }
    if (motivo === 'otra_escuela' && !payload.archivos.documentoDestino) {
      throw new Error('Falta la documentación de la institución de destino.');
    }

    const requestId = requestId_();
    const trackingCode = randomTrackingCode_();
    const trackingHash = hashTrackingCode_(trackingCode);
    const root = DriveApp.getFolderById(config.requestsFolderId);
    const safeName = (dni + ' - ' + apellido + ' ' + nombre + ' - ' + requestId).replace(/[\\/:*?"<>|]/g, '_');
    const folder = root.createFolder(safeName);
    const refs = saveFiles_(folder, payload.archivos);

    const pending = getSheetAndHeaders_(config.pendingSpreadsheetId, config.pendingSheetName);
    requireHeaders_(pending.index, [
      'ID solicitud', 'Fecha recepción', 'Estado revisión', 'Apellido estudiante',
      'Nombre estudiante', 'DNI estudiante', 'Fecha nacimiento', 'Localidad nacimiento',
      'Motivo', 'Institución / lugar de presentación', 'Teléfono', 'Correo electrónico',
      'Vínculo EES18', 'Estado documentación', 'Aprobado para iniciar',
      'Pasado a seguimiento', 'Carpeta Drive', 'Código seguimiento hash', 'Estado público'
    ]);

    const row = new Array(pending.headers.length).fill('');
    function set(header, value) { if (pending.index[header] !== undefined) row[pending.index[header]] = value; }

    set('ID solicitud', requestId);
    set('Fecha recepción', new Date());
    set('Estado revisión', 'RECIBIDA');
    set('Apellido estudiante', apellido);
    set('Nombre estudiante', nombre);
    set('DNI estudiante', dni);
    set('Fecha nacimiento', fechaNacimiento);
    set('Localidad nacimiento', localidadNacimiento);
    set('Motivo', motivo);
    set('Otro motivo', normalizeText_(payload.otroMotivo, 300));
    set('Institución / lugar de presentación', institucionDestino);
    set('Localidad destino', normalizeText_(payload.localidadDestino, 140));
    set('Cursos declarados', (payload.trayectoria || []).map(function(item) { return item.curso; }).join(', '));
    set('Años declarados', payload.noRecuerdaAnios ? 'No recuerda' : (payload.trayectoria || []).map(function(item) { return item.curso + 'º: ' + (item.anio || 's/d'); }).join(' | '));
    set('Solicitante es estudiante', solicitante.esEstudiante ? 'Sí' : 'No');
    set('Apellido y nombre solicitante', normalizeText_(solicitante.nombre, 200));
    set('Vínculo con estudiante', normalizeText_(solicitante.vinculo, 120));
    set('Teléfono', telefono);
    set('Correo electrónico', email);
    set('DNI adjunto', refs.dni ? 'Sí' : 'No');
    set('Partida adjunta', refs.partida ? 'Sí' : 'No');
    set('Documento destino', motivo === 'fines' ? 'NO REQUERIDO' : (refs.documentoDestino ? 'Sí' : 'No'));
    set('Analítico anterior', refs.analiticoAnterior ? 'Sí' : 'No');
    set('Otra documentación', refs.otraDocumentacion ? 'Sí' : 'No');
    set('Vínculo EES18', 'PENDIENTE');
    set('Estado documentación', 'PENDIENTE');
    set('Aprobado para iniciar', 'No');
    set('Pasado a seguimiento', 'No');
    set('Carpeta Drive', folder.getId());
    set('Código seguimiento hash', trackingHash);
    set('Estado público', PUBLIC_PENDING_STATUS);

    pending.sheet.appendRow(row);
    return { ok: true, idSolicitud: requestId, codigoSeguimiento: trackingCode };
  } finally {
    lock.releaseLock();
  }
}

function consultarEstado(dni, codigoSeguimiento) {
  const config = getConfig_();
  const cleanDni = normalizeDni_(dni);
  const hash = hashTrackingCode_(codigoSeguimiento);
  const pending = getSheetAndHeaders_(config.pendingSpreadsheetId, config.pendingSheetName);
  requireHeaders_(pending.index, [
    'Apellido estudiante', 'Nombre estudiante', 'DNI estudiante',
    'Código seguimiento hash', 'Estado público'
  ]);

  const values = pending.sheet.getDataRange().getDisplayValues();
  for (let r = values.length - 1; r >= 1; r -= 1) {
    const row = values[r];
    if (String(row[pending.index['DNI estudiante']]).replace(/\D/g, '') !== cleanDni) continue;
    if (String(row[pending.index['Código seguimiento hash']]) !== hash) continue;
    return {
      ok: true,
      apellidoNombre: (row[pending.index['Apellido estudiante']] + ' ' + row[pending.index['Nombre estudiante']]).trim(),
      dni: cleanDni,
      estado: row[pending.index['Estado público']] || PUBLIC_PENDING_STATUS
    };
  }
  return { ok: false, message: 'No encontramos un trámite con esos datos.' };
}

function promoverSolicitudValidada(rowIndex) {
  const config = getConfig_();
  if (!config.officialSpreadsheetId) throw new Error('Falta OFFICIAL_SPREADSHEET_ID.');

  const pending = getSheetAndHeaders_(config.pendingSpreadsheetId, config.pendingSheetName);
  requireHeaders_(pending.index, [
    'Vínculo EES18', 'Estado documentación', 'Aprobado para iniciar',
    'Pasado a seguimiento', 'DNI estudiante', 'Apellido estudiante', 'Nombre estudiante'
  ]);

  const row = pending.sheet.getRange(Number(rowIndex), 1, 1, pending.headers.length).getDisplayValues()[0];
  if (row[pending.index['Vínculo EES18']] !== 'VERIFICADO') throw new Error('El vínculo EES18 todavía no está VERIFICADO.');
  if (row[pending.index['Estado documentación']] !== 'VALIDADA') throw new Error('La documentación todavía no está VALIDADA.');
  if (row[pending.index['Aprobado para iniciar']] !== 'Sí') throw new Error('La solicitud todavía no está aprobada para iniciar.');
  if (row[pending.index['Pasado a seguimiento']] === 'Sí') throw new Error('La solicitud ya fue pasada al seguimiento.');

  // El seguimiento oficial actual está almacenado como XLSX. SpreadsheetApp solo puede
  // escribir de forma segura sobre una hoja nativa de Google Sheets. Esta promoción se
  // habilita únicamente cuando OFFICIAL_SPREADSHEET_ID apunte a la versión operativa
  // autorizada por Secretaría; nunca se convierte ni reemplaza el XLSX automáticamente.
  const official = getSheetAndHeaders_(config.officialSpreadsheetId, config.officialSheetName);
  requireHeaders_(official.index, ['Apellido y Nombre', 'DNI']);

  const dni = String(row[pending.index['DNI estudiante']]).replace(/\D/g, '');
  const officialValues = official.sheet.getDataRange().getDisplayValues();
  for (let r = 1; r < officialValues.length; r += 1) {
    if (String(officialValues[r][official.index['DNI']]).replace(/\D/g, '') === dni) {
      throw new Error('Ya existe un registro en seguimiento para este DNI.');
    }
  }

  const target = new Array(official.headers.length).fill('');
  function copy(targetHeader, pendingHeader, fallback) {
    if (official.index[targetHeader] === undefined) return;
    target[official.index[targetHeader]] = pending.index[pendingHeader] === undefined ? (fallback || '') : row[pending.index[pendingHeader]];
  }

  copy('Apellido y Nombre', 'Apellido estudiante');
  if (official.index['Apellido y Nombre'] !== undefined) {
    target[official.index['Apellido y Nombre']] = (row[pending.index['Apellido estudiante']] + ' ' + row[pending.index['Nombre estudiante']]).trim();
  }
  copy('DNI', 'DNI estudiante');
  copy('Escuela destino', 'Institución / lugar de presentación');
  copy('Localidad', 'Localidad destino');
  copy('Fotocopia DNI', 'DNI adjunto');
  copy('Partida de nacimiento', 'Partida adjunta');
  copy('Pase a otra escuela', 'Documento destino');
  copy('Estado documentación', 'Estado documentación');

  official.sheet.appendRow(target);
  pending.sheet.getRange(Number(rowIndex), pending.index['Pasado a seguimiento'] + 1).setValue('Sí');
  if (pending.index['Fecha aprobación'] !== undefined) {
    pending.sheet.getRange(Number(rowIndex), pending.index['Fecha aprobación'] + 1).setValue(new Date());
  }
  if (pending.index['Referencia seguimiento'] !== undefined) {
    pending.sheet.getRange(Number(rowIndex), pending.index['Referencia seguimiento'] + 1).setValue('DNI ' + dni);
  }
  if (pending.index['Estado público'] !== undefined) {
    pending.sheet.getRange(Number(rowIndex), pending.index['Estado público'] + 1).setValue('Documentación validada. Trámite iniciado.');
  }
  return { ok: true, dni: dni };
}
