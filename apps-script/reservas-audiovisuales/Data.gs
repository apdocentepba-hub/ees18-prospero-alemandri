function getReservationSpreadsheet_() {
  return SpreadsheetApp.openById(RESERVAS_SETTINGS_.SPREADSHEET_ID);
}

function getRequiredSheet_(sheetName) {
  var sheet = getReservationSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('MISSING_SHEET_' + sheetName);
  return sheet;
}

function normalizeHeader_(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function buildHeaderMap_(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i += 1) {
    map[normalizeHeader_(headers[i])] = i;
  }
  return map;
}

function valueForHeader_(headersMap, values, headerName) {
  var index = headersMap[normalizeHeader_(headerName)];
  if (typeof index !== 'number') return '';
  return values[index];
}

function normalizeSheetDateIso_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, RESERVAS_SETTINGS_.TIME_ZONE, 'yyyy-MM-dd');
  }

  var text = String(value == null ? '' : value).trim();
  if (!text) return '';

  var isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3];

  var localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localMatch) {
    return localMatch[3] + '-' + String(localMatch[2]).padStart(2, '0') + '-' + String(localMatch[1]).padStart(2, '0');
  }

  return '';
}

function normalizeSheetTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, RESERVAS_SETTINGS_.TIME_ZONE, 'HH:mm');
  }

  var text = String(value == null ? '' : value).trim();
  if (!text) return '';

  var match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';

  var hour = Number(match[1]);
  var minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';

  return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
}

function normalizeStateText_(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function buildReservationRecordFromValues_(headers, values, rowNumber) {
  var map = buildHeaderMap_(headers);
  return {
    rowNumber: rowNumber || null,
    id: String(valueForHeader_(map, values, 'ID') || '').trim(),
    state: String(valueForHeader_(map, values, 'Estado') || '').trim(),
    date: normalizeSheetDateIso_(valueForHeader_(map, values, 'Fecha de reserva')),
    start: normalizeSheetTime_(valueForHeader_(map, values, 'Hora desde')),
    end: normalizeSheetTime_(valueForHeader_(map, values, 'Hora hasta')),
    teacher: String(valueForHeader_(map, values, 'Profesor/a') || '').trim(),
    email: String(valueForHeader_(map, values, 'Correo docente') || '').trim(),
    course: String(valueForHeader_(map, values, 'Curso') || '').trim(),
    subject: String(valueForHeader_(map, values, 'Materia / espacio curricular') || '').trim(),
    shift: String(valueForHeader_(map, values, 'Turno') || '').trim(),
    calendarEventId: String(valueForHeader_(map, values, 'ID evento calendario') || '').trim(),
    syncState: String(valueForHeader_(map, values, 'Estado sincronización') || '').trim(),
    groupId: String(valueForHeader_(map, values, 'ID grupo') || '').trim(),
    slots: String(valueForHeader_(map, values, 'Módulos') || '').trim(),
    cancellationHash: String(valueForHeader_(map, values, 'Hash cancelación') || '').trim()
  };
}

function reservationOccupiesRoom_(record) {
  if (!record || !record.date || !record.start || !record.end) return false;

  var state = normalizeStateText_(record.state);
  var syncState = normalizeStateText_(record.syncState);
  if (state === 'CANCELADA' || state === 'RECHAZADA' || state === 'CONFLICTO DE HORARIO') return false;

  if (state === 'CONFIRMADA') return true;
  return syncState === 'PENDIENTE_CALENDAR';
}

function readReservationRecords_() {
  var sheet = getRequiredSheet_(RESERVAS_SETTINGS_.RESERVAS_SHEET);
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  var headers = values[0];
  var records = [];

  for (var row = 1; row < values.length; row += 1) {
    var record = buildReservationRecordFromValues_(headers, values[row], row + 1);
    if (record.id || record.date || record.state) records.push(record);
  }

  return records;
}

function normalizeActive_(value) {
  if (value === true || value === 1) return true;
  var normalized = String(value == null ? '' : value).trim().toUpperCase();
  return normalized === 'SÍ' || normalized === 'SI' || normalized === 'TRUE' || normalized === 'YES' || normalized === '1';
}

function readBlockedDays_() {
  var spreadsheet = getReservationSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(RESERVAS_SETTINGS_.BLOCKED_DAYS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  var headers = values[0];
  var map = buildHeaderMap_(headers);
  var blocked = [];

  for (var row = 1; row < values.length; row += 1) {
    var date = normalizeSheetDateIso_(valueForHeader_(map, values[row], 'Fecha'));
    if (!date) continue;
    blocked.push({
      date: date,
      type: String(valueForHeader_(map, values[row], 'Tipo') || '').trim(),
      description: String(valueForHeader_(map, values[row], 'Descripción') || '').trim(),
      active: normalizeActive_(valueForHeader_(map, values[row], 'Activo'))
    });
  }

  return blocked;
}

function getCalendarIdFromConfiguration_() {
  var sheet = getRequiredSheet_(RESERVAS_SETTINGS_.CONFIG_SHEET);
  var values = sheet.getDataRange().getValues();

  for (var row = 0; row < values.length; row += 1) {
    if (normalizeHeader_(values[row][0]) === normalizeHeader_('ID del calendario')) {
      return String(values[row][1] || '').trim();
    }
  }

  throw new Error('MISSING_CALENDAR_ID');
}
