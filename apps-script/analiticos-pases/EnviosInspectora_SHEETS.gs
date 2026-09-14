/**
 * EnviosInspectora.gs
 * EES 18 - Copias semanales de analíticos parciales en Google Sheets.
 *
 * FLUJO:
 * 1) Cuando en Seguimiento -> "Analítico realizado" se coloca "Sí",
 *    se completa "Fecha realización" con la fecha del momento si estaba vacía.
 * 2) Se mantiene intacto el Google Sheet original en PASES MARTIN.
 * 3) Se crea una COPIA del Google Sheet original en:
 *    PASES MARTIN / ENVÍOS SEMANALES A INSPECTORA / DD-MM-AAAA al DD-MM-AAAA
 * 4) No genera PDF.
 * 5) No duplica copias si ya existe una con el mismo nombre.
 */
const EI_SEGUIMIENTO_SPREADSHEET_ID = '11HEkLjvlrRe1w_86jnvLYvuyfS_QQdhHCGHN1el0WgM';
const EI_SEGUIMIENTO_SHEET_NAME = 'Seguimiento';
const EI_FIRST_DATA_ROW = 6;
const EI_COL_NOMBRE = 2;                 // B
const EI_COL_DNI = 3;                    // C
const EI_COL_ANALITICO_REALIZADO = 12;   // L
const EI_COL_FECHA_REALIZACION = 13;     // M
const EI_COL_REFERENCIA_ANALITICO = 32;  // AF
const EI_PASES_MARTIN_FOLDER_ID = '1V0kkz6RIEdYVBQq-AeHu9_Z58b1jPeDE';
const EI_ENVIOS_INSPECTORA_FOLDER_ID = '112j26i79ig8u-vGw9WEIw31jcNC1-wKz';
const EI_TIMEZONE = 'America/Argentina/Buenos_Aires';

function instalarAutomatizacionEnviosInspectora() {
  const ss = SpreadsheetApp.openById(EI_SEGUIMIENTO_SPREADSHEET_ID);
  const handlers = new Set(['alEditarEnviosInspectora_', 'sincronizarSemanaActualInspectora']);
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (handlers.has(trigger.getHandlerFunction())) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('alEditarEnviosInspectora_').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('sincronizarSemanaActualInspectora').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(17).inTimezone(EI_TIMEZONE).create();
  const semana = rangoSemanaLaboral_(fechaLocalActual_());
  const carpeta = obtenerOCrearCarpetaSemana_(semana.inicio, semana.fin);
  const resultado = { ok: true, carpetaSemana: carpeta.getName(), carpetaUrl: carpeta.getUrl(), mensaje: 'Automatización instalada para copias semanales en Google Sheets.' };
  Logger.log(JSON.stringify(resultado));
  return resultado;
}

function alEditarEnviosInspectora_(e) {
  if (!e || !e.range) return;
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== EI_SEGUIMIENTO_SHEET_NAME) return;
  if (sheet.getParent().getId() !== EI_SEGUIMIENTO_SPREADSHEET_ID) return;
  if (range.getRow() < EI_FIRST_DATA_ROW) return;
  const firstCol = range.getColumn();
  const lastCol = firstCol + range.getNumColumns() - 1;
  if (EI_COL_ANALITICO_REALIZADO < firstCol || EI_COL_ANALITICO_REALIZADO > lastCol) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const firstRow = range.getRow();
    const lastRow = firstRow + range.getNumRows() - 1;
    for (let row = firstRow; row <= lastRow; row++) procesarFilaInspectora_(row, false);
  } catch (err) {
    console.error('EnviosInspectora onEdit:', err && err.stack ? err.stack : err);
  } finally {
    lock.releaseLock();
  }
}

function sincronizarSemanaActualInspectora() {
  const semana = rangoSemanaLaboral_(fechaLocalActual_());
  return sincronizarRangoInspectora_(semana.inicio, semana.fin, false);
}

function regenerarSemanaActualInspectora() {
  const semana = rangoSemanaLaboral_(fechaLocalActual_());
  return sincronizarRangoInspectora_(semana.inicio, semana.fin, true);
}

function sincronizarSemanaDeFechaInspectora(fechaReferencia) {
  const fecha = fechaReferencia instanceof Date ? fechaReferencia : fechaLocalActual_();
  const semana = rangoSemanaLaboral_(fecha);
  return sincronizarRangoInspectora_(semana.inicio, semana.fin, false);
}

function sincronizarRangoInspectora_(inicio, fin, reemplazarExistentes) {
  const ss = SpreadsheetApp.openById(EI_SEGUIMIENTO_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EI_SEGUIMIENTO_SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja Seguimiento.');
  const lastRow = sheet.getLastRow();
  const resultado = { semana: nombreCarpetaSemana_(inicio, fin), creados: 0, existentes: 0, omitidos: 0, errores: [] };
  obtenerOCrearCarpetaSemana_(inicio, fin);
  for (let row = EI_FIRST_DATA_ROW; row <= lastRow; row++) {
    try {
      const r = procesarFilaInspectora_(row, reemplazarExistentes, inicio, fin);
      if (!r) continue;
      if (r.estado === 'creado') resultado.creados++;
      else if (r.estado === 'existente') resultado.existentes++;
      else resultado.omitidos++;
    } catch (err) {
      resultado.errores.push('Fila ' + row + ': ' + (err && err.message ? err.message : err));
    }
  }
  Logger.log(JSON.stringify(resultado));
  return resultado;
}

function procesarFilaInspectora_(row, reemplazarExistente, inicioFiltro, finFiltro) {
  const ss = SpreadsheetApp.openById(EI_SEGUIMIENTO_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EI_SEGUIMIENTO_SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja Seguimiento.');
  const values = sheet.getRange(row, 1, 1, EI_COL_REFERENCIA_ANALITICO).getValues()[0];
  const realizado = values[EI_COL_ANALITICO_REALIZADO - 1];
  if (!esSi_(realizado)) return { estado: 'omitido', motivo: 'No está marcado como realizado' };
  const nombre = String(values[EI_COL_NOMBRE - 1] || '').trim();
  const dni = String(values[EI_COL_DNI - 1] || '').trim();
  if (!nombre) return { estado: 'omitido', motivo: 'Sin nombre' };
  const fechaCell = sheet.getRange(row, EI_COL_FECHA_REALIZACION);
  let fecha = fechaCell.getValue();
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
    fecha = fechaLocalActual_();
    fechaCell.setValue(fecha).setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();
  }
  fecha = normalizarFechaLocal_(fecha);
  if (inicioFiltro && finFiltro && !fechaEnRango_(fecha, inicioFiltro, finFiltro)) return { estado: 'omitido', motivo: 'Fuera de la semana' };
  const semana = rangoSemanaLaboral_(fecha);
  const carpetaSemana = obtenerOCrearCarpetaSemana_(semana.inicio, semana.fin);
  const referencia = values[EI_COL_REFERENCIA_ANALITICO - 1];
  const sourceId = resolverAnaliticoId_(referencia, nombre);
  if (!sourceId) throw new Error('No se encontró el analítico original en PASES MARTIN para ' + nombre + '.');
  return copiarAnaliticoSheet_(sourceId, nombre, dni, carpetaSemana, !!reemplazarExistente);
}

function copiarAnaliticoSheet_(spreadsheetId, nombre, dni, carpetaSemana, reemplazarExistente) {
  const sourceFile = DriveApp.getFileById(spreadsheetId);
  if (sourceFile.getMimeType() !== MimeType.GOOGLE_SHEETS) throw new Error('El archivo original no es un Google Sheet: ' + sourceFile.getName());
  const copyName = nombreCopiaSheet_(nombre, dni);
  const existentes = carpetaSemana.getFilesByName(copyName);
  let habiaExistente = false;
  while (existentes.hasNext()) {
    const existente = existentes.next();
    habiaExistente = true;
    if (!reemplazarExistente) return { estado: 'existente', archivo: copyName, url: existente.getUrl() };
    existente.setTrashed(true);
  }
  const copia = sourceFile.makeCopy(copyName, carpetaSemana);
  return { estado: 'creado', reemplazo: habiaExistente, archivo: copyName, url: copia.getUrl() };
}

/** Prioridad: 1) Columna AF "Referencia analítico" 2) búsqueda por nombre en PASES MARTIN. */
function resolverAnaliticoId_(referencia, nombre) {
  const idRef = extraerIdDrive_(referencia);
  if (idRef) {
    try {
      const f = DriveApp.getFileById(idRef);
      if (f && f.getMimeType() === MimeType.GOOGLE_SHEETS) return idRef;
    } catch (err) {}
  }
  const folder = DriveApp.getFolderById(EI_PASES_MARTIN_FOLDER_ID);
  const files = folder.getFiles();
  const objetivo = normalizarNombreComparacion_(nombre);
  let mejorId = '';
  let mejorFecha = 0;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
    if (normalizarNombreComparacion_(file.getName()) !== objetivo) continue;
    const mod = file.getLastUpdated().getTime();
    if (mod >= mejorFecha) { mejorFecha = mod; mejorId = file.getId(); }
  }
  return mejorId;
}

function obtenerOCrearCarpetaSemana_(inicio, fin) {
  const root = DriveApp.getFolderById(EI_ENVIOS_INSPECTORA_FOLDER_ID);
  const nombre = nombreCarpetaSemana_(inicio, fin);
  const carpetas = root.getFoldersByName(nombre);
  return carpetas.hasNext() ? carpetas.next() : root.createFolder(nombre);
}
function nombreCopiaSheet_(nombre, dni) { return 'ANALITICO PARCIAL - ' + limpiarNombreArchivo_(nombre || 'SIN NOMBRE') + ' - ' + limpiarNombreArchivo_(dni || 'SIN DNI'); }
function limpiarNombreArchivo_(text) { return String(text).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim(); }
function fechaLocalActual_() { return normalizarFechaLocal_(new Date()); }
function normalizarFechaLocal_(date) {
  const yyyy = Number(Utilities.formatDate(date, EI_TIMEZONE, 'yyyy'));
  const mm = Number(Utilities.formatDate(date, EI_TIMEZONE, 'MM'));
  const dd = Number(Utilities.formatDate(date, EI_TIMEZONE, 'dd'));
  return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
}
function rangoSemanaLaboral_(fecha) {
  const base = new Date(fecha.getTime()); base.setHours(12, 0, 0, 0);
  const day = base.getDay(); const diasDesdeLunes = day === 0 ? 6 : day - 1;
  const inicio = new Date(base.getTime()); inicio.setDate(base.getDate() - diasDesdeLunes); inicio.setHours(12, 0, 0, 0);
  const fin = new Date(inicio.getTime()); fin.setDate(inicio.getDate() + 4); fin.setHours(12, 0, 0, 0);
  return { inicio, fin };
}
function fechaEnRango_(fecha, inicio, fin) {
  const f = new Date(fecha.getTime()), i = new Date(inicio.getTime()), e = new Date(fin.getTime());
  f.setHours(12, 0, 0, 0); i.setHours(12, 0, 0, 0); e.setHours(12, 0, 0, 0);
  return f.getTime() >= i.getTime() && f.getTime() <= e.getTime();
}
function nombreCarpetaSemana_(inicio, fin) { return formatearFechaCarpeta_(inicio) + ' al ' + formatearFechaCarpeta_(fin); }
function formatearFechaCarpeta_(date) { return String(date.getDate()).padStart(2, '0') + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + date.getFullYear(); }
function extraerIdDrive_(value) { const m = String(value || '').trim().match(/[-\w]{25,}/); return m ? m[0] : ''; }
function esSi_(value) { return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase() === 'SI'; }
function normalizarNombreComparacion_(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ').toUpperCase(); }

if (typeof module !== 'undefined' && module.exports) module.exports = { esSi_, rangoSemanaLaboral_, nombreCarpetaSemana_, extraerIdDrive_, nombreCopiaSheet_, fechaEnRango_ };
