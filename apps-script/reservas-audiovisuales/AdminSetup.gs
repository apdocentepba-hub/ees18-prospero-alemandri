var RESERVAS_EXTRA_COLUMNS_ = Object.freeze([
  'ID grupo',
  'Módulos',
  'Tipo correo',
  'Hash cancelación',
  'Fecha cancelación',
  'Estado sincronización',
  'Último error sincronización'
]);

function ensureReservationColumns_() {
  var sheet = getRequiredSheet_(RESERVAS_SETTINGS_.RESERVAS_SHEET);
  var lastColumn = sheet.getLastColumn();
  var headers = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];
  var headerMap = buildHeaderMap_(headers);
  var missing = [];

  for (var i = 0; i < RESERVAS_EXTRA_COLUMNS_.length; i += 1) {
    if (typeof headerMap[normalizeHeader_(RESERVAS_EXTRA_COLUMNS_[i])] !== 'number') {
      missing.push(RESERVAS_EXTRA_COLUMNS_[i]);
    }
  }

  if (missing.length > 0) {
    sheet.getRange(1, lastColumn + 1, 1, missing.length).setValues([missing]);
  }

  return missing;
}
