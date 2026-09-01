const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rules = require(path.join(root, 'assets', 'js', 'reservas-audiovisuales.js'));

assert.strictEqual(rules.isInstitutionalEmail('docente@abc.gob.ar'), true);
assert.strictEqual(rules.isInstitutionalEmail('DOCENTE@ABC.GOB.AR'), true);
assert.strictEqual(rules.isInstitutionalEmail('docente@gmail.com'), false);
assert.strictEqual(rules.isInstitutionalEmail('docente@foo.abc.gob.ar'), false);

assert.throws(
  () => rules.buildReservationPayload(
    {
      teacher: 'Docente Prueba',
      email: 'docente@gmail.com',
      course: '5° 1°',
      subject: 'Historia',
      mode: 'single'
    },
    {
      selectedDate: '2026-09-02',
      selectedSlotIds: ['M1']
    }
  ),
  /INSTITUTIONAL_EMAIL_REQUIRED/,
  'el frontend debe rechazar correos fuera de @abc.gob.ar'
);

assert.doesNotThrow(() => rules.buildReservationPayload(
  {
    teacher: 'Docente Prueba',
    email: 'DOCENTE@ABC.GOB.AR',
    course: '5° 1°',
    subject: 'Historia',
    mode: 'single'
  },
  {
    selectedDate: '2026-09-02',
    selectedSlotIds: ['M1']
  }
));

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
  () => backendContext.normalizeReservationPayload_({
    mode: 'single',
    date: '2026-09-02',
    slotIds: ['M1'],
    teacher: 'Docente Prueba',
    email: 'docente@gmail.com',
    course: '5° 1°',
    subject: 'Historia',
    resources: {}
  }, '2026-09-01'),
  /INSTITUTIONAL_EMAIL_REQUIRED/,
  'el backend debe impedir bypass con correo externo'
);

assert.doesNotThrow(() => backendContext.normalizeReservationPayload_({
  mode: 'single',
  date: '2026-09-02',
  slotIds: ['M1'],
  teacher: 'Docente Prueba',
  email: 'docente@abc.gob.ar',
  course: '5° 1°',
  subject: 'Historia',
  resources: {}
}, '2026-09-01'));

assert.strictEqual(
  backendContext.publicReservationErrorCode_(new Error('INSTITUTIONAL_EMAIL_REQUIRED')),
  'INSTITUTIONAL_EMAIL_REQUIRED',
  'la API debe publicar un código específico para correo institucional requerido'
);

console.log('abc-email-policy.test.js: all assertions passed');
