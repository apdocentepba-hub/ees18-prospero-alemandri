const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const home = read('index.html');
const sitemap = read('sitemap.xml');

assert(home.includes('143 programas disponibles'), 'home must show the current program count');
assert(!home.includes('138 programas disponibles'), 'home must not show the stale program count');
assert(!home.includes('homeCompletaCarreraStatus'), 'home must not keep the obsolete Completa Carrera status loader');
assert(sitemap.includes('https://ees18avellaneda.edu.ar/mesas-completa-carrera-octubre-2026.html'), 'sitemap must include the October 2026 Completa Carrera schedule');
assert(!sitemap.includes('\\n'), 'sitemap must not contain escaped newline text');

console.log('site-maintenance.test.js: all assertions passed');
