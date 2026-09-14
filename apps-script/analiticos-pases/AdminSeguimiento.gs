/**
 * EES 18 — Solicitudes de analíticos -> Seguimiento + Libro/Folio.
 *
 * Reglas:
 * 1) Pasa una solicitud cuando se cumplen LAS TRES validaciones:
 *    Vínculo EES18 = VERIFICADO
 *    Estado documentación = VALIDADA
 *    Aprobado para iniciar = Sí
 * 2) Escuela/localidad destino son opcionales.
 * 3) El proceso es idempotente: busca por ID solicitud y luego adopta una fila
 *    legacy por DNI solo si no pertenece a otra solicitud.
 * 4) Si el analítico individual tiene Libro/Folio, se concilia automáticamente
 *    contra Indice_Libros_Matrices y se refleja también en Seguimiento.
 * 5) Un conflicto de DNI o Libro/Folio NUNCA se pisa en silencio.
 */
const AS_SRC_ID = '1M8kLoW2IA6pu8z_IrFp8efe0BPWXcW4JqdQFSaK300Y';
const AS_SRC_SHEET = 'Solicitudes';
const AS_DST_ID = '11HEkLjvlrRe1w_86jnvLYvuyfS_QQdhHCGHN1el0WgM';
const AS_DST_SHEET = 'Seguimiento';
const AS_DST_FIRST_ROW = 6;
const AS_DST_TEMPLATE_ROW = 120;

const AS_INDICE_ID = '1mk0dwCcPYORU4YdOL6QN9taAdkqdtlo5fCVnT7g2-TI';
const AS_INDICE_SHEET = 'Índice';
const AS_ANALITICO_SHEET = 'Analítico';
const AS_ANALITICO_LIBRO_CELL = 'D132';
const AS_ANALITICO_FOLIO_CELL = 'G132';
const AS_LF_PREFIX = 'AVISO LIBRO/FOLIO: ';
const AS_SYNC_PREFIX = 'ERROR SINCRONIZACIÓN: ';

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
  const gateCols = ['Vínculo EES18', 'Estado documentación', 'Aprobado para iniciar'].map(x => h[x]).filter(Boolean);
  const c1 = e.range.getColumn();
  const c2 = c1 + e.range.getNumColumns() - 1;
  if (!gateCols.some(c => c >= c1 && c <= c2)) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const r1 = e.range.getRow();
    const r2 = r1 + e.range.getNumRows() - 1;
    for (let r = r1; r <= r2; r++) asProcesarSolicitud_(sh, h, r);
    asReconciliarLibrosFolios_(sh, h, r1, r2);
  } finally {
    lock.releaseLock();
  }
}

function reconciliarSolicitudesAnaliticos() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, mensaje: 'Sincronización ocupada' };
  const out = { ok: true, revisadas: 0, sincronizadas: 0, omitidas: 0, errores: [], librosFolios: null };
  try {
    const sh = SpreadsheetApp.openById(AS_SRC_ID).getSheetByName(AS_SRC_SHEET);
    if (!sh) throw new Error('No se encontró Solicitudes.');
    const h = asHeaders_(sh, 1);
    const last = asUltimaFilaSolicitud_(sh, h['ID solicitud']);

    for (let r = 2; r <= last; r++) {
      out.revisadas++;
      const x = asProcesarSolicitud_(sh, h, r);
      if (x.estado === 'creado' || x.estado === 'actualizado') out.sincronizadas++;
      else if (x.estado === 'error') out.errores.push('Fila ' + r + ': ' + x.error);
      else out.omitidas++;
    }

    out.librosFolios = asReconciliarLibrosFolios_(sh, h, 2, last);
    if (out.librosFolios && out.librosFolios.errores && out.librosFolios.errores.length) {
      out.errores = out.errores.concat(out.librosFolios.errores);
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
    const dstRow = match.row || asPrimeraLibre_(dst, dh['Apellido y nombre'], dh['ID solicitud']);
    if (!match.row) asPrepararFila_(dst, dstRow);

    const setMissing = (header, value) => {
      if (!dh[header]) return;
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
    if (ref && dh['Referencia analítico']) dst.getRange(dstRow, dh['Referencia analítico']).setValue(ref);
    if (dh['Fecha sincronización']) dst.getRange(dstRow, dh['Fecha sincronización']).setValue(new Date()).setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();

    const verifyId = String(dst.getRange(dstRow, dh['ID solicitud']).getDisplayValue() || '').trim();
    const verifyDni = asNormalizarDni_(dst.getRange(dstRow, dh['DNI']).getDisplayValue());
    if (verifyId !== id || verifyDni !== dni) throw new Error('Falló la verificación posterior de la fila ' + dstRow + '.');

    if (h['Pasado a seguimiento']) src.getRange(row, h['Pasado a seguimiento']).setValue('Sí');
    if (h['Fecha última actualización']) src.getRange(row, h['Fecha última actualización']).setValue(new Date());
    asLimpiarLineaPrefijo_(src, h, row, AS_SYNC_PREFIX);
    SpreadsheetApp.flush();
    return { estado: match.row ? 'actualizado' : 'creado', fila: dstRow, por: match.by || 'nueva' };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (h['Pasado a seguimiento']) src.getRange(row, h['Pasado a seguimiento']).setValue('No');
    if (h['Fecha última actualización']) src.getRange(row, h['Fecha última actualización']).setValue(new Date());
    asAgregarLineaPrefijo_(src, h, row, AS_SYNC_PREFIX, msg);
    console.error('Sync analíticos fila ' + row + ': ' + msg);
    return { estado: 'error', error: msg };
  }
}

function asReconciliarLibrosFolios_(src, h, firstRow, lastRow) {
  const out = { revisadas: 0, sinDatos: 0, sincronizadas: 0, conflictos: 0, errores: [] };
  if (lastRow < firstRow) return out;

  const dst = SpreadsheetApp.openById(AS_DST_ID).getSheetByName(AS_DST_SHEET);
  const indice = SpreadsheetApp.openById(AS_INDICE_ID).getSheetByName(AS_INDICE_SHEET);
  if (!dst || !indice) throw new Error('No se pudo abrir Seguimiento o Índice de Matrices.');
  const dh = asHeaders_(dst, 5);
  const ctx = asCargarContextoIndice_(indice);

  const n = lastRow - firstRow + 1;
  const data = src.getRange(firstRow, 1, n, src.getLastColumn()).getValues();
  data.forEach((v, offset) => {
    const row = firstRow + offset;
    const get = name => h[name] ? v[h[name] - 1] : '';
    if (!asDebeSincronizar_(get('Vínculo EES18'), get('Estado documentación'), get('Aprobado para iniciar'))) return;

    const id = String(get('ID solicitud') || '').trim();
    const dni = asNormalizarDni_(get('DNI estudiante'));
    const nombre = asNombreCompleto_(get('Apellido estudiante'), get('Nombre estudiante'));
    const ref = String(get('Referencia seguimiento') || '').trim();
    if (!id || !dni || !ref) return;
    out.revisadas++;

    try {
      const analiticoId = asExtraerIdDrive_(ref);
      if (!analiticoId) throw new Error('Referencia analítico inválida.');
      const a = SpreadsheetApp.openById(analiticoId).getSheetByName(AS_ANALITICO_SHEET);
      if (!a) throw new Error('El archivo no tiene hoja "' + AS_ANALITICO_SHEET + '".');
      const libro = String(a.getRange(AS_ANALITICO_LIBRO_CELL).getDisplayValue() || '').trim();
      const folio = String(a.getRange(AS_ANALITICO_FOLIO_CELL).getDisplayValue() || '').trim();

      if (!libro && !folio) {
        out.sinDatos++;
        asLimpiarLineaPrefijo_(src, h, row, AS_LF_PREFIX);
        return;
      }
      if (!libro || !folio) {
        const msg = 'Libro/Folio incompleto en ' + id + ': ' + (libro || '—') + '/' + (folio || '—');
        asAgregarLineaPrefijo_(src, h, row, AS_LF_PREFIX, msg);
        out.conflictos++;
        return;
      }

      const idx = asAplicarLibroFolioIndice_(indice, ctx, { id, dni, nombre, libro, folio });
      if (!idx.ok) {
        asAgregarLineaPrefijo_(src, h, row, AS_LF_PREFIX, idx.mensaje);
        asMarcarErrorSeguimientoLibroFolio_(dst, dh, id, idx.mensaje);
        out.conflictos++;
        return;
      }

      const dstRow = asBuscarFilaSeguimientoPorId_(dst, dh, id);
      if (!dstRow) throw new Error('No se encontró la fila de Seguimiento para ' + id + '.');
      dst.getRange(dstRow, dh['Libro']).setValue(libro);
      dst.getRange(dstRow, dh['Folio']).setValue(folio);
      asLimpiarErrorSeguimientoLibroFolio_(dst, dh, dstRow);
      asLimpiarLineaPrefijo_(src, h, row, AS_LF_PREFIX);
      out.sincronizadas++;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      asAgregarLineaPrefijo_(src, h, row, AS_LF_PREFIX, msg);
      out.errores.push('Libro/Folio fila ' + row + ': ' + msg);
    }
  });

  SpreadsheetApp.flush();
  return out;
}

function asCargarContextoIndice_(sh) {
  const last = Math.max(sh.getLastRow(), 1);
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 9).getDisplayValues() : [];
  const ctx = { rows, porDni: new Map(), porLf: new Map() };
  rows.forEach((r, i) => {
    const row = i + 2;
    const dni = asNormalizarDni_(r[1]);
    const lf = asClaveLibroFolio_(r[2], r[3]);
    const obj = { row, values: r };
    if (dni) {
      if (!ctx.porDni.has(dni)) ctx.porDni.set(dni, []);
      ctx.porDni.get(dni).push(obj);
    }
    if (lf) {
      if (!ctx.porLf.has(lf)) ctx.porLf.set(lf, []);
      ctx.porLf.get(lf).push(obj);
    }
  });
  return ctx;
}

function asAplicarLibroFolioIndice_(sh, ctx, x) {
  const lf = asClaveLibroFolio_(x.libro, x.folio);
  const porLf = (ctx.porLf.get(lf) || []).filter(r => asNormalizarDni_(r.values[1]) !== x.dni);
  if (porLf.length) {
    const ajeno = porLf.map(r => (r.values[0] || 'sin nombre') + ' DNI ' + (r.values[1] || '—')).join(' / ');
    return { ok: false, mensaje: 'Libro/Folio ' + x.libro + '/' + x.folio + ' ya pertenece a ' + ajeno + '.' };
  }

  const porDni = ctx.porDni.get(x.dni) || [];
  if (porDni.length > 1) {
    return { ok: false, mensaje: 'DNI ' + x.dni + ' aparece más de una vez en el Índice; no se modifica automáticamente.' };
  }

  if (porDni.length === 1) {
    const hit = porDni[0];
    const libroActual = String(hit.values[2] || '').trim();
    const folioActual = String(hit.values[3] || '').trim();
    const libroConf = libroActual && libroActual !== String(x.libro);
    const folioConf = folioActual && folioActual !== String(x.folio);
    if (libroConf || folioConf) {
      const msg = 'Conflicto para DNI ' + x.dni + ': Índice ' + (libroActual || '—') + '/' + (folioActual || '—') +
        ' vs analítico ' + x.libro + '/' + x.folio + '.';
      sh.getRange(hit.row, 5, 1, 5).setValues([[
        x.nombre, x.dni, x.libro, x.folio, asUnirObservacion_(hit.values[8], msg)
      ]]);
      return { ok: false, mensaje: msg };
    }

    if (!libroActual) sh.getRange(hit.row, 3).setValue(x.libro);
    if (!folioActual) sh.getRange(hit.row, 4).setValue(x.folio);
    hit.values[2] = x.libro;
    hit.values[3] = x.folio;
    if (!ctx.porLf.has(lf)) ctx.porLf.set(lf, []);
    if (!ctx.porLf.get(lf).some(r => r.row === hit.row)) ctx.porLf.get(lf).push(hit);
    return { ok: true, accion: (!libroActual || !folioActual) ? 'completado' : 'sin-cambios', row: hit.row };
  }

  const newRow = Math.max(sh.getLastRow() + 1, 2);
  sh.getRange(newRow, 1, 1, 4).setValues([[x.nombre, x.dni, x.libro, x.folio]]);
  const values = [x.nombre, x.dni, x.libro, x.folio, '', '', '', '', ''];
  const obj = { row: newRow, values };
  ctx.rows.push(values);
  ctx.porDni.set(x.dni, [obj]);
  if (!ctx.porLf.has(lf)) ctx.porLf.set(lf, []);
  ctx.porLf.get(lf).push(obj);
  return { ok: true, accion: 'creado', row: newRow };
}

function asBuscarFilaSeguimientoPorId_(sh, h, id) {
  const col = h['ID solicitud'];
  if (!col || sh.getLastRow() < AS_DST_FIRST_ROW) return 0;
  const n = sh.getLastRow() - AS_DST_FIRST_ROW + 1;
  const ids = sh.getRange(AS_DST_FIRST_ROW, col, n, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === id) return AS_DST_FIRST_ROW + i;
  }
  return 0;
}

function asMarcarErrorSeguimientoLibroFolio_(sh, h, id, msg) {
  const row = asBuscarFilaSeguimientoPorId_(sh, h, id);
  if (!row || !h['Tiene error'] || !h['Detalle / corrección']) return;
  const detalle = sh.getRange(row, h['Detalle / corrección']);
  const actual = String(detalle.getDisplayValue() || '').trim();
  if (actual && !actual.startsWith('LIBRO/FOLIO:')) return;
  sh.getRange(row, h['Tiene error']).setValue('Sí');
  detalle.setValue('LIBRO/FOLIO: ' + msg);
}

function asLimpiarErrorSeguimientoLibroFolio_(sh, h, row) {
  if (!h['Tiene error'] || !h['Detalle / corrección']) return;
  const detalle = sh.getRange(row, h['Detalle / corrección']);
  const actual = String(detalle.getDisplayValue() || '').trim();
  if (!actual.startsWith('LIBRO/FOLIO:')) return;
  detalle.clearContent();
  sh.getRange(row, h['Tiene error']).clearContent();
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

function asPrimeraLibre_(sh, nameCol, idCol) {
  const n = sh.getMaxRows() - AS_DST_FIRST_ROW + 1;
  const names = sh.getRange(AS_DST_FIRST_ROW, nameCol, n, 1).getDisplayValues();
  const ids = idCol ? sh.getRange(AS_DST_FIRST_ROW, idCol, n, 1).getDisplayValues() : [];
  for (let i = 0; i < names.length; i++) {
    const nameEmpty = !String(names[i][0] || '').trim();
    const idEmpty = !idCol || !String(ids[i][0] || '').trim();
    if (nameEmpty && idEmpty) return AS_DST_FIRST_ROW + i;
  }
  sh.insertRowsAfter(sh.getMaxRows(), 1);
  return sh.getMaxRows();
}

function asPrepararFila_(sh, row) {
  const templateRow = Math.min(AS_DST_TEMPLATE_ROW, sh.getMaxRows());
  const src = sh.getRange(templateRow, 1, 1, sh.getLastColumn());
  const dst = sh.getRange(row, 1, 1, sh.getLastColumn());

  dst.clearContent();
  src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);

  const formulas = src.getFormulasR1C1()[0];
  formulas.forEach((formula, idx) => {
    if (formula) dst.getCell(1, idx + 1).setFormulaR1C1(formula);
  });
}

function asHeaders_(sh, row) {
  const a = sh.getRange(row, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const h = {};
  a.forEach((x, i) => { const k = String(x || '').trim(); if (k) h[k] = i + 1; });
  return h;
}

function asUltimaFilaSolicitud_(sh, idCol) {
  if (!idCol || sh.getLastRow() < 2) return 1;
  const n = sh.getLastRow() - 1;
  const ids = sh.getRange(2, idCol, n, 1).getDisplayValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0] || '').trim()) return i + 2;
  }
  return 1;
}

function asAgregarLineaPrefijo_(sh, h, row, prefix, msg) {
  if (!h['Observación interna']) return;
  const cell = sh.getRange(row, h['Observación interna']);
  const old = String(cell.getDisplayValue() || '')
    .split('\n').filter(x => x.indexOf(prefix) !== 0).join('\n').trim();
  cell.setValue((old ? old + '\n' : '') + prefix + String(msg).slice(0, 700));
}

function asLimpiarLineaPrefijo_(sh, h, row, prefix) {
  if (!h['Observación interna']) return;
  const cell = sh.getRange(row, h['Observación interna']);
  const old = String(cell.getDisplayValue() || '');
  if (old.indexOf(prefix) < 0) return;
  cell.setValue(old.split('\n').filter(x => x.indexOf(prefix) !== 0).join('\n').trim());
}

function asUnirObservacion_(old, msg) {
  const a = String(old || '').trim();
  if (!a) return msg;
  if (a.indexOf(msg) >= 0) return a;
  return a + ' | ' + msg;
}

function asDebeSincronizar_(vinculo, estadoDoc, aprobado) {
  return asNorm_(vinculo) === 'VERIFICADO' && asNorm_(estadoDoc) === 'VALIDADA' && asNorm_(aprobado) === 'SI';
}
function asNorm_(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase(); }
function asNormalizarDni_(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function asNombreCompleto_(a, n) { return (String(a || '').trim() + ' ' + String(n || '').trim()).replace(/\s+/g, ' ').trim().toUpperCase(); }
function asDestino_(v) { const x = String(v == null ? '' : v).trim(); return x || '-'; }
function asExtraerIdDrive_(v) { const m = String(v || '').trim().match(/[-\w]{25,}/); return m ? m[0] : ''; }
function asClaveLibroFolio_(l, f) { l = String(l || '').trim(); f = String(f || '').trim(); return l && f ? l + '|' + f : ''; }

if (typeof module !== 'undefined' && module.exports) module.exports = {
  asDebeSincronizar_, asNorm_, asNormalizarDni_, asNombreCompleto_, asDestino_,
  asExtraerIdDrive_, asClaveLibroFolio_, asUnirObservacion_
};
