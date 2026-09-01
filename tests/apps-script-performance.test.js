const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'apps-script', 'reservas-audiovisuales');

// Regression 1: a single Apps Script execution must not reopen the same spreadsheet repeatedly.
let openByIdCalls = 0;
const headers = ['ID', 'Estado', 'ID evento calendario', 'Estado sincronización', 'Aviso enviado', 'Última actualización'];
let storedRow = ['r1', 'Confirmada', '', 'PENDIENTE_CALENDAR', 'No', ''];
let rowWrites = 0;

const fakeSheet = {
  getLastRow() { return 5; },
  getLastColumn() { return headers.length; },
  getRange(row, column, numRows, numColumns) {
    return {
      getValues() {
        if (row === 1) return [headers.slice()];
        if (row === 5 && column === 1 && numRows === 1 && numColumns === headers.length) return [storedRow.slice()];
        throw new Error(`Unexpected getValues range ${row},${column},${numRows},${numColumns}`);
      },
      setValues(values) {
        if (row !== 5 || column !== 1 || numRows !== 1 || numColumns !== headers.length) {
          throw new Error(`Expected one batched row write, got ${row},${column},${numRows},${numColumns}`);
        }
        rowWrites += 1;
        storedRow = values[0].slice();
      },
      setValue() {
        throw new Error('Performance regression: field updates must be batched, not one setValue per cell');
      }
    };
  }
};

const fakeSpreadsheet = {
  getSheetByName(name) {
    if (name === 'Reservas') return fakeSheet;
    return null;
  }
};

const dataContext = vm.createContext({
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
  SpreadsheetApp: {
    openById() {
      openByIdCalls += 1;
      return fakeSpreadsheet;
    }
  },
  PropertiesService: {
    getScriptProperties() {
      return { getProperty() { return ''; } };
    }
  },
  Utilities: {
    formatDate(value) { return String(value); }
  },
  reservationSpreadsheetId_() { return 'sheet-production'; },
  RESERVAS_SETTINGS_: {
    RESERVAS_SHEET: 'Reservas',
    BLOCKED_DAYS_SHEET: 'Días bloqueados',
    CONFIG_SHEET: 'Configuración',
    TIME_ZONE: 'America/Argentina/Buenos_Aires'
  },
  ensureReservationColumns_() {},
  yesNoReservation_(value) { return value ? 'Sí' : 'No'; }
});

vm.runInContext(fs.readFileSync(path.join(backendDir, 'Data.gs'), 'utf8'), dataContext, { filename: 'Data.gs' });

dataContext.getReservationSpreadsheet_();
dataContext.getReservationSpreadsheet_();
assert.strictEqual(openByIdCalls, 1, 'la planilla debe abrirse una sola vez por ejecución');

// When the caller already knows rowNumber, updating Calendar/Mail state must not rescan the entire sheet.
dataContext.findReservationRecordById_ = function () {
  throw new Error('Performance regression: full reservation scan');
};
assert.doesNotThrow(() => dataContext.updateReservationFieldsById_(
  'r1',
  { calendarEventId: 'evt-1', syncState: 'OK', mailSent: 'Sí' },
  5
));
assert.strictEqual(rowWrites, 1, 'los campos de una reserva deben persistirse con una sola escritura de fila');
assert.strictEqual(storedRow[2], 'evt-1');
assert.strictEqual(storedRow[3], 'OK');
assert.strictEqual(storedRow[4], 'Sí');

// Regression 2: public availability may be cached briefly, but the cache must contain no PII.
let reservationReads = 0;
let blockedReads = 0;
const cacheStore = new Map();
const availabilityContext = vm.createContext({
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
  CacheService: {
    getScriptCache() {
      return {
        get(key) { return cacheStore.has(key) ? cacheStore.get(key) : null; },
        put(key, value) { cacheStore.set(key, value); },
        remove(key) { cacheStore.delete(key); }
      };
    }
  },
  readReservationRecords_() {
    reservationReads += 1;
    return [{
      id: 'private-id',
      teacher: 'Docente Privado',
      email: 'privado@abc.gob.ar',
      state: 'Confirmada',
      date: '2026-09-03',
      start: '07:30',
      end: '08:30',
      syncState: 'OK'
    }];
  },
  readBlockedDays_() {
    blockedReads += 1;
    return [{ date: '2026-09-04', type: 'FERIADO', description: 'Feriado', active: true }];
  },
  reservationOccupiesRoom_(record) { return record && record.state === 'Confirmada'; },
  allReservationSlots_() {
    return [
      { id: 'M1', start: '07:30', end: '08:30', shift: 'Mañana' },
      { id: 'M2', start: '08:30', end: '09:30', shift: 'Mañana' }
    ];
  },
  RESERVAS_SETTINGS_: {
    BOOKING_WINDOW_DAYS: 60,
    TIME_ZONE: 'America/Argentina/Buenos_Aires'
  },
  Utilities: {
    formatDate(date, _tz, pattern) {
      if (pattern === 'yyyy-MM-dd') return date.toISOString().slice(0, 10);
      if (pattern === 'HH:mm') return date.toISOString().slice(11, 16);
      throw new Error('Unsupported pattern');
    }
  }
});

vm.runInContext(fs.readFileSync(path.join(backendDir, 'Availability.gs'), 'utf8'), availabilityContext, { filename: 'Availability.gs' });

const snapshot1 = availabilityContext.readPublicAvailabilitySnapshot_();
const snapshot2 = availabilityContext.readPublicAvailabilitySnapshot_();
assert.strictEqual(reservationReads, 1, 'dos consultas públicas consecutivas deben reutilizar el snapshot cacheado');
assert.strictEqual(blockedReads, 1, 'los días bloqueados también deben reutilizar el snapshot cacheado');
assert.deepStrictEqual(JSON.parse(JSON.stringify(snapshot2)), JSON.parse(JSON.stringify(snapshot1)));
const serializedSnapshot = JSON.stringify(snapshot1).toLowerCase();
assert.strictEqual(serializedSnapshot.includes('docente privado'), false, 'el caché público no debe contener nombres');
assert.strictEqual(serializedSnapshot.includes('privado@abc.gob.ar'), false, 'el caché público no debe contener correos');
assert.strictEqual(serializedSnapshot.includes('private-id'), false, 'el caché público no debe contener IDs de reserva');

availabilityContext.invalidatePublicAvailabilityCache_();
availabilityContext.readPublicAvailabilitySnapshot_();
assert.strictEqual(reservationReads, 2, 'invalidar el cache debe forzar una lectura nueva');
assert.strictEqual(blockedReads, 2, 'invalidar el cache debe forzar una lectura nueva de bloqueos');

console.log('apps-script-performance.test.js: all assertions passed');
