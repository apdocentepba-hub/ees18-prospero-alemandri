function configurarCompletaCarrera(spreadsheetId, requestsFolderId, actaTemplateId, actasFolderId) {
  const cleanSpreadsheetId = normalizeText_(spreadsheetId, 200);
  const cleanRequestsFolderId = normalizeText_(requestsFolderId, 200);
  const cleanActaTemplateId = normalizeText_(actaTemplateId, 200);
  const cleanActasFolderId = normalizeText_(actasFolderId, 200);
  if (!cleanSpreadsheetId || !cleanRequestsFolderId || !cleanActaTemplateId || !cleanActasFolderId) {
    throw new Error('Faltan IDs de configuración.');
  }

  SpreadsheetApp.openById(cleanSpreadsheetId);
  DriveApp.getFolderById(cleanRequestsFolderId);
  DriveApp.getFileById(cleanActaTemplateId);
  DriveApp.getFolderById(cleanActasFolderId);

  PropertiesService.getScriptProperties().setProperties({
    COMPLETA_SPREADSHEET_ID: cleanSpreadsheetId,
    COMPLETA_SHEET_NAME: 'Solicitudes',
    COMPLETA_REQUESTS_FOLDER_ID: cleanRequestsFolderId,
    COMPLETA_ACTA_TEMPLATE_ID: cleanActaTemplateId,
    COMPLETA_ACTAS_FOLDER_ID: cleanActasFolderId
  }, false);

  prepararHojaCompletaCarrera_();
  instalarTriggerConfirmacion_();
  return 'Completa Carrera configurado. Hoja y trigger preparados.';
}

function prepararHojaCompletaCarrera_() {
  const config = getConfig_();
  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = ss.getSheetByName(config.sheetName);
  if (!sheet) throw new Error('No existe la pestaña Solicitudes.');

  const headers = sheet.getRange(1, 1, 1, SOLICITUD_HEADERS.length).getDisplayValues()[0];
  SOLICITUD_HEADERS.forEach(function(header, index) {
    if (String(headers[index] || '').trim() !== header) {
      throw new Error('Encabezado inválido en columna ' + (index + 1) + ': se esperaba “' + header + '”.');
    }
  });

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, SOLICITUD_HEADERS.length).setFontWeight('bold').setWrap(true);
  sheet.getRange(2, 3, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['PENDIENTE', 'APROBADA', 'OBSERVADA', 'RECHAZADA'], true)
      .setAllowInvalid(false)
      .build()
  );
  sheet.getRange(2, 27, Math.max(sheet.getMaxRows() - 1, 1), 1).insertCheckboxes();
  getRegistrySheet_(ss);
  return 'Hoja Solicitudes verificada.';
}

function instalarTriggerConfirmacion_() {
  const config = getConfig_();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'alEditarCompletaCarrera') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('alEditarCompletaCarrera')
    .forSpreadsheet(config.spreadsheetId)
    .onEdit()
    .create();
  return 'Trigger instalado.';
}

function configurarDatosActa(instancia, fecha, libroFolio) {
  PropertiesService.getScriptProperties().setProperties({
    COMPLETA_ACTA_INSTANCIA: normalizeText_(instancia || 'A completar', 120),
    COMPLETA_ACTA_FECHA: normalizeText_(fecha || 'A completar', 80),
    COMPLETA_LIBRO_FOLIO: normalizeText_(libroFolio || 'A completar', 120)
  }, false);
  const result = sincronizarActas_();
  limpiarActasSinConfirmados_();
  return result;
}
