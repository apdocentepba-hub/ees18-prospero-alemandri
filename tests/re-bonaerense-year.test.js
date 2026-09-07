const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vida = fs.readFileSync(path.join(root, 'vida-escolar.html'), 'utf8');

assert(
  home.includes('<span class="news-label">Proyecto institucional · 2026</span><h2>2.º Encuentro de RE Bonaerense</h2>'),
  'la portada debe mostrar RE Bonaerense como actividad de 2026'
);
assert(
  vida.includes('<span>Actividad destacada · 2026</span><h2>2.º Encuentro de RE Bonaerense</h2>'),
  'Vida escolar debe mostrar RE Bonaerense como actividad destacada de 2026'
);
assert(
  vida.includes('<span class="feature-story__label">Proyecto institucional · 2026</span><h2>Compartimos y celebramos</h2>'),
  'Vida escolar debe rotular RE Bonaerense como proyecto institucional 2026'
);

console.log('re-bonaerense-year.test.js: all assertions passed');
