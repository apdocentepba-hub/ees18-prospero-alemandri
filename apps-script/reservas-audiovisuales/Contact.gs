var PUBLIC_CONTACT_RECIPIENT_ = 'secundaria18avellaneda@abc.gob.ar';
var PUBLIC_CONTACT_RATE_LIMIT_SECONDS_ = 60;

function contactRequiredText_(value, maxLength, errorCode) {
  var text = String(value == null ? '' : value).trim();
  if (!text || (maxLength && text.length > maxLength)) throw new Error(errorCode);
  return text;
}

function isValidPublicContactEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function normalizePublicContact_(payload) {
  var input = payload || {};
  var honeypot = String(input.website || '').trim();
  if (honeypot) throw new Error('CONTACT_SPAM_REJECTED');

  var email = contactRequiredText_(input.email, 180, 'CONTACT_INVALID_EMAIL');
  if (!isValidPublicContactEmail_(email)) throw new Error('CONTACT_INVALID_EMAIL');

  var subject = contactRequiredText_(input.subject, 140, 'CONTACT_INVALID_SUBJECT')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  var message = contactRequiredText_(input.message, 1800, 'CONTACT_INVALID_MESSAGE');

  return {
    email: email,
    subject: subject,
    message: message
  };
}

function publicContactRateLimitKey_(email) {
  return 'public-contact:' + String(email || '').trim().toLowerCase();
}

function enforcePublicContactRateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var key = publicContactRateLimitKey_(email);
  if (cache.get(key)) throw new Error('CONTACT_RATE_LIMITED');
  cache.put(key, '1', PUBLIC_CONTACT_RATE_LIMIT_SECONDS_);
}

function publicContactMailBody_(contact) {
  return [
    'Nuevo mensaje enviado desde el sitio web de la E.E.S. Nº 18.',
    '',
    'Correo de contacto: ' + contact.email,
    'Asunto informado: ' + contact.subject,
    '',
    'Mensaje:',
    contact.message,
    '',
    'Para responder, usá la función Responder del correo.',
    '',
    'Sitio institucional: https://ees18avellaneda.edu.ar/'
  ].join('\n');
}

function sendPublicContact_(payload) {
  var contact = normalizePublicContact_(payload);
  enforcePublicContactRateLimit_(contact.email);

  MailApp.sendEmail({
    to: PUBLIC_CONTACT_RECIPIENT_,
    replyTo: contact.email,
    subject: '[Web EES18] ' + contact.subject,
    body: publicContactMailBody_(contact),
    name: 'E.E.S. Nº 18 · Contacto web'
  });

  return { ok: true };
}
