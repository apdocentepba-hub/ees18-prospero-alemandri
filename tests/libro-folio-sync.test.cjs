const assert = require('node:assert/strict');
const h = require('../apps-script/analiticos-pases/AdminSeguimiento.gs');

assert.equal(typeof h.asDecidirLibroFolio_, 'function');
assert.deepEqual(h.asDecidirLibroFolio_({dni:'48514569',libro:'91',folio:'84'}, [], []), {ok:true, accion:'crear'});
assert.deepEqual(h.asDecidirLibroFolio_({dni:'48514569',libro:'91',folio:'84'}, [['GARCIA MARIA BELEN','48514569','','']], []), {ok:true, accion:'completar'});
assert.deepEqual(h.asDecidirLibroFolio_({dni:'48514569',libro:'91',folio:'84'}, [['GARCIA MARIA BELEN','48514569','91','84']], []), {ok:true, accion:'sin-cambios'});
assert.equal(h.asDecidirLibroFolio_({dni:'48514569',libro:'91',folio:'84'}, [['GARCIA MARIA BELEN','48514569','90','80']], []).ok, false);
assert.equal(h.asDecidirLibroFolio_({dni:'48514569',libro:'91',folio:'84'}, [], [['OTRA PERSONA','40000000','91','84']]).ok, false);
assert.equal(h.asDecidirLibroFolio_({dni:'48514569',libro:'91',folio:'84'}, [['A','48514569','91','84'],['B','48514569','91','84']], []).ok, false);
console.log('libro-folio-sync OK');
