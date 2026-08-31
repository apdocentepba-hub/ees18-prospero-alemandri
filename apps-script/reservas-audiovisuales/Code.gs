function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = String(params.action || 'health').trim();

  try {
    if (action === 'health') {
      return publicReservationOutput_({ ok: true, service: 'reservas-audiovisuales' }, params.callback);
    }

    if (action === 'availability') {
      return publicReservationOutput_(getAvailability(String(params.date || '')), params.callback);
    }

    if (action === 'month') {
      return publicReservationOutput_(getMonthAvailability(params.year, params.month), params.callback);
    }

    return publicReservationOutput_({ ok: false, code: 'UNKNOWN_ACTION' }, params.callback);
  } catch (error) {
    console.error('Reservas Web App error', error);
    return publicReservationOutput_({
      ok: false,
      code: 'REQUEST_ERROR',
      message: 'No se pudo procesar la consulta de disponibilidad.'
    }, params.callback);
  }
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
