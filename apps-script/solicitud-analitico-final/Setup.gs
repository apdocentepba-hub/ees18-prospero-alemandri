function configurarAnaliticoFinal(spreadsheetId, folderId) {
  const cleanSpreadsheetId = normalizeText_(spreadsheetId, 200);
  const cleanFolderId = normalizeText_(folderId, 200);
  if (!cleanSpreadsheetId || !cleanFolderId) {
    throw new Error('Debés indicar el ID de la planilla y el ID de la carpeta de Drive.');
  }

  SpreadsheetApp.openById(cleanSpreadsheetId);
  DriveApp.getFolderById(cleanFolderId);

  PropertiesService.getScriptProperties().setProperties({
    PENDING_SPREADSHEET_ID: cleanSpreadsheetId,
    PENDING_SHEET_NAME: 'Solicitudes',
    REQUESTS_FOLDER_ID: cleanFolderId
  }, false);

  prepararHojaSolicitudes();
  return 'Configuración guardada y hoja Solicitudes preparada.';
}

function prepararHojaSolicitudes() {
  const config = getConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.pendingSpreadsheetId);
  let sheet = spreadsheet.getSheetByName(config.pendingSheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(config.pendingSheetName);

  const hasData = sheet.getLastRow() > 1;
  const existing = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), SOLICITUD_HEADERS.length)).getDisplayValues()[0]
    : [];
  const firstRowHasValues = existing.some(function(value) { return String(value || '').trim() !== ''; });

  if (firstRowHasValues) {
    SOLICITUD_HEADERS.forEach(function(header, index) {
      if (String(existing[index] || '').trim() !== header) {
        throw new Error('La hoja ya tiene encabezados distintos en la columna ' + (index + 1) + '. No se modificó nada.');
      }
    });
    return 'La hoja Solicitudes ya estaba preparada.';
  }

  if (hasData) {
    throw new Error('La hoja contiene datos pero no tiene los encabezados esperados. No se modificó nada.');
  }

  sheet.getRange(1, 1, 1, SOLICITUD_HEADERS.length).setValues([SOLICITUD_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, SOLICITUD_HEADERS.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, SOLICITUD_HEADERS.length);
  return 'Hoja Solicitudes preparada.';
}
