const assert = require('assert');
const path = require('path');

const rules = require(path.join('..', 'assets', 'js', 'reservas-audiovisuales.js'));

assert.deepStrictEqual(
  rules.SLOTS.MANANA.map((slot) => slot.id),
  ['M1', 'M2', 'M3', 'M4', 'M5'],
  'turno mañana debe tener cinco módulos en el orden institucional'
);

assert.deepStrictEqual(
  rules.SLOTS.TARDE.map((slot) => slot.id),
  ['T1', 'T2', 'T3', 'T4', 'T5'],
  'turno tarde debe tener cinco módulos en el orden institucional'
);

assert.deepStrictEqual(
  rules.buildContinuousRange(['M2', 'M3']),
  { start: '08:30', end: '10:50', shift: 'Mañana', count: 2 },
  'el recreo no debe cortar una selección continua'
);

assert.deepStrictEqual(
  rules.buildContinuousRange(['T2', 'T3', 'T4']),
  { start: '14:00', end: '17:20', shift: 'Tarde', count: 3 },
  'la selección de tarde debe abarcar desde el primer inicio al último fin'
);

assert.throws(
  () => rules.buildContinuousRange(['M2', 'M4']),
  /NON_CONTIGUOUS_SELECTION/,
  'no se deben admitir módulos salteados'
);

assert.throws(
  () => rules.buildContinuousRange(['M5', 'T1']),
  /MIXED_SHIFT_SELECTION/,
  'no se deben mezclar turnos en una misma reserva'
);

assert.strictEqual(rules.isInstitutionalEmail('docente@abc.gob.ar'), true);
assert.strictEqual(rules.isInstitutionalEmail('DOCENTE@ABC.GOB.AR'), true);
assert.strictEqual(rules.isInstitutionalEmail('docente@gmail.com'), false);

assert.strictEqual(rules.isValidEmail('nombre@gmail.com'), true);
assert.strictEqual(rules.isValidEmail('docente@abc.gob.ar'), true);
assert.strictEqual(rules.isValidEmail('correo-invalido'), false);

assert.deepStrictEqual(
  rules.buildWeeklyDates('2026-09-01', '2026-09-29'),
  ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']
);

assert.throws(
  () => rules.buildWeeklyDates('2026-09-29', '2026-09-01'),
  /INVALID_REPEAT_RANGE/
);

console.log('reservas-audiovisuales.test.js: all assertions passed');
