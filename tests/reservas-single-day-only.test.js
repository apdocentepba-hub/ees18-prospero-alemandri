const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const bookingHtml = fs.readFileSync(path.join(root, 'reservas-audiovisuales.html'), 'utf8');

assert.strictEqual(/Modalidad/i.test(bookingHtml), false, 'el formulario no debe mostrar un bloque de modalidad');
assert.strictEqual(/Solo este día/i.test(bookingHtml), false, 'el formulario no debe mostrar la opción Solo este día');
assert.strictEqual(/Repetir semanalmente/i.test(bookingHtml), false, 'el formulario no debe ofrecer repetición semanal');
assert.strictEqual(/Repetir hasta/i.test(bookingHtml), false, 'el formulario no debe ofrecer fecha límite de repetición');
assert.strictEqual(/type="radio"[^>]*name="mode"/i.test(bookingHtml), false, 'el formulario no debe exponer radios de modalidad');
assert.match(
  bookingHtml,
  /type="hidden"[^>]*name="mode"[^>]*value="single"/i,
  'el formulario debe enviar siempre mode=single'
);
assert.strictEqual(/id="repeat-until"[^>]*type="date"/i.test(bookingHtml), false, 'la fecha de repetición no debe ser editable');

const frontendPath = path.join(root, 'assets', 'js', 'reservas-audiovisuales.js');
const rules = require(frontendPath);
const payload = rules.buildReservationPayload(
  {
    teacher: 'Docente Prueba',
    email: 'docente@abc.gob.ar',
    course: '4° 1°',
    subject: 'Historia',
    mode: 'single',
    repeatUntil: '',
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
assert.strictEqual(payload.repeatUntil, '', 'una reserva simple no debe tener fecha de repetición');

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

assert.doesNotThrow(
  () => context.requireSingleReservationMode_({ mode: 'single' }),
  'el servidor debe aceptar reservas simples'
);
assert.throws(
  () => context.requireSingleReservationMode_({ mode: 'weekly' }),
  /RECURRING_RESERVATIONS_DISABLED/,
  'el servidor debe rechazar pedidos semanales aunque provengan de una versión vieja'
);

console.log('reservas-single-day-only.test.js: all assertions passed');
