const assert = require('assert');
const fs = require('fs');
const path = require('path');

const frontendPath = path.join(__dirname, '..', 'assets', 'js', 'reservas-audiovisuales.js');
const rules = require(frontendPath);
const frontendSource = fs.readFileSync(frontendPath, 'utf8');

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

assert.throws(
  () => rules.buildWeeklyDates('2026-09-01', '2026-11-15'),
  /REPEAT_WINDOW_EXCEEDED/
);

const payload = rules.buildReservationPayload(
  {
    teacher: 'Luciano Leal',
    email: 'facutronge27@gmail.com',
    course: '5to 2da',
    subject: 'Geografía',
    mode: 'weekly',
    repeatUntil: '2026-09-29',
    projector: true,
    speakers: false,
    schoolNotebook: true,
    internet: true,
    observations: 'Clase con mapas.'
  },
  {
    selectedDate: '2026-09-01',
    selectedSlotIds: ['M2', 'M3']
  }
);

assert.deepStrictEqual(payload, {
  mode: 'weekly',
  date: '2026-09-01',
  repeatUntil: '2026-09-29',
  slotIds: ['M2', 'M3'],
  start: '08:30',
  end: '10:50',
  teacher: 'Luciano Leal',
  email: 'facutronge27@gmail.com',
  emailType: 'externo',
  course: '5to 2da',
  subject: 'Geografía',
  shift: 'Mañana',
  resources: {
    projector: true,
    speakers: false,
    schoolNotebook: true,
    internet: true
  },
  observations: 'Clase con mapas.'
});

assert.throws(
  () => rules.buildReservationPayload(
    { teacher: 'Docente', email: 'correo-invalido', course: '5° 1°', subject: 'Historia', mode: 'single' },
    { selectedDate: '2026-09-01', selectedSlotIds: ['M1'] }
  ),
  /INVALID_EMAIL/
);

assert.deepStrictEqual(
  rules.occupiedSlotIdsFromMonthDay({ occupiedSlotIds: ['M1', 'T2', 'INVALID'] }),
  ['M1', 'T2'],
  'la vista diaria debe poder pintar horarios inmediatamente con el resumen mensual'
);
assert.deepStrictEqual(
  rules.occupiedSlotIdsFromMonthDay(null),
  [],
  'si el mes no tiene detalle de módulos, la selección optimista debe ser vacía'
);

const gate = rules.createLatestRequestGate();
const firstRequest = gate.next('2026-09-02');
const secondRequest = gate.next('2026-09-03');
assert.strictEqual(gate.isCurrent(firstRequest, '2026-09-02'), false, 'una respuesta vieja no debe bloquear ni sobrescribir el día nuevo');
assert.strictEqual(gate.isCurrent(secondRequest, '2026-09-03'), true, 'la última selección debe seguir vigente');

assert.strictEqual(
  frontendSource.includes('if (!apiReady || state.dayLoading) return;'),
  false,
  'el calendario no debe ignorar clics mientras otra consulta diaria está en curso'
);
assert(frontendSource.includes('const monthAvailabilityCache = new Map()'), 'los meses ya cargados deben reutilizarse en memoria');
assert(frontendSource.includes('const dayRequestGate = rules.createLatestRequestGate()'), 'la UI debe descartar respuestas de días viejos');
assert(frontendSource.includes('rules.occupiedSlotIdsFromMonthDay(state.monthDays[isoDate])'), 'los horarios deben pintarse con el resumen mensual antes de la verificación fresca');
assert(frontendSource.includes('dayRequestGate.isCurrent'), 'una respuesta diaria vieja no debe sobrescribir la selección actual');

// Regression 4: clicking a day must be fully local once the month snapshot is loaded.
assert.strictEqual(
  frontendSource.includes("requestJsonp('availability'"),
  false,
  'tocar un día no debe iniciar otra ejecución de Apps Script; el mes ya contiene occupiedSlotIds'
);

// Regression 5: a successful month snapshot must survive reloads so a cold Apps Script start cannot freeze the calendar.
assert(
  frontendSource.includes('window.localStorage'),
  'el calendario debe persistir snapshots públicos en localStorage'
);
assert(
  frontendSource.includes('EES18_RESERVAS_MONTH_SNAPSHOT_'),
  'el snapshot persistente debe usar una clave institucional propia'
);
assert(
  frontendSource.includes('Actualizando…'),
  'sin snapshot todavía, los días deben indicar Actualizando en vez de fingir que están bloqueados'
);
assert(
  frontendSource.includes('scheduleMonthRetry'),
  'si la actualización mensual falla o vence, la UI debe reintentar en segundo plano'
);

console.log('reservas-audiovisuales.test.js: all assertions passed');
