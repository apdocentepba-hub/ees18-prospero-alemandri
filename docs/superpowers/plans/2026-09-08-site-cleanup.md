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

- [ ] **Step 1: Crear `tests/site-cleanup.test.js` con los contratos RED**

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const fullLayoutPages = [
  'index.html', 'nuestra-escuela.html', 'propuesta-educativa.html',
  'estudiantes-familias.html', 'docentes.html', 'vida-escolar.html',
  'ingreso-2027.html', 'contacto.html', 'historia.html', 'plan-estudios.html',
  'tramites.html', 'pases-equivalencias.html', 'consultar-estado.html',
  'certificado-analitico.html', 'boleto-estudiantil.html', 'comunicados.html',
  'reservas-audiovisuales.html', 'cancelar-reserva.html', 'visitas-ees18.html',
  '404.html'
];

const normalPublicPages = fullLayoutPages.filter((file) => ![
  'cancelar-reserva.html', 'visitas-ees18.html', '404.html'
].includes(file));

const primaryHrefs = [
  'index.html', 'nuestra-escuela.html', 'propuesta-educativa.html',
  'estudiantes-familias.html', 'docentes.html', 'vida-escolar.html',
  'ingreso-2027.html', 'contacto.html'
];

const footerHrefs = [
  'index.html', 'nuestra-escuela.html', 'estudiantes-familias.html',
  'docentes.html', 'vida-escolar.html', 'contacto.html',
  'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'
];

function navHrefs(html) {
  const match = html.match(/<nav class="primary-nav"[\s\S]*?<\/nav>/i);
  assert(match, 'Falta primary-nav');
  return [...match[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

function footerNavHrefs(html) {
  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/i);
  assert(footer, 'Falta site-footer');
  const nav = footer[0].match(/<nav aria-label="Enlaces del pie"[\s\S]*?<\/nav>/i);
  assert(nav, 'Falta navegación uniforme del footer');
  return [...nav[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

for (const file of fullLayoutPages) {
  const html = read(file);
  assert.deepStrictEqual(navHrefs(html), primaryHrefs, `${file}: menú principal inconsistente`);
  assert(html.includes('assets/img/logo-ees18.jpg'), `${file}: debe usar logo local`);
  assert(!html.includes('isfd100-bue.infd.edu.ar'), `${file}: no debe depender del logo remoto`);

  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/i)[0];
  assert(footer.includes('Av. Manuel Belgrano 355 · Avellaneda'), `${file}: falta dirección en footer`);
  assert(footer.includes('secundaria18avellaneda@abc.gob.ar'), `${file}: falta correo en footer`);
  assert.deepStrictEqual(footerNavHrefs(html), footerHrefs, `${file}: footer inconsistente`);
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
  'cancelar-reserva.html', 'enspa-en-accion.html', 'visitas-enspa.html',
  'solicitar-analitico.html', 'visitas-ees18.html'
]) {
  assert(read(file).includes('name="robots" content="noindex,follow"'), `${file}: falta noindex,follow`);
}

const sitemap = read('sitemap.xml');
for (const forbidden of [
  'cancelar-reserva.html', 'enspa-en-accion.html', 'visitas-enspa.html',
  'solicitar-analitico.html', 'visitas-ees18.html'
]) {
  assert(!sitemap.includes(forbidden), `sitemap no debe incluir ${forbidden}`);
}

console.log('site-cleanup.test.js: all assertions passed');
```

- [ ] **Step 2: Actualizar tests antiguos que contradicen el diseño**

En `tests/site.test.js`, reemplazar las expectativas del sistema docente viejo por:

```javascript
assert(!docentes.includes('1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw/viewform'), 'teacher hub must remove obsolete contingency form');
assert(!docentes.includes('Carro Tecnológico'), 'teacher hub must not advertise unavailable public cart interface');
```

En `tests/test_site.py`, usar:

```python
PRINCIPAL = [
    "index.html", "nuestra-escuela.html", "propuesta-educativa.html",
    "estudiantes-familias.html", "docentes.html", "vida-escolar.html",
    "ingreso-2027.html", "contacto.html",
]
NAV_LINKS = [
    "index.html", "nuestra-escuela.html", "propuesta-educativa.html",
    "estudiantes-familias.html", "docentes.html", "vida-escolar.html",
    "ingreso-2027.html", "contacto.html",
]
```

En `tests/test_growth_suite.py`, reemplazar el test de visitas por:

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

- [ ] **Step 3: Agregar el test al workflow**

Después de `node tests/site.test.js` agregar:

```yaml
          node tests/site-cleanup.test.js
```

- [ ] **Step 4: Confirmar RED**

```bash
node tests/site-cleanup.test.js
node tests/site.test.js
pytest -q tests/test_site.py tests/test_growth_suite.py
```

Expected: FAIL por el estado actual del sitio; los fallos deben corresponder a Agenda, placeholders, formulario viejo, navegación/footer, logo remoto o SEO.

- [ ] **Step 5: Commit**

```bash
git add tests/site-cleanup.test.js tests/site.test.js tests/test_site.py tests/test_growth_suite.py .github/workflows/test-public.yml
git commit -m "test: define site cleanup contracts"
```

---

### Task 2: Limpiar contenido editorial y funciones públicas inexistentes

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

- [ ] **Step 1: Corregir Inicio, autoridad TT y Contacto**

En `index.html`, localizar la sección cuyo tag de apertura es exactamente:

```html
<section class="page-section page-section--dark" aria-labelledby="agenda-title">
```

y eliminar esa sección completa hasta su `</section>` correspondiente. Verificar después que `id="agenda-title"` ya no exista. No tocar el elemento que contiene `data-visitor-counter` ni el `<script src="assets/js/visitor-counter.js"></script>`.

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

- [ ] **Step 2: Dejar Docentes con un único canal de reservas**

Usar este encabezado de sección:

```html
<div class="section-heading">
  <span>Reservas y recursos</span>
  <h2>Herramientas disponibles.</h2>
  <p>El sistema de reservas del Salón de Audiovisuales está activo para consultar disponibilidad y reservar módulos de un único día.</p>
</div>
```

La grilla de reservas debe contener sólo:

```html
<article class="link-card link-card--accent">
  <small>Sistema vigente</small>
  <h3>Reservar Salón de Audiovisuales</h3>
  <p>Consultá la disponibilidad mensual, seleccioná módulos libres y confirmá la reserva para el día elegido. La confirmación y el enlace de cancelación llegan por correo.</p>
  <a href="reservas-audiovisuales.html">Reservar Salón de Audiovisuales →</a>
</article>
```

Eliminar la tarjeta del Google Form con ID `1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw` y la tarjeta `Carro Tecnológico`.

- [ ] **Step 3: Limpiar Trámites y Comunicados**

En `tramites.html`, dejar sólo Pases/equivalencias, Consulta por DNI, Analítico Final y Boleto Estudiantil; eliminar `Constancias y certificados` y `Formularios escolares`.

En `comunicados.html`, eliminar la grilla con `Fecha visible`, `Mensaje completo` y `Canal institucional`. Mantener el bloque dinámico:

```html
<div class="news-list news-list--spaced" data-news-section="comunicados">
  <div data-news-list>
    <div class="actualidad-empty"><strong>Comunicados oficiales</strong><br>En este momento no pudimos actualizar la lista. Consultá nuevamente en unos minutos o comunicate con la escuela por los canales institucionales.</div>
  </div>
</div>
```

- [ ] **Step 4: Convertir Vida escolar estática en archivo**

Antes de las dos historias estáticas agregar:

```html
<section class="page-section page-section--soft" aria-labelledby="archivo-vida-title">
  <div class="container">
    <div class="section-heading">
      <span>Memoria institucional · 2026</span>
      <h2 id="archivo-vida-title">Archivo de actividades destacadas</h2>
      <p>Estas publicaciones permanecen como registro de actividades ya realizadas por la comunidad educativa.</p>
    </div>
```

Conservar dentro de esta sección las historias de Leer en Comunidad y RE Bonaerense. Eliminar la sección `Qué compartimos` y sus seis tarjetas con `Nuevas publicaciones próximamente`. Mantener arriba `data-news-section="vida-escolar"`.

- [ ] **Step 5: Replantear Ingreso 2027**

En el hero usar:

```html
<div class="ingreso-campaign__actions ingreso-page-hero__actions">
  <a class="ingreso-campaign__button ingreso-campaign__button--primary" href="https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l">Seguir novedades por WhatsApp</a>
  <a class="ingreso-campaign__button" href="plan-estudios.html">Ver plan de estudios</a>
  <a class="ingreso-campaign__button" href="contacto.html">Contacto institucional</a>
</div>
```

Eliminar todos los `href="visitas-ees18.html"` de `ingreso-2027.html`.

En `visitas-ees18.html` usar este mensaje factual:

```html
<strong>Actualmente no hay jornadas de visita publicadas para Ingreso 2027.</strong>
<span>Si la escuela comunica una actividad abierta, se difundirá por los canales institucionales.</span>
```

No usar `Fecha a confirmar`, `fecha a confirmar` ni `se publicará cuando`.

- [ ] **Step 6: Ejecutar tests editoriales**

```bash
node tests/site-cleanup.test.js
node tests/site.test.js
pytest -q tests/test_site.py tests/test_growth_suite.py
```

Expected: los fallos que queden deben corresponder sólo a navegación/footer, identidad local, imágenes o SEO.

- [ ] **Step 7: Commit**

```bash
git add index.html nuestra-escuela.html contacto.html docentes.html tramites.html comunicados.html vida-escolar.html ingreso-2027.html visitas-ees18.html
git commit -m "fix: clean public school content"
```

---

### Task 3: Unificar navegación, footer y breadcrumbs

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
- Consumes: menú móvil de `assets/js/main.js` sin cambiar su API.
- Produces: ocho enlaces principales uniformes, footer uniforme y navegación contextual accesible.

- [ ] **Step 1: Aplicar el menú principal único**

Todos los `primary-nav` deben contener, en este orden:

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

Agregar `aria-current="page"` al enlace de sección según este mapeo:

```text
index.html -> Inicio
nuestra-escuela.html, historia.html -> Nuestra escuela
propuesta-educativa.html, plan-estudios.html -> Propuesta educativa
estudiantes-familias.html, tramites.html, pases-equivalencias.html, consultar-estado.html, certificado-analitico.html, boleto-estudiantil.html -> Estudiantes y familias
docentes.html, reservas-audiovisuales.html, cancelar-reserva.html -> Docentes
vida-escolar.html, comunicados.html -> Vida escolar
ingreso-2027.html, visitas-ees18.html -> Ingreso 2027
contacto.html -> Contacto
404.html -> ninguno
```

- [ ] **Step 2: Aplicar footer uniforme**

En todas las páginas de layout completo usar:

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

En `index.html`, insertar además el bloque existente que contiene `data-visitor-counter` después del `<nav>` y antes del copyright, sin modificar su contenido.

- [ ] **Step 3: Agregar CSS de breadcrumbs**

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

- [ ] **Step 4: Agregar breadcrumbs con rutas exactas**

Agregar un `<nav class="breadcrumbs container" aria-label="Ruta de navegación">` inmediatamente después de `<main id="contenido">` en:

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

Ejemplo exacto para `tramites.html`:

```html
<nav class="breadcrumbs container" aria-label="Ruta de navegación">
  <a href="index.html">Inicio</a><span aria-hidden="true">›</span>
  <a href="estudiantes-familias.html">Estudiantes y familias</a><span aria-hidden="true">›</span>
  <span aria-current="page">Trámites</span>
</nav>
```

- [ ] **Step 5: Versionar CSS compartido modificado**

Reemplazar en todas las páginas consumidoras:

```html
<link rel="stylesheet" href="assets/css/multipage.css">
```

por:

```html
<link rel="stylesheet" href="assets/css/multipage.css?v=20260908-3">
```

- [ ] **Step 6: Ejecutar tests de navegación**

```bash
node tests/site-cleanup.test.js
node tests/site.test.js
pytest -q tests/test_site.py
```

Expected: nav/footer GREEN; pueden quedar fallos de logo/imágenes/SEO.

- [ ] **Step 7: Commit**

```bash
git add *.html assets/css/multipage.css
git commit -m "refactor: unify site navigation and footer"
```

---

### Task 4: Localizar logo, favicon, PWA y metadata social

**Files:**
- Create: `assets/img/logo-ees18.jpg`
- Create: `assets/img/icon-192.png`
- Create: `assets/img/icon-512.png`
- Create: `favicon.ico`
- Create: `tests/test_site_identity.py`
- Modify: `site.webmanifest`
- Modify: las 20 páginas de layout completo

**Interfaces:**
- Consumes: `https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/celeste_cristina.jpg`.
- Produces: identidad local estable sin redibujar el emblema.

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
    paths = [
        ROOT / "assets/img/logo-ees18.jpg",
        ROOT / "assets/img/icon-192.png",
        ROOT / "assets/img/icon-512.png",
        ROOT / "favicon.ico",
    ]
    for item in paths:
        assert item.exists()
        assert item.stat().st_size > 500
    with Image.open(paths[0]) as image:
        assert image.format == "JPEG"
        image.verify()
    with Image.open(paths[1]) as image:
        assert image.format == "PNG" and image.size == (192, 192)
    with Image.open(paths[2]) as image:
        assert image.format == "PNG" and image.size == (512, 512)
    with Image.open(paths[3]) as image:
        assert image.format == "ICO"

def test_paginas_usan_logo_y_favicon_local():
    for name in FULL:
        html = read(name)
        assert "isfd100-bue.infd.edu.ar" not in html
        assert 'assets/img/logo-ees18.jpg' in html
        assert 'rel="icon" href="favicon.ico"' in html

def test_manifest_declara_iconos():
    manifest = json.loads(read("site.webmanifest"))
    assert manifest["icons"] == [
        {"src": "assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"},
    ]

def test_social_image_local():
    absolute = "https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg"
    for name in ["index.html", "ingreso-2027.html", "vida-escolar.html"]:
        html = read(name)
        assert f'property="og:image" content="{absolute}"' in html
        assert f'name="twitter:image" content="{absolute}"' in html
```

- [ ] **Step 2: Confirmar RED**

```bash
pytest -q tests/test_site_identity.py
```

Expected: FAIL por assets inexistentes/logo remoto.

- [ ] **Step 3: Descargar exactamente el emblema actual**

```bash
curl -L --fail --silent --show-error \
  'https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/celeste_cristina.jpg' \
  -o assets/img/logo-ees18.jpg
```

Si el shell no tiene salida a Internet, usar la capacidad de descarga de archivos del entorno para guardar esa misma URL y ningún otro recurso en `assets/img/logo-ees18.jpg`.

Verificar:

```bash
python - <<'PY'
from PIL import Image
with Image.open('assets/img/logo-ees18.jpg') as image:
    assert image.format == 'JPEG'
    print(image.size)
PY
```

- [ ] **Step 4: Generar iconos derivados**

```bash
python - <<'PY'
from PIL import Image, ImageOps
logo = Image.open('assets/img/logo-ees18.jpg').convert('RGB')
for size in (192, 512):
    icon = ImageOps.pad(logo, (size, size), method=Image.Resampling.LANCZOS, color='white', centering=(0.5, 0.5))
    icon.save(f'assets/img/icon-{size}.png', format='PNG', optimize=True)
favicon = ImageOps.pad(logo, (256, 256), method=Image.Resampling.LANCZOS, color='white', centering=(0.5, 0.5))
favicon.save('favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
PY
```

- [ ] **Step 5: Reemplazar logo remoto y declarar favicon**

En las 20 páginas, reemplazar la URL remota exacta por:

```html
assets/img/logo-ees18.jpg
```

y agregar dentro de `<head>`:

```html
<link rel="icon" href="favicon.ico">
```

- [ ] **Step 6: Actualizar manifest**

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

- [ ] **Step 7: Agregar metadata social**

En `index.html`, `ingreso-2027.html` y `vida-escolar.html` agregar:

```html
<meta property="og:image" content="https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg">
<meta property="og:image:alt" content="Emblema institucional de la E.E.S. Nº 18 Próspero Alemandri">
<meta name="twitter:image" content="https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg">
<meta name="twitter:image:alt" content="Emblema institucional de la E.E.S. Nº 18 Próspero Alemandri">
```

- [ ] **Step 8: Ejecutar tests y commit**

```bash
pytest -q tests/test_site_identity.py
node tests/site-cleanup.test.js
git add assets/img/logo-ees18.jpg assets/img/icon-192.png assets/img/icon-512.png favicon.ico site.webmanifest *.html tests/test_site_identity.py
git commit -m "feat: localize school visual identity"
```

---

### Task 5: Consolidar imágenes editoriales y simplificar renderer

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
- Consumes: 10 tiras JPEG de Leer en Comunidad y `re-bonaerense-2024.jpg`.
- Produces: `leer-en-comunidad-2026.jpg` de 240×349, `re-bonaerense-2026.jpg` de 280×420 y renderer de imagen estándar.

- [ ] **Step 1: Cambiar tests a la representación final y confirmar RED**

En `tests/novedades-client.test.js`:

```javascript
assert.strictEqual(rules.safeUrl('assets/img/re-bonaerense-2026.jpg'), 'assets/img/re-bonaerense-2026.jpg');
assert.strictEqual(typeof rules.posterStripUrls, 'undefined', 'No debe quedar el helper temporal de tiras');
```

Eliminar las expectativas que exigían 10 URLs.

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

Mantener tests de teclado, swipe, `createElement`, `textContent`, altura compacta y ausencia de autoplay.

En `tests/test_identidad_historia_vida.py`, el test de Leer debe exigir:

```python
'src="assets/img/leer-en-comunidad-2026.jpg"'
assert (ROOT / "assets/img/leer-en-comunidad-2026.jpg").exists()
```

El de RE debe exigir:

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

Agregar:

```python
def test_leer_en_comunidad_es_jpeg_consolidado():
    path = ROOT / "assets" / "img" / "leer-en-comunidad-2026.jpg"
    assert path.exists()
    with Image.open(path) as image:
        assert image.format == "JPEG"
        assert image.size == (240, 349)
        image.verify()
```

En `tests/re-bonaerense-year.test.js` agregar:

```javascript
assert.strictEqual(re['Imagen'], 'assets/img/re-bonaerense-2026.jpg');
```

Actualizar en `tests/site.test.js` y `tests/test_site.py` las expectativas de `re-bonaerense-2024.jpg` a `re-bonaerense-2026.jpg` y las de tiras a `leer-en-comunidad-2026.jpg`.

Run:

```bash
node tests/novedades-client.test.js
node tests/novedades-pages.test.js
pytest -q tests/test_identidad_historia_vida.py tests/test_re_bonaerense_image.py
```

Expected: FAIL hasta crear assets y simplificar renderer.

- [ ] **Step 2: Consolidar Leer en Comunidad**

```bash
python - <<'PY'
from pathlib import Path
from PIL import Image
root = Path('assets/img')
paths = [root / f'leer-en-comunidad-2026-{n:02d}.jpg' for n in range(1, 11)]
images = [Image.open(path).convert('RGB') for path in paths]
try:
    assert {image.width for image in images} == {240}
    total_height = sum(image.height for image in images)
    assert total_height == 349
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

No borrar las tiras en esta entrega.

- [ ] **Step 3: Crear alias RE 2026**

```bash
cp assets/img/re-bonaerense-2024.jpg assets/img/re-bonaerense-2026.jpg
```

No borrar el asset 2024 en esta entrega.

- [ ] **Step 4: Actualizar HTML y seed**

En `vida-escolar.html` usar para Leer:

```html
<figure>
  <img src="assets/img/leer-en-comunidad-2026.jpg" alt="Afiche institucional de Leer en Comunidad, realizado el 4 de septiembre de 2026 en la E.E.S. Nº 18" width="240" height="349">
</figure>
```

Reemplazar el asset estático de RE por `assets/img/re-bonaerense-2026.jpg`.

En `data/novedades-seed.json`:

```text
leer-en-comunidad-2026-09-04.Imagen = assets/img/leer-en-comunidad-2026.jpg
re-bonaerense-2026.Imagen = assets/img/re-bonaerense-2026.jpg
```

- [ ] **Step 5: Simplificar `appendNewsImage`**

Eliminar `posterStripUrls` y reemplazar `appendNewsImage` por:

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

Eliminar `posterStripUrls` del objeto exportado si figura al final del módulo.

- [ ] **Step 6: Retirar CSS temporal y versionar Novedades**

Eliminar selectores `.news-poster-strips` de `novedades-carousel.css` y `actualidad.css`.

Usar:

```text
index.html -> novedades-carousel.css?v=20260908-3 y novedades.js?v=20260908-3
vida-escolar.html -> actualidad.css?v=20260908-3 y novedades.js?v=20260908-3
comunicados.html -> actualidad.css?v=20260908-3 y novedades.js?v=20260908-3
```

- [ ] **Step 7: Ejecutar tests y commit**

```bash
node tests/novedades-client.test.js
node tests/novedades-pages.test.js
node tests/re-bonaerense-year.test.js
node tests/site.test.js
pytest -q tests/test_identidad_historia_vida.py tests/test_re_bonaerense_image.py tests/test_site.py
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
- Consumes: URLs auxiliares existentes.
- Produces: mismas URLs funcionales, fuera del índice principal.

- [ ] **Step 1: Agregar meta robots exacta**

En las cinco páginas agregar dentro de `<head>`:

```html
<meta name="robots" content="noindex,follow">
```

No bloquearlas en `robots.txt`.

- [ ] **Step 2: Limpiar sitemap**

`sitemap.xml` no debe incluir:

```text
/cancelar-reserva.html
/enspa-en-accion.html
/visitas-enspa.html
/solicitar-analitico.html
/visitas-ees18.html
```

La única de esas rutas presente actualmente en sitemap es `visitas-ees18.html`; eliminarla y no agregar las demás.

- [ ] **Step 3: Ejecutar tests y commit**

```bash
node tests/site-cleanup.test.js
pytest -q tests/test_growth_suite.py tests/test_site_identity.py
git add cancelar-reserva.html enspa-en-accion.html visitas-enspa.html solicitar-analitico.html visitas-ees18.html sitemap.xml
git commit -m "fix: keep auxiliary pages out of search index"
```

---

### Task 7: Verificación integral, PR y deploy

**Files:**
- Verify only: todo el árbol de trabajo.

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: PR GREEN y GitHub Pages desplegado sin cambios de backend.

- [ ] **Step 1: Ejecutar suite Python completa**

```bash
pytest -q
```

Expected: PASS.

- [ ] **Step 2: Ejecutar checks JS equivalentes a CI**

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

Expected: PASS, incluido `visitor-counter.test.js`.

- [ ] **Step 3: Ejecutar probes productivos pre-merge**

```bash
python tests/probe_reservas_live.py
python tests/probe_novedades_live.py
```

Expected: ambos PASS. La Sheet todavía puede devolver las rutas antiguas; eso es esperado hasta Task 8.

- [ ] **Step 4: Confirmar que backends no cambiaron**

```bash
git diff main...HEAD -- apps-script/reservas-audiovisuales
git diff main...HEAD -- apps-script/solicitud-analitico-final
git diff main...HEAD -- apps-script/novedades
git diff main...HEAD -- assets/js/reservas-config.js assets/js/status-config.js assets/js/contacto.js assets/js/reservas-audiovisuales.js assets/js/estado-publico.js
git diff --check
git status --short
```

Expected: diffs de backend vacíos, `git diff --check` limpio y worktree sin cambios sin commit.

- [ ] **Step 5: Revisar diff**

```bash
git diff main...HEAD --stat
git diff main...HEAD -- '*.html' '*.css' '*.js' '*.json' '*.xml' 'tests/*'
```

Confirmar que el contador sigue presente, sólo existe el sistema nuevo de Reservas, Motyl Nadezhda figura, no quedan placeholders normales, nav/footer son uniformes, el logo es local y `noindex` sólo se aplica a las páginas acordadas.

- [ ] **Step 6: Abrir PR**

Título:

```text
Limpieza integral e identidad local del sitio EES18
```

Body:

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

Esperar `Test public site` GREEN antes del merge.

- [ ] **Step 7: Merge y verificar Pages**

Después del merge, esperar `pages build and deployment = success` para el SHA de merge. Confirmar acceso público a:

```text
https://ees18avellaneda.edu.ar/assets/img/logo-ees18.jpg
https://ees18avellaneda.edu.ar/assets/img/icon-192.png
https://ees18avellaneda.edu.ar/assets/img/icon-512.png
https://ees18avellaneda.edu.ar/assets/img/leer-en-comunidad-2026.jpg
https://ees18avellaneda.edu.ar/assets/img/re-bonaerense-2026.jpg
```

No tocar la Sheet hasta que las cinco URLs funcionen públicamente.

---

### Task 8: Migrar las dos rutas de Sheet y validar producción

**Files / external data:**
- Google Sheet: `Novedades EES18 - BASE`
- Spreadsheet ID: `1q_pGx5hQ1NR19CpRLMp3Kup5_CmF7RuE_vsyiqwFUi4`
- Tab: `Novedades`

**Interfaces:**
- Consumes: nuevos assets ya desplegados.
- Produces: API de Novedades usando las rutas nuevas sin redeploy de Apps Script.

- [ ] **Step 1: Leer skill de spreadsheets**

Leer `/home/oai/skills/spreadsheets/SKILL.md` antes de cualquier escritura.

- [ ] **Step 2: Leer las dos filas por ID y capturar valores previos**

Localizar por `ID`:

```text
leer-en-comunidad-2026-09-04
re-bonaerense-2026
```

Esperar en `Imagen`:

```text
assets/img/leer-en-comunidad-2026-01.jpg
assets/img/re-bonaerense-2024.jpg
```

Si un valor ya difiere, leer y reconciliar; no sobrescribir por número de fila ni a ciegas.

- [ ] **Step 3: Cambiar exclusivamente las dos celdas Imagen**

```text
leer-en-comunidad-2026-09-04 -> assets/img/leer-en-comunidad-2026.jpg
re-bonaerense-2026 -> assets/img/re-bonaerense-2026.jpg
```

No modificar ninguna otra celda, formato, validación o columna.

- [ ] **Step 4: Esperar cache y comprobar API pública**

Esperar hasta 120 segundos. Consultar anónimamente:

```text
https://script.google.com/macros/s/AKfycbzguaQvZVJnkptjrEfIi6H0BpyrUt1hb10tFBXzx_PQKdqWXZxUex1rzVMEKhr5gmZi-w/exec?section=inicio
```

Verificar:

```text
leer-en-comunidad-2026-09-04.image == assets/img/leer-en-comunidad-2026.jpg
re-bonaerense-2026.image == assets/img/re-bonaerense-2026.jpg
```

- [ ] **Step 5: Ejecutar probes finales**

```bash
python tests/probe_reservas_live.py
python tests/probe_novedades_live.py
```

Expected: PASS.

- [ ] **Step 6: Verificar producción**

Comprobar:

```text
Inicio: sin Agenda y con contador funcionando/fallback silencioso.
Nuestra escuela: Motyl Nadezhda.
Contacto: sin teléfono no confirmado.
Docentes: sin Google Form viejo ni Carro Tecnológico.
Reservas: lógica intacta, un solo día.
Comunicados: lista dinámica primero.
Vida escolar: novedades actuales arriba y Archivo de actividades destacadas abajo.
Ingreso 2027: WhatsApp, Contacto y Plan; sin CTA de visitas.
Menú y footer uniformes en escritorio y móvil.
Logo/favicon locales cargando.
Páginas auxiliares con noindex,follow.
Leer en Comunidad y RE Bonaerense usando las rutas 2026 nuevas.
```

Si un asset nuevo no cargara después del deploy, restaurar de inmediato las dos celdas `Imagen` a los valores previos; los assets antiguos se conservaron para que ese rollback sea seguro.
