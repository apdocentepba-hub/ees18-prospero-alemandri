const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'apps-script', 'reservas-audiovisuales');
const reservationsSource = fs.readFileSync(path.join(backendDir, 'Reservations.gs'), 'utf8');
const dataSource = fs.readFileSync(path.join(backendDir, 'Data.gs'), 'utf8');
const adminSource = fs.readFileSync(path.join(backendDir, 'AdminSetup.gs'), 'utf8');
const queuePath = path.join(backendDir, 'SecondaryQueue.gs');
const frontendSource = fs.readFileSync(path.join(root, 'assets', 'js', 'reservas-audiovisuales.js'), 'utf8');

assert.strictEqual(
  reservationsSource.includes('syncReservationToCalendar_(created);'),
  false,
  'createReservation no debe esperar a Google Calendar antes de responder'
);
assert.strictEqual(
  reservationsSource.includes('sendReservationConfirmation_(created, created.rawCancellationToken_);'),
  false,
  'createReservation no debe esperar al correo antes de responder'
);
assert(
  reservationsSource.includes('queueReservationSecondaryProcessing_(createdRecords)'),
  'createReservation debe encolar Calendar + correo después de persistir la reserva'
);

assert(fs.existsSync(queuePath), 'debe existir SecondaryQueue.gs para procesar servicios secundarios fuera de la petición web');
const queueSource = fs.readFileSync(queuePath, 'utf8');
assert.doesNotThrow(() => new vm.Script(queueSource, { filename: 'SecondaryQueue.gs' }), 'SecondaryQueue.gs debe tener sintaxis JavaScript válida');
assert(queueSource.includes("ScriptApp.newTrigger('processPendingReservationSecondaries')"), 'la cola debe programar un trigger diferido');
assert(queueSource.includes('.after('), 'el trigger secundario debe ser one-shot y no un polling permanente');
assert(queueSource.includes('syncReservationToCalendar_'), 'el procesador secundario debe crear/sincronizar Calendar');
assert(queueSource.includes('sendReservationConfirmation_'), 'el procesador secundario debe enviar el correo de confirmación');
assert(queueSource.includes('PropertiesService.getScriptProperties()'), 'el token crudo debe mantenerse sólo en propiedades privadas del script');
assert.strictEqual(queueSource.includes('Hash cancelación'), false, 'la cola no debe guardar el token crudo en la planilla');

assert(
  dataSource.includes("mailSent: String(valueForHeader_(map, values, 'Aviso enviado')"),
  'los registros deben leer Aviso enviado para que el procesador sepa qué correos faltan'
);
assert(
  adminSource.includes('ensureReservationSecondaryTriggerAuthorization_()'),
  'setupReservationSystem debe autorizar/probar el mecanismo de triggers secundarios'
);
assert(
  frontendSource.includes('La confirmación y el enlace de cancelación se envían al correo indicado.'),
  'la UI debe dejar claro que el correo se envía después de confirmar la reserva'
);

console.log('apps-script-async-secondaries.test.js: all assertions passed');
