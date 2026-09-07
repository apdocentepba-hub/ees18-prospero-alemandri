const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bookingHtml = fs.readFileSync(path.join(root, 'reservas-audiovisuales.html'), 'utf8');
const frontendPath = path.join(root, 'assets', 'js', 'reservas-audiovisuales.js');
const frontendSource = fs.readFileSync(frontendPath, 'utf8');
const rules = require(frontendPath);

assert.strictEqual(/Repetir semanalmente/i.test(bookingHtml), false, 'el formulario no debe ofrecer repetición semanal');
assert.strictEqual(/Repetir hasta/i.test(bookingHtml), false, 'el formulario no debe ofrecer fecha límite de repetición');
assert.strictEqual(/name="mode"/i.test(bookingHtml), false, 'el formulario no debe exponer selector de modalidad');
assert.strictEqual(/repeat-until/i.test(bookingHtml), false, 'el formulario no debe contener controles de repetición');
assert.strictEqual(typeof rules.buildWeeklyDates, 'undefined', 'el cliente no debe conservar lógica para expandir reservas semanales');
assert.strictEqual(frontendSource.includes('repeatUntil'), false, 'el cliente no debe leer ni enviar repeatUntil');

const payload = rules.buildReservationPayload(
  {
    teacher: 'Docente Prueba',
    email: 'docente@abc.gob.ar',
    course: '4° 1°',
    subject: 'Historia',
    projector: true,
    speakers: false,
    schoolNotebook: false,
    internet: true,
    observations: ''
  },
  {
    selectedDate: '2026-09-08',
    selectedSlotIds: ['M1', 'M2']
  }
);
assert.strictEqual(payload.mode, 'single', 'cada reserva nueva debe ser siempre de una sola fecha');
assert.strictEqual(Object.prototype.hasOwnProperty.call(payload, 'repeatUntil'), false, 'el payload nuevo no debe incluir repeatUntil');

const backendDir = path.join(root, 'apps-script', 'reservas-audiovisuales');
const context = vm.createContext({
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
  encodeURIComponent
});
for (const file of ['Config.gs', 'Data.gs', 'Availability.gs', 'Reservations.gs']) {
  const source = fs.readFileSync(path.join(backendDir, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

assert.throws(
  () => context.normalizeReservationPayload_({
    mode: 'weekly',
    date: '2026-09-08',
    repeatUntil: '2026-09-29',
    slotIds: ['M1'],
    teacher: 'Docente viejo',
    email: 'docente@abc.gob.ar',
    course: '4° 1°',
    subject: 'Historia',
    resources: {}
  }, '2026-09-07'),
  /RECURRING_RESERVATIONS_DISABLED/,
  'el servidor debe rechazar pedidos semanales aunque provengan de una versión vieja'
);

console.log('reservas-single-day-only.test.js: all assertions passed');
