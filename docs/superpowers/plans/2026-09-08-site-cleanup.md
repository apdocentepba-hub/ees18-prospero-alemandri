# E.E.S. Nº 18 Site Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el sitio público de la E.E.S. Nº 18 coherente, sin placeholders ni canales obsoletos, con navegación/footer uniformes, identidad local, imágenes editoriales normalizadas y páginas auxiliares correctamente fuera del índice de buscadores, preservando todos los backends productivos y el contador de visitas.

**Architecture:** El sitio continúa siendo HTML/CSS/JS estático sobre GitHub Pages. Los cambios se implementan como contratos estructurales verificables por tests, limpieza editorial de HTML, normalización de assets locales y ajustes de SEO; no se agrega framework, CMS, template engine ni build system. Las dos rutas de imagen en la Google Sheet de Novedades se cambian sólo después del merge y de confirmar que los nuevos assets están publicados.

**Tech Stack:** HTML5, CSS3, JavaScript ES5/ES6 compatible con navegador, Node.js para tests estructurales, Python 3.12 + pytest + Pillow, GitHub Pages, Google Apps Script existente, Google Sheets existente.

**Spec:** `docs/superpowers/specs/2026-09-08-site-cleanup-design.md`

## Global Constraints

- No modificar la lógica productiva de Reservas, Cancelación, Contacto, Estado por DNI, Analítico Final ni backend de Novedades.
- No modificar el esquema, columnas, validaciones ni estructura de `Novedades EES18 - BASE`.
- Las únicas escrituras de Sheet permitidas son las rutas `Imagen` de `leer-en-comunidad-2026-09-04` y `re-bonaerense-2026`, y sólo después del deploy de los nuevos assets.
- Conservar el contador público de visitas y su fallback silencioso actual.
- No inventar teléfono, fechas de visita, autoridades, fotografías ni contenido institucional.
- Conservar el sitio como HTML/CSS/JS estático, sin framework ni generador.
- Mantener los assets viejos `re-bonaerense-2024.jpg` y las 10 tiras de Leer en Comunidad durante este despliegue como compatibilidad; pueden limpiarse en una entrega posterior cuando no haya consumidores productivos.
- Usar `20260908-3` como versión de cache para CSS/JS de Novedades que cambien en esta entrega.
- Antes de cualquier escritura en Google Sheets, leer `/home/oai/skills/spreadsheets/SKILL.md` y seguir sus reglas.

---

### Task 1: Congelar contratos de limpieza, navegación y contenido

**Files:**
- Create: `tests/site-cleanup.test.js`
- Modify: `tests/site.test.js`
- Modify: `tests/test_site.py`
- Modify: `tests/test_growth_suite.py`
- Modify: `.github/workflows/test-public.yml`

**Interfaces:**
- Consumes: HTML/CSS/JS estático actual.
- Produces: contratos automatizados que todas las tareas siguientes deben satisfacer.

- [ ] **Step 1: Crear el test RED central `tests/site-cleanup.test.js`**

Usar exactamente estas listas y comprobaciones base:

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const fullLayoutPages = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html',
  'historia.html',
  'plan-estudios.html',
  'tramites.html',
  'pases-equivalencias.html',
  'consultar-estado.html',
  'certificado-analitico.html',
  'boleto-estudiantil.html',
  'comunicados.html',
  'reservas-audiovisuales.html',
  'cancelar-reserva.html',
  'visitas-ees18.html',
  '404.html'
];

const normalPublicPages = fullLayoutPages.filter((file) => ![
  'cancelar-reserva.html',
  'visitas-ees18.html',
  '404.html'
].includes(file));

const primaryHrefs = [
  'index.html',
  'nuestra-escuela.html',
  'propuesta-educativa.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'ingreso-2027.html',
  'contacto.html'
];

const footerHrefs = [
  'index.html',
  'nuestra-escuela.html',
  'estudiantes-familias.html',
  'docentes.html',
  'vida-escolar.html',
  'contacto.html',
  'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'
];

function navHrefs(html) {
  const match = html.match(/<nav class="primary-nav"[\s\S]*?<\/nav>/i);
  assert(match, 'Falta primary-nav');
  return [...match[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

function footerLinks(html) {
  const match = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/i);
  assert(match, 'Falta site-footer');
  return [...match[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

for (const file of fullLayoutPages) {
  const html = read(file);
  assert.deepStrictEqual(navHrefs(html), primaryHrefs, `${file}: menú principal inconsistente`);
  assert(html.includes('assets/img/logo-ees18.jpg'), `${file}: debe usar logo local`);
  assert(!html.includes('isfd100-bue.infd.edu.ar'), `${file}: no debe depender del logo remoto`);

  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/i)[0];
  assert(footer.includes('Av. Manuel Belgrano 355 · Avellaneda'), `${file}: falta dirección en footer`);
  assert(footer.includes('secundaria18avellaneda@abc.gob.ar'), `${file}: falta correo en footer`);
  assert.deepStrictEqual(footerLinks(html), footerHrefs, `${file}: footer inconsistente`);
}

for (const file of normalPublicPages) {
  const html = read(file);
  for (const placeholder of ['A confirmar', 'Próximamente', 'Información en preparación']) {
    assert(!html.includes(placeholder), `${file}: conserva placeholder ${placeholder}`);
  }
}

const index = read('index.html');
assert(!index.includes('id="agenda-title"'), 'Inicio no debe conservar Agenda');
assert(index.includes('data-visitor-counter'), 'El contador de visitas debe conservarse');
assert(index.includes('assets/js/visitor-counter.js'), 'El script del contador debe conservarse');

const school = read('nuestra-escuela.html');
assert(school.includes('Motyl Nadezhda'), 'Debe figurar Motyl Nadezhda');

const contact = read('contacto.html');
assert(!contact.includes('<dt>Teléfono</dt>'), 'No debe mostrarse un teléfono inexistente');

const teachers = read('docentes.html');
assert(!/semanal/i.test(teachers), 'Docentes no debe prometer reservas semanales');
assert(!teachers.includes('1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw'), 'Debe eliminarse el Google Form viejo');
assert(!teachers.includes('Carro Tecnológico'), 'Debe ocultarse Carro Tecnológico hasta tener interfaz pública');
assert(teachers.includes('reservas-audiovisuales.html'), 'Debe mantenerse el sistema vigente de reservas');

const procedures = read('tramites.html');
assert(!procedures.includes('Constancias y certificados'), 'No mostrar trámite inexistente');
assert(!procedures.includes('Formularios escolares'), 'No mostrar formularios inexistentes');

const comms = read('comunicados.html');
for (const heading of ['Fecha visible', 'Mensaje completo', 'Canal institucional']) {
  assert(!comms.includes(`<h3>${heading}</h3>`), `Comunicados no debe conservar ${heading}`);
}
assert(comms.includes('data-news-section="comunicados"'), 'Debe mantenerse la lista dinámica');

const life = read('vida-escolar.html');
assert(/Archivo de actividades destacadas/i.test(life), 'Vida escolar debe distinguir el archivo');
assert(!life.includes('Nuevas publicaciones próximamente'), 'Vida escolar no debe tener categorías vacías');

const ingreso = read('ingreso-2027.html');
assert(ingreso.includes('https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'), 'Ingreso debe priorizar WhatsApp');
assert(ingreso.includes('contacto.html'), 'Ingreso debe ofrecer contacto institucional');
assert(ingreso.includes('plan-estudios.html'), 'Ingreso debe ofrecer plan de estudios');
assert(!ingreso.includes('href="visitas-ees18.html"'), 'Ingreso no debe promocionar visitas sin actividad confirmada');

for (const file of [
  'cancelar-reserva.html',
  'enspa-en-accion.html',
  'visitas-enspa.html',
  'solicitar-analitico.html',
  'visitas-ees18.html'
]) {
  assert(read(file).includes('name="robots" content="noindex,follow"'), `${file}: falta noindex,follow`);
}

const sitemap = read('sitemap.xml');
for (const forbidden of [
  'cancelar-reserva.html',
  'enspa-en-accion.html',
  'visitas-enspa.html',
  'solicitar-analitico.html',
  'visitas-ees18.html'
]) {
  assert(!sitemap.includes(forbidden), `sitemap no debe incluir ${forbidden}`);
}

console.log('site-cleanup.test.js: all assertions passed');
```

- [ ] **Step 2: Actualizar contratos antiguos que contradicen el diseño aprobado**

En `tests/site.test.js`:

```javascript
assert(!docentes.includes('1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw/viewform'), 'teacher hub must remove obsolete contingency form');
assert(!docentes.includes('Carro Tecnológico'), 'teacher hub must not advertise unavailable public cart interface');
```

Eliminar los asserts que exigían conservar el formulario de contingencia y Carro Tecnológico.

En `tests/test_site.py`, usar exactamente:

```python
PRINCIPAL = [
    "index.html",
    "nuestra-escuela.html",
    "propuesta-educativa.html",
    "estudiantes-familias.html",
    "docentes.html",
    "vida-escolar.html",
    "ingreso-2027.html",
    "contacto.html",
]

NAV_LINKS = [
    "index.html",
    "nuestra-escuela.html",
    "propuesta-educativa.html",
    "estudiantes-familias.html",
    "docentes.html",
    "vida-escolar.html",
    "ingreso-2027.html",
    "contacto.html",
]
```

En `tests/test_growth_suite.py`, reemplazar la expectativa de visita futura por:

```python
def test_ingreso_has_faq_contact_whatsapp_and_no_unconfirmed_visit_cta():
    ingreso = read("ingreso-2027.html")
    assert '<details' in ingreso
    assert 'Preguntas frecuentes' in ingreso
    assert 'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l' in ingreso
    assert 'mailto:secundaria18avellaneda@abc.gob.ar' in ingreso or 'href="contacto.html"' in ingreso
    assert 'href="visitas-ees18.html"' not in ingreso

    visitas_html = read("visitas-ees18.html")
    assert 'no hay jornadas' in visitas_html.lower()
    assert 'fecha a confirmar' not in visitas_html.lower()
```

- [ ] **Step 3: Incorporar el test nuevo al workflow**

Agregar después de `node tests/site.test.js`:

```yaml
          node tests/site-cleanup.test.js
```

- [ ] **Step 4: Ejecutar los contratos y confirmar RED limpio**

Run:

```bash
node tests/site-cleanup.test.js
node tests/site.test.js
pytest -q tests/test_site.py tests/test_growth_suite.py
```

Expected: FAIL por contenido actual (`A confirmar`, Agenda, formulario viejo, nav/footer desigual, logo remoto, falta de `noindex,follow`). No corregir implementación en este paso.

- [ ] **Step 5: Commit**

```bash
git add tests/site-cleanup.test.js tests/site.test.js tests/test_site.py tests/test_growth_suite.py .github/workflows/test-public.yml
git commit -m "test: define site cleanup contracts"
```

---

### Task 2: Limpiar contenido editorial y eliminar funciones públicas inexistentes

**Files:**
- Modify: `index.html`
- Modify: `nuestra-escuela.html`
- Modify: `contacto.html`
- Modify: `docentes.html`
- Modify: `tramites.html`
- Modify: `comunicados.html`
- Modify: `vida-escolar.html`
- Modify: `ingreso-2027.html`
- Modify: `visitas-ees18.html`

**Interfaces:**
- Consumes: estructura estática actual y fuente dinámica de Novedades existente.
- Produces: contenido público sin placeholders, canales obsoletos ni promociones sin actividad confirmada.

- [ ] **Step 1: Corregir Inicio, autoridades y Contacto**

En `index.html`, eliminar el bloque completo:

```html
<section class="page-section page-section--dark" aria-labelledby="agenda-title">
...
</section>
```

No tocar el `<div class="visitor-counter" data-visitor-counter ...>` ni `assets/js/visitor-counter.js`.

En `nuestra-escuela.html`, reemplazar:

```html
<article class="person-card"><span>Vicedirección · Turno tarde</span><strong>A confirmar</strong></article>
```

por:

```html
<article class="person-card"><span>Vicedirección · Turno tarde</span><strong>Motyl Nadezhda</strong></article>
```

En `contacto.html`, eliminar únicamente:

```html
<div><dt>Teléfono</dt><dd>A confirmar</dd></div>
```

- [ ] **Step 2: Dejar Docentes con un único sistema de reservas**

En `docentes.html`, usar esta introducción:

```html
<div class="section-heading">
  <span>Reservas y recursos</span>
  <h2>Herramientas disponibles.</h2>
  <p>El sistema de reservas del Salón de Audiovisuales está activo para consultar disponibilidad y reservar módulos de un único día.</p>
</div>
```

La grilla de Reservas debe contener sólo esta tarjeta funcional:

```html
<article class="link-card link-card--accent">
  <small>Sistema vigente</small>
  <h3>Reservar Salón de Audiovisuales</h3>
  <p>Consultá la disponibilidad mensual, seleccioná módulos libres y confirmá la reserva para el día elegido. La confirmación y el enlace de cancelación llegan por correo.</p>
  <a href="reservas-audiovisuales.html">Reservar Salón de Audiovisuales →</a>
</article>
```

Eliminar por completo la tarjeta del Google Form viejo y la tarjeta `Carro Tecnológico`.

- [ ] **Step 3: Limpiar Trámites y Comunicados**

En `tramites.html`, dejar en la grilla sólo:

- Pases y equivalencias.
- Consultar por DNI.
- Solicitar Analítico Final.
- Boleto estudiantil.

Eliminar los dos `<article class="link-card">` de `Constancias y certificados` y `Formularios escolares`.

En `comunicados.html`, eliminar la grilla explicativa con `Fecha visible`, `Mensaje completo` y `Canal institucional`; el bloque dinámico debe quedar inmediatamente después del encabezado de la sección:

```html
<div class="news-list news-list--spaced" data-news-section="comunicados">
  <div data-news-list>
    <div class="actualidad-empty">
      <strong>Comunicados oficiales</strong><br>
      En este momento no pudimos actualizar la lista. Consultá nuevamente en unos minutos o comunicate con la escuela por los canales institucionales.
    </div>
  </div>
</div>
```

- [ ] **Step 4: Convertir el contenido estático de Vida escolar en archivo**

Antes de las historias estáticas de Leer en Comunidad y RE Bonaerense, usar:

```html
<section class="page-section page-section--soft" aria-labelledby="archivo-vida-title">
  <div class="container">
    <div class="section-heading">
      <span>Memoria institucional · 2026</span>
      <h2 id="archivo-vida-title">Archivo de actividades destacadas</h2>
      <p>Estas publicaciones permanecen como registro de actividades ya realizadas por la comunidad educativa.</p>
    </div>
```

Reubicar/conservar dentro del archivo las dos historias existentes y cerrar la sección después de ambas. Eliminar por completo la sección `Qué compartimos` con las seis categorías y todos los textos `Nuevas publicaciones próximamente`.

No eliminar `data-news-section="vida-escolar"`: sigue siendo la fuente actual arriba del archivo.

- [ ] **Step 5: Replantear Ingreso 2027 sin prometer visitas**

En el hero de `ingreso-2027.html`, reemplazar las acciones por:

```html
<div class="ingreso-campaign__actions ingreso-page-hero__actions">
  <a class="ingreso-campaign__button ingreso-campaign__button--primary" href="https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l">Seguir novedades por WhatsApp</a>
  <a class="ingreso-campaign__button" href="plan-estudios.html">Ver plan de estudios</a>
  <a class="ingreso-campaign__button" href="contacto.html">Contacto institucional</a>
</div>
```

Eliminar todos los demás `href="visitas-ees18.html"` de Ingreso 2027. Mantener FAQ, propuesta, orientaciones y nota de privacidad.

En `visitas-ees18.html`, reemplazar la promesa de fecha futura por texto factual:

```html
<strong>Actualmente no hay jornadas de visita publicadas para Ingreso 2027.</strong>
<span>Si la escuela comunica una actividad abierta, se difundirá por los canales institucionales.</span>
```

Usar como acciones sólo WhatsApp, Contacto e Ingreso 2027. No usar `Fecha a confirmar`, `fecha a confirmar` ni `se publicará cuando`.

- [ ] **Step 6: Ejecutar tests editoriales**

Run:

```bash
node tests/site-cleanup.test.js
node tests/site.test.js
pytest -q tests/test_site.py tests/test_growth_suite.py
```

Expected: todavía puede fallar por navegación/footer/logo/noindex, pero no debe fallar por Agenda, autoridad, teléfono, formulario viejo, Carro, tarjetas vacías, Comunicados, Vida escolar o CTA de visitas.

- [ ] **Step 7: Commit**

```bash
git add index.html nuestra-escuela.html contacto.html docentes.html tramites.html comunicados.html vida-escolar.html ingreso-2027.html visitas-ees18.html
git commit -m "fix: clean public school content"
```

---

### Task 3: Unificar navegación, footer y contexto de páginas internas

**Files:**
- Modify: `index.html`
- Modify: `nuestra-escuela.html`
- Modify: `propuesta-educativa.html`
- Modify: `estudiantes-familias.html`
- Modify: `docentes.html`
- Modify: `vida-escolar.html`
- Modify: `ingreso-2027.html`
- Modify: `contacto.html`
- Modify: `historia.html`
- Modify: `plan-estudios.html`
- Modify: `tramites.html`
- Modify: `pases-equivalencias.html`
- Modify: `consultar-estado.html`
- Modify: `certificado-analitico.html`
- Modify: `boleto-estudiantil.html`
- Modify: `comunicados.html`
- Modify: `reservas-audiovisuales.html`
- Modify: `cancelar-reserva.html`
- Modify: `visitas-ees18.html`
- Modify: `404.html`
- Modify: `assets/css/multipage.css`

**Interfaces:**
- Consumes: navegación móvil de `assets/js/main.js`, sin cambiar su API.
- Produces: exactamente ocho enlaces de navegación en todas las páginas con layout completo; footer institucional uniforme; breadcrumbs accesibles en páginas de detalle.

- [ ] **Step 1: Aplicar el menú principal único**

El contenido de cada `<nav class="primary-nav" id="primary-nav" ...>` debe tener exactamente estos ocho `href`, en este orden:

```html
<a href="index.html">Inicio</a>
<a href="nuestra-escuela.html">Nuestra escuela</a>
<a href="propuesta-educativa.html">Propuesta educativa</a>
<a href="estudiantes-familias.html">Estudiantes y familias</a>
<a href="docentes.html">Docentes</a>
<a href="vida-escolar.html">Vida escolar</a>
<a href="ingreso-2027.html">Ingreso 2027</a>
<a href="contacto.html" class="nav-cta">Contacto</a>
```

Agregar `aria-current="page"` únicamente al enlace de la sección activa con este mapeo exacto:

```text
index.html -> index.html
nuestra-escuela.html, historia.html -> nuestra-escuela.html
propuesta-educativa.html, plan-estudios.html -> propuesta-educativa.html
estudiantes-familias.html, tramites.html, pases-equivalencias.html, consultar-estado.html, certificado-analitico.html, boleto-estudiantil.html -> estudiantes-familias.html
docentes.html, reservas-audiovisuales.html, cancelar-reserva.html -> docentes.html
vida-escolar.html, comunicados.html -> vida-escolar.html
ingreso-2027.html, visitas-ees18.html -> ingreso-2027.html
contacto.html -> contacto.html
404.html -> ninguno
```

- [ ] **Step 2: Aplicar footer uniforme**

En las 20 páginas de layout completo, usar el mismo conjunto de enlaces y datos:

```html
<footer class="site-footer">
  <div class="container site-footer__inner">
    <div>
      <strong>E.E.S. Nº 18 “PRÓSPERO ALEMANDRI”</strong><br>
      <span>Av. Manuel Belgrano 355 · Avellaneda</span><br>
      <a href="mailto:secundaria18avellaneda@abc.gob.ar">secundaria18avellaneda@abc.gob.ar</a>
    </div>
    <nav aria-label="Enlaces del pie">
      <a href="index.html">Inicio</a>
      <a href="nuestra-escuela.html">Nuestra escuela</a>
      <a href="estudiantes-familias.html">Estudiantes y familias</a>
      <a href="docentes.html">Docentes</a>
      <a href="vida-escolar.html">Vida escolar</a>
      <a href="contacto.html">Contacto</a>
      <a href="https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l">WhatsApp</a>
    </nav>
    <span>© <span id="current-year">2026</span></span>
  </div>
</footer>
```

Excepción controlada de `index.html`: conservar el bloque existente `data-visitor-counter` dentro del footer, ubicado después del `<nav>` y antes del copyright. No alterar su markup interno ni su script.

El test `footerLinks()` debe seguir viendo exactamente `footerHrefs`; `mailto:` queda fuera del `<nav>` y por eso no forma parte de esa lista.

- [ ] **Step 3: Agregar breadcrumbs sólo a páginas internas útiles**

En `assets/css/multipage.css`, agregar:

```css
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 18px;
  color: #5e7484;
  font-size: .82rem;
  font-weight: 700;
}
.breadcrumbs a { color: var(--azul-profundo); }
.breadcrumbs a:hover,
.breadcrumbs a:focus-visible { text-decoration: underline; }
.breadcrumbs [aria-current="page"] { color: #6f8290; }
```

Agregar una ruta inmediatamente después de `<main id="contenido">` en estas páginas:

```text
historia.html: Inicio › Nuestra escuela › Nuestra historia
plan-estudios.html: Inicio › Propuesta educativa › Plan de estudios
tramites.html: Inicio › Estudiantes y familias › Trámites
pases-equivalencias.html: Inicio › Estudiantes y familias › Trámites › Pases y equivalencias
consultar-estado.html: Inicio › Estudiantes y familias › Trámites › Consultar estado
certificado-analitico.html: Inicio › Estudiantes y familias › Trámites › Analítico Final
boleto-estudiantil.html: Inicio › Estudiantes y familias › Trámites › Boleto Estudiantil
comunicados.html: Inicio › Vida escolar › Comunicados
reservas-audiovisuales.html: Inicio › Docentes › Reservas de Audiovisuales
cancelar-reserva.html: Inicio › Docentes › Cancelar reserva
visitas-ees18.html: Inicio › Ingreso 2027 › Información de visitas
```

Formato exacto de ejemplo para Trámites:

```html
<nav class="breadcrumbs container" aria-label="Ruta de navegación">
  <a href="index.html">Inicio</a><span aria-hidden="true">›</span>
  <a href="estudiantes-familias.html">Estudiantes y familias</a><span aria-hidden="true">›</span>
  <span aria-current="page">Trámites</span>
</nav>
```

- [ ] **Step 4: Versionar `multipage.css`**

En todas las páginas que carguen `assets/css/multipage.css`, reemplazar por:

```html
<link rel="stylesheet" href="assets/css/multipage.css?v=20260908-3">
```

- [ ] **Step 5: Ejecutar contratos de navegación**

Run:

```bash
node tests/site-cleanup.test.js
node tests/site.test.js
pytest -q tests/test_site.py
```

Expected: las comprobaciones de nav/footer deben pasar. Los fallos restantes deben limitarse a identidad local, normalización de imágenes y SEO.

- [ ] **Step 6: Commit**

```bash
git add *.html assets/css/multipage.css
git commit -m "refactor: unify site navigation and footer"
```

---

### Task 4: Servir identidad institucional local y completar iconos/metadata social

**Files:**
- Create: `assets/img/logo-ees18.jpg`
- Create: `assets/img/icon-192.png`
- Create: `assets/img/icon-512.png`
- Create: `favicon.ico`
- Create: `tests/test_site_identity.py`
- Modify: `site.webmanifest`
- Modify: todas las páginas de `fullLayoutPages` definidas en Task 1
- Modify: `index.html`
- Modify: `ingreso-2027.html`
- Modify: `vida-escolar.html`

**Interfaces:**
- Consumes: emblema actualmente referenciado en `https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/celeste_cristina.jpg`.
- Produces: assets locales estables; manifest con iconos; metadata social basada en identidad real.

- [ ] **Step 1: Escribir tests RED de identidad**

Crear `tests/test_site_identity.py`:

```python
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FULL = [
    "index.html", "nuestra-escuela.html", "propuesta-educativa.html",
    "estudiantes-familias.html", "docentes.html", "vida-escolar.html",
    "ingreso-2027.html", "contacto.html", "historia.html", "plan-estudios.html",
    "tramites.html", "pases-equivalencias.html", "consultar-estado.html",
    "certificado-analitico.html", "boleto-estudiantil.html", "comunicados.html",
    "reservas-audiovisuales.html", "cancelar-reserva.html", "visitas-ees18.html", "404.html"
]


def read(name):
    return ROOT.joinpath(name).read_text(encoding="utf-8")


def test_logo_e_iconos_locales_validos():
    logo = ROOT / "assets/img/logo-ees18.jpg"
    icon192 = ROOT / "assets/img/icon-192.png"
    icon512 = ROOT / "assets/img/icon-512.png"
    favicon = ROOT / "favicon.ico"

    for path in [logo, icon192, icon512, favicon]:
        assert path.exists(), f"Falta {path.relative_to(ROOT)}"
        assert path.stat().st_size > 500

    with Image.open(logo) as image:
        assert image.format == "JPEG"
        image.verify()
    with Image.open(icon192) as image:
        assert image.format == "PNG"
        assert image.size == (192, 192)
    with Image.open(icon512) as image:
        assert image.format == "PNG"
        assert image.size == (512, 512)
    with Image.open(favicon) as image:
        assert image.format == "ICO"


def test_paginas_no_dependen_del_isfd_para_el_logo():
    for name in FULL:
        html = read(name)
        assert "isfd100-bue.infd.edu.ar" not in html
        assert 'assets/img/logo-ees18.jpg' in html
        assert 'rel="icon" href="favicon.ico"' in html


def test_manifest_declara_iconos_locales():
    manifest = json.loads(read("site.webmanifest"))
    assert manifest["icons"] == [
        {"src": "assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"},
    ]


def test_paginas_principales_tienen_imagen_social_local():
    absolute = "https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg"
    for name in ["index.html", "ingreso-2027.html", "vida-escolar.html"]:
        html = read(name)
        assert f'property="og:image" content="{absolute}"' in html
        assert f'name="twitter:image" content="{absolute}"' in html
```

- [ ] **Step 2: Ejecutar y confirmar RED**

Run:

```bash
pytest -q tests/test_site_identity.py
```

Expected: FAIL porque todavía no existen los assets locales y las páginas usan el logo remoto.

- [ ] **Step 3: Descargar una copia exacta del emblema actualmente usado**

Run:

```bash
curl -L --fail --silent --show-error \
  'https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/celeste_cristina.jpg' \
  -o assets/img/logo-ees18.jpg
```

Si el entorno de shell no tiene salida a Internet, usar la capacidad de descarga de archivos disponible en el entorno para guardar exactamente esa URL en `assets/img/logo-ees18.jpg`; no sustituir el asset por otra imagen.

Verificar:

```bash
python - <<'PY'
from PIL import Image
p = 'assets/img/logo-ees18.jpg'
with Image.open(p) as im:
    print(im.format, im.size)
    assert im.format == 'JPEG'
PY
```

- [ ] **Step 4: Generar iconos sin redibujar el emblema**

Run:

```bash
python - <<'PY'
from PIL import Image, ImageOps

logo = Image.open('assets/img/logo-ees18.jpg').convert('RGB')

for size in (192, 512):
    icon = ImageOps.pad(
        logo,
        (size, size),
        method=Image.Resampling.LANCZOS,
        color='white',
        centering=(0.5, 0.5),
    )
    icon.save(f'assets/img/icon-{size}.png', format='PNG', optimize=True)

favicon = ImageOps.pad(
    logo,
    (256, 256),
    method=Image.Resampling.LANCZOS,
    color='white',
    centering=(0.5, 0.5),
)
favicon.save('favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
PY
```

- [ ] **Step 5: Reemplazar el logo remoto y declarar favicon**

En las 20 páginas de `fullLayoutPages`, reemplazar:

```html
https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/celeste_cristina.jpg
```

por:

```html
assets/img/logo-ees18.jpg
```

Dentro de `<head>` agregar:

```html
<link rel="icon" href="favicon.ico">
```

No cambiar los `alt` existentes del emblema.

- [ ] **Step 6: Actualizar manifest**

`site.webmanifest` debe contener:

```json
{
  "name": "E.E.S. Nº 18 Próspero Alemandri",
  "short_name": "EES18",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f3f62",
  "lang": "es-AR",
  "description": "Sitio institucional de la E.E.S. Nº 18 Próspero Alemandri de Avellaneda.",
  "icons": [
    {"src": "assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

- [ ] **Step 7: Agregar metadata social a Inicio, Ingreso y Vida escolar**

En cada una agregar dentro de `<head>`:

```html
<meta property="og:image" content="https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg">
<meta property="og:image:alt" content="Emblema institucional de la E.E.S. Nº 18 Próspero Alemandri">
<meta name="twitter:image" content="https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg">
<meta name="twitter:image:alt" content="Emblema institucional de la E.E.S. Nº 18 Próspero Alemandri">
```

Mantener `twitter:card="summary"`.

- [ ] **Step 8: Ejecutar tests de identidad**

Run:

```bash
pytest -q tests/test_site_identity.py
node tests/site-cleanup.test.js
```

Expected: PASS para identidad local; el test central puede seguir fallando sólo por SEO/imágenes editoriales si todavía no se hicieron.

- [ ] **Step 9: Commit**

```bash
git add assets/img/logo-ees18.jpg assets/img/icon-192.png assets/img/icon-512.png favicon.ico site.webmanifest *.html tests/test_site_identity.py
git commit -m "feat: localize school visual identity"
```

---

### Task 5: Consolidar imágenes editoriales y eliminar renderer temporal de tiras

**Files:**
- Create: `assets/img/leer-en-comunidad-2026.jpg`
- Create: `assets/img/re-bonaerense-2026.jpg`
- Modify: `vida-escolar.html`
- Modify: `data/novedades-seed.json`
- Modify: `assets/js/novedades.js`
- Modify: `assets/css/novedades-carousel.css`
- Modify: `assets/css/actualidad.css`
- Modify: `index.html`
- Modify: `comunicados.html`
- Modify: `tests/novedades-client.test.js`
- Modify: `tests/novedades-pages.test.js`
- Modify: `tests/test_identidad_historia_vida.py`
- Modify: `tests/test_re_bonaerense_image.py`
- Modify: `tests/re-bonaerense-year.test.js`
- Modify: `tests/site.test.js`
- Modify: `tests/test_site.py`

**Interfaces:**
- Consumes: 10 tiras JPEG existentes de Leer en Comunidad y JPEG existente de RE Bonaerense.
- Produces: `assets/img/leer-en-comunidad-2026.jpg` de 240×349; `assets/img/re-bonaerense-2026.jpg` de 280×420; renderer normal de una imagen por noticia.

- [ ] **Step 1: Cambiar tests a la representación final y confirmar RED**

En `tests/novedades-client.test.js`:

```javascript
assert.strictEqual(
  rules.safeUrl('assets/img/re-bonaerense-2026.jpg'),
  'assets/img/re-bonaerense-2026.jpg'
);
assert.strictEqual(typeof rules.posterStripUrls, 'undefined', 'No debe quedar el helper temporal de tiras');
```

Eliminar todo el bloque que exige 10 URLs de `posterStripUrls`.

En `tests/novedades-pages.test.js` exigir:

```javascript
assert(index.includes('assets/js/novedades.js?v=20260908-3'));
assert(index.includes('assets/css/novedades-carousel.css?v=20260908-3'));
assert(vida.includes('assets/js/novedades.js?v=20260908-3'));
assert(vida.includes('assets/css/actualidad.css?v=20260908-3'));
assert(comunicados.includes('assets/js/novedades.js?v=20260908-3'));
assert(comunicados.includes('assets/css/actualidad.css?v=20260908-3'));
assert(!/function\s+posterStripUrls\s*\(/.test(newsJs));
assert(!newsJs.includes('news-poster-strips'));
assert(!carouselCss.includes('.news-poster-strips'));
assert(!actualidadCss.includes('.news-poster-strips'));
```

Mantener todos los tests de teclado, swipe, `createElement`, `textContent`, altura compacta y sin autoplay.

En `tests/test_identidad_historia_vida.py`, reemplazar el test de 10 tiras por:

```python
def test_vida_escolar_publica_leer_en_comunidad_2026():
    vida = read("vida-escolar.html")
    for item in [
        "Leer en Comunidad",
        "Jornada de Bibliotecas Escolares Abiertas 2026",
        "4 de septiembre de 2026",
        "Una comunidad que sigue leyendo",
        'src="assets/img/leer-en-comunidad-2026.jpg"',
    ]:
        assert item in vida
    assert (ROOT / "assets/img/leer-en-comunidad-2026.jpg").exists()
```

Y el test de RE debe exigir:

```python
'src="assets/img/re-bonaerense-2026.jpg"'
assert (ROOT / "assets/img/re-bonaerense-2026.jpg").exists()
```

En `tests/test_re_bonaerense_image.py` usar:

```python
IMAGE_PATH = ROOT / "assets" / "img" / "re-bonaerense-2026.jpg"
```

y:

```python
assert item["Imagen"] == "assets/img/re-bonaerense-2026.jpg"
```

Agregar a ese archivo:

```python
def test_leer_en_comunidad_es_jpeg_consolidado():
    path = ROOT / "assets" / "img" / "leer-en-comunidad-2026.jpg"
    assert path.exists()
    with Image.open(path) as image:
        assert image.format == "JPEG"
        assert image.size == (240, 349)
        image.verify()
```

En `tests/re-bonaerense-year.test.js`, agregar:

```javascript
assert.strictEqual(re['Imagen'], 'assets/img/re-bonaerense-2026.jpg');
```

Actualizar en `tests/site.test.js` y `tests/test_site.py` todas las expectativas `re-bonaerense-2024.jpg` a `re-bonaerense-2026.jpg` y todas las expectativas de tiras a `leer-en-comunidad-2026.jpg`.

Run:

```bash
node tests/novedades-client.test.js
node tests/novedades-pages.test.js
pytest -q tests/test_identidad_historia_vida.py tests/test_re_bonaerense_image.py
```

Expected: FAIL hasta crear assets y simplificar renderer.

- [ ] **Step 2: Consolidar las 10 tiras sin alterar contenido**

Run:

```bash
python - <<'PY'
from pathlib import Path
from PIL import Image

root = Path('assets/img')
paths = [root / f'leer-en-comunidad-2026-{n:02d}.jpg' for n in range(1, 11)]
images = [Image.open(path).convert('RGB') for path in paths]
try:
    widths = {image.width for image in images}
    assert widths == {240}, widths
    total_height = sum(image.height for image in images)
    assert total_height == 349, total_height
    canvas = Image.new('RGB', (240, total_height), 'white')
    y = 0
    for image in images:
        canvas.paste(image, (0, y))
        y += image.height
    canvas.save(root / 'leer-en-comunidad-2026.jpg', 'JPEG', quality=95, subsampling=0, optimize=True)
finally:
    for image in images:
        image.close()
PY
```

No borrar las 10 tiras en esta entrega.

- [ ] **Step 3: Crear alias 2026 de RE Bonaerense**

Run:

```bash
cp assets/img/re-bonaerense-2024.jpg assets/img/re-bonaerense-2026.jpg
```

No borrar `re-bonaerense-2024.jpg` en esta entrega.

- [ ] **Step 4: Actualizar HTML y seed**

En `vida-escolar.html`, reemplazar el `<figure>` de las 10 tiras por:

```html
<figure>
  <img src="assets/img/leer-en-comunidad-2026.jpg" alt="Afiche institucional de Leer en Comunidad, realizado el 4 de septiembre de 2026 en la E.E.S. Nº 18" width="240" height="349">
</figure>
```

Reemplazar `assets/img/re-bonaerense-2024.jpg` por `assets/img/re-bonaerense-2026.jpg`.

En `data/novedades-seed.json`:

```json
"Imagen": "assets/img/leer-en-comunidad-2026.jpg"
```

para ID `leer-en-comunidad-2026-09-04`, y:

```json
"Imagen": "assets/img/re-bonaerense-2026.jpg"
```

para ID `re-bonaerense-2026`.

- [ ] **Step 5: Simplificar renderer de imágenes**

Eliminar por completo `posterStripUrls` de `assets/js/novedades.js` y reemplazar `appendNewsImage` por:

```javascript
function appendNewsImage(parent, item) {
  if (!item.image) return false;

  var image = root.document.createElement('img');
  image.src = item.image;
  image.alt = 'Imagen de ' + item.title;
  image.loading = 'lazy';
  image.decoding = 'async';
  parent.appendChild(image);
  return true;
}
```

Eliminar `posterStripUrls` del objeto exportado al final del módulo si figura allí.

- [ ] **Step 6: Eliminar CSS temporal de tiras y versionar consumidores**

Eliminar de `assets/css/novedades-carousel.css` y `assets/css/actualidad.css` todos los selectores `.news-poster-strips` y `.news-poster-strips img`.

Usar versión `20260908-3`:

```html
assets/css/novedades-carousel.css?v=20260908-3
assets/css/actualidad.css?v=20260908-3
assets/js/novedades.js?v=20260908-3
```

Aplicar:

```text
index.html -> novedades-carousel.css + novedades.js
vida-escolar.html -> actualidad.css + novedades.js
comunicados.html -> actualidad.css + novedades.js
```

- [ ] **Step 7: Ejecutar tests de Novedades e imágenes**

Run:

```bash
node tests/novedades-client.test.js
node tests/novedades-pages.test.js
node tests/re-bonaerense-year.test.js
node tests/site.test.js
pytest -q tests/test_identidad_historia_vida.py tests/test_re_bonaerense_image.py tests/test_site.py
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add assets/img/leer-en-comunidad-2026.jpg assets/img/re-bonaerense-2026.jpg vida-escolar.html data/novedades-seed.json assets/js/novedades.js assets/css/novedades-carousel.css assets/css/actualidad.css index.html comunicados.html tests/novedades-client.test.js tests/novedades-pages.test.js tests/test_identidad_historia_vida.py tests/test_re_bonaerense_image.py tests/re-bonaerense-year.test.js tests/site.test.js tests/test_site.py
git commit -m "refactor: normalize editorial news images"
```

---

### Task 6: Aplicar `noindex,follow` y limpiar sitemap

**Files:**
- Modify: `cancelar-reserva.html`
- Modify: `enspa-en-accion.html`
- Modify: `visitas-enspa.html`
- Modify: `solicitar-analitico.html`
- Modify: `visitas-ees18.html`
- Modify: `sitemap.xml`

**Interfaces:**
- Consumes: URLs históricas/operativas existentes.
- Produces: mismas URLs funcionales, pero sin competir como resultados indexables.

- [ ] **Step 1: Agregar `noindex,follow`**

Dentro de `<head>` de las cinco páginas, agregar exactamente:

```html
<meta name="robots" content="noindex,follow">
```

No bloquear esas URLs en `robots.txt`: Google necesita poder rastrearlas para leer `noindex` y seguir los enlaces.

- [ ] **Step 2: Limpiar sitemap**

Asegurar que `sitemap.xml` no incluya ninguna de estas rutas:

```text
/cancelar-reserva.html
/enspa-en-accion.html
/visitas-enspa.html
/solicitar-analitico.html
/visitas-ees18.html
```

Actualmente sólo `visitas-ees18.html` debe requerir eliminación del sitemap; no agregar las otras.

- [ ] **Step 3: Ejecutar contratos SEO**

Run:

```bash
node tests/site-cleanup.test.js
pytest -q tests/test_growth_suite.py tests/test_site_identity.py
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add cancelar-reserva.html enspa-en-accion.html visitas-enspa.html solicitar-analitico.html visitas-ees18.html sitemap.xml
git commit -m "fix: keep auxiliary pages out of search index"
```

---

### Task 7: Verificar regresiones, revisar diff y publicar el PR

**Files:**
- Verify only: todo el árbol de trabajo
- No backend files should change.

**Interfaces:**
- Consumes: Tasks 1–6 completas.
- Produces: PR verificable y merge seguro a `main`.

- [ ] **Step 1: Ejecutar suite Python completa**

Run:

```bash
pytest -q
```

Expected: todos los tests PASS.

- [ ] **Step 2: Ejecutar chequeos JS completos equivalentes a CI**

Run:

```bash
node --check assets/js/main.js
node --check assets/js/visitor-counter.js
node --check assets/js/estado-publico.js
node --check assets/js/status-config.js
node --check assets/js/reservas-config.js
node --check assets/js/reservas-audiovisuales.js
node --check assets/js/reservas-email-policy.js
node --check assets/js/cancelar-reserva.js
node --check assets/js/contacto.js
node --check assets/js/novedades.js
node --check assets/js/novedades-config.js

node tests/site.test.js
node tests/site-cleanup.test.js
node tests/re-bonaerense-year.test.js
node tests/whatsapp-channel.test.js
node tests/contact-and-reservation-mail.test.js
node tests/contact-backend.test.js
node tests/visitor-counter.test.js
node tests/reservas-audiovisuales.test.js
node tests/reservas-single-day-only.test.js
node tests/apps-script-reservas.test.js
node tests/abc-email-policy.test.js
node tests/apps-script-performance.test.js
node tests/analitico-final.test.js
node tests/novedades-backend.test.js
node tests/novedades-client.test.js
node tests/novedades-pages.test.js
```

Expected: todos PASS, incluido `visitor-counter.test.js`.

- [ ] **Step 3: Ejecutar probes productivos antes del merge**

Run:

```bash
python tests/probe_reservas_live.py
python tests/probe_novedades_live.py
```

Expected: ambos PASS. El probe de Novedades todavía puede devolver rutas de imagen viejas desde la Sheet; eso es esperado hasta Task 8.

- [ ] **Step 4: Confirmar que ningún backend productivo cambió**

Run:

```bash
git diff main...HEAD -- apps-script/reservas-audiovisuales
git diff main...HEAD -- apps-script/solicitud-analitico-final
git diff main...HEAD -- apps-script/novedades
git diff main...HEAD -- assets/js/reservas-config.js assets/js/status-config.js assets/js/contacto.js assets/js/reservas-audiovisuales.js assets/js/estado-publico.js
```

Expected: salida vacía para todos esos paths.

También ejecutar:

```bash
git status --short
git diff --check
```

Expected: worktree limpio después de commits; `git diff --check` sin errores.

- [ ] **Step 5: Revisión del diff**

Revisar específicamente:

```bash
git diff main...HEAD --stat
git diff main...HEAD -- '*.html' '*.css' '*.js' '*.json' '*.xml' 'tests/*'
```

Confirmar manualmente:

```text
- contador de visitas sigue presente y visitor-counter.js no cambió;
- único sistema público de reservas = reservas-audiovisuales.html;
- Motyl Nadezhda visible;
- ningún A confirmar/Próximamente/Información en preparación en páginas normales;
- nav de 8 enlaces uniforme;
- footer uniforme;
- logo local en todas las páginas completas;
- assets 2026 nuevos presentes;
- noindex sólo en páginas auxiliares acordadas.
```

- [ ] **Step 6: Abrir PR y esperar CI**

PR target: `main`.

Título:

```text
Limpieza integral e identidad local del sitio EES18
```

Descripción mínima:

```text
- limpia placeholders y canales obsoletos
- unifica navegación y footer
- corrige Vicedirección TT y elimina teléfono no confirmado
- deja Reservas nuevas como único canal
- localiza logo/favicon/iconos
- normaliza imágenes de Vida escolar
- aplica noindex a páginas auxiliares
- preserva backends y contador de visitas
```

Esperar `Test public site` GREEN. No mergear con tests pendientes o fallidos.

- [ ] **Step 7: Merge y verificar GitHub Pages**

Merge sólo con CI GREEN. Después verificar que el workflow `pages build and deployment` del SHA de merge termine `success` antes de tocar la Sheet.

Comprobar que respondan públicamente:

```text
https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg
https://ees18avellaneda.edu.ar/assets/img/icon-192.png
https://ees18avellaneda.edu.ar/assets/img/icon-512.png
https://ees18avellaneda.edu.ar/assets/img/leer-en-comunidad-2026.jpg
https://ees18avellaneda.edu.ar/assets/img/re-bonaerense-2026.jpg
```

---

### Task 8: Migrar las dos rutas editoriales de la Sheet y validar producción

**Files / external data:**
- Google Sheet: `Novedades EES18 - BASE`
- Spreadsheet ID: `1q_pGx5hQ1NR19CpRLMp3Kup5_CmF7RuE_vsyiqwFUi4`
- Tab: `Novedades`
- No repository files need changing unless a genuine post-deploy regression is found.

**Interfaces:**
- Consumes: nuevos assets ya publicados por GitHub Pages.
- Produces: API de Novedades publicando las dos rutas nuevas sin redeploy de Apps Script.

- [ ] **Step 1: Leer skill de spreadsheets y abrir la Sheet por ID**

Antes de escribir, leer:

```text
/home/oai/skills/spreadsheets/SKILL.md
```

Usar el conector de Google Drive/Sheets disponible para localizar el tab `Novedades` del spreadsheet ID exacto. No buscar otra planilla por nombre si el ID está accesible.

- [ ] **Step 2: Leer las dos filas por ID y capturar valores previos**

Localizar por la columna `ID`, no por número de fila fijo:

```text
leer-en-comunidad-2026-09-04
re-bonaerense-2026
```

Antes de escribir, confirmar que la columna `Imagen` tiene respectivamente:

```text
assets/img/leer-en-comunidad-2026-01.jpg
assets/img/re-bonaerense-2024.jpg
```

Si alguno ya difiere, no sobrescribir a ciegas: leer el valor actual y reconciliarlo con los assets publicados.

- [ ] **Step 3: Actualizar exclusivamente las dos celdas `Imagen`**

Escribir:

```text
leer-en-comunidad-2026-09-04 -> assets/img/leer-en-comunidad-2026.jpg
re-bonaerense-2026 -> assets/img/re-bonaerense-2026.jpg
```

No modificar `ID`, `Activa`, fechas, prioridad, textos, secciones, validaciones ni formato.

- [ ] **Step 4: Esperar expiración de cache y verificar API pública**

Esperar hasta 120 segundos. Luego consultar el Web App público:

```text
https://script.google.com/macros/s/AKfycbzguaQvZVJnkptjrEfIi6H0BpyrUt1hb10tFBXzx_PQKdqWXZxUex1rzVMEKhr5gmZi-w/exec?section=inicio
```

Verificar por ID:

```text
leer-en-comunidad-2026-09-04.image == assets/img/leer-en-comunidad-2026.jpg
re-bonaerense-2026.image == assets/img/re-bonaerense-2026.jpg
```

No aceptar una respuesta autenticada distinta de la respuesta pública anónima.

- [ ] **Step 5: Ejecutar probes productivos finales**

Run:

```bash
python tests/probe_reservas_live.py
python tests/probe_novedades_live.py
```

Expected: ambos PASS.

Además verificar que Inicio, Comunicados y Vida escolar siguen cargando sus listas dinámicas y que la imagen de Leer en Comunidad se muestra como un único afiche.

- [ ] **Step 6: Verificar criterios finales de producción**

Comprobar en el sitio publicado:

```text
- Inicio sin Agenda y con contador visible cuando CounterAPI responde.
- Nuestra escuela: Motyl Nadezhda.
- Contacto sin teléfono A confirmar.
- Docentes sin Google Form viejo y sin Carro Tecnológico.
- Reserva de Audiovisuales intacta y sólo de un día.
- Comunicados: lista real primero.
- Vida escolar: novedades arriba + Archivo de actividades destacadas abajo.
- Ingreso 2027: WhatsApp + Contacto + Plan, sin CTA de visitas.
- mismo menú y footer en escritorio/móvil.
- favicon/logo local cargando.
- páginas auxiliares con noindex,follow.
```

Si un asset nuevo no cargara después del deploy, restaurar inmediatamente las dos rutas de Sheet a sus valores previos; los assets de compatibilidad se conservaron precisamente para que este rollback sea seguro.
