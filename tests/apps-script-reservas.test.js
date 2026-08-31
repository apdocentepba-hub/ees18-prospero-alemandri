const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
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
  Utilities: {
    formatDate(date, _timeZone, pattern) {
      if (pattern === 'yyyy-MM-dd') return date.toISOString().slice(0, 10);
      if (pattern === 'HH:mm') return date.toISOString().slice(11, 16);
      throw new Error(`Unsupported format in test: ${pattern}`);
    }
  }
});

for (const file of ['Config.gs', 'Data.gs', 'Availability.gs', 'Reservations.gs']) {
  const source = fs.readFileSync(path.join(backendDir, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

assert.strictEqual(context.isWeekend_('2026-09-05'), true, 'sábado debe quedar bloqueado');
assert.strictEqual(context.isWeekend_('2026-09-06'), true, 'domingo debe quedar bloqueado');
assert.strictEqual(context.isWeekend_('2026-09-07'), false, 'lunes debe ser hábil si no está bloqueado');

assert.strictEqual(context.overlaps_('08:30', '10:50', '09:50', '10:50'), true);
assert.strictEqual(context.overlaps_('08:30', '09:30', '09:50', '10:50'), false);
assert.strictEqual(context.overlaps_('13:00', '15:00', '14:00', '15:00'), true);

assert.deepStrictEqual(
  Array.from(context.slotIdsTouchedByRange_('08:30', '10:50')),
  ['M2', 'M3'],
  'una reserva 08:30–10:50 debe bloquear M2 y M3'
);

assert.deepStrictEqual(
  Array.from(context.slotIdsTouchedByRange_('13:00', '15:00')),
  ['T1', 'T2'],
  'una reserva 13:00–15:00 debe bloquear T1 y T2'
);

assert.deepStrictEqual(
  Array.from(context.slotIdsTouchedByRange_('09:20', '10:00')),
  ['M2', 'M3'],
  'una reserva histórica irregular debe bloquear todo módulo que toque'
);

const headers = [
  'ID', 'Estado', 'Fecha de reserva', 'Hora desde', 'Hora hasta',
  'Profesor/a', 'Correo docente', 'Curso', 'Materia / espacio curricular',
  'Estado sincronización'
];

const confirmed = context.buildReservationRecordFromValues_(headers, [
  'r1', 'Confirmada', '01/09/2026', '08:30', '10:50',
  'Docente Privado', 'privado@example.com', '5° 2°', 'Geografía', 'OK'
]);

assert.strictEqual(confirmed.id, 'r1');
assert.strictEqual(confirmed.date, '2026-09-01');
assert.strictEqual(confirmed.start, '08:30');
assert.strictEqual(confirmed.end, '10:50');
assert.strictEqual(context.reservationOccupiesRoom_(confirmed), true);

const cancelled = context.buildReservationRecordFromValues_(headers, [
  'r2', 'Cancelada', '01/09/2026', '10:50', '11:50',
  'Otro Docente', 'otro@example.com', '4° 1°', 'Historia', 'OK'
]);
assert.strictEqual(context.reservationOccupiesRoom_(cancelled), false);

const availability = context.buildAvailabilityForDate_(
  '2026-09-01',
  '2026-08-31',
  [confirmed, cancelled],
  []
);

assert.strictEqual(availability.ok, true);
assert.strictEqual(availability.status, 'partial');
assert.strictEqual(availability.total, 10);
assert.strictEqual(availability.free, 8);
assert.deepStrictEqual(
  Array.from(availability.slots.filter((slot) => !slot.available).map((slot) => slot.id)),
  ['M2', 'M3']
);
assert.strictEqual(JSON.stringify(availability).includes('Docente Privado'), false, 'la respuesta pública no debe filtrar nombres');
assert.strictEqual(JSON.stringify(availability).includes('privado@example.com'), false, 'la respuesta pública no debe filtrar correos');

const blocked = context.buildAvailabilityForDate_(
  '2026-09-02',
  '2026-08-31',
  [],
  [{ date: '2026-09-02', type: 'CIERRE ESCOLAR', description: 'Jornada institucional', active: true }]
);
assert.strictEqual(blocked.status, 'blocked');
assert.strictEqual(blocked.free, 0);
assert.strictEqual(blocked.reason, 'Jornada institucional');

const weekend = context.buildAvailabilityForDate_('2026-09-05', '2026-08-31', [], []);
assert.strictEqual(weekend.status, 'blocked');
assert.strictEqual(weekend.free, 0);

const tooFar = context.buildAvailabilityForDate_('2026-11-01', '2026-08-31', [], []);
assert.strictEqual(tooFar.status, 'blocked');
assert.strictEqual(tooFar.reason, 'Fuera de la ventana de reserva');

const normalizedPayload = context.normalizeReservationPayload_({
  mode: 'weekly',
  date: '2026-09-01',
  repeatUntil: '2026-09-29',
  slotIds: ['M2', 'M3'],
  start: '00:00',
  end: '23:59',
  teacher: 'Luciano Leal',
  email: 'facutronge27@gmail.com',
  course: '5to 2da',
  subject: 'Geografía',
  resources: { projector: true, speakers: false, schoolNotebook: true, internet: true },
  observations: 'Clase con mapas.'
}, '2026-08-31');

assert.strictEqual(normalizedPayload.start, '08:30', 'el servidor debe recalcular hora inicial desde slotIds');
assert.strictEqual(normalizedPayload.end, '10:50', 'el servidor debe recalcular hora final desde slotIds');
assert.strictEqual(normalizedPayload.shift, 'Mañana');
assert.strictEqual(normalizedPayload.emailType, 'externo');

assert.deepStrictEqual(
  Array.from(context.expandReservationDates_(normalizedPayload)),
  ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']
);

const occupiedSep15 = {
  id: 'ocupada',
  state: 'Confirmada',
  date: '2026-09-15',
  start: '08:30',
  end: '10:50',
  syncState: 'OK'
};

const plan = context.planReservationDates_(
  normalizedPayload,
  '2026-08-31',
  [occupiedSep15],
  []
);

assert.deepStrictEqual(
  Array.from(plan.confirmedDates),
  ['2026-09-01', '2026-09-08', '2026-09-22', '2026-09-29'],
  'una serie semanal debe conservar las fechas libres'
);
assert.deepStrictEqual(
  Array.from(plan.conflicts.map((conflict) => conflict.date)),
  ['2026-09-15'],
  'la fecha ocupada debe informarse sin rechazar toda la serie'
);
assert.strictEqual(JSON.stringify(plan).includes('Luciano Leal'), false, 'el plan de conflictos no debe exponer titulares previos');

const singleConflict = context.planReservationDates_(
  context.normalizeReservationPayload_({
    mode: 'single',
    date: '2026-09-15',
    slotIds: ['M2'],
    teacher: 'Prueba',
    email: 'prueba@abc.gob.ar',
    course: '4° 1°',
    subject: 'Historia',
    resources: {}
  }, '2026-08-31'),
  '2026-08-31',
  [occupiedSep15],
  []
);
assert.strictEqual(singleConflict.confirmedDates.length, 0);
assert.strictEqual(singleConflict.conflicts.length, 1);

console.log('apps-script-reservas.test.js: all assertions passed');
