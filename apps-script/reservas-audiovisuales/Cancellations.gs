function lookupCancellationInRecords_(rawToken, records) {
  var token = String(rawToken || '').trim();
  if (!token) return { ok: false, code: 'INVALID_TOKEN' };

  var hash = hashCancellationToken_(token);
  var list = records || [];
  var found = null;

  for (var i = 0; i < list.length; i += 1) {
    if (String(list[i].cancellationHash || '') === hash) {
      found = list[i];
      break;
    }
  }

  if (!found) return { ok: false, code: 'INVALID_TOKEN' };
  if (normalizeStateText_(found.state) === 'CANCELADA') {
    return { ok: false, code: 'ALREADY_CANCELLED' };
  }

  return { ok: true, reservation: found };
}

function publicCancellationReservation_(record) {
  return {
    id: record.id,
    date: record.date,
    start: record.start,
    end: record.end,
    course: record.course,
    subject: record.subject,
    shift: record.shift
  };
}

function getReservationByCancelToken(rawToken) {
  var lookup = lookupCancellationInRecords_(rawToken, readReservationRecords_());
  if (!lookup.ok) return lookup;

  return {
    ok: true,
    reservation: publicCancellationReservation_(lookup.reservation)
  };
}

function deleteReservationCalendarEvent_(record) {
  if (!record || !record.calendarEventId) return { ok: true, skipped: true };

  try {
    var calendar = CalendarApp.getCalendarById(getCalendarIdFromConfiguration_());
    if (!calendar) throw new Error('CALENDAR_NOT_FOUND');
    var event = calendar.getEventById(record.calendarEventId);
    if (event) event.deleteEvent();
    return { ok: true };
  } catch (error) {
    var message = String(error && error.message ? error.message : error).slice(0, 220);
    updateReservationFieldsById_(record.id, {
      syncError: 'CANCEL_CALENDAR_PENDING: ' + message
    }, record.rowNumber);
    return { ok: false, error: message };
  }
}

function cancelReservation(rawToken) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var reservation;

  try {
    var lookup = lookupCancellationInRecords_(rawToken, readReservationRecords_());
    if (!lookup.ok) return lookup;

    reservation = lookup.reservation;
    updateReservationFieldsById_(reservation.id, {
      state: 'Cancelada',
      cancellationDate: new Date()
    }, reservation.rowNumber);
    reservation.state = 'Cancelada';
    reservation.cancellationDate = new Date();
    invalidatePublicAvailabilityCache_();
  } finally {
    lock.releaseLock();
  }

  deleteReservationCalendarEvent_(reservation);
  sendCancellationConfirmation_(reservation);

  return {
    ok: true,
    reservation: publicCancellationReservation_(reservation)
  };
}
