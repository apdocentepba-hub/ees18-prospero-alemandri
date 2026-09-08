const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
const comunicados = read('comunicados.html');
const vida = read('vida-escolar.html');
const newsJs = read('assets/js/novedades.js');
const homeCss = read('assets/css/home-layout.css');
const actualidadCss = read('assets/css/actualidad.css');

assert(index.includes('data-news-section="inicio"'), 'Inicio debe incluir el contenedor dinámico de novedades');
assert(index.includes('data-news-list'), 'Inicio debe incluir el viewport/lista del carrusel');
assert(index.includes('data-news-prev'), 'Inicio debe incluir control de novedad anterior');
assert(index.includes('data-news-next'), 'Inicio debe incluir control de novedad siguiente');
assert(index.includes('data-news-dots'), 'Inicio debe incluir indicadores del carrusel');
assert(index.includes('assets/js/novedades-config.js'), 'Inicio debe cargar la configuración de Novedades');
assert(index.includes('assets/js/novedades.js'), 'Inicio debe cargar el cliente de Novedades');
assert(/Novedades destacadas/i.test(index), 'La sección debe titularse Novedades destacadas');
assert(index.includes('Ver comunicados'), 'El fallback debe mantener acceso a Comunicados');
assert(/assets\/css\/home-layout\.css\?v=[A-Za-z0-9._-]+/.test(index), 'Inicio debe versionar home-layout.css para evitar CSS viejo en caché');

assert(comunicados.includes('data-news-section="comunicados"'), 'Comunicados debe tener una lista dinámica');
assert(comunicados.includes('data-news-list'), 'Comunicados debe incluir el contenedor de publicaciones');
assert(comunicados.includes('assets/js/novedades-config.js'), 'Comunicados debe cargar la configuración de Novedades');
assert(comunicados.includes('assets/js/novedades.js'), 'Comunicados debe cargar el cliente de Novedades');
assert(/Consultá nuevamente en unos minutos/i.test(comunicados), 'Comunicados debe tener fallback estable ante caída del servicio');

assert(vida.includes('data-news-section="vida-escolar"'), 'Vida escolar debe tener una fuente dinámica de actividades');
assert(vida.includes('data-news-list'), 'Vida escolar debe incluir el contenedor de actividades');
assert(vida.includes('assets/js/novedades-config.js'), 'Vida escolar debe cargar la configuración de Novedades');
assert(vida.includes('assets/js/novedades.js'), 'Vida escolar debe cargar el cliente de Novedades');
assert(/Actividades destacadas/i.test(vida), 'Vida escolar debe identificar el bloque dinámico de actividades');
assert(vida.includes('2.º Encuentro de RE Bonaerense'), 'Vida escolar debe conservar el archivo histórico de RE Bonaerense');
assert(vida.includes('Leer en Comunidad'), 'Vida escolar debe conservar el archivo histórico de Leer en Comunidad');
assert(/function\s+mountLifeSchoolList\s*\(/.test(newsJs), 'El cliente debe renderizar actividades de Vida escolar con imagen y texto');

assert(/function\s+mountHomeCarousel\s*\(/.test(newsJs), 'El cliente debe montar el carrusel de Inicio');
assert(/function\s+mountNewsList\s*\(/.test(newsJs), 'El cliente debe montar listas dinámicas de novedades');
assert(/ArrowLeft/.test(newsJs) && /ArrowRight/.test(newsJs), 'El carrusel debe responder a teclado');
assert(/touchstart/.test(newsJs) && /touchend/.test(newsJs), 'El carrusel debe soportar swipe táctil');
assert(/45/.test(newsJs), 'El swipe debe exigir un desplazamiento mínimo de 45 px');
assert(!/setInterval\s*\(/.test(newsJs), 'El carrusel no debe usar autoplay');
assert(/createElement/.test(newsJs), 'Las noticias deben construirse con nodos DOM');
assert(/textContent/.test(newsJs), 'Los textos dinámicos deben insertarse como texto, no HTML');

assert(homeCss.includes('.news-carousel'), 'Inicio debe incluir estilos específicos del carrusel');
assert(homeCss.includes('.news-card'), 'Inicio debe incluir estilos de las tarjetas de novedades');
assert(/\.news-carousel__viewport\s*\{[^}]*min-height:\s*0/s.test(homeCss), 'El viewport del carrusel no debe reservar altura vacía fija');
assert(/\.news-card__media\s*\{[^}]*min-height:\s*300px/s.test(homeCss), 'La imagen del carrusel debe mantener una altura compacta en escritorio');
assert(homeCss.includes('prefers-reduced-motion'), 'El carrusel debe respetar reducción de movimiento');
assert(actualidadCss.includes('.news-list'), 'Comunicados debe incluir estilos para la lista dinámica');
assert(actualidadCss.includes('.news-list__item'), 'Comunicados debe incluir estilos para cada publicación');
assert(actualidadCss.includes('.life-news-list'), 'Vida escolar debe incluir estilos para publicaciones dinámicas');
assert(actualidadCss.includes('.life-news-list__item'), 'Vida escolar debe estilizar cada actividad dinámica');

console.log('novedades-pages.test.js: all assertions passed');
