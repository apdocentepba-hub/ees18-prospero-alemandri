var RESERVAS_PUBLIC_AVAILABILITY_CACHE_KEY_ = 'reservas-public-availability-v1';
var RESERVAS_PUBLIC_AVAILABILITY_CACHE_SECONDS_ = 120;

function parseIsoDateParts_(isoDate) {
  var text = String(isoDate == null ? '' : isoDate).trim();
  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('INVALID_DATE');

  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  var date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('INVALID_DATE');
  }

  return { year: year, month: month, day: day, date: date };
}

function formatIsoParts_(year, month, day) {
  return String(year).padStart(4, '0') + '-' +
    String(month).padStart(2, '0') + '-' +
    String(day).padStart(2, '0');
}

function isWeekend_(isoDate) {
  var day = parseIsoDateParts_(isoDate).date.getUTCDay();
  return day === 0 || day === 6;
}

function dateSerial_(isoDate) {
  return parseIsoDateParts_(isoDate).date.getTime();
}

function daysBetweenIso_(fromIso, toIso) {
  return Math.round((dateSerial_(toIso) - dateSerial_(fromIso)) / 86400000);
}

function isWithinBookingWindow_(isoDate, todayIso) {
  var distance = daysBetweenIso_(todayIso, isoDate);
  return distance >= 0 && distance <= RESERVAS_SETTINGS_.BOOKING_WINDOW_DAYS;
}

function timeToMinutes_(timeText) {
  var text = String(timeText == null ? '' : timeText).trim();
  var match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error('INVALID_TIME');

  var hour = Number(match[1]);
  var minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('INVALID_TIME');
  return hour * 60 + minute;
}

function overlaps_(startA, endA, startB, endB) {
  var aStart = timeToMinutes_(startA);
  var aEnd = timeToMinutes_(endA);
  var bStart = timeToMinutes_(startB);
  var bEnd = timeToMinutes_(endB);

  if (aEnd <= aStart || bEnd <= bStart) throw new Error('INVALID_TIME_RANGE');
  return aStart < bEnd && bStart < aEnd;
}

function slotIdsTouchedByRange_(start, end) {
  var touched = [];
  var slots = allReservationSlots_();
  for (var i = 0; i < slots.length; i += 1) {
    if (overlaps_(start, end, slots[i].start, slots[i].end)) touched.push(slots[i].id);
  }
  return touched;
}

function activeBlockedDay_(isoDate, blockedDays) {
  var list = Array.isArray(blockedDays) ? blockedDays : [];
  for (var i = 0; i < list.length; i += 1) {
    if (list[i] && list[i].active === true && list[i].date === isoDate) return list[i];
  }
  return null;
}

function occupiedSlotIdsForDate_(isoDate, reservationRecords) {
  var records = Array.isArray(reservationRecords) ? reservationRecords : [];
  var occupiedMap = {};

  for (var i = 0; i < records.length; i += 1) {
    var record = records[i];
    if (!record || record.date !== isoDate || !reservationOccupiesRoom_(record)) continue;

    var touched = slotIdsTouchedByRange_(record.start, record.end);
    for (var slotIndex = 0; slotIndex < touched.length; slotIndex += 1) {
      occupiedMap[touched[slotIndex]] = true;
    }
  }

  return allReservationSlots_()
    .map(function (slot) { return slot.id; })
    .filter(function (slotId) { return occupiedMap[slotId] === true; });
}

function buildPublicAvailabilitySnapshot_(reservationRecords, blockedDays) {
  var occupiedByDate = {};
  var records = Array.isArray(reservationRecords) ? reservationRecords : [];

  for (var i = 0; i < records.length; i += 1) {
    var record = records[i];
    if (!record || !record.date || !reservationOccupiesRoom_(record)) continue;

    if (!occupiedByDate[record.date]) occupiedByDate[record.date] = {};
    var touched = slotIdsTouchedByRange_(record.start, record.end);
    for (var slotIndex = 0; slotIndex < touched.length; slotIndex += 1) {
      occupiedByDate[record.date][touched[slotIndex]] = true;
    }
  }

  Object.keys(occupiedByDate).forEach(function (date) {
    var map = occupiedByDate[date];
    occupiedByDate[date] = allReservationSlots_()
      .map(function (slot) { return slot.id; })
      .filter(function (slotId) { return map[slotId] === true; });
  });

  var blockedByDate = {};
  var blocked = Array.isArray(blockedDays) ? blockedDays : [];
  for (var blockedIndex = 0; blockedIndex < blocked.length; blockedIndex += 1) {
    var item = blocked[blockedIndex];
    if (!item || item.active !== true || !item.date) continue;
    blockedByDate[item.date] = {
      type: String(item.type || '').trim(),
      description: String(item.description || '').trim()
    };
  }

  return {
    occupiedByDate: occupiedByDate,
    blockedByDate: blockedByDate
  };
}

function readPublicAvailabilitySnapshot_() {
  var cache = CacheService.getScriptCache();

  try {
    var cached = cache.get(RESERVAS_PUBLIC_AVAILABILITY_CACHE_KEY_);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.occupiedByDate && parsed.blockedByDate) return parsed;
    }
  } catch (error) {
    console.warn('No se pudo leer el cache de disponibilidad', error);
  }

  var snapshot = buildPublicAvailabilitySnapshot_(
    readReservationRecords_(),
    readBlockedDays_()
  );

  try {
    cache.put(
      RESERVAS_PUBLIC_AVAILABILITY_CACHE_KEY_,
      JSON.stringify(snapshot),
      RESERVAS_PUBLIC_AVAILABILITY_CACHE_SECONDS_
    );
  } catch (error) {
    console.warn('No se pudo guardar el cache de disponibilidad', error);
  }

  return snapshot;
}

function invalidatePublicAvailabilityCache_() {
  try {
    CacheService.getScriptCache().remove(RESERVAS_PUBLIC_AVAILABILITY_CACHE_KEY_);
  } catch (error) {
    console.warn('No se pudo invalidar el cache de disponibilidad', error);
  }
}

function startedSlotIdsForSameDay_(isoDate, todayIso, currentTimeText) {
  if (isoDate !== todayIso || !String(currentTimeText || '').trim()) return [];

  var currentMinutes = timeToMinutes_(currentTimeText);
  return allReservationSlots_()
    .filter(function (slot) { return timeToMinutes_(slot.start) <= currentMinutes; })
    .map(function (slot) { return slot.id; });
}

function publicSlotsForOccupiedIds_(occupiedSlotIds) {
  var occupiedMap = {};
  (occupiedSlotIds || []).forEach(function (slotId) {
    occupiedMap[slotId] = true;
  });

  return allReservationSlots_().map(function (slot) {
    return {
      id: slot.id,
      start: slot.start,
      end: slot.end,
      shift: slot.shift,
      available: occupiedMap[slot.id] !== true
    };
  });
}

function blockedAvailability_(isoDate, reason) {
  return {
    ok: true,
    date: isoDate,
    status: 'blocked',
    free: 0,
    total: allReservationSlots_().length,
    reason: reason || 'Fecha no disponible',
    slots: publicSlotsForOccupiedIds_(
      allReservationSlots_().map(function (slot) { return slot.id; })
    )
  };
}

function availableResultForOccupiedIds_(isoDate, occupiedSlotIds, todayIso, currentTimeText) {
  var started = startedSlotIdsForSameDay_(isoDate, todayIso, currentTimeText);
  var slots = publicSlotsForOccupiedIds_((occupiedSlotIds || []).concat(started));
  var free = slots.filter(function (slot) { return slot.available; }).length;
  var total = slots.length;
  var status = free === 0 ? 'full' : (free === total ? 'available' : 'partial');

  return {
    ok: true,
    date: isoDate,
    status: status,
    free: free,
    total: total,
    reason: '',
    slots: slots
  };
}

function buildAvailabilityForDate_(isoDate, todayIso, reservationRecords, blockedDays, currentTimeText) {
  parseIsoDateParts_(isoDate);
  parseIsoDateParts_(todayIso);

  if (!isWithinBookingWindow_(isoDate, todayIso)) {
    return blockedAvailability_(isoDate, 'Fuera de la ventana de reserva');
  }

  if (isWeekend_(isoDate)) {
    return blockedAvailability_(isoDate, 'Fin de semana');
  }

  var blockedDay = activeBlockedDay_(isoDate, blockedDays);
  if (blockedDay) {
    return blockedAvailability_(
      isoDate,
      blockedDay.description || blockedDay.type || 'Día bloqueado'
    );
  }

  return availableResultForOccupiedIds_(
    isoDate,
    occupiedSlotIdsForDate_(isoDate, reservationRecords),
    todayIso,
    currentTimeText
  );
}

function buildAvailabilityForDateFromSnapshot_(isoDate, todayIso, snapshot, currentTimeText) {
  parseIsoDateParts_(isoDate);
  parseIsoDateParts_(todayIso);

  if (!isWithinBookingWindow_(isoDate, todayIso)) {
    return blockedAvailability_(isoDate, 'Fuera de la ventana de reserva');
  }

  if (isWeekend_(isoDate)) {
    return blockedAvailability_(isoDate, 'Fin de semana');
  }

  var safeSnapshot = snapshot || { occupiedByDate: {}, blockedByDate: {} };
  var blockedDay = safeSnapshot.blockedByDate && safeSnapshot.blockedByDate[isoDate];
  if (blockedDay) {
    return blockedAvailability_(
      isoDate,
      blockedDay.description || blockedDay.type || 'Día bloqueado'
    );
  }

  var occupied = safeSnapshot.occupiedByDate && safeSnapshot.occupiedByDate[isoDate];
  return availableResultForOccupiedIds_(
    isoDate,
    occupied || [],
    todayIso,
    currentTimeText
  );
}

function reservationClock_(nowValue) {
  var now = nowValue instanceof Date ? nowValue : new Date();
  return {
    date: Utilities.formatDate(now, RESERVAS_SETTINGS_.TIME_ZONE, 'yyyy-MM-dd'),
    time: Utilities.formatDate(now, RESERVAS_SETTINGS_.TIME_ZONE, 'HH:mm')
  };
}

function todayReservationIso_() {
  return reservationClock_().date;
}

function currentReservationTime_() {
  return reservationClock_().time;
}

function getAvailability(dateIso) {
  var clock = reservationClock_();
  return buildAvailabilityForDateFromSnapshot_(
    dateIso,
    clock.date,
    readPublicAvailabilitySnapshot_(),
    clock.time
  );
}

function getOccupiedSlots(dateIso) {
  return occupiedSlotIdsForDate_(dateIso, readReservationRecords_());
}

function getMonthAvailability(year, month) {
  var numericYear = Number(year);
  var numericMonth = Number(month);

  if (
    !Number.isInteger(numericYear) ||
    !Number.isInteger(numericMonth) ||
    numericMonth < 1 ||
    numericMonth > 12
  ) {
    throw new Error('INVALID_MONTH');
  }

  var clock = reservationClock_();
  var todayIso = clock.date;
  var snapshot = readPublicAvailabilitySnapshot_();
  var daysInMonth = new Date(Date.UTC(numericYear, numericMonth, 0)).getUTCDate();
  var days = {};

  for (var day = 1; day <= daysInMonth; day += 1) {
    var isoDate = formatIsoParts_(numericYear, numericMonth, day);
    var availability = buildAvailabilityForDateFromSnapshot_(
      isoDate,
      todayIso,
      snapshot,
      clock.time
    );

    days[isoDate] = {
      status: availability.status,
      free: availability.free,
      total: availability.total,
      reason: availability.reason,
      occupiedSlotIds: availability.slots
        .filter(function (slot) { return slot.available !== true; })
        .map(function (slot) { return slot.id; })
    };
  }

  return {
    ok: true,
    year: numericYear,
    month: numericMonth,
    days: days
  };
}
