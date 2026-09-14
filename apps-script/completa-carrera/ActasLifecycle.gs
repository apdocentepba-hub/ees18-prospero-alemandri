function vaciarDocumentoActa_(docId) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  const tables = body.getTables();
  if (tables.length < 4) throw new Error('El acta no tiene la estructura esperada.');
  const studentTable = tables[2];
  for (let i = 0; i < MAX_ALUMNOS_ACTA; i++) {
    const rowIndex = i + 2;
    studentTable.getCell(rowIndex, 0).setText(String(i + 1).padStart(2, '0'));
    for (let col = 1; col <= 5; col++) studentTable.getCell(rowIndex, col).setText('');
  }
  tables[3].getCell(0, 0).setText('TOTAL ALUMNOS  0');
  tables[3].getCell(0, 1).setText('APROBADOS  ______');
  tables[3].getCell(0, 2).setText('DESAPROBADOS  ______');
  tables[3].getCell(0, 3).setText('AUSENTES  ______');
  body.insertParagraph(0, 'ACTA SIN ALUMNOS CONFIRMADOS').setBold(true);
  doc.saveAndClose();
}

function limpiarActasSinConfirmados_() {
  const config = getConfig_();
  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  const registry = ss.getSheetByName(REGISTRY_SHEET);
  if (!registry || registry.getLastRow() < 2) return 0;
  const values = registry.getRange(2, 1, registry.getLastRow() - 1, ACTAS_REGISTRY_HEADERS.length).getValues();
  let cleared = 0;
  values.forEach(function(row, offset) {
    if (String(row[7] || '') !== 'SIN ALUMNOS CONFIRMADOS' || !row[4]) return;
    try {
      vaciarDocumentoActa_(String(row[4]));
      registry.getRange(offset + 2, 7).setValue(new Date());
      cleared++;
    } catch (error) {
      console.error('No se pudo vaciar acta ' + row[4] + ':', error);
    }
  });
  return cleared;
}

function alEditarCompletaCarrera(e) {
  alEditarSolicitudes(e);
  limpiarActasSinConfirmados_();
}
