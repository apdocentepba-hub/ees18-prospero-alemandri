const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const scriptPath = path.join(__dirname, '..', 'apps-script', 'analiticos-pases', 'AdminSeguimiento.gs');
const source = fs.readFileSync(scriptPath, 'utf8');
const h = require(scriptPath);

assert.equal(h.asClaveLibroFolio_('91', '84'), '91|84');
assert.equal(h.asExtraerIdDrive_('https://docs.google.com/spreadsheets/d/1xlnO2NPnXngnkLNIl9b4Kc8ERK6gNuo7qxn2-T1rjRU/edit'), '1xlnO2NPnXngnkLNIl9b4Kc8ERK6gNuo7qxn2-T1rjRU');

// El reconciliador debe leer Libro/Folio desde el analítico individual.
assert.match(source, /AS_ANALITICO_LIBRO_CELL\s*=\s*'D132'/);
assert.match(source, /AS_ANALITICO_FOLIO_CELL\s*=\s*'G132'/);
assert.match(source, /asAplicarLibroFolioIndice_/);
assert.match(source, /Libro\/Folio .* ya pertenece/);
assert.match(source, /aparece más de una vez en el Índice/);
assert.match(source, /vs analítico/);

// Debe reflejar el resultado también en Seguimiento.
assert.match(source, /dh\['Libro'\]/);
assert.match(source, /dh\['Folio'\]/);

// Fila nueva limpia: nunca copiar valores constantes de otra persona.
assert.match(source, /dst\.clearContent\(\)/);
assert.doesNotMatch(source, /PASTE_VALUES/);
assert.match(source, /PASTE_DATA_VALIDATION/);

// Los tres índices derivados deben refrescarse desde la hoja base Índice.
assert.equal(typeof h.asOrdenarFilasIndice_, 'function');
const muestra = [
  ['ZETA ANA', '50000002', '10', '2', '', '', '', '', ''],
  ['ALFA BERTA', '40000001', '2', '10', '', '', '', '', ''],
  ['BETA CARLA', '30000003', '2', '3', '', '', '', '', '']
];
assert.deepEqual(h.asOrdenarFilasIndice_(muestra, 'alfabetico').map(r => r[0]), ['ALFA BERTA', 'BETA CARLA', 'ZETA ANA']);
assert.deepEqual(h.asOrdenarFilasIndice_(muestra, 'dni').map(r => r[1]), ['30000003', '40000001', '50000002']);
assert.deepEqual(h.asOrdenarFilasIndice_(muestra, 'libro-folio').map(r => `${r[2]}/${r[3]}`), ['2/3', '2/10', '10/2']);
assert.match(source, /Orden alfabético/);
assert.match(source, /Orden por DNI/);
assert.match(source, /Orden por Libro y Folio/);
assert.match(source, /asRefrescarVistasIndice_/);

console.log('libro-folio-sync OK');
