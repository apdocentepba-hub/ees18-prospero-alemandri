function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = String(params.action || 'health').trim();

  try {
    var environmentCheck = validateReservationEnvironmentConfiguration_();

    if (action === 'health') {
      return publicReservationOutput_({
        ok: true,
        service: 'reservas-audiovisuales',
        environment: environmentCheck.environment
      }, params.callback);
    }

    if (action === 'availability') {
      return publicReservationOutput_(getAvailability(String(params.date || '')), params.callback);
    }

    if (action === 'month') {
      return publicReservationOutput_(getMonthAvailability(params.year, params.month), params.callback);
    }

    if (action === 'create') {
      var payload = parsePublicReservationPayload_(params.payload);
      return publicReservationOutput_(createReservation(payload), params.callback);
    }

    if (action === 'cancelLookup') {
      return publicReservationOutput_(getReservationByCancelToken(String(params.token || '')), params.callback);
    }

    if (action === 'cancel') {
      return publicReservationOutput_(cancelReservation(String(params.token || '')), params.callback);
    }

    return publicReservationOutput_({ ok: false, code: 'UNKNOWN_ACTION' }, params.callback);
  } catch (error) {
    console.error('Reservas Web App error', error);
    return publicReservationOutput_({
      ok: false,
      code: publicReservationErrorCode_(error),
      message: 'No se pudo procesar la solicitud.'
    }, params.callback);
  }
}

function doPost(e) {
  var params = (e && e.parameter) || {};
  var callback = params.callback;

  try {
    validateReservationEnvironmentConfiguration_();

    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = String(body.action || params.action || '').trim();
    if (action === 'create') {
      return publicReservationOutput_(createReservation(body.payload || {}), callback);
    }
    if (action === 'cancel') {
      return publicReservationOutput_(cancelReservation(String(body.token || '')), callback);
    }

    return publicReservationOutput_({ ok: false, code: 'UNKNOWN_ACTION' }, callback);
  } catch (error) {
    console.error('Reservas Web App POST error', error);
    return publicReservationOutput_({
      ok: false,
      code: publicReservationErrorCode_(error),
      message: 'No se pudo procesar la solicitud.'
    }, callback);
  }
}

function parsePublicReservationPayload_(rawPayload) {
  var text = String(rawPayload || '').trim();
  if (!text) throw new Error('INVALID_PAYLOAD');
  if (text.length > 6000) throw new Error('PAYLOAD_TOO_LARGE');

  var payload = JSON.parse(text);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('INVALID_PAYLOAD');
  }
  return payload;
}

function publicReservationErrorCode_(error) {
  var code = String(error && error.message ? error.message : error || 'REQUEST_ERROR');
  var allowed = [
    'INVALID_PAYLOAD', 'PAYLOAD_TOO_LARGE', 'INVALID_DATE', 'DATE_OUT_OF_RANGE',
    'INVALID_TEACHER', 'INVALID_EMAIL', 'INVALID_COURSE', 'INVALID_SUBJECT',
    'EMPTY_SELECTION', 'INVALID_SLOT_SELECTION', 'MIXED_SHIFT_SELECTION',
    'NON_CONTIGUOUS_SELECTION', 'INVALID_REPEAT_RANGE', 'REPEAT_WINDOW_EXCEEDED',
    'CONFLICT', 'INVALID_TOKEN', 'ALREADY_CANCELLED',
    'MISSING_ENVIRONMENT_CONFIGURATION', 'MISSING_SPREADSHEET_CONFIGURATION',
    'MISSING_CALENDAR_CONFIGURATION', 'ENVIRONMENT_CONFIGURATION_MISMATCH'
  ];
  return allowed.indexOf(code) >= 0 ? code : 'REQUEST_ERROR';
}

function publicReservationOutput_(payload, callback) {
  var json = JSON.stringify(payload || {});
  var callbackName = sanitizeJsonpCallback_(callback);

  if (callbackName) {
    return ContentService
      .createTextOutput(callbackName + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeJsonpCallback_(callback) {
  var value = String(callback || '').trim();
  if (!value) return '';
  if (!/^[A-Za-z_$][A-Za-z0-9_$.]{0,100}$/.test(value)) return '';
  return value;
}
