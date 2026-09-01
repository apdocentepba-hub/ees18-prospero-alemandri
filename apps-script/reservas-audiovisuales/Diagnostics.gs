function diagnosticReservationErrorCode_(error) {
  var code = String(error && error.message ? error.message : error || '').trim();
  var safeCodes = [
    'INVALID_DATE', 'DATE_OUT_OF_RANGE', 'INVALID_TEACHER', 'INVALID_EMAIL',
    'INSTITUTIONAL_EMAIL_REQUIRED', 'INVALID_COURSE', 'INVALID_SUBJECT',
    'EMPTY_SELECTION', 'INVALID_SLOT_SELECTION', 'MIXED_SHIFT_SELECTION',
    'NON_CONTIGUOUS_SELECTION', 'INVALID_REPEAT_RANGE', 'REPEAT_WINDOW_EXCEEDED',
    'INVALID_TIME', 'INVALID_TIME_RANGE'
  ];
  return safeCodes.indexOf(code) >= 0 ? code : 'INTERNAL_ERROR';
}

function diagnoseReservationCreate_(payload) {
  var stage = 'NORMALIZE';
  var lock = null;

  try {
    requireInstitutionalReservationEmail_(payload && payload.email);

    var clock = reservationClock_();
    var todayIso = clock.date;
    var normalized = normalizeReservationPayload_(payload, todayIso);

    stage = 'LOCK';
    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    lock.releaseLock();
    lock = null;

    stage = 'READ';
    var reservations = readReservationRecords_();
    var blockedDays = readBlockedDays_();

    stage = 'PLAN';
    var plan = planReservationDates_(
      normalized,
      todayIso,
      reservations,
      blockedDays,
      clock.time
    );

    if (plan.confirmedDates.length === 0) {
      return {
        ok: true,
        ready: false,
        stage: 'PLAN',
        code: 'CONFLICT',
        requested: plan.requested,
        confirmed: 0,
        conflicts: plan.conflicts.length
      };
    }

    stage = 'BUILD';
    var groupId = normalized.mode === 'weekly' ? Utilities.getUuid() : '';
    var record = buildReservationRecordForDate_(
      normalized,
      plan.confirmedDates[0],
      groupId
    );
    var rawToken = generateCancellationToken_();
    record.cancellationHash = hashCancellationToken_(rawToken);

    return {
      ok: true,
      ready: true,
      stage: 'READY',
      requested: plan.requested,
      confirmedCandidates: plan.confirmedDates.length,
      conflicts: plan.conflicts.length,
      recordShape: {
        hasId: Boolean(record.id),
        hasDate: Boolean(record.date),
        hasCancellationHash: Boolean(record.cancellationHash),
        syncState: record.syncState
      }
    };
  } catch (error) {
    console.error('diagnoseReservationCreate stage', stage, error);
    return {
      ok: false,
      ready: false,
      stage: stage,
      code: diagnosticReservationErrorCode_(error)
    };
  } finally {
    if (lock) {
      try {
        lock.releaseLock();
      } catch (releaseError) {
        console.error('diagnoseReservationCreate lock release', releaseError);
      }
    }
  }
}
