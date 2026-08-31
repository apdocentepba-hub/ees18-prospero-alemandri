var RESERVAS_SETTINGS_ = Object.freeze({
  SPREADSHEET_ID: '1o8G7tD-w1FBA4LB3zC3SEtx4hVXKvALSupGnHEMqHkQ',
  RESERVAS_SHEET: 'Reservas',
  CONFIG_SHEET: 'Configuración',
  BLOCKED_DAYS_SHEET: 'Días bloqueados',
  ADMIN_SHEET: 'Administración',
  TIME_ZONE: 'America/Argentina/Buenos_Aires',
  BOOKING_WINDOW_DAYS: 60
});

var RESERVAS_SLOTS_ = Object.freeze({
  MANANA: Object.freeze([
    Object.freeze({ id: 'M1', start: '07:30', end: '08:30', shift: 'Mañana' }),
    Object.freeze({ id: 'M2', start: '08:30', end: '09:30', shift: 'Mañana' }),
    Object.freeze({ id: 'M3', start: '09:50', end: '10:50', shift: 'Mañana' }),
    Object.freeze({ id: 'M4', start: '10:50', end: '11:50', shift: 'Mañana' }),
    Object.freeze({ id: 'M5', start: '11:50', end: '12:50', shift: 'Mañana' })
  ]),
  TARDE: Object.freeze([
    Object.freeze({ id: 'T1', start: '13:00', end: '14:00', shift: 'Tarde' }),
    Object.freeze({ id: 'T2', start: '14:00', end: '15:00', shift: 'Tarde' }),
    Object.freeze({ id: 'T3', start: '15:20', end: '16:20', shift: 'Tarde' }),
    Object.freeze({ id: 'T4', start: '16:20', end: '17:20', shift: 'Tarde' }),
    Object.freeze({ id: 'T5', start: '17:20', end: '18:20', shift: 'Tarde' })
  ])
});

function allReservationSlots_() {
  return RESERVAS_SLOTS_.MANANA.concat(RESERVAS_SLOTS_.TARDE);
}

function reservationSlotById_(slotId) {
  var slots = allReservationSlots_();
  for (var i = 0; i < slots.length; i += 1) {
    if (slots[i].id === slotId) return slots[i];
  }
  return null;
}
