# Novedades administrables desde Google Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una fuente editorial única en Google Sheets para que las novedades de Inicio, Comunicados y Vida escolar puedan publicarse, editarse, ordenarse u ocultarse sin tocar GitHub.

**Architecture:** Un Google Sheet `Novedades EES18 - BASE` actúa como fuente editorial. Un Apps Script separado, `Novedades EES18 - PRODUCCIÓN`, expone únicamente lectura pública por JSON/JSONP y filtra por sección. El sitio estático consume ese endpoint con un cliente JavaScript aislado que renderiza un carrusel manual en Inicio y listas dinámicas en Comunicados/Vida escolar, con fallback estable si la API falla.

**Tech Stack:** HTML estático, CSS, JavaScript ES2020 sin dependencias, Node.js `assert` + `vm`, Python 3 para probes, Google Sheets, Google Apps Script, GitHub Pages, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-07-novedades-sheet-design.md`

## Global Constraints

- Reservas y Contacto no se modifican ni comparten backend con Novedades.
- El Web App de Novedades es público sólo para lectura; no existe endpoint público de escritura.
- La Sheet queda editable sólo por cuentas autorizadas.
- Las publicaciones nuevas requieren `Fecha`; contenido histórico puede usar `Fecha visible` sin inventar día/mes.
- Orden: `Prioridad` descendente, luego `Fecha` descendente y finalmente orden estable de fila.
- URLs públicas permitidas: `https:` o rutas internas relativas seguras.
- Texto proveniente de la Sheet se inserta como texto, nunca como HTML sin sanitización.
- Inicio no usa autoplay; incluye anterior/siguiente, indicadores, teclado y swipe.
- Una falla de Google/Apps Script no debe romper layout ni dejar la página inutilizable.
- Los cambios editoriales deben reflejarse sin nuevo deploy del sitio; TTL objetivo 120 segundos.

---

### Task 1: Backend Apps Script de sólo lectura

**Files:**
- Create: `apps-script/novedades/Config.gs`
- Create: `apps-script/novedades/Data.gs`
- Create: `apps-script/novedades/Code.gs`
- Create: `apps-script/novedades/DEPLOY.md`
- Test: `tests/novedades-backend.test.js`

**Interfaces:**
- Consumes: Script Property `NOVEDADES_SPREADSHEET_ID`; pestaña `Novedades`.
- Produces: `getPublicNews_(section)` → `{ ok: true, section, items: PublicNewsItem[] }`.
- `PublicNewsItem`: `{ id, date, dateDisplay, priority, type, title, summary, body, image, buttonText, buttonUrl }`.

- [ ] **Step 1: Escribir el test RED**

Crear `tests/novedades-backend.test.js` con `assert`, `fs`, `path` y `vm`. Cabeceras exactas:

```js
const HEADERS = [
  'ID', 'Activa', 'Fecha', 'Fecha visible', 'Prioridad', 'Tipo', 'Título',
  'Bajada', 'Cuerpo', 'Imagen', 'Botón texto', 'Botón URL',
  'Inicio', 'Comunicados', 'Vida escolar', 'Actualizada'
];
```

El fixture debe incluir:
- `whatsapp-2026-09-07`, prioridad 30, Inicio/Comunicados Sí;
- `leer-en-comunidad-2026-09-04`, prioridad 20, Inicio/Vida escolar Sí;
- `re-bonaerense-2026`, Fecha vacía, Fecha visible `2026`, prioridad 10, Inicio/Vida escolar Sí;
- una fila inactiva;
- una fila sólo Comunicados.

Assertions obligatorios:

```js
assert.strictEqual(context.normalizeNewsYesNo_('Sí'), true);
assert.strictEqual(context.normalizeNewsYesNo_('No'), false);
assert.strictEqual(context.safePublicNewsUrl_('javascript:alert(1)'), '');
assert.strictEqual(context.safePublicNewsUrl_('assets/img/re-bonaerense-2024.jpg'), 'assets/img/re-bonaerense-2024.jpg');
assert.strictEqual(context.safePublicNewsUrl_('https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'), 'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l');
const result = context.buildPublicNews_('inicio', HEADERS, rows);
assert.deepStrictEqual(result.map((item) => item.id), ['whatsapp-2026-09-07', 'leer-en-comunidad-2026-09-04', 're-bonaerense-2026']);
assert.strictEqual(result[2].date, '');
assert.strictEqual(result[2].dateDisplay, '2026');
```

También verificar JSONP válido, callback inválido ignorado y ausencia total de `doPost`.

- [ ] **Step 2: Ejecutar RED**

```bash
node tests/novedades-backend.test.js
```

Expected: FAIL porque los archivos todavía no existen.

- [ ] **Step 3: Implementar `Config.gs`**

```javascript
var NOVEDADES_SETTINGS_ = Object.freeze({
  SHEET_NAME: 'Novedades',
  CACHE_SECONDS: 120
});

function novedadesSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty('NOVEDADES_SPREADSHEET_ID');
  if (!id) throw new Error('MISSING_NOVEDADES_SPREADSHEET_ID');
  return String(id).trim();
}
```

- [ ] **Step 4: Implementar normalización en `Data.gs`**

```javascript
function normalizeNewsYesNo_(value) {
  var text = String(value == null ? '' : value).trim().toUpperCase();
  return value === true || text === 'SÍ' || text === 'SI' || text === 'TRUE' || text === '1';
}

function safePublicNewsUrl_(value) {
  var text = String(value == null ? '' : value).trim();
  if (!text) return '';
  if (/^https:\/\//i.test(text)) return text;
  if (/^(?:\.\/)?(?:assets|vida-escolar|comunicados|contacto|ingreso-2027|index)[A-Za-z0-9_./?#=&%-]*$/i.test(text)) return text;
  return '';
}
```

`buildPublicNews_(section, headers, rows)` debe aceptar sólo `inicio`, `comunicados`, `vida-escolar`; omitir filas inactivas o sin ID/título; requerir Fecha o Fecha visible; filtrar por la columna de sección; devolver sólo campos públicos; ordenar prioridad desc, fecha desc, fila asc.

`getPublicNews_(section)` debe abrir la Sheet una sola vez por ejecución, leer rango usado y cachear el payload público por 120 segundos.

- [ ] **Step 5: Implementar `Code.gs`**

```javascript
function doGet(e) {
  var params = (e && e.parameter) || {};
  try {
    var section = String(params.section || 'inicio').trim();
    return newsOutput_(getPublicNews_(section), params.callback);
  } catch (error) {
    return newsOutput_({ ok: false, code: 'REQUEST_ERROR' }, params.callback);
  }
}
```

`sanitizeNewsJsonpCallback_()` debe aceptar sólo `^[A-Za-z_$][A-Za-z0-9_$.]{0,100}$`. `newsOutput_()` debe usar `ContentService` y devolver JSON o JavaScript según callback. No crear `doPost`.

- [ ] **Step 6: Documentar despliegue**

`DEPLOY.md` debe indicar: crear proyecto separado `Novedades EES18 - PRODUCCIÓN`; copiar los tres `.gs`; crear Script Property `NOVEDADES_SPREADSHEET_ID` usando el ID real de la Sheet creada en Task 6; implementar como Web App ejecutado por el propietario con acceso público; conservar la URL `/exec`.

- [ ] **Step 7: GREEN + commit**

```bash
node tests/novedades-backend.test.js
git add apps-script/novedades tests/novedades-backend.test.js
git commit -m "feat: add read-only novedades backend"
```

---

### Task 2: Cliente JavaScript y contrato seguro

**Files:**
- Create: `assets/js/novedades.js`
- Create: `assets/js/novedades-config.js`
- Test: `tests/novedades-client.test.js`

**Interfaces:**
- Consumes: `window.EES18_NOVEDADES_API_URL`.
- Produces: `window.EES18Novedades` y `module.exports` con `normalizeItem`, `safeUrl`, `sortItems`, `createCarouselState`.

- [ ] **Step 1: Escribir test RED**

```js
const assert = require('assert');
const rules = require('../assets/js/novedades.js');
assert.strictEqual(rules.safeUrl('javascript:alert(1)'), '');
assert.strictEqual(rules.safeUrl('https://example.org/x'), 'https://example.org/x');
assert.strictEqual(rules.safeUrl('assets/img/re-bonaerense-2024.jpg'), 'assets/img/re-bonaerense-2024.jpg');
const sorted = rules.sortItems([
  { id: 'a', priority: 0, date: '2026-09-04' },
  { id: 'b', priority: 2, date: '2026-09-01' },
  { id: 'c', priority: 0, date: '2026-09-07' }
]);
assert.deepStrictEqual(sorted.map((item) => item.id), ['b', 'c', 'a']);
const state = rules.createCarouselState(3);
assert.strictEqual(state.current(), 0);
assert.strictEqual(state.next(), 1);
assert.strictEqual(state.next(), 2);
assert.strictEqual(state.next(), 0);
assert.strictEqual(state.previous(), 2);
```

- [ ] **Step 2: Ejecutar RED**

```bash
node tests/novedades-client.test.js
```

- [ ] **Step 3: Implementar módulo exportable**

Usar patrón UMD compatible Node/browser. `normalizeItem(raw)` debe truncar título 180, bajada 400, cuerpo 2400, tipo 80 y CTA 100 caracteres. No aceptar HTML arbitrario.

- [ ] **Step 4: Implementar JSONP browser-only**

`requestNews(section)` crea callback único, `<script>` dinámico y timeout de 12 segundos. Debe limpiar script, timer y callback tanto en success como error.

- [ ] **Step 5: Crear config predeployment**

```javascript
window.EES18_NOVEDADES_API_URL = '';
```

URL vacía mantiene el fallback y no rompe la página.

- [ ] **Step 6: GREEN + commit**

```bash
node tests/novedades-client.test.js
node --check assets/js/novedades.js
node --check assets/js/novedades-config.js
git add assets/js/novedades.js assets/js/novedades-config.js tests/novedades-client.test.js
git commit -m "feat: add novedades client"
```

---

### Task 3: Carrusel manual en Inicio

**Files:**
- Modify: `index.html`
- Modify: `assets/css/home-layout.css`
- Modify: `assets/js/novedades.js`
- Test: `tests/novedades-pages.test.js`
- Modify: `tests/site.test.js`
- Modify: `tests/whatsapp-channel.test.js`
- Modify: `tests/re-bonaerense-year.test.js`

**Interfaces:**
- Consumes: `requestNews('inicio')`.
- Produces: `[data-news-section="inicio"]`, `[data-news-prev]`, `[data-news-next]`, `[data-news-dots]`.

- [ ] **Step 1: RED de estructura**

```js
assert(index.includes('data-news-section="inicio"'));
assert(index.includes('data-news-prev'));
assert(index.includes('data-news-next'));
assert(index.includes('data-news-dots'));
assert(index.includes('assets/js/novedades-config.js'));
assert(index.includes('assets/js/novedades.js'));
assert(/Novedades destacadas/i.test(index));
```

Actualizar tests viejos para dejar de exigir Canal de WhatsApp/RE hardcodeados en portada; deben validar el contenedor dinámico y los IDs seed en tests de datos.

- [ ] **Step 2: Ejecutar RED**

```bash
node tests/novedades-pages.test.js
node tests/site.test.js
node tests/whatsapp-channel.test.js
node tests/re-bonaerense-year.test.js
```

- [ ] **Step 3: Reemplazar noticia fija por shell con fallback**

```html
<div class="news-carousel reveal" data-news-section="inicio" aria-live="polite">
  <div class="news-carousel__viewport" data-news-list>
    <article class="news-fallback">
      <h3>Novedades de la E.E.S. Nº 18</h3>
      <p>Consultá los comunicados oficiales y la vida escolar.</p>
      <a class="simple-button" href="comunicados.html">Ver comunicados</a>
    </article>
  </div>
  <div class="news-carousel__controls">
    <button type="button" data-news-prev aria-label="Novedad anterior">←</button>
    <div data-news-dots aria-label="Selector de novedades"></div>
    <button type="button" data-news-next aria-label="Novedad siguiente">→</button>
  </div>
</div>
```

Cargar `novedades-config.js` y `novedades.js` antes del cierre de `body`.

- [ ] **Step 4: Implementar render accesible**

Crear todos los nodos con `createElement`, `textContent` y atributos seguros. Flechas con wrap, teclado ArrowLeft/ArrowRight, swipe >=45 px, sin autoplay, controles ocultos con 0/1 item, placeholder institucional si no hay imagen.

- [ ] **Step 5: CSS responsive**

Agregar `news-carousel`, `news-card`, `news-card__media`, `news-card__body`, `news-carousel__controls`, `news-carousel__dot`; desktop dos columnas, móvil una columna; `prefers-reduced-motion` sin transición.

- [ ] **Step 6: GREEN + commit**

```bash
node tests/novedades-pages.test.js
node tests/site.test.js
node tests/whatsapp-channel.test.js
node tests/re-bonaerense-year.test.js
node --check assets/js/novedades.js
git add index.html assets/css/home-layout.css assets/js/novedades.js tests
git commit -m "feat: add home news carousel"
```

---

### Task 4: Comunicados dinámicos

**Files:**
- Modify: `comunicados.html`
- Modify: `assets/css/actualidad.css`
- Modify: `assets/js/novedades.js`
- Test: `tests/novedades-pages.test.js`

**Interfaces:**
- Consumes: `requestNews('comunicados')`.
- Produces: `[data-news-section="comunicados"]`.

- [ ] **Step 1: RED**

```js
assert(comunicados.includes('data-news-section="comunicados"'));
assert(comunicados.includes('assets/js/novedades-config.js'));
assert(comunicados.includes('assets/js/novedades.js'));
```

- [ ] **Step 2: Reemplazar panel estático específico del canal**

Usar un contenedor dinámico con fallback `actualidad-empty`. Cada item muestra `dateDisplay || fecha formateada`, tipo, título, `body || summary` y CTA seguro.

- [ ] **Step 3: Estilos + GREEN + commit**

```bash
node tests/novedades-pages.test.js
node tests/site.test.js
node --check assets/js/novedades.js
git add comunicados.html assets/css/actualidad.css assets/js/novedades.js tests/novedades-pages.test.js
git commit -m "feat: render comunicados from novedades feed"
```

---

### Task 5: Vida escolar administrable sin borrar archivo histórico

**Files:**
- Modify: `vida-escolar.html`
- Modify: `assets/css/actualidad.css`
- Modify: `assets/js/novedades.js`
- Test: `tests/novedades-pages.test.js`
- Modify: `tests/re-bonaerense-year.test.js`

**Interfaces:**
- Consumes: `requestNews('vida-escolar')`.
- Produces: `[data-news-section="vida-escolar"]`; historias estáticas existentes permanecen debajo durante esta fase.

- [ ] **Step 1: RED**

```js
assert(vida.includes('data-news-section="vida-escolar"'));
assert(vida.includes('assets/js/novedades.js'));
assert(vida.includes('2.º Encuentro de RE Bonaerense'));
assert(vida.includes('Leer en Comunidad'));
```

- [ ] **Step 2: Insertar sección dinámica antes del archivo histórico**

Heading `Novedades de Vida escolar`; tarjetas compactas con imagen opcional, fecha visible, tipo, título, bajada y CTA. `body` se presenta como texto, no HTML.

- [ ] **Step 3: GREEN + commit**

```bash
node tests/novedades-pages.test.js
node tests/re-bonaerense-year.test.js
node tests/site.test.js
node --check assets/js/novedades.js
git add vida-escolar.html assets/css/actualidad.css assets/js/novedades.js tests
git commit -m "feat: add managed vida escolar news"
```

---

### Task 6: Crear Google Sheet editorial y cargar datos iniciales

**Files:**
- External artifact: Google Sheet `Novedades EES18 - BASE`, tab `Novedades`.

**Interfaces:**
- Produces: Spreadsheet ID real para Script Property `NOVEDADES_SPREADSHEET_ID`.

- [ ] **Step 1: Crear Sheet**

Columnas, en orden:

```text
ID | Activa | Fecha | Fecha visible | Prioridad | Tipo | Título | Bajada | Cuerpo | Imagen | Botón texto | Botón URL | Inicio | Comunicados | Vida escolar | Actualizada
```

- [ ] **Step 2: Validaciones**

`Activa`, `Inicio`, `Comunicados`, `Vida escolar`: dropdown `Sí/No`. `Prioridad`: entero >=0. `Fecha`: formato `dd/mm/yyyy`. Congelar fila 1 y activar filtro.

- [ ] **Step 3: Seed WhatsApp**

```text
ID=whatsapp-2026-09-07
Activa=Sí
Fecha=07/09/2026
Fecha visible=7 de septiembre de 2026
Prioridad=30
Tipo=Institucional
Título=Canal oficial de WhatsApp
Bajada=La E.E.S. Nº 18 incorpora un canal de WhatsApp para compartir novedades y avisos institucionales con la comunidad educativa.
Cuerpo=La E.E.S. Nº 18 incorpora un canal de WhatsApp para compartir novedades y avisos institucionales con la comunidad educativa.
Botón texto=📢 Seguir el canal de WhatsApp
Botón URL=https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l
Inicio=Sí
Comunicados=Sí
Vida escolar=No
```

- [ ] **Step 4: Seed Leer en Comunidad**

```text
ID=leer-en-comunidad-2026-09-04
Activa=Sí
Fecha=04/09/2026
Fecha visible=4 de septiembre de 2026
Prioridad=20
Tipo=Vida escolar
Título=Leer en Comunidad
Bajada=Segunda jornada de Leer en Comunidad en el marco de Bibliotecas Escolares Abiertas 2026.
Imagen=assets/img/leer-en-comunidad-2026-01.jpg
Botón texto=Ver Vida escolar
Botón URL=vida-escolar.html
Inicio=Sí
Comunicados=No
Vida escolar=Sí
```

- [ ] **Step 5: Seed RE Bonaerense**

```text
ID=re-bonaerense-2026
Activa=Sí
Fecha=[celda vacía]
Fecha visible=2026
Prioridad=10
Tipo=Proyecto institucional
Título=2.º Encuentro de RE Bonaerense
Bajada=La E.E.S. Nº 18 compartió micro relatos del proyecto “Estudiantes hacen memoria” junto con otras instituciones de la región.
Imagen=assets/img/re-bonaerense-2024.jpg
Botón texto=Ver Vida escolar
Botón URL=vida-escolar.html
Inicio=Sí
Comunicados=No
Vida escolar=Sí
```

- [ ] **Step 6: Verificar permisos**

La Sheet no queda editable públicamente. Sólo propietario/cuentas autorizadas editan; Web App lee como propietario.

---

### Task 7: Desplegar Web App separado y conectar el sitio

**Files:**
- Modify: `assets/js/novedades-config.js`
- Create: `tests/probe_novedades_live.py`
- Modify: `.github/workflows/test-public.yml`

**Interfaces:**
- Consumes: URL `/exec` real devuelta por Apps Script.
- Produces: endpoint productivo `section=inicio|comunicados|vida-escolar`.

- [ ] **Step 1: Desplegar Apps Script**

Seguir `apps-script/novedades/DEPLOY.md`. Crear la Script Property con el Spreadsheet ID real de Task 6. No reutilizar el proyecto de Reservas.

- [ ] **Step 2: Probar endpoint directamente**

Abrir la URL `/exec` real agregando `?section=inicio`. Debe devolver `ok=true` y exactamente los tres IDs seed en orden WhatsApp → Leer → RE.

- [ ] **Step 3: Conectar config**

Reemplazar la cadena vacía de `assets/js/novedades-config.js` por la URL `/exec` real devuelta por Apps Script. Antes de commit verificar que la cadena empieza con `https://script.google.com/macros/s/` y termina en `/exec`.

- [ ] **Step 4: Escribir probe live**

`tests/probe_novedades_live.py` debe leer la URL del config, hacer GET `section=inicio` con timeout 20 s y exigir:
- `ok is True`;
- lista `items` con al menos 3;
- IDs seed presentes;
- respuesta sin claves `Activa`/`Actualizada`, sin emails, sin tokens/acciones de escritura.

- [ ] **Step 5: Ejecutar probe**

```bash
python tests/probe_novedades_live.py
```

Expected: PASS.

- [ ] **Step 6: Integrar CI**

Agregar syntax checks para `novedades-config.js` y `novedades.js`; structure checks para los tres tests de novedades; y step `Probe deployed novedades Web App` ejecutando `python tests/probe_novedades_live.py`.

- [ ] **Step 7: Commit**

```bash
git add assets/js/novedades-config.js tests/probe_novedades_live.py .github/workflows/test-public.yml
git commit -m "chore: connect novedades production endpoint"
```

---

### Task 8: Verificación end-to-end y cierre

**Files:**
- No code change salvo defecto demostrado por test.

**Interfaces:**
- Verifica Sheet → Apps Script → GitHub Pages y aislamiento de Reservas.

- [ ] **Step 1: Suite completa**

```bash
pytest -q
node tests/site.test.js
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
python tests/probe_reservas_live.py
python tests/probe_novedades_live.py
```

Expected: todo PASS.

- [ ] **Step 2: Probar edición sin deploy**

Cambiar temporalmente la Bajada del Canal de WhatsApp agregando `PRUEBA EDITORIAL`, esperar hasta 120 s, recargar Inicio/Comunicados y verificar el cambio sin commit/deploy. Restaurar el texto original.

- [ ] **Step 3: Probar ocultación sin deploy**

Cambiar `Activa` de RE Bonaerense a `No`, esperar hasta 120 s y verificar que desaparece del carrusel y sección dinámica de Vida escolar mientras el archivo histórico estático permanece. Restaurar `Sí`.

- [ ] **Step 4: Probar fallback**

Con URL vacía o inválida en test/local, verificar fallback útil y ausencia de errores JavaScript visibles.

- [ ] **Step 5: Revisión visual**

Desktop/móvil: una tarjeta visible; flechas/puntos; swipe; teclado; links sin `target="_blank"`; placeholder sin imagen; reduced motion; Comunicados y Vida escolar legibles.

- [ ] **Step 6: Criterios de aceptación**

Confirmar los 7 criterios del spec: edición sólo en Sheet, cero deploy editorial, carrusel manual, fuente única para las tres áreas, canal WhatsApp administrable, backend independiente de Reservas/Contacto y degradación segura.

- [ ] **Step 7: Commit sólo si hubo correcciones**

```bash
git status --short
```

No crear commit vacío. Si hubo una corrección, repetir suite focalizada y completa antes de commit.
