var RESERVAS_EXTRA_COLUMNS_ = Object.freeze([
  'ID grupo',
  'Módulos',
  'Tipo correo',
  'Hash cancelación',
  'Fecha cancelación',
  'Estado sincronización',
  'Último error sincronización'
]);

var BLOCKED_DAYS_HEADERS_ = Object.freeze([
  'Fecha',
  'Tipo',
  'Descripción',
  'Activo',
  'Fecha actualización'
]);

var ADMIN_HEADERS_ = Object.freeze([
  'Fecha',
  'Horario',
  'Docente',
  'Correo',
  'Curso',
  'Materia',
  'Turno',
  'Estado',
  'ID grupo',
  'Sincronización',
  'Evento Calendar',
  'ID reserva'
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

function ensureBlockedDaysSheet_() {
  var spreadsheet = getReservationSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(RESERVAS_SETTINGS_.BLOCKED_DAYS_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(RESERVAS_SETTINGS_.BLOCKED_DAYS_SHEET);

  var existingHeaders = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), BLOCKED_DAYS_HEADERS_.length)).getValues()[0]
    : [];

  for (var i = 0; i < BLOCKED_DAYS_HEADERS_.length; i += 1) {
    if (String(existingHeaders[i] || '').trim() !== BLOCKED_DAYS_HEADERS_[i]) {
      sheet.getRange(1, i + 1).setValue(BLOCKED_DAYS_HEADERS_[i]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange('B2:B').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['FERIADO', 'CIERRE ESCOLAR'], true)
      .setAllowInvalid(false)
      .build()
  );
  sheet.getRange('D2:D').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Sí', 'No'], true)
      .setAllowInvalid(false)
      .build()
  );
  sheet.getRange('A2:A').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('E2:E').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.autoResizeColumns(1, BLOCKED_DAYS_HEADERS_.length);
  return sheet;
}

function ensureAdministrationSheet_() {
  var spreadsheet = getReservationSpreadsheet_();
  var sheet = spreadsheet.getSheetByName('Administración');
  if (!sheet) sheet = spreadsheet.insertSheet('Administración');

  sheet.getRange(1, 1, 1, ADMIN_HEADERS_.length).setValues([ADMIN_HEADERS_]);
  sheet.setFrozenRows(1);
  return sheet;
}

function calendarEventAdminUrl_(eventId) {
  if (!eventId) return '';
  try {
    var calendarId = getCalendarIdFromConfiguration_();
    var encoded = Utilities.base64EncodeWebSafe(eventId + ' ' + calendarId).replace(/=+$/g, '');
    return 'https://calendar.google.com/calendar/event?eid=' + encoded;
  } catch (error) {
    return '';
  }
}

function refreshAdministrationSheet_() {
  var sheet = ensureAdministrationSheet_();
  var records = readReservationRecords_();

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), ADMIN_HEADERS_.length)).clearContent();
  }

  var rows = records.map(function (record) {
    var eventUrl = calendarEventAdminUrl_(record.calendarEventId);
    return [
      reservationDateDisplay_(record.date),
      record.start && record.end ? record.start + '–' + record.end : '',
      record.teacher,
      record.email,
      record.course,
      record.subject,
      record.shift,
      record.state,
      record.groupId,
      record.syncState,
      eventUrl ? '=HYPERLINK("' + eventUrl + '","Abrir")' : '',
      record.id
    ];
  });

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, ADMIN_HEADERS_.length).setValues(rows);
  }

  sheet.getRange('A2:A').setNumberFormat('@');
  sheet.autoResizeColumns(1, ADMIN_HEADERS_.length);

  var existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(1, 1, sheet.getLastRow(), ADMIN_HEADERS_.length).createFilter();
  }

  return { rows: rows.length };
}

function setupReservationSystem() {
  var addedColumns = ensureReservationColumns_();
  ensureBlockedDaysSheet_();
  ensureAdministrationSheet_();
  var administration = refreshAdministrationSheet_();
  var secondaryTrigger = ensureReservationSecondaryTriggerAuthorization_();

  return {
    ok: true,
    addedColumns: addedColumns,
    administrationRows: administration.rows,
    secondaryTrigger: secondaryTrigger
  };
}
