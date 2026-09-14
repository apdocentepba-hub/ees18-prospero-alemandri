const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const TURNOS = ['Mañana', 'Tarde'];
const ORIENTACIONES = ['Ciencias Naturales', 'Ciencias Sociales', 'Comunicación', 'Lenguas Extranjeras', 'Otra'];
const SOLICITUD_HEADERS = [
  'ID solicitud','Fecha recepción','Estado','Apellido','Nombre','DNI','Teléfono / WhatsApp','Correo electrónico',
  'Último año cursado','Turno','Año de egreso','Orientación','Otra orientación','Plan de estudios',
  'Materia 1 año','Materia 1','Materia 2 año','Materia 2','Materia 3 año','Materia 3',
  'DNI frente adjunto','DNI dorso adjunto','Carpeta Drive','Observaciones','Fecha revisión','Revisado por',
  'CONFIRMAR PARA ACTA','RESULTADO ACTA'
];
const ACTAS_REGISTRY_HEADERS = ['Clave parte','Clave grupo','Parte','ID acta','Documento ID','URL','Actualizado','Estado'];
const REGISTRY_SHEET = '_ACTAS_REGISTRO';
const MAX_ALUMNOS_ACTA = 30;

function doGet() {
  return HtmlService.createTemplateFromFile('Formulario').evaluate()
    .setTitle('Completa Carrera · E.E.S. Nº 18')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    spreadsheetId: props.getProperty('COMPLETA_SPREADSHEET_ID'),
    sheetName: props.getProperty('COMPLETA_SHEET_NAME') || 'Solicitudes',
    requestsFolderId: props.getProperty('COMPLETA_REQUESTS_FOLDER_ID'),
    actaTemplateId: props.getProperty('COMPLETA_ACTA_TEMPLATE_ID'),
    actasFolderId: props.getProperty('COMPLETA_ACTAS_FOLDER_ID'),
    instancia: props.getProperty('COMPLETA_ACTA_INSTANCIA') || 'A completar',
    fechaActa: props.getProperty('COMPLETA_ACTA_FECHA') || 'A completar',
    libroFolio: props.getProperty('COMPLETA_LIBRO_FOLIO') || 'A completar'
  };
  ['spreadsheetId','requestsFolderId','actaTemplateId','actasFolderId'].forEach(function(k) {
    if (!config[k]) throw new Error('Falta configurar ' + k + ' en Script Properties.');
  });
  return config;
}

function normalizeText_(value, maxLength) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').slice(0, maxLength || 300);
}

function normalizeDni_(value) {
  const dni = String(value || '').replace(/\D/g, '');
  if (dni.length < 6 || dni.length > 10) throw new Error('DNI inválido.');
  return dni;
}

function normalizeMateria_(value) {
  return normalizeText_(value, 180);
}

function normalizeEmail_(value) {
  const email = normalizeText_(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo electrónico inválido.');
  return email;
}

function normalizeYear_(value, label) {
  const year = Number(String(value || '').replace(/\D/g, ''));
  const max = new Date().getFullYear() + 1;
  if (!Number.isInteger(year) || year < 1950 || year > max) throw new Error((label || 'Año') + ' inválido.');
  return String(year);
}

function materiasDesdeFormulario_(form) {
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const anio = normalizeText_(form['materia' + i + 'Anio'], 10);
    const materia = normalizeMateria_(form['materia' + i]);
    if (!!anio !== !!materia) throw new Error('Cada materia debe tener año y materia completos.');
    if (!anio && !materia) continue;
    if (!/^[1-6]$/.test(anio)) throw new Error('Año de materia inválido.');
    out.push({ anio: anio, materia: materia });
  }
  if (!out.length) throw new Error('Debés indicar al menos una materia.');
  return out;
}

function claveActa_(item) {
  return [item.materia, item.anio, item.orientacion, item.turno]
    .map(function(v) { return normalizeText_(v, 180).toUpperCase(); })
    .join('|');
}

function validarSolicitudBasica_(data) {
  const obligatorios = ['apellido','nombre','dni','telefono','email','ultimoAnio','turno','anioEgreso','orientacion','planEstudios'];
  if (obligatorios.some(function(k) { return !normalizeText_(data[k], 300); })) throw new Error('Faltan datos obligatorios.');
  normalizeDni_(data.dni);
  normalizeEmail_(data.email);
  if (!/^[1-6]$/.test(String(data.ultimoAnio))) throw new Error('Último año cursado inválido.');
  if (TURNOS.indexOf(data.turno) === -1) throw new Error('Turno inválido.');
  if (ORIENTACIONES.indexOf(data.orientacion) === -1) throw new Error('Orientación inválida.');
  normalizeYear_(data.anioEgreso, 'Año de egreso');
}

function expandirSolicitudParaActas_(solicitud) {
  if (normalizeText_(solicitud.estado, 30).toUpperCase() !== 'APROBADA' || solicitud.confirmar !== true) return [];
  const materias = Array.isArray(solicitud.materias) ? solicitud.materias : [];
  return materias.map(function(m) {
    const item = {
      materia: normalizeMateria_(m.materia),
      anio: normalizeText_(m.anio, 10),
      orientacion: normalizeText_(solicitud.orientacion, 100),
      turno: normalizeText_(solicitud.turno, 30),
      dni: normalizeDni_(solicitud.dni),
      apellido: normalizeText_(solicitud.apellido, 100),
      nombre: normalizeText_(solicitud.nombre, 100),
      solicitudId: normalizeText_(solicitud.id, 80),
      sheetRow: solicitud.sheetRow
    };
    item.clave = claveActa_(item);
    return item;
  }).filter(function(item) { return item.materia && /^[1-6]$/.test(item.anio); });
}

function dedupeAlumnos_(alumnos) {
  const seen = {};
  const out = [];
  (alumnos || []).forEach(function(alumno) {
    const dni = normalizeDni_(alumno.dni);
    if (seen[dni]) return;
    seen[dni] = true;
    out.push(alumno);
  });
  return out;
}

function agruparItemsActa_(items) {
  const groups = {};
  (items || []).forEach(function(item) {
    if (!groups[item.clave]) {
      groups[item.clave] = { clave:item.clave, materia:item.materia, anio:item.anio, orientacion:item.orientacion, turno:item.turno, alumnos:[] };
    }
    groups[item.clave].alumnos.push({dni:item.dni, apellido:item.apellido, nombre:item.nombre, solicitudId:item.solicitudId, sheetRow:item.sheetRow});
  });
  Object.keys(groups).forEach(function(key) { groups[key].alumnos = dedupeAlumnos_(groups[key].alumnos); });
  return groups;
}

function dividirEnBloques_(items, size) {
  const out = [];
  const chunkSize = Math.max(1, Number(size) || 1);
  for (let i = 0; i < (items || []).length; i += chunkSize) out.push(items.slice(i, i + chunkSize));
  return out;
}

function requestId_() {
  const year = new Date().getFullYear();
  const shortId = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  return 'CC-' + year + '-' + shortId;
}

function sanitizeFileName_(value) {
  return normalizeText_(value || 'archivo', 160).replace(/[\\/:*?"<>|]/g, '_');
}

function validateBlob_(blob, label) {
  if (!blob || typeof blob.getBytes !== 'function') throw new Error('Falta adjuntar ' + label + '.');
  const type = String(blob.getContentType() || '').toLowerCase();
  if (ALLOWED_FILE_TYPES.indexOf(type) === -1) throw new Error(label + ': formato no permitido.');
  const bytes = blob.getBytes();
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error(label + ': el archivo está vacío o supera 10 MB.');
  return blob;
}

function saveFile_(folder, blob, prefix) {
  validateBlob_(blob, prefix);
  const copy = blob.copyBlob();
  copy.setName(prefix + ' - ' + sanitizeFileName_(blob.getName()));
  return folder.createFile(copy);
}

function getSheet_(config) {
  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName(config.sheetName);
  if (!sheet) throw new Error('No se encontró la pestaña ' + config.sheetName + '.');
  const headers = sheet.getRange(1, 1, 1, SOLICITUD_HEADERS.length).getDisplayValues()[0];
  SOLICITUD_HEADERS.forEach(function(header, index) {
    if (String(headers[index] || '').trim() !== header) throw new Error('Encabezado inválido en columna ' + (index + 1) + ': se esperaba “' + header + '”.');
  });
  return sheet;
}

function enviarConfirmacion_(email, fechaRecepcion, idSolicitud) {
  const tz = Session.getScriptTimeZone() || 'America/Argentina/Buenos_Aires';
  const fecha = Utilities.formatDate(fechaRecepcion, tz, 'dd/MM/yyyy HH:mm');
  const subject = 'E.E.S. Nº 18 · Solicitud Completa Carrera recibida';
  const body = [
    'Tu solicitud de inscripción a Completa Carrera fue recibida.',
    'Solicitud: ' + idSolicitud,
    'Fecha de recepción: ' + fecha + '.',
    'La solicitud queda PENDIENTE de revisión de Secretaría. El envío del formulario no confirma la inscripción ni genera automáticamente un acta.',
    'La escuela se comunicará si necesita una aclaración.'
  ].join('\n\n');
  MailApp.sendEmail({to:email, subject:subject, body:body});
}

function crearSolicitudDesdeFormulario(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let folder = null;
  try {
    const config = getConfig_();
    const fechaRecepcion = new Date();
    const id = requestId_();
    const data = {
      apellido: normalizeText_(form.apellido, 100),
      nombre: normalizeText_(form.nombre, 100),
      dni: normalizeDni_(form.dni),
      telefono: normalizeText_(form.telefono, 80),
      email: normalizeEmail_(form.email),
      ultimoAnio: normalizeText_(form.ultimoAnio, 10),
      turno: normalizeText_(form.turno, 20),
      anioEgreso: normalizeYear_(form.anioEgreso, 'Año de egreso'),
      orientacion: normalizeText_(form.orientacion, 80),
      otraOrientacion: normalizeText_(form.otraOrientacion, 200),
      planEstudios: normalizeText_(form.planEstudios, 120),
      planOtro: normalizeText_(form.planOtro, 200),
      observaciones: normalizeText_(form.observaciones, 1000)
    };
    validarSolicitudBasica_(data);
    if (data.orientacion === 'Otra' && !data.otraOrientacion) throw new Error('Aclarar la otra orientación.');
    if (data.planEstudios === 'Otro' && !data.planOtro) throw new Error('Aclarar el otro plan de estudios / año.');
    const materias = materiasDesdeFormulario_(form);
    validateBlob_(form.dniFrente, 'DNI frente');
    validateBlob_(form.dniDorso, 'DNI dorso');

    const root = DriveApp.getFolderById(config.requestsFolderId);
    folder = root.createFolder((id + ' - ' + data.dni + ' - ' + data.apellido + ' ' + data.nombre).replace(/[\\/:*?"<>|]/g, '_'));
    const frente = saveFile_(folder, form.dniFrente, '01 - DNI FRENTE');
    const dorso = saveFile_(folder, form.dniDorso, '02 - DNI DORSO');

    const orientacionGuardada = data.orientacion === 'Otra' ? 'Otra' : data.orientacion;
    const planGuardado = data.planEstudios === 'Otro' ? 'Otro / ' + data.planOtro : data.planEstudios;
    const row = [
      id, fechaRecepcion, 'PENDIENTE', data.apellido, data.nombre, data.dni, data.telefono, data.email,
      data.ultimoAnio, data.turno, data.anioEgreso, orientacionGuardada, data.otraOrientacion, planGuardado,
      materias[0] ? materias[0].anio : '', materias[0] ? materias[0].materia : '',
      materias[1] ? materias[1].anio : '', materias[1] ? materias[1].materia : '',
      materias[2] ? materias[2].anio : '', materias[2] ? materias[2].materia : '',
      frente.getUrl(), dorso.getUrl(), folder.getUrl(), data.observaciones, '', '', false, ''
    ];
    const sheet = getSheet_(config);
    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();
    sheet.getRange(rowNumber, 27).insertCheckboxes();
    try { enviarConfirmacion_(data.email, fechaRecepcion, id); } catch (mailError) { console.error(mailError); }
    return {ok:true, idSolicitud:id, message:'Tu solicitud fue recibida y quedó pendiente de revisión.'};
  } catch (error) {
    console.error(error);
    if (folder) { try { folder.setTrashed(true); } catch (cleanupError) { console.error(cleanupError); } }
    return {ok:false, message:error.message || 'No se pudo registrar la solicitud.'};
  } finally {
    lock.releaseLock();
  }
}

function leerSolicitudesConfirmadas_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, SOLICITUD_HEADERS.length).getValues();
  const out = [];
  values.forEach(function(row, offset) {
    const solicitud = {
      id: row[0], estado: row[2], apellido: row[3], nombre: row[4], dni: row[5], turno: row[9],
      orientacion: row[11] === 'Otra' && row[12] ? row[12] : row[11], confirmar: row[26] === true, sheetRow: offset + 2,
      materias: [
        {anio:String(row[14] || ''), materia:row[15]},
        {anio:String(row[16] || ''), materia:row[17]},
        {anio:String(row[18] || ''), materia:row[19]}
      ].filter(function(m) { return normalizeText_(m.anio, 10) && normalizeMateria_(m.materia); })
    };
    out.push(solicitud);
  });
  return out;
}

function getRegistrySheet_(ss) {
  let sheet = ss.getSheetByName(REGISTRY_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(REGISTRY_SHEET);
    sheet.getRange(1,1,1,ACTAS_REGISTRY_HEADERS.length).setValues([ACTAS_REGISTRY_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  return sheet;
}

function registryMap_(sheet) {
  const map = {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return map;
  const rows = sheet.getRange(2,1,lastRow - 1,ACTAS_REGISTRY_HEADERS.length).getValues();
  rows.forEach(function(r, i) {
    if (r[0]) map[String(r[0])] = {row:i + 2, claveGrupo:r[1], parte:r[2], idActa:r[3], docId:r[4], url:r[5], estado:r[7]};
  });
  return map;
}

function nextActaId_() {
  const props = PropertiesService.getScriptProperties();
  const year = new Date().getFullYear();
  const key = 'COMPLETA_ACTA_SEQ_' + year;
  const next = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(next));
  return 'CC-' + year + '-' + String(next).padStart(3, '0');
}

function actaFileName_(group, parte) {
  const suffix = parte > 1 ? ' - Parte ' + parte : '';
  return ('CC - ' + group.materia + ' - ' + group.anio + 'º - ' + group.orientacion + ' - ' + group.turno + suffix)
    .replace(/[\\/:*?"<>|]/g, '_').slice(0, 180);
}

function getOrCreateActa_(config, registrySheet, registry, group, parte) {
  const claveParte = group.clave + '|P' + parte;
  const existing = registry[claveParte];
  if (existing && existing.docId) {
    try {
      const file = DriveApp.getFileById(existing.docId);
      return {claveParte:claveParte, idActa:existing.idActa, docId:existing.docId, url:file.getUrl(), registryRow:existing.row};
    } catch (error) { console.error('Acta registrada no disponible; se recreará:', error); }
  }
  const idActa = nextActaId_();
  const targetFolder = DriveApp.getFolderById(config.actasFolderId);
  const template = DriveApp.getFileById(config.actaTemplateId);
  const copy = template.makeCopy(actaFileName_(group, parte), targetFolder);
  const url = copy.getUrl();
  registrySheet.appendRow([claveParte, group.clave, parte, idActa, copy.getId(), url, new Date(), 'ACTIVA']);
  const registryRow = registrySheet.getLastRow();
  registry[claveParte] = {row:registryRow, claveGrupo:group.clave, parte:parte, idActa:idActa, docId:copy.getId(), url:url, estado:'ACTIVA'};
  return {claveParte:claveParte, idActa:idActa, docId:copy.getId(), url:url, registryRow:registryRow};
}

function setCellText_(table, row, col, text) {
  table.getCell(row, col).setText(String(text == null ? '' : text));
}

function actualizarDocumentoActa_(acta, group, alumnos, config) {
  const doc = DocumentApp.openById(acta.docId);
  const body = doc.getBody();
  const tables = body.getTables();
  if (tables.length < 5) throw new Error('La plantilla de acta no tiene la estructura esperada.');

  setCellText_(tables[0], 0, 2, 'COMPLETA CARRERA\nACTA Nº ' + acta.idActa);
  setCellText_(tables[1], 0, 0, 'MES / INSTANCIA\n' + config.instancia);
  setCellText_(tables[1], 0, 1, 'AÑO\n' + new Date().getFullYear());
  setCellText_(tables[1], 0, 2, 'TURNO\n' + group.turno);
  setCellText_(tables[1], 0, 3, 'LIBRO / FOLIO\n' + config.libroFolio);
  setCellText_(tables[1], 1, 0, 'MATERIA\n' + group.materia);
  setCellText_(tables[1], 1, 1, 'AÑO DE LA MATERIA\n' + group.anio + 'º');
  setCellText_(tables[1], 1, 2, 'ORIENTACIÓN\n' + group.orientacion);
  setCellText_(tables[1], 1, 3, 'FECHA\n' + config.fechaActa);

  const studentTable = tables[2];
  for (let i = 0; i < MAX_ALUMNOS_ACTA; i++) {
    const rowIndex = i + 2;
    setCellText_(studentTable, rowIndex, 0, String(i + 1).padStart(2, '0'));
    setCellText_(studentTable, rowIndex, 1, '');
    setCellText_(studentTable, rowIndex, 2, '');
    setCellText_(studentTable, rowIndex, 3, '');
    setCellText_(studentTable, rowIndex, 4, '');
    setCellText_(studentTable, rowIndex, 5, '');
    if (alumnos[i]) {
      setCellText_(studentTable, rowIndex, 1, alumnos[i].apellido + ', ' + alumnos[i].nombre);
      setCellText_(studentTable, rowIndex, 2, alumnos[i].dni);
    }
  }
  setCellText_(tables[3], 0, 0, 'TOTAL ALUMNOS  ' + alumnos.length);
  setCellText_(tables[3], 0, 1, 'APROBADOS  ______');
  setCellText_(tables[3], 0, 2, 'DESAPROBADOS  ______');
  setCellText_(tables[3], 0, 3, 'AUSENTES  ______');
  doc.saveAndClose();
}

function sincronizarActas_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const config = getConfig_();
    const sheet = getSheet_(config);
    const ss = sheet.getParent();
    const solicitudes = leerSolicitudesConfirmadas_(sheet);
    const items = [];
    solicitudes.forEach(function(s) { Array.prototype.push.apply(items, expandirSolicitudParaActas_(s)); });
    const groups = agruparItemsActa_(items);
    const registrySheet = getRegistrySheet_(ss);
    const registry = registryMap_(registrySheet);
    const activePartKeys = {};
    const urlsByRow = {};

    Object.keys(groups).sort().forEach(function(groupKey) {
      const group = groups[groupKey];
      const chunks = dividirEnBloques_(group.alumnos, MAX_ALUMNOS_ACTA);
      chunks.forEach(function(alumnos, idx) {
        const parte = idx + 1;
        const acta = getOrCreateActa_(config, registrySheet, registry, group, parte);
        actualizarDocumentoActa_(acta, group, alumnos, config);
        activePartKeys[acta.claveParte] = true;
        registrySheet.getRange(acta.registryRow, 7, 1, 2).setValues([[new Date(), 'ACTIVA']]);
        alumnos.forEach(function(a) {
          if (!urlsByRow[a.sheetRow]) urlsByRow[a.sheetRow] = [];
          if (urlsByRow[a.sheetRow].indexOf(acta.url) === -1) urlsByRow[a.sheetRow].push(acta.url);
        });
      });
    });

    Object.keys(registry).forEach(function(key) {
      if (!activePartKeys[key] && registry[key].row) registrySheet.getRange(registry[key].row, 8).setValue('SIN ALUMNOS CONFIRMADOS');
    });

    solicitudes.forEach(function(s) {
      if (s.confirmar === true && normalizeText_(s.estado,30).toUpperCase() === 'APROBADA') {
        const urls = urlsByRow[s.sheetRow] || [];
        sheet.getRange(s.sheetRow, 28).setValue(urls.length ? 'EN ACTA: ' + urls.join(' | ') : 'SIN MATERIAS VÁLIDAS');
      } else if (s.confirmar === true) {
        sheet.getRange(s.sheetRow, 28).setValue('NO PROCESADA: cambiar Estado a APROBADA');
      } else {
        sheet.getRange(s.sheetRow, 28).clearContent();
      }
    });
    return {ok:true, grupos:Object.keys(groups).length, alumnos:items.length};
  } finally {
    lock.releaseLock();
  }
}

function alEditarSolicitudes(e) {
  try {
    if (!e || !e.range) return;
    const range = e.range;
    if (range.getRow() < 2) return;
    const config = getConfig_();
    const sheet = range.getSheet();
    if (sheet.getName() !== config.sheetName || sheet.getParent().getId() !== config.spreadsheetId) return;
    if (range.getColumn() !== 3 && range.getColumn() !== 27) return;
    sincronizarActas_();
  } catch (error) {
    console.error(error);
    try { if (e && e.range) e.range.getSheet().getRange(e.range.getRow(), 28).setValue('ERROR: ' + error.message); } catch (_) {}
  }
}
