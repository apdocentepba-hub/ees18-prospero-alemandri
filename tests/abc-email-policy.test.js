const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rules = require(path.join(root, 'assets', 'js', 'reservas-audiovisuales.js'));
const emailPolicy = require(path.join(root, 'assets', 'js', 'reservas-email-policy.js'));

assert.strictEqual(rules.isInstitutionalEmail('docente@abc.gob.ar'), true);
assert.strictEqual(rules.isInstitutionalEmail('DOCENTE@ABC.GOB.AR'), true);
assert.strictEqual(rules.isInstitutionalEmail('docente@gmail.com'), false);
assert.strictEqual(rules.isInstitutionalEmail('docente@foo.abc.gob.ar'), false);

assert.deepStrictEqual(
  emailPolicy.validateInstitutionalEmail('docente@gmail.com'),
  { ok: false, code: 'INSTITUTIONAL_EMAIL_REQUIRED' },
  'el frontend debe rechazar correos fuera de @abc.gob.ar'
);
assert.deepStrictEqual(
  emailPolicy.validateInstitutionalEmail('correo-invalido'),
  { ok: false, code: 'INVALID_EMAIL' }
);
assert.deepStrictEqual(
  emailPolicy.validateInstitutionalEmail('DOCENTE@ABC.GOB.AR'),
  { ok: true, email: 'docente@abc.gob.ar' }
);

const backendContext = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  parseIsoDateParts_() { return {}; },
  isWithinBookingWindow_() { return true; },
  continuousRangeForSlotIds_() {
    return { slotIds: ['M1'], start: '07:30', end: '08:30', shift: 'Mañana', count: 1 };
  }
});

vm.runInContext(
  fs.readFileSync(path.join(root, 'apps-script', 'reservas-audiovisuales', 'Reservations.gs'), 'utf8'),
  backendContext,
  { filename: 'Reservations.gs' }
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'apps-script', 'reservas-audiovisuales', 'Code.gs'), 'utf8'),
  backendContext,
  { filename: 'Code.gs' }
);

assert.throws(
  () => backendContext.requireInstitutionalReservationEmail_('docente@gmail.com'),
  /INSTITUTIONAL_EMAIL_REQUIRED/,
  'el backend debe impedir correos externos'
);
assert.strictEqual(
  backendContext.requireInstitutionalReservationEmail_('DOCENTE@ABC.GOB.AR'),
  'DOCENTE@ABC.GOB.AR',
  'el backend debe aceptar @abc.gob.ar sin depender de mayúsculas/minúsculas'
);

const originalGuard = backendContext.requireInstitutionalReservationEmail_;
backendContext.requireInstitutionalReservationEmail_ = function () {
  throw new Error('EMAIL_POLICY_HOOK');
};
assert.throws(
  () => backendContext.createReservation({ email: 'docente@abc.gob.ar' }),
  /EMAIL_POLICY_HOOK/,
  'createReservation debe pasar siempre por la política institucional antes de escribir'
);
backendContext.requireInstitutionalReservationEmail_ = originalGuard;

assert.throws(
  () => backendContext.createReservation({ email: 'docente@gmail.com' }),
  /INSTITUTIONAL_EMAIL_REQUIRED/,
  'la entrada real de creación debe rechazar el bypass con Gmail antes de tocar Sheets o Calendar'
);

assert.strictEqual(
  backendContext.publicReservationErrorCode_(new Error('INSTITUTIONAL_EMAIL_REQUIRED')),
  'INSTITUTIONAL_EMAIL_REQUIRED',
  'la API debe publicar un código específico para correo institucional requerido'
);

const reservationHtml = fs.readFileSync(path.join(root, 'reservas-audiovisuales.html'), 'utf8');
assert(reservationHtml.includes('Correo institucional'), 'el formulario debe identificar el correo institucional');
assert(reservationHtml.includes('usuario@abc.gob.ar'), 'el formulario debe mostrar un ejemplo @abc.gob.ar');
assert(reservationHtml.includes('assets/js/reservas-email-policy.js'), 'la página debe cargar el guard de correo institucional');

console.log('abc-email-policy.test.js: all assertions passed');
