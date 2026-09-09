const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const index = read('index.html');
const vida = read('vida-escolar.html');
const stylesCss = read('assets/css/styles.css');
const carouselCss = read('assets/css/novedades-carousel.css');
const actualidadCss = read('assets/css/actualidad.css');
const logoPath = path.join(root, 'assets/img/logo-ees18.jpg');

assert(fs.existsSync(logoPath), 'local ENSPA condor logo must exist');
assert(fs.statSync(logoPath).size > 50000, 'ENSPA condor logo must not regress to the tiny pixelated source');
assert((index.match(/assets\/img\/logo-ees18\.jpg/g) || []).length >= 4, 'home metadata, header and hero must all use the local ENSPA condor logo');
assert(vida.includes('assets/img/logo-ees18.jpg'), 'Vida escolar must use the local ENSPA condor logo');
assert(!index.includes('Logo-Superior-863x1000.jpg'), 'home must not use the 100-year Profesorado logo');
assert(!index.includes('isfd100-bue.infd.edu.ar'), 'home must not hotlink any Profesorado logo');
assert(!index.includes('assets/img/logo-ees18.svg'), 'home must not replace the original logo with the generated SVG');
assert(!vida.includes('assets/img/logo-ees18.svg'), 'Vida escolar must not replace the original logo with the generated SVG');
assert(/\.enspa-logo\s*\{[^}]*object-fit:\s*contain/s.test(stylesCss), 'logos must render complete without cropping');
assert(/\.enspa-logo--hero\s*\{[^}]*object-fit:\s*contain/s.test(stylesCss), 'hero logo must render complete without cropping');

assert(carouselCss.includes('aspect-ratio: 16 / 10;'), 'home banners must use a controlled landscape ratio');
assert(carouselCss.includes('object-fit: cover;'), 'home banner images must crop cleanly instead of letterboxing');
assert(actualidadCss.includes('aspect-ratio: 4 / 3;'), 'Vida escolar media must use a controlled card ratio');
assert(actualidadCss.includes('object-fit: cover;'), 'Vida escolar images must fill their media frame cleanly');
assert(actualidadCss.includes('border-radius: 18px;'), 'Vida escolar cards must use the compact rounded-card treatment');

console.log('visual-integrity.test.js: all assertions passed');
