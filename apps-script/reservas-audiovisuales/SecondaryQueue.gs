var RESERVAS_SECONDARY_QUEUE_PREFIX_ = 'RESERVAS_SECONDARY_QUEUE_';
var RESERVAS_SECONDARY_TRIGGER_DELAY_MS_ = 1000;
var RESERVAS_SECONDARY_RETRY_DELAY_MS_ = 60000;
var RESERVAS_SECONDARY_MAX_ATTEMPTS_ = 3;
var RESERVAS_SECONDARY_BATCH_SIZE_ = 12;
var RESERVAS_SECONDARY_CLAIM_MS_ = 5 * 60 * 1000;

function reservationSecondaryQueueKey_(reservationId) {
  return RESERVAS_SECONDARY_QUEUE_PREFIX_ + String(reservationId || '').trim();
}

function reservationSecondaryQueueItem_(rawToken, attempts, processingUntil) {
  return JSON.stringify({
    token: String(rawToken || ''),
    attempts: Number(attempts) || 0,
    processingUntil: Number(processingUntil) || 0
  });
}

function parseReservationSecondaryQueueItem_(value) {
  try {
    var parsed = JSON.parse(String(value || ''));
    if (!parsed || !String(parsed.token || '').trim()) return null;
    return {
      token: String(parsed.token),
      attempts: Number(parsed.attempts) || 0,
      processingUntil: Number(parsed.processingUntil) || 0
    };
  } catch (error) {
    return null;
  }
}

function scheduleReservationSecondaryProcessing_(delayMs) {
  var minimumDelay = Math.max(1000, Number(delayMs) || RESERVAS_SECONDARY_TRIGGER_DELAY_MS_);
  return ScriptApp
    .newTrigger('processPendingReservationSecondaries')
    .timeBased()
    .after(minimumDelay)
    .create();
}

function ensureReservationSecondaryTriggerAuthorization_() {
  var trigger = scheduleReservationSecondaryProcessing_(RESERVAS_SECONDARY_TRIGGER_DELAY_MS_);
  return {
    ok: true,
    triggerId: trigger && trigger.getUniqueId ? trigger.getUniqueId() : ''
  };
}

function queueReservationSecondaryProcessing_(createdRecords) {
  var records = Array.isArray(createdRecords) ? createdRecords : [];
  var properties = PropertiesService.getScriptProperties();
  var pending = {};
  var queuedRecords = [];

  for (var i = 0; i < records.length; i += 1) {
    var record = records[i];
    if (!record || !record.id || !record.rawCancellationToken_) continue;
    pending[reservationSecondaryQueueKey_(record.id)] = reservationSecondaryQueueItem_(record.rawCancellationToken_, 0, 0);
    queuedRecords.push(record);
    delete record.rawCancellationToken_;
  }

  var keys = Object.keys(pending);
  if (!keys.length) return { ok: true, queued: 0 };

  properties.setProperties(pending, false);

  try {
    scheduleReservationSecondaryProcessing_(RESERVAS_SECONDARY_TRIGGER_DELAY_MS_);
    return { ok: true, queued: keys.length };
  } catch (error) {
    var message = String(error && error.message ? error.message : error).slice(0, 220);
    for (var recordIndex = 0; recordIndex < queuedRecords.length; recordIndex += 1) {
      var queued = queuedRecords[recordIndex];
      try {
        updateReservationFieldsById_(queued.id, {
          syncState: 'PENDIENTE_SECUNDARIOS',
          syncError: 'TRIGGER_PENDING: ' + message
        }, queued.rowNumber);
      } catch (updateError) {
        console.error('No se pudo marcar el error de trigger secundario', updateError);
      }
    }
    console.error('No se pudo programar el procesamiento secundario', error);
    return { ok: false, queued: keys.length, error: message };
  }
}

function claimReservationSecondaryQueueBatch_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    var properties = PropertiesService.getScriptProperties();
    var allProperties = properties.getProperties();
    var now = new Date().getTime();
    var claimed = [];
    var updates = {};
    var keys = Object.keys(allProperties).filter(function (key) {
      return key.indexOf(RESERVAS_SECONDARY_QUEUE_PREFIX_) === 0;
    });

    for (var i = 0; i < keys.length && claimed.length < RESERVAS_SECONDARY_BATCH_SIZE_; i += 1) {
      var key = keys[i];
      var item = parseReservationSecondaryQueueItem_(allProperties[key]);
      if (!item) {
        properties.deleteProperty(key);
        continue;
      }
      if (item.processingUntil > now) continue;
      if (item.attempts >= RESERVAS_SECONDARY_MAX_ATTEMPTS_) continue;

      var reservationId = key.slice(RESERVAS_SECONDARY_QUEUE_PREFIX_.length);
      item.processingUntil = now + RESERVAS_SECONDARY_CLAIM_MS_;
      updates[key] = reservationSecondaryQueueItem_(item.token, item.attempts, item.processingUntil);
      claimed.push({ key: key, reservationId: reservationId, item: item });
    }

    if (Object.keys(updates).length) properties.setProperties(updates, false);
    return claimed;
  } finally {
    lock.releaseLock();
  }
}

function finishReservationSecondaryQueueItem_(claimed, success) {
  var properties = PropertiesService.getScriptProperties();
  if (success) {
    properties.deleteProperty(claimed.key);
    return;
  }

  var attempts = (Number(claimed.item.attempts) || 0) + 1;
  properties.setProperty(
    claimed.key,
    reservationSecondaryQueueItem_(claimed.item.token, attempts, 0)
  );
}

function reservationNeedsSecondaryWork_(record) {
  if (!record || normalizeStateText_(record.state) !== 'CONFIRMADA') return false;
  return !record.calendarEventId || normalizeStateText_(record.mailSent) !== 'SÍ';
}

function processPendingReservationSecondaries() {
  var claimed = claimReservationSecondaryQueueBatch_();
  if (!claimed.length) return { attempted: 0, completed: 0, pending: 0 };

  var records = readReservationRecords_();
  var byId = {};
  for (var recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    if (records[recordIndex] && records[recordIndex].id) byId[records[recordIndex].id] = records[recordIndex];
  }

  var results = { attempted: 0, completed: 0, pending: 0 };
  var shouldRetry = false;

  for (var i = 0; i < claimed.length; i += 1) {
    var queueItem = claimed[i];
    var record = byId[queueItem.reservationId];
    results.attempted += 1;

    if (!record || normalizeStateText_(record.state) !== 'CONFIRMADA') {
      finishReservationSecondaryQueueItem_(queueItem, true);
      results.completed += 1;
      continue;
    }

    var reservation = hydrateReservationForSecondaryServices_(record);
    if (!reservation.calendarEventId) syncReservationToCalendar_(reservation);

    var mailOk = normalizeStateText_(reservation.mailSent) === 'SÍ';
    if (!mailOk) {
      var mailResult = sendReservationConfirmation_(reservation, queueItem.item.token);
      mailOk = mailResult && mailResult.ok === true;
      if (mailOk) reservation.mailSent = 'Sí';
    }

    var complete = Boolean(reservation.calendarEventId) && mailOk;
    finishReservationSecondaryQueueItem_(queueItem, complete);

    if (complete) {
      results.completed += 1;
    } else {
      results.pending += 1;
      if ((Number(queueItem.item.attempts) || 0) + 1 < RESERVAS_SECONDARY_MAX_ATTEMPTS_) shouldRetry = true;
    }
  }

  if (shouldRetry) {
    try {
      scheduleReservationSecondaryProcessing_(RESERVAS_SECONDARY_RETRY_DELAY_MS_);
    } catch (error) {
      console.error('No se pudo programar el reintento secundario', error);
    }
  }

  return results;
}
