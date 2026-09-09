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
const fullOriginalLogo = 'https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/Logo-Superior-863x1000.jpg';

assert(fs.existsSync(path.join(root, 'assets/img/logo-ees18.jpg')), 'local fallback JPG logo must exist');
assert(index.includes(fullOriginalLogo), 'home must use the full original ENSPA logo from the Profesorado source');
assert((index.match(/Logo-Superior-863x1000\.jpg/g) || []).length >= 2, 'home header and hero must both use the full original logo');
assert(index.includes("this.src='assets/img/logo-ees18.jpg'"), 'home must keep a local fallback if the source image fails');
assert(!index.includes('assets/img/logo-ees18.svg'), 'home must not replace the original logo with the generated SVG');
assert(vida.includes('assets/img/logo-ees18.jpg'), 'Vida escolar keeps the local original-logo fallback');
assert(!vida.includes('assets/img/logo-ees18.svg'), 'Vida escolar must not replace the original logo with the generated SVG');
assert(/\.enspa-logo\s*\{[^}]*object-fit:\s*contain/s.test(stylesCss), 'logos must render complete without cropping');
assert(/\.enspa-logo--hero\s*\{[^}]*object-fit:\s*contain/s.test(stylesCss), 'hero logo must render complete without cropping');

assert(carouselCss.includes('aspect-ratio: 16 / 10;'), 'home banners must use a controlled landscape ratio');
assert(carouselCss.includes('object-fit: cover;'), 'home banner images must crop cleanly instead of letterboxing');
assert(actualidadCss.includes('aspect-ratio: 4 / 3;'), 'Vida escolar media must use a controlled card ratio');
assert(actualidadCss.includes('object-fit: cover;'), 'Vida escolar images must fill their media frame cleanly');
assert(actualidadCss.includes('border-radius: 18px;'), 'Vida escolar cards must use the compact rounded-card treatment');

console.log('visual-integrity.test.js: all assertions passed');
