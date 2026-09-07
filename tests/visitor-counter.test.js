const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(
  index,
  /<footer[\s\S]*data-visitor-counter[\s\S]*id="visitor-count"[\s\S]*<\/footer>/i,
  'La portada debe mostrar el contador de visitas dentro del footer.'
);

assert.match(
  index,
  /<script\s+src="assets\/js\/visitor-counter\.js"\s*><\/script>/i,
  'La portada debe cargar el script aislado del contador de visitas.'
);

const counterScriptPath = path.join(root, 'assets', 'js', 'visitor-counter.js');
assert.ok(
  fs.existsSync(counterScriptPath),
  'Debe existir assets/js/visitor-counter.js.'
);

const counterScript = fs.readFileSync(counterScriptPath, 'utf8');
assert.match(
  counterScript,
  /https:\/\/counterapi\.com\/api\/ees18avellaneda\.edu\.ar\/view\/home-visits-from-2026-09-07-v1/,
  'El contador debe usar una clave nueva para comenzar a contar desde el 7/09/2026.'
);
assert.match(
  counterScript,
  /readOnly=true/,
  'Las recargas dentro de la misma sesión deben poder leer el total sin incrementarlo.'
);
assert.match(
  counterScript,
  /sessionStorage/,
  'El contador debe evitar sumar varias recargas de la misma sesión.'
);
assert.match(
  counterScript,
  /Intl\.NumberFormat\(['"]es-AR['"]\)/,
  'El total debe mostrarse con formato numérico argentino.'
);
assert.match(
  counterScript,
  /\.catch\([\s\S]*hidden\s*=\s*true/,
  'Si el servicio externo falla, el contador debe ocultarse sin romper la página.'
);

console.log('visitor-counter.test.js: OK');
