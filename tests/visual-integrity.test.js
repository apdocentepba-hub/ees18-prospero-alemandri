const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const index = read('index.html');
const vida = read('vida-escolar.html');
const carouselCss = read('assets/css/novedades-carousel.css');
const actualidadCss = read('assets/css/actualidad.css');

assert(fs.existsSync(path.join(root, 'assets/img/logo-ees18.jpg')), 'original local JPG logo must exist');
assert(index.includes('assets/img/logo-ees18.jpg'), 'home must use the original local JPG logo');
assert(vida.includes('assets/img/logo-ees18.jpg'), 'Vida escolar must use the original local JPG logo');
assert(!index.includes('assets/img/logo-ees18.svg'), 'home must not replace the original logo with the generated SVG');
assert(!vida.includes('assets/img/logo-ees18.svg'), 'Vida escolar must not replace the original logo with the generated SVG');
assert(!index.includes('isfd100-bue.infd.edu.ar'), 'home must not depend on the external ENSPA logo');
assert(!vida.includes('isfd100-bue.infd.edu.ar'), 'Vida escolar must not depend on the external ENSPA logo');

assert(carouselCss.includes('aspect-ratio: 16 / 10;'), 'home banners must use a controlled landscape ratio');
assert(carouselCss.includes('object-fit: cover;'), 'home banner images must crop cleanly instead of letterboxing');
assert(actualidadCss.includes('aspect-ratio: 4 / 3;'), 'Vida escolar media must use a controlled card ratio');
assert(actualidadCss.includes('object-fit: cover;'), 'Vida escolar images must fill their media frame cleanly');
assert(actualidadCss.includes('border-radius: 18px;'), 'Vida escolar cards must use the compact rounded-card treatment');

console.log('visual-integrity.test.js: all assertions passed');
