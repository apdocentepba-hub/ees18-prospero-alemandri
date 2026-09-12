const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const index = read('index.html');
const vida = read('vida-escolar.html');
const mainJs = read('assets/js/main.js');
const stylesCss = read('assets/css/styles.css');
const carouselCss = read('assets/css/novedades-carousel.css');
const actualidadCss = read('assets/css/actualidad.css');
const canonicalLogo = 'https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/celeste_cristina.jpg';

assert(fs.existsSync(path.join(root, 'assets/img/logo-ees18.jpg')), 'local fallback JPG logo must exist');
assert(index.includes(canonicalLogo), 'home must use the same ENSPA logo source that users see as correct');
assert((index.match(/celeste_cristina\.jpg/g) || []).length >= 2, 'home header and hero must both use the canonical ENSPA logo');
assert(vida.includes(canonicalLogo), 'Vida escolar must use the same canonical ENSPA logo as home');
assert(!index.includes('assets/img/logo-ees18.svg'), 'home must not replace the institutional logo with the generated SVG');
assert(!vida.includes('assets/img/logo-ees18.svg'), 'Vida escolar must not replace the institutional logo with the generated SVG');
assert(mainJs.includes(canonicalLogo), 'main.js must define the canonical ENSPA logo source');
assert(mainJs.includes("querySelectorAll('.enspa-logo')"), 'main.js must normalize every ENSPA logo instance on internal pages');
assert(/logo\.src\s*=\s*ENSPA_LOGO_SRC/.test(mainJs), 'main.js must assign the canonical source to each ENSPA logo');

const rootHtmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
rootHtmlFiles.forEach((name) => {
  const html = read(name);
  if (!html.includes('class="enspa-logo')) return;
  assert(html.includes('assets/js/main.js'), `${name} must load main.js so the shared ENSPA logo stays consistent`);
});

assert(/\.enspa-logo\s*\{[^}]*object-fit:\s*contain/s.test(stylesCss), 'logos must render complete without cropping');
assert(/\.enspa-logo--hero\s*\{[^}]*object-fit:\s*contain/s.test(stylesCss), 'hero logo must render complete without cropping');

assert(carouselCss.includes('aspect-ratio: 16 / 10;'), 'home banners must use a controlled landscape ratio');
assert(carouselCss.includes('object-fit: cover;'), 'home banner images must crop cleanly instead of letterboxing');
assert(actualidadCss.includes('aspect-ratio: 4 / 3;'), 'Vida escolar media must use a controlled card ratio');
assert(actualidadCss.includes('object-fit: cover;'), 'Vida escolar images must fill their media frame cleanly');
assert(actualidadCss.includes('border-radius: 18px;'), 'Vida escolar cards must use the compact rounded-card treatment');

console.log('visual-integrity.test.js: all assertions passed');
