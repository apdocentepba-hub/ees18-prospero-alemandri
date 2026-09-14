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

console.log('libro-folio-sync OK');
