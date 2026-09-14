/**
 * EES 18 — Solicitudes de analíticos -> Seguimiento.
 *
 * Pasa una solicitud cuando se cumplen LAS TRES validaciones:
 *   Vínculo EES18 = VERIFICADO
 *   Estado documentación = VALIDADA
 *   Aprobado para iniciar = Sí
 *
 * La escuela/localidad de destino son opcionales. El proceso es idempotente:
 * primero busca por ID solicitud y luego adopta una fila legacy por DNI si esa
 * fila aún no tiene otro ID de solicitud.
 */
const AS_SRC_ID = '1M8kLoW2IA6pu8z_IrFp8efe0BPWXcW4JqdQFSaK300Y';
const AS_SRC_SHEET = 'Solicitudes';
const AS_DST_ID = '11HEkLjvlrRe1w_86jnvLYvuyfS_QQdhHCGHN1el0WgM';
const AS_DST_SHEET = 'Seguimiento';
const AS_DST_FIRST_ROW = 6;
const AS_DST_TEMPLATE_ROW = 119;

function instalarSincronizacionAnaliticos() {
  const ss = SpreadsheetApp.openById(AS_SRC_ID);
  const handlers = new Set(['alEditarSolicitudesAnaliticos_', 'reconciliarSolicitudesAnaliticos']);
  ScriptApp.getProjectTriggers().forEach(t => {
    if (handlers.has(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('alEditarSolicitudesAnaliticos_').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('reconciliarSolicitudesAnaliticos').timeBased().everyMinutes(5).create();
  return reconciliarSolicitudesAnaliticos();
}

function alEditarSolicitudesAnaliticos_(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getParent().getId() !== AS_SRC_ID || sh.getName() !== AS_SRC_SHEET || e.range.getRow() < 2) return;
  const h = asHeaders_(sh, 1);
  const gateCols = ['Vínculo EES18', 'Estado documentación', 'Aprobado para iniciar'].map(x => h[x]);
  const c1 = e.range.getColumn();
  const c2 = c1 + e.range.getNumColumns() - 1;
  if (!gateCols.some(c => c >= c1 && c <= c2)) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // el reconciliador reintentará
  try {
    const r1 = e.range.getRow();
    const r2 = r1 + e.range.getNumRows() - 1;
    for (let r = r1; r <= r2; r++) asProcesarSolicitud_(sh, h, r);
  } finally {
    lock.releaseLock();
  }
}

function reconciliarSolicitudesAnaliticos() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, mensaje: 'Sincronización ocupada' };
  const out = { ok: true, revisadas: 0, sincronizadas: 0, omitidas: 0, errores: [] };
  try {
    const sh = SpreadsheetApp.openById(AS_SRC_ID).getSheetByName(AS_SRC_SHEET);
    if (!sh) throw new Error('No se encontró Solicitudes.');
    const h = asHeaders_(sh, 1);
    for (let r = 2; r <= sh.getLastRow(); r++) {
      out.revisadas++;
      const x = asProcesarSolicitud_(sh, h, r);
      if (x.estado === 'creado' || x.estado === 'actualizado') out.sincronizadas++;
      else if (x.estado === 'error') out.errores.push('Fila ' + r + ': ' + x.error);
      else out.omitidas++;
    }
    out.ok = out.errores.length === 0;
    Logger.log(JSON.stringify(out));
    return out;
  } finally {
    lock.releaseLock();
  }
}

function asProcesarSolicitud_(src, h, row) {
  try {
    const v = src.getRange(row, 1, 1, src.getLastColumn()).getValues()[0];
    const get = name => h[name] ? v[h[name] - 1] : '';
    const id = String(get('ID solicitud') || '').trim();
    if (!id) return { estado: 'omitido' };
    if (!asDebeSincronizar_(get('Vínculo EES18'), get('Estado documentación'), get('Aprobado para iniciar'))) {
      return { estado: 'omitido' };
    }

    const dni = asNormalizarDni_(get('DNI estudiante'));
    const nombre = asNombreCompleto_(get('Apellido estudiante'), get('Nombre estudiante'));
    if (!dni || !nombre) throw new Error('Falta DNI o nombre en ' + id + '.');

    const dst = SpreadsheetApp.openById(AS_DST_ID).getSheetByName(AS_DST_SHEET);
    if (!dst) throw new Error('No se encontró Seguimiento.');
    const dh = asHeaders_(dst, 5);
    const match = asBuscarDestino_(dst, dh, id, dni);
    const dstRow = match.row || asPrimeraLibre_(dst, dh['Apellido y nombre']);
    if (!match.row) asPrepararFila_(dst, dstRow);

    const setMissing = (header, value) => {
      const cell = dst.getRange(dstRow, dh[header]);
      if (!match.row || !String(cell.getDisplayValue() || '').trim()) cell.setValue(value);
    };

    setMissing('Apellido y nombre', nombre);
    setMissing('DNI', Number(dni));
    setMissing('Escuela destino', asDestino_(get('Institución / lugar de presentación')));
    setMissing('Localidad', asDestino_(get('Localidad destino')));
    ['Fotocopia DNI', 'Partida nacimiento', 'Pase a otra escuela', 'Ficha datos personales']
      .forEach(x => setMissing(x, 'Sí'));

    dst.getRange(dstRow, dh['ID solicitud']).setValue(id);
    const ref = String(get('Referencia seguimiento') || '').trim();
    if (ref) dst.getRange(dstRow, dh['Referencia analítico']).setValue(ref);
    dst.getRange(dstRow, dh['Fecha sincronización']).setValue(new Date()).setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();

    const verifyId = String(dst.getRange(dstRow, dh['ID solicitud']).getDisplayValue() || '').trim();
    const verifyDni = asNormalizarDni_(dst.getRange(dstRow, dh['DNI']).getDisplayValue());
    if (verifyId !== id || verifyDni !== dni) throw new Error('Falló la verificación posterior de la fila ' + dstRow + '.');

    src.getRange(row, h['Pasado a seguimiento']).setValue('Sí');
    if (h['Fecha última actualización']) src.getRange(row, h['Fecha última actualización']).setValue(new Date());
    asLimpiarError_(src, h, row);
    SpreadsheetApp.flush();
    return { estado: match.row ? 'actualizado' : 'creado', fila: dstRow, por: match.by || 'nueva' };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (h['Pasado a seguimiento']) src.getRange(row, h['Pasado a seguimiento']).setValue('No');
    if (h['Fecha última actualización']) src.getRange(row, h['Fecha última actualización']).setValue(new Date());
    asError_(src, h, row, msg);
    console.error('Sync analíticos fila ' + row + ': ' + msg);
    return { estado: 'error', error: msg };
  }
}

function asBuscarDestino_(sh, h, id, dni) {
  const n = Math.max(0, sh.getLastRow() - AS_DST_FIRST_ROW + 1);
  if (!n) return { row: 0, by: '' };
  const ids = sh.getRange(AS_DST_FIRST_ROW, h['ID solicitud'], n, 1).getDisplayValues();
  for (let i = 0; i < n; i++) if (String(ids[i][0] || '').trim() === id) return { row: AS_DST_FIRST_ROW + i, by: 'id' };

  const dnis = sh.getRange(AS_DST_FIRST_ROW, h['DNI'], n, 1).getDisplayValues();
  for (let i = 0; i < n; i++) {
    if (asNormalizarDni_(dnis[i][0]) !== dni) continue;
    const otherId = String(ids[i][0] || '').trim();
    if (!otherId || otherId === id) return { row: AS_DST_FIRST_ROW + i, by: 'dni-legacy' };
  }
  return { row: 0, by: '' };
}

function asPrimeraLibre_(sh, nameCol) {
  const n = sh.getMaxRows() - AS_DST_FIRST_ROW + 1;
  const values = sh.getRange(AS_DST_FIRST_ROW, nameCol, n, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (!String(values[i][0] || '').trim()) return AS_DST_FIRST_ROW + i;
  sh.insertRowsAfter(sh.getMaxRows(), 1);
  return sh.getMaxRows();
}

function asPrepararFila_(sh, row) {
  const src = sh.getRange(Math.min(AS_DST_TEMPLATE_ROW, sh.getMaxRows()), 1, 1, sh.getLastColumn());
  const dst = sh.getRange(row, 1, 1, sh.getLastColumn());
  src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
}

function asHeaders_(sh, row) {
  const a = sh.getRange(row, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const h = {};
  a.forEach((x, i) => { const k = String(x || '').trim(); if (k) h[k] = i + 1; });
  return h;
}

function asError_(sh, h, row, msg) {
  if (!h['Observación interna']) return;
  const cell = sh.getRange(row, h['Observación interna']);
  const prefix = 'ERROR SINCRONIZACIÓN: ';
  const old = String(cell.getDisplayValue() || '').split('\n').filter(x => x.indexOf(prefix) !== 0).join('\n').trim();
  cell.setValue((old ? old + '\n' : '') + prefix + String(msg).slice(0, 500));
}

function asLimpiarError_(sh, h, row) {
  if (!h['Observación interna']) return;
  const cell = sh.getRange(row, h['Observación interna']);
  const prefix = 'ERROR SINCRONIZACIÓN: ';
  const old = String(cell.getDisplayValue() || '');
  if (old.indexOf(prefix) < 0) return;
  cell.setValue(old.split('\n').filter(x => x.indexOf(prefix) !== 0).join('\n').trim());
}

function asDebeSincronizar_(vinculo, estadoDoc, aprobado) {
  return asNorm_(vinculo) === 'VERIFICADO' && asNorm_(estadoDoc) === 'VALIDADA' && asNorm_(aprobado) === 'SI';
}
function asNorm_(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase(); }
function asNormalizarDni_(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function asNombreCompleto_(a, n) { return (String(a || '').trim() + ' ' + String(n || '').trim()).replace(/\s+/g, ' ').trim().toUpperCase(); }
function asDestino_(v) { const x = String(v == null ? '' : v).trim(); return x || '-'; }

if (typeof module !== 'undefined' && module.exports) module.exports = { asDebeSincronizar_, asNorm_, asNormalizarDni_, asNombreCompleto_, asDestino_ };
