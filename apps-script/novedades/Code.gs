function doGet(e) {
  var params = (e && e.parameter) || {};
  try {
    var section = String(params.section || 'inicio').trim();
    return newsOutput_(getPublicNews_(section), params.callback);
  } catch (error) {
    console.error('Novedades Web App error', error);
    return newsOutput_({ ok: false, code: 'REQUEST_ERROR' }, params.callback);
  }
}

function sanitizeNewsJsonpCallback_(callback) {
  var value = String(callback || '').trim();
  if (!value) return '';
  if (!/^[A-Za-z_$][A-Za-z0-9_$.]{0,100}$/.test(value)) return '';
  return value;
}

function newsOutput_(payload, callback) {
  var json = JSON.stringify(payload || {});
  var callbackName = sanitizeNewsJsonpCallback_(callback);
  if (callbackName) {
    return ContentService.createTextOutput(callbackName + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
