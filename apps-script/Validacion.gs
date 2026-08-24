function evaluarPosibleDuplicado_(pending, dni) {
  requireHeaders_(pending.index, ['DNI estudiante', 'Estado revisión']);
  const lastRow = pending.sheet.getLastRow();
  if (lastRow < pending.dataStartRow) return false;
  const rows = pending.sheet
    .getRange(pending.dataStartRow, 1, lastRow - pending.dataStartRow + 1, pending.headers.length)
    .getDisplayValues();
  let coincidencias = 0;
  rows.forEach(function(row) {
    const currentDni = String(row[pending.index['DNI estudiante']] || '').replace(/\D/g, '');
    if (currentDni === dni) coincidencias += 1;
  });
  // La columna de la planilla también lo calcula por fórmula; este control sirve
  // para procesos internos y futuras automatizaciones del panel de Secretaría.
  return coincidencias > 0 ? 'POSIBLE DUPLICADO' : '';
}

function registrarValidacionSolicitud(rowIndex, datos) {
  const config = getConfig_();
  const pending = getSheetAndHeaders_(config.pendingSpreadsheetId, config.pendingSheetName, 1);
  requireHeaders_(pending.index, [
    'Estado revisión', 'Vínculo EES18', 'Estado documentación',
    'Fuente verificación EES18', 'Fecha verificación EES18',
    'Responsable revisión', 'Fecha última actualización'
  ]);

  const rowNumber = Number(rowIndex);
  if (!rowNumber || rowNumber < pending.dataStartRow || rowNumber > pending.sheet.getLastRow()) {
    throw new Error('Fila de solicitud inválida.');
  }

  const input = datos || {};
  const vinculo = normalizeText_(input.vinculoEES18, 40).toUpperCase();
  const documentacion = normalizeText_(input.estadoDocumentacion, 40).toUpperCase();
  const fuente = normalizeText_(input.fuenteVerificacion, 240);
  const responsable = normalizeText_(input.responsable, 160);
  const observacion = normalizeText_(input.observacion, 600);

  const vinculosPermitidos = ['PENDIENTE', 'VERIFICADO', 'NO ENCONTRADO', 'REVISAR'];
  const documentosPermitidos = ['PENDIENTE', 'VALIDADA', 'INCOMPLETA', 'OBSERVADA'];
  if (vinculosPermitidos.indexOf(vinculo) === -1) throw new Error('Estado de vínculo no válido.');
  if (documentosPermitidos.indexOf(documentacion) === -1) throw new Error('Estado de documentación no válido.');
  if (!responsable) throw new Error('Debe indicarse quién realizó la revisión.');

  function set(header, value) {
    if (pending.index[header] === undefined) return;
    pending.sheet.getRange(rowNumber, pending.index[header] + 1).setValue(value);
  }

  set('Vínculo EES18', vinculo);
  set('Estado documentación', documentacion);
  set('Fuente verificación EES18', fuente);
  set('Responsable revisión', responsable);
  set('Fecha última actualización', new Date());
  if (vinculo === 'VERIFICADO') set('Fecha verificación EES18', new Date());
  if (observacion && pending.index['Observación interna'] !== undefined) set('Observación interna', observacion);

  let revision = 'EN REVISION';
  if (vinculo === 'NO ENCONTRADO' || vinculo === 'REVISAR') revision = 'OBSERVADA';
  if (documentacion === 'INCOMPLETA' || documentacion === 'OBSERVADA') revision = 'OBSERVADA';
  if (vinculo === 'VERIFICADO' && documentacion === 'VALIDADA') revision = 'LISTA PARA APROBAR';
  set('Estado revisión', revision);

  // Esta función NO cambia "Aprobado para iniciar". La aprobación final sigue siendo manual.
  return {
    ok: true,
    fila: rowNumber,
    estadoRevision: revision,
    listoParaAprobar: revision === 'LISTA PARA APROBAR'
  };
}
