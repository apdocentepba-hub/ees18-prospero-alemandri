const assert = require('node:assert/strict');
const h = require('../apps-script/analiticos-pases/AdminSeguimiento.gs');

assert.equal(h.asDebeSincronizar_('VERIFICADO', 'VALIDADA', 'Sí'), true);
assert.equal(h.asDebeSincronizar_('verificado', 'validada', 'si'), true);
assert.equal(h.asDebeSincronizar_('VERIFICADO', 'VALIDADA', 'No'), false);
assert.equal(h.asDebeSincronizar_('PENDIENTE', 'VALIDADA', 'Sí'), false);
assert.equal(h.asDebeSincronizar_('VERIFICADO', 'PENDIENTE', 'Sí'), false);
assert.equal(h.asNormalizarDni_('47.963.511'), '47963511');
assert.equal(h.asNorm_(' Sí '), 'SI');
assert.equal(h.asNombreCompleto_('Marino Baez', 'Ernestina Zahira Isabella'), 'MARINO BAEZ ERNESTINA ZAHIRA ISABELLA');
assert.equal(h.asDestino_(''), '-');
assert.equal(h.asDestino_('Ninguno'), 'Ninguno');

console.log('admin-seguimiento: 10/10 OK');
