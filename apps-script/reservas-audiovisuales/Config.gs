var RESERVAS_SETTINGS_ = Object.freeze({
  ENVIRONMENT_PROPERTY: 'RESERVAS_ENVIRONMENT',
  SPREADSHEET_PROPERTY: 'RESERVAS_SPREADSHEET_ID',
  CALENDAR_PROPERTY: 'RESERVAS_CALENDAR_ID',
  RESERVAS_SHEET: 'Reservas',
  CONFIG_SHEET: 'Configuración',
  BLOCKED_DAYS_SHEET: 'Días bloqueados',
  ADMIN_SHEET: 'Administración',
  TIME_ZONE: 'America/Argentina/Buenos_Aires',
  BOOKING_WINDOW_DAYS: 60
});

var RESERVAS_ENVIRONMENTS_ = Object.freeze({
  pilot: Object.freeze({
    spreadsheetId: '1mvbJGjwWWFi7RI1cWCtqppALxGre7WUKg9u0_YeR2Hk',
    calendarId: 'classroom108484736585769598885@group.calendar.google.com'
  }),
  production: Object.freeze({
    spreadsheetId: '1o8G7tD-w1FBA4LB3zC3SEtx4hVXKvALSupGnHEMqHkQ',
    calendarId: '5780a0363aca1620734b2f154ddab8409488e28886e3232631f6d6b6ab4c5ebf@group.calendar.google.com'
  })
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

function reservationEnvironment_() {
  var value = PropertiesService.getScriptProperties().getProperty(RESERVAS_SETTINGS_.ENVIRONMENT_PROPERTY);
  var normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PILOT') return 'pilot';
  if (normalized === 'PRODUCTION') return 'production';
  throw new Error('MISSING_ENVIRONMENT_CONFIGURATION');
}

function reservationSpreadsheetId_() {
  var value = PropertiesService.getScriptProperties().getProperty(RESERVAS_SETTINGS_.SPREADSHEET_PROPERTY);
  if (!value) throw new Error('MISSING_SPREADSHEET_CONFIGURATION');
  return String(value).trim();
}

function reservationCalendarPropertyId_() {
  var value = PropertiesService.getScriptProperties().getProperty(RESERVAS_SETTINGS_.CALENDAR_PROPERTY);
  return String(value || '').trim();
}

function validateReservationEnvironmentConfiguration_() {
  var environment = reservationEnvironment_();
  var expected = RESERVAS_ENVIRONMENTS_[environment];
  var spreadsheetId = reservationSpreadsheetId_();
  var calendarId = reservationCalendarPropertyId_();

  if (!calendarId) throw new Error('MISSING_CALENDAR_CONFIGURATION');
  if (spreadsheetId !== expected.spreadsheetId || calendarId !== expected.calendarId) {
    throw new Error('ENVIRONMENT_CONFIGURATION_MISMATCH');
  }

  return { environment: environment };
}

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
