function reservationDateTime_(dateIso, timeText) {
  var dateParts = parseIsoDateParts_(dateIso);
  var timeMatch = String(timeText || '').match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) throw new Error('INVALID_TIME');

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0
  );
}

function reservationResourcesText_(resources) {
  var input = resources || {};
  var lines = [];
  if (input.projector) lines.push('Cañón/proyector');
  if (input.speakers) lines.push('Parlantes');
  if (input.schoolNotebook) lines.push('Notebook de la escuela');
  if (input.internet) lines.push('Internet');
  return lines.length ? lines.join(', ') : 'Sin recursos adicionales informados';
}

function reservationEventDescription_(reservation) {
  return [
    'Reserva del Salón de Audiovisuales',
    'ID: ' + reservation.id,
    'Docente: ' + reservation.teacher,
    'Correo: ' + reservation.email,
    'Curso: ' + reservation.course,
    'Materia: ' + reservation.subject,
    'Recursos: ' + reservationResourcesText_(reservation.resources),
    'Observaciones: ' + (reservation.observations || 'Sin observaciones')
  ].join('\n');
}

function syncReservationToCalendar_(reservation) {
  var current = findReservationRecordById_(reservation.id);
  if (current && current.calendarEventId) {
    reservation.calendarEventId = current.calendarEventId;
    reservation.syncState = 'OK';
    return reservation;
  }

  try {
    var calendarId = getCalendarIdFromConfiguration_();
    var calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) throw new Error('CALENDAR_NOT_FOUND');

    var event = calendar.createEvent(
      'Audiovisuales · ' + reservation.course + ' · ' + reservation.subject,
      reservationDateTime_(reservation.date, reservation.start),
      reservationDateTime_(reservation.date, reservation.end),
      { description: reservationEventDescription_(reservation) }
    );

    reservation.calendarEventId = event.getId();
    reservation.syncState = 'OK';
    reservation.syncError = '';
    updateReservationFieldsById_(reservation.id, {
      calendarEventId: reservation.calendarEventId,
      syncState: 'OK',
      syncError: ''
    });
  } catch (error) {
    reservation.syncState = 'PENDIENTE_CALENDAR';
    reservation.syncError = String(error && error.message ? error.message : error).slice(0, 250);
    updateReservationFieldsById_(reservation.id, {
      syncState: 'PENDIENTE_CALENDAR',
      syncError: reservation.syncError
    });
  }

  return reservation;
}

function retryPendingCalendarSync() {
  var records = readReservationRecords_();
  var results = { attempted: 0, synced: 0, pending: 0 };

  for (var i = 0; i < records.length; i += 1) {
    var record = records[i];
    if (normalizeStateText_(record.state) !== 'CONFIRMADA') continue;
    if (record.calendarEventId) continue;
    if (normalizeStateText_(record.syncState) !== 'PENDIENTE_CALENDAR') continue;

    results.attempted += 1;
    var fullReservation = hydrateReservationForSecondaryServices_(record);
    syncReservationToCalendar_(fullReservation);
    if (fullReservation.calendarEventId) results.synced += 1;
    else results.pending += 1;
  }

  return results;
}

function hydrateReservationForSecondaryServices_(record) {
  var sheet = getRequiredSheet_(RESERVAS_SETTINGS_.RESERVAS_SHEET);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(record.rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = buildHeaderMap_(headers);

  record.resources = {
    projector: normalizeActive_(valueForHeader_(map, values, 'Usa cañón')),
    speakers: normalizeActive_(valueForHeader_(map, values, 'Usa parlantes')),
    schoolNotebook: normalizeActive_(valueForHeader_(map, values, 'Usa notebook escuela')),
    internet: normalizeActive_(valueForHeader_(map, values, 'Necesita internet'))
  };
  record.observations = String(valueForHeader_(map, values, 'Observaciones') || '').trim();
  return record;
}
