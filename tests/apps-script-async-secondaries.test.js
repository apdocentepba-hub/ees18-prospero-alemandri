const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'apps-script', 'reservas-audiovisuales');
const reservationsSource = fs.readFileSync(path.join(backendDir, 'Reservations.gs'), 'utf8');
const dataSource = fs.readFileSync(path.join(backendDir, 'Data.gs'), 'utf8');
const adminSource = fs.readFileSync(path.join(backendDir, 'AdminSetup.gs'), 'utf8');
const codeSource = fs.readFileSync(path.join(backendDir, 'Code.gs'), 'utf8');
const queuePath = path.join(backendDir, 'SecondaryQueue.gs');
const diagnosticsPath = path.join(backendDir, 'Diagnostics.gs');
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
assert(queueSource.includes("newTrigger('processPendingReservationSecondaries')"), 'la cola debe programar un trigger diferido');
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

assert(fs.existsSync(diagnosticsPath), 'debe existir Diagnostics.gs para diagnosticar el preflight sin escribir');
const diagnosticsSource = fs.readFileSync(diagnosticsPath, 'utf8');
assert.doesNotThrow(() => new vm.Script(diagnosticsSource, { filename: 'Diagnostics.gs' }), 'Diagnostics.gs debe tener sintaxis JavaScript válida');
for (const stage of ['NORMALIZE', 'LOCK', 'READ', 'PLAN', 'BUILD']) {
  assert(diagnosticsSource.includes(`'${stage}'`), `el diagnóstico debe distinguir la etapa ${stage}`);
}
assert.strictEqual(diagnosticsSource.includes('appendReservationRecord_'), false, 'el diagnóstico no debe escribir una reserva');
assert.strictEqual(diagnosticsSource.includes('setValues('), false, 'el diagnóstico no debe escribir celdas');
assert.strictEqual(diagnosticsSource.includes('syncReservationToCalendar_'), false, 'el diagnóstico no debe tocar Calendar');
assert.strictEqual(diagnosticsSource.includes('sendReservationConfirmation_'), false, 'el diagnóstico no debe enviar correo');
assert(
  diagnosticsSource.includes("typeof queueReservationSecondaryProcessing_ === 'function'"),
  'el diagnóstico debe confirmar que la función de cola está cargada en la versión desplegada'
);
assert(
  diagnosticsSource.includes("typeof processPendingReservationSecondaries === 'function'"),
  'el diagnóstico debe confirmar que el procesador secundario está cargado en la versión desplegada'
);
assert(
  diagnosticsSource.includes('runtimeDependencies'),
  'el diagnóstico debe devolver el estado de las dependencias de runtime'
);
assert(
  diagnosticsSource.includes("stage = 'TARGET'"),
  'el diagnóstico debe inspeccionar la fila objetivo antes de cualquier escritura'
);
assert(
  diagnosticsSource.includes('canEdit'),
  'el diagnóstico debe informar si la fila objetivo es editable'
);
assert(
  diagnosticsSource.includes('nextRow'),
  'el diagnóstico debe informar qué fila usaría appendReservationRecord_'
);
assert(
  diagnosticsSource.includes('missingColumns'),
  'el diagnóstico debe informar si faltan columnas requeridas sin agregarlas'
);
assert(
  codeSource.includes("action === 'diagnoseCreate'"),
  'Code.gs debe exponer el preflight seguro como diagnoseCreate'
);
assert(
  codeSource.includes('diagnoseReservationCreate_(payload)'),
  'Code.gs debe enviar el payload al diagnóstico sin escritura'
);

console.log('apps-script-async-secondaries.test.js: all assertions passed');
