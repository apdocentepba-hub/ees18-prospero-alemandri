function reservationRequiredText_(value, maxLength, errorCode) {
  var text = String(value == null ? '' : value).trim();
  if (!text) throw new Error(errorCode);
  if (maxLength && text.length > maxLength) throw new Error(errorCode + '_TOO_LONG');
  return text;
}

function isValidReservationEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isInstitutionalReservationEmail_(email) {
  return /^[^\s@]+@abc\.gob\.ar$/.test(String(email || '').trim().toLowerCase());
}

function requireInstitutionalReservationEmail_(email) {
  var normalized = reservationRequiredText_(email, 180, 'INVALID_EMAIL');
  if (!isValidReservationEmail_(normalized)) throw new Error('INVALID_EMAIL');
  if (!isInstitutionalReservationEmail_(normalized)) throw new Error('INSTITUTIONAL_EMAIL_REQUIRED');
  return normalized;
}

function continuousRangeForSlotIds_(slotIds) {
  if (!Array.isArray(slotIds) || slotIds.length === 0) throw new Error('EMPTY_SELECTION');

  var unique = {};
  var selected = [];
  for (var i = 0; i < slotIds.length; i += 1) {
    var id = String(slotIds[i] || '').trim();
    if (!id || unique[id]) throw new Error('INVALID_SLOT_SELECTION');
    var slot = reservationSlotById_(id);
    if (!slot) throw new Error('INVALID_SLOT_SELECTION');
    unique[id] = true;
    selected.push(slot);
  }

  var shift = selected[0].shift;
  for (var selectedIndex = 0; selectedIndex < selected.length; selectedIndex += 1) {
    if (selected[selectedIndex].shift !== shift) throw new Error('MIXED_SHIFT_SELECTION');
  }

  var shiftSlots = shift === 'Mañana' ? RESERVAS_SLOTS_.MANANA : RESERVAS_SLOTS_.TARDE;
  var indexes = selected.map(function (slot) {
    for (var index = 0; index < shiftSlots.length; index += 1) {
      if (shiftSlots[index].id === slot.id) return index;
    }
    return -1;
  }).sort(function (a, b) { return a - b; });

  for (var position = 1; position < indexes.length; position += 1) {
    if (indexes[position] !== indexes[position - 1] + 1) throw new Error('NON_CONTIGUOUS_SELECTION');
  }

  var normalizedIds = indexes.map(function (index) { return shiftSlots[index].id; });
  return {
    slotIds: normalizedIds,
    start: shiftSlots[indexes[0]].start,
    end: shiftSlots[indexes[indexes.length - 1]].end,
    shift: shift,
    count: indexes.length
  };
}

function normalizeReservationPayload_(payload, todayIso) {
  var input = payload || {};
  var date = reservationRequiredText_(input.date, 10, 'INVALID_DATE');
  parseIsoDateParts_(date);

  if (!isWithinBookingWindow_(date, todayIso)) throw new Error('DATE_OUT_OF_RANGE');

  var range = continuousRangeForSlotIds_(input.slotIds);
  var teacher = reservationRequiredText_(input.teacher, 120, 'INVALID_TEACHER');
  var email = reservationRequiredText_(input.email, 180, 'INVALID_EMAIL');
  if (!isValidReservationEmail_(email)) throw new Error('INVALID_EMAIL');
  var course = reservationRequiredText_(input.course, 80, 'INVALID_COURSE');
  var subject = reservationRequiredText_(input.subject, 140, 'INVALID_SUBJECT');
  var mode = input.mode === 'weekly' ? 'weekly' : 'single';
  var repeatUntil = '';

  if (mode === 'weekly') {
    repeatUntil = reservationRequiredText_(input.repeatUntil, 10, 'INVALID_REPEAT_RANGE');
    parseIsoDateParts_(repeatUntil);
    if (daysBetweenIso_(date, repeatUntil) < 0) throw new Error('INVALID_REPEAT_RANGE');
    if (!isWithinBookingWindow_(repeatUntil, todayIso)) throw new Error('REPEAT_WINDOW_EXCEEDED');
  }

  var resources = input.resources || {};
  return {
    mode: mode,
    date: date,
    repeatUntil: repeatUntil,
    slotIds: range.slotIds,
    start: range.start,
    end: range.end,
    shift: range.shift,
    teacher: teacher,
    email: email,
    emailType: isInstitutionalReservationEmail_(email) ? 'institucional' : 'externo',
    course: course,
    subject: subject,
    resources: {
      projector: resources.projector === true,
      speakers: resources.speakers === true,
      schoolNotebook: resources.schoolNotebook === true,
      internet: resources.internet === true
    },
    observations: String(input.observations || '').trim().slice(0, 500)
  };
}

function addDaysToIso_(isoDate, amount) {
  var parts = parseIsoDateParts_(isoDate);
  var date = new Date(parts.date.getTime());
  date.setUTCDate(date.getUTCDate() + amount);
  return formatIsoParts_(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function expandReservationDates_(normalizedPayload) {
  if (normalizedPayload.mode !== 'weekly') return [normalizedPayload.date];

  var dates = [];
  var cursor = normalizedPayload.date;
  while (dateSerial_(cursor) <= dateSerial_(normalizedPayload.repeatUntil)) {
    dates.push(cursor);
    cursor = addDaysToIso_(cursor, 7);
  }
  return dates;
}

function selectedSlotsAreAvailable_(availability, slotIds) {
  var availabilityMap = {};
  (availability.slots || []).forEach(function (slot) {
    availabilityMap[slot.id] = slot.available === true;
  });

  for (var i = 0; i < slotIds.length; i += 1) {
    if (availabilityMap[slotIds[i]] !== true) return false;
  }
  return true;
}

function planReservationDates_(normalizedPayload, todayIso, reservationRecords, blockedDays, currentTimeText) {
  var requestedDates = expandReservationDates_(normalizedPayload);
  var confirmedDates = [];
  var conflicts = [];

  for (var i = 0; i < requestedDates.length; i += 1) {
    var date = requestedDates[i];
    var availability = buildAvailabilityForDate_(date, todayIso, reservationRecords, blockedDays, currentTimeText);

    if (availability.status === 'blocked') {
      conflicts.push({ date: date, code: 'BLOCKED', reason: availability.reason || 'Fecha bloqueada' });
      continue;
    }

    if (!selectedSlotsAreAvailable_(availability, normalizedPayload.slotIds)) {
      conflicts.push({ date: date, code: 'CONFLICT', reason: 'Uno o más módulos ya están ocupados o ya comenzaron' });
      continue;
    }

    confirmedDates.push(date);
  }

  return {
    requested: requestedDates.length,
    confirmedDates: confirmedDates,
    conflicts: conflicts
  };
}

function yesNoReservation_(value) {
  return value === true ? 'Sí' : 'No';
}

function generateCancellationToken_() {
  var seed = Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + new Date().getTime() + '|' + Math.random();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function hashCancellationToken_(rawToken) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(rawToken || ''),
    Utilities.Charset.UTF_8
  );
  return digest.map(function (byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function buildReservationRecordForDate_(payload, date, groupId) {
  return {
    id: Utilities.getUuid(),
    groupId: groupId || '',
    state: 'Confirmada',
    date: date,
    start: payload.start,
    end: payload.end,
    slotIds: payload.slotIds.slice(),
    teacher: payload.teacher,
    email: payload.email,
    emailType: payload.emailType,
    course: payload.course,
    subject: payload.subject,
    shift: payload.shift,
    resources: {
      projector: payload.resources.projector,
      speakers: payload.resources.speakers,
      schoolNotebook: payload.resources.schoolNotebook,
      internet: payload.resources.internet
    },
    observations: payload.observations,
    calendarEventId: '',
    cancellationHash: '',
    cancellationDate: '',
    syncState: 'PENDIENTE_CALENDAR',
    syncError: ''
  };
}

function publicCreatedReservation_(record) {
  return {
    id: record.id,
    date: record.date,
    start: record.start,
    end: record.end,
    shift: record.shift
  };
}

function createReservation(payload) {
  requireInstitutionalReservationEmail_(payload && payload.email);

  var clock = reservationClock_();
  var todayIso = clock.date;
  var normalized = normalizeReservationPayload_(payload, todayIso);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  var createdRecords = [];
  var plan;

  try {
    ensureReservationColumns_();
    var reservations = readReservationRecords_();
    var blockedDays = readBlockedDays_();
    plan = planReservationDates_(normalized, todayIso, reservations, blockedDays, clock.time);

    if (plan.confirmedDates.length === 0) {
      return {
        ok: false,
        code: 'CONFLICT',
        requested: plan.requested,
        confirmed: 0,
        conflicts: plan.conflicts,
        reservations: []
      };
    }

    var groupId = normalized.mode === 'weekly' ? Utilities.getUuid() : '';
    for (var i = 0; i < plan.confirmedDates.length; i += 1) {
      var record = buildReservationRecordForDate_(normalized, plan.confirmedDates[i], groupId);
      var rawToken = generateCancellationToken_();
      record.cancellationHash = hashCancellationToken_(rawToken);
      record.rawCancellationToken_ = rawToken;
      appendReservationRecord_(record);
      createdRecords.push(record);
    }

    if (createdRecords.length > 0) invalidatePublicAvailabilityCache_();
  } finally {
    lock.releaseLock();
  }

  for (var secondaryIndex = 0; secondaryIndex < createdRecords.length; secondaryIndex += 1) {
    var created = createdRecords[secondaryIndex];
    syncReservationToCalendar_(created);
    sendReservationConfirmation_(created, created.rawCancellationToken_);
    delete created.rawCancellationToken_;
  }

  return {
    ok: true,
    requested: plan.requested,
    confirmed: createdRecords.length,
    conflicts: plan.conflicts,
    reservations: createdRecords.map(publicCreatedReservation_)
  };
}
