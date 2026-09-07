# Novedades administrables desde Google Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una fuente editorial única en Google Sheets para que las novedades de Inicio, Comunicados y Vida escolar puedan publicarse, editarse, ordenarse u ocultarse sin tocar GitHub.

**Architecture:** Un Google Sheet `Novedades EES18 - BASE` actúa como fuente editorial. Un Apps Script separado, `Novedades EES18 - PRODUCCIÓN`, expone únicamente lectura pública por JSON/JSONP y filtra por sección. El sitio estático consume ese endpoint con un cliente JavaScript aislado que renderiza un carrusel manual en Inicio y listas dinámicas en Comunicados/Vida escolar, con fallback estable si la API falla.

**Tech Stack:** HTML estático, CSS, JavaScript ES2020 sin dependencias, Node.js `assert` + `vm` para tests, Google Sheets, Google Apps Script, GitHub Pages, GitHub Actions.

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
- Los cambios editoriales deben reflejarse sin nuevo deploy del sitio; una caché corta de pocos minutos es aceptable.

---

### Task 1: Contrato de datos y backend Apps Script de sólo lectura

**Files:**
- Create: `apps-script/novedades/Config.gs`
- Create: `apps-script/novedades/Data.gs`
- Create: `apps-script/novedades/Code.gs`
- Create: `apps-script/novedades/DEPLOY.md`
- Test: `tests/novedades-backend.test.js`

**Interfaces:**
- Consumes: Script Property `NOVEDADES_SPREADSHEET_ID`; pestaña `Novedades`.
- Produces: `getPublicNews_(section)` → `{ ok: true, section, items: PublicNewsItem[] }`; `doGet(e)` JSON/JSONP de sólo lectura.
- `PublicNewsItem`: `{ id, date, dateDisplay, priority, type, title, summary, body, image, buttonText, buttonUrl }`.

- [ ] **Step 1: Escribir el test RED del backend**

Crear `tests/novedades-backend.test.js` con un `vm` que cargue `Config.gs`, `Data.gs` y `Code.gs`. El test debe construir filas simuladas con estas cabeceras exactas:

```js
const HEADERS = [
  'ID', 'Activa', 'Fecha', 'Fecha visible', 'Prioridad', 'Tipo', 'Título',
  'Bajada', 'Cuerpo', 'Imagen', 'Botón texto', 'Botón URL',
  'Inicio', 'Comunicados', 'Vida escolar', 'Actualizada'
];
```

Casos mínimos:

```js
assert.strictEqual(context.normalizeNewsYesNo_('Sí'), true);
assert.strictEqual(context.normalizeNewsYesNo_('No'), false);
assert.strictEqual(context.safePublicNewsUrl_('javascript:alert(1)'), '');
assert.strictEqual(context.safePublicNewsUrl_('assets/img/re-bonaerense-2024.jpg'), 'assets/img/re-bonaerense-2024.jpg');
assert.strictEqual(context.safePublicNewsUrl_('https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'), 'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l');

const result = context.buildPublicNews_('inicio', HEADERS, rows);
assert.deepStrictEqual(result.map((item) => item.id), ['whatsapp-2026-09-07', 'leer-2026-09-04', 're-bonaerense-2026']);
assert.strictEqual(result[2].date, '');
assert.strictEqual(result[2].dateDisplay, '2026');
assert.strictEqual(result.some((item) => item.id === 'inactiva'), false);
assert.strictEqual(result.some((item) => item.id === 'solo-comunicados'), false);
```

También verificar que `doGet({parameter:{section:'inicio',callback:'cb'}})` devuelve JavaScript `cb({...});`, que un callback inválido no se usa y que no existe `doPost`.

- [ ] **Step 2: Ejecutar el test y verificar RED**

Run:

```bash
node tests/novedades-backend.test.js
```

Expected: FAIL porque `apps-script/novedades/*.gs` todavía no existe.

- [ ] **Step 3: Implementar `Config.gs` mínimo**

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

- [ ] **Step 4: Implementar `Data.gs` con normalización explícita**

Incluir exactamente estas funciones públicas internas:

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

`buildPublicNews_(section, headers, rows)` debe:
- aceptar sólo `inicio`, `comunicados`, `vida-escolar`;
- omitir `Activa != Sí`;
- omitir filas sin `ID` o `Título`;
- requerir `Fecha` o `Fecha visible`;
- filtrar por la columna de sección correspondiente;
- mapear sólo campos públicos;
- ordenar por prioridad numérica desc, fecha ISO desc, índice de fila asc;
- no devolver `Activa`, `Actualizada` ni otras columnas internas.

`readPublicNews_(section)` debe abrir la Sheet una sola vez, leer el rango usado y cachear sólo el payload público 120 segundos.

- [ ] **Step 5: Implementar `Code.gs` sólo lectura**

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

Agregar `sanitizeNewsJsonpCallback_()` con regex equivalente al backend de Reservas: `^[A-Za-z_$][A-Za-z0-9_$.]{0,100}$`.

No crear `doPost`.

- [ ] **Step 6: Documentar despliegue**

`DEPLOY.md` debe indicar:
1. crear proyecto Apps Script separado `Novedades EES18 - PRODUCCIÓN`;
2. copiar `Config.gs`, `Data.gs`, `Code.gs`;
3. Script Property `NOVEDADES_SPREADSHEET_ID=<ID de la Sheet creada en Task 6>`;
4. implementar como Web App, ejecutar como propietario, acceso público;
5. conservar la URL `/exec` y colocarla después en `assets/js/novedades-config.js`.

- [ ] **Step 7: Ejecutar test GREEN**

```bash
node tests/novedades-backend.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps-script/novedades tests/novedades-backend.test.js
git commit -m "feat: add read-only novedades backend"
```

---

### Task 2: Cliente de novedades y reglas de seguridad en navegador

**Files:**
- Create: `assets/js/novedades.js`
- Create: `assets/js/novedades-config.js`
- Test: `tests/novedades-client.test.js`

**Interfaces:**
- Consumes: `window.EES18_NOVEDADES_API_URL`.
- Produces: `window.EES18Novedades` con `normalizeItem`, `safeUrl`, `sortItems`, `filterItems`, `createCarouselState` para tests y UI.

- [ ] **Step 1: Escribir test RED del módulo puro**

Crear `tests/novedades-client.test.js`:

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

Expected: FAIL porque no existe `assets/js/novedades.js`.

- [ ] **Step 3: Implementar módulo UMD sin dependencias**

Usar el mismo patrón exportable que `reservas-audiovisuales.js`: `module.exports` en Node y `window.EES18Novedades` en navegador.

`normalizeItem(raw)` debe truncar defensivamente:
- título 180 caracteres;
- bajada 400;
- cuerpo 2400;
- tipo 80;
- CTA 100.

No debe aceptar propiedades HTML arbitrarias.

- [ ] **Step 4: Implementar request JSONP con timeout**

Dentro de la parte browser-only, crear `requestNews(section)` con callback único, script dinámico y timeout de 12 segundos. Si falla, rechazar con `NETWORK_ERROR` o `TIMEOUT`; nunca dejar callbacks globales colgados.

- [ ] **Step 5: Crear config vacío hasta deployment**

```javascript
window.EES18_NOVEDADES_API_URL = '';
```

La UI debe interpretar URL vacía como “servicio todavía no configurado” y mantener fallback, no lanzar error visible.

- [ ] **Step 6: Ejecutar GREEN y syntax check**

```bash
node tests/novedades-client.test.js
node --check assets/js/novedades.js
node --check assets/js/novedades-config.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add assets/js/novedades.js assets/js/novedades-config.js tests/novedades-client.test.js
git commit -m "feat: add novedades client"
```

---

### Task 3: Carrusel manual de novedades en Inicio

**Files:**
- Modify: `index.html`
- Modify: `assets/css/home-layout.css`
- Test: `tests/novedades-pages.test.js`
- Modify: `tests/site.test.js`
- Modify: `tests/whatsapp-channel.test.js`
- Modify: `tests/re-bonaerense-year.test.js`

**Interfaces:**
- Consumes: `EES18Novedades.mountHomeCarousel(root, items)`.
- Produces: contenedor `[data-news-section="inicio"]`, controles `[data-news-prev]`, `[data-news-next]`, indicadores `[data-news-dots]`.

- [ ] **Step 1: Escribir assertions RED de estructura**

En `tests/novedades-pages.test.js` comprobar:

```js
assert(index.includes('data-news-section="inicio"'));
assert(index.includes('data-news-prev'));
assert(index.includes('data-news-next'));
assert(index.includes('data-news-dots'));
assert(index.includes('assets/js/novedades-config.js'));
assert(index.includes('assets/js/novedades.js'));
assert(/Novedades destacadas/i.test(index));
```

Actualizar tests históricos para no exigir que el texto del canal/RE esté hardcodeado en `index.html`; en cambio deben exigir que los contenidos seed existan en la fuente editorial/fixture y que el contenedor dinámico esté presente.

- [ ] **Step 2: Ejecutar RED**

```bash
node tests/novedades-pages.test.js
node tests/site.test.js
node tests/whatsapp-channel.test.js
node tests/re-bonaerense-year.test.js
```

Expected: al menos `novedades-pages` falla antes del cambio.

- [ ] **Step 3: Reemplazar la noticia fija de Inicio por shell + fallback**

Usar estructura semántica equivalente a:

```html
<section class="page-section page-section--soft" aria-labelledby="news-title">
  <div class="container">
    <div class="section-heading reveal">
      <span>Novedades destacadas</span>
      <h2 id="news-title">Vida escolar e información institucional</h2>
    </div>
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
  </div>
</section>
```

Cargar al final de `body`, antes de `main.js` o después de él de forma determinista:

```html
<script src="assets/js/novedades-config.js"></script>
<script src="assets/js/novedades.js"></script>
```

- [ ] **Step 4: Implementar render de carrusel**

En `novedades.js`, cada noticia se crea con `document.createElement`, `textContent` y `setAttribute`; no usar `innerHTML` con datos de la Sheet.

Controles:
- flechas circulares;
- `ArrowLeft` / `ArrowRight` cuando el carrusel tiene foco;
- swipe mínimo 45 px;
- sin autoplay;
- esconder controles si hay 0/1 noticia;
- imagen ausente → bloque `.news-card__media--placeholder` con texto `E.E.S. Nº 18`.

- [ ] **Step 5: Estilos responsive**

Agregar a `home-layout.css` clases `news-carousel`, `news-card`, `news-card__media`, `news-card__body`, `news-carousel__controls`, `news-carousel__dot`. Mantener una tarjeta visible; desktop en dos columnas imagen/texto y móvil en una columna. Incluir `@media (prefers-reduced-motion: reduce)` para eliminar transiciones del carrusel.

- [ ] **Step 6: Ejecutar GREEN**

```bash
node tests/novedades-pages.test.js
node tests/site.test.js
node tests/whatsapp-channel.test.js
node tests/re-bonaerense-year.test.js
node --check assets/js/novedades.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html assets/css/home-layout.css assets/js/novedades.js tests
git commit -m "feat: add home news carousel"
```

---

### Task 4: Comunicados dinámicos desde la misma fuente

**Files:**
- Modify: `comunicados.html`
- Modify: `assets/css/actualidad.css`
- Modify: `assets/js/novedades.js`
- Test: `tests/novedades-pages.test.js`

**Interfaces:**
- Consumes: `requestNews('comunicados')`.
- Produces: render en `[data-news-section="comunicados"]`.

- [ ] **Step 1: Extender test RED**

```js
assert(comunicados.includes('data-news-section="comunicados"'));
assert(comunicados.includes('assets/js/novedades-config.js'));
assert(comunicados.includes('assets/js/novedades.js'));
```

Verificar que el panel estático específico del canal de WhatsApp ya no sea la fuente de verdad.

- [ ] **Step 2: Ejecutar RED**

```bash
node tests/novedades-pages.test.js
```

- [ ] **Step 3: Reemplazar comunicado hardcodeado por contenedor dinámico**

Mantener encabezado institucional de la página y usar fallback:

```html
<div class="news-list" data-news-section="comunicados" data-news-list>
  <div class="actualidad-empty">
    <strong>Comunicados oficiales</strong>
    <p>Si la actualización automática no está disponible, consultá nuevamente en unos minutos.</p>
  </div>
</div>
```

- [ ] **Step 4: Renderizar comunicados**

Cada item debe mostrar `dateDisplay || format(date)`, `type`, `title`, `body || summary` y CTA válido. Sin imagen obligatoria.

- [ ] **Step 5: Estilos**

Agregar `.news-list`, `.news-list__item`, `.news-list__date`, `.news-list__body` a `actualidad.css`, reutilizando variables/colores actuales.

- [ ] **Step 6: GREEN + commit**

```bash
node tests/novedades-pages.test.js
node tests/site.test.js
node --check assets/js/novedades.js
git add comunicados.html assets/css/actualidad.css assets/js/novedades.js tests/novedades-pages.test.js
git commit -m "feat: render comunicados from novedades feed"
```

---

### Task 5: Vida escolar dinámica sin borrar todavía el archivo histórico

**Files:**
- Modify: `vida-escolar.html`
- Modify: `assets/css/actualidad.css`
- Modify: `assets/js/novedades.js`
- Test: `tests/novedades-pages.test.js`
- Modify: `tests/re-bonaerense-year.test.js`

**Interfaces:**
- Consumes: `requestNews('vida-escolar')`.
- Produces: `[data-news-section="vida-escolar"]` con tarjetas administrables; las historias detalladas estáticas existentes permanecen debajo durante esta fase.

- [ ] **Step 1: RED de integración**

```js
assert(vida.includes('data-news-section="vida-escolar"'));
assert(vida.includes('assets/js/novedades.js'));
assert(vida.includes('2.º Encuentro de RE Bonaerense'));
assert(vida.includes('Leer en Comunidad'));
```

Los dos últimos asserts preservan el archivo histórico estático hasta completar validación visual del dinámico.

- [ ] **Step 2: Ejecutar RED**

```bash
node tests/novedades-pages.test.js
```

- [ ] **Step 3: Insertar sección administrable antes del archivo histórico**

Agregar heading `Novedades de Vida escolar` y contenedor `data-news-section="vida-escolar"`. Las publicaciones dinámicas deben usar tarjetas compactas para no duplicar visualmente las historias detalladas.

- [ ] **Step 4: Render y estilos**

Renderizar imagen opcional, fecha visible, tipo, título, bajada y CTA. No interpretar `body` como HTML.

- [ ] **Step 5: GREEN + commit**

```bash
node tests/novedades-pages.test.js
node tests/re-bonaerense-year.test.js
node tests/site.test.js
node --check assets/js/novedades.js
git add vida-escolar.html assets/css/actualidad.css assets/js/novedades.js tests
git commit -m "feat: add managed vida escolar news"
```

---

### Task 6: Crear y preparar la Google Sheet editorial con datos iniciales

**Files:**
- External artifact: Google Sheet `Novedades EES18 - BASE`, tab `Novedades`.
- Modify after creation: `apps-script/novedades/DEPLOY.md` only if the real sheet title/path needs recording; do not commit credentials.

**Interfaces:**
- Produces: Spreadsheet ID para `NOVEDADES_SPREADSHEET_ID`.

- [ ] **Step 1: Crear Sheet nativa**

Crear `Novedades EES18 - BASE` con una única pestaña `Novedades` y 16 columnas en el orden exacto de Task 1.

- [ ] **Step 2: Aplicar validaciones**

`Activa`, `Inicio`, `Comunicados`, `Vida escolar`: dropdown `Sí/No`.

`Prioridad`: número entero >= 0.

`Fecha`: formato `dd/mm/yyyy`; se permite vacío sólo para histórico con `Fecha visible`.

Congelar fila 1 y activar filtro.

- [ ] **Step 3: Cargar tres filas iniciales**

Fila WhatsApp:

```text
ID: whatsapp-2026-09-07
Activa: Sí
Fecha: 07/09/2026
Fecha visible: 7 de septiembre de 2026
Prioridad: 30
Tipo: Institucional
Título: Canal oficial de WhatsApp
Bajada: La E.E.S. Nº 18 incorpora un canal de WhatsApp para compartir novedades y avisos institucionales con la comunidad educativa.
Cuerpo: La E.E.S. Nº 18 incorpora un canal de WhatsApp para compartir novedades y avisos institucionales con la comunidad educativa.
Imagen: [vacío]
Botón texto: 📢 Seguir el canal de WhatsApp
Botón URL: https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l
Inicio: Sí
Comunicados: Sí
Vida escolar: No
```

Fila Leer en Comunidad:

```text
ID: leer-en-comunidad-2026-09-04
Activa: Sí
Fecha: 04/09/2026
Fecha visible: 4 de septiembre de 2026
Prioridad: 20
Tipo: Vida escolar
Título: Leer en Comunidad
Bajada: Segunda jornada de Leer en Comunidad en el marco de Bibliotecas Escolares Abiertas 2026.
Imagen: assets/img/leer-en-comunidad-2026-01.jpg
Botón texto: Ver Vida escolar
Botón URL: vida-escolar.html
Inicio: Sí
Comunicados: No
Vida escolar: Sí
```

Fila RE Bonaerense:

```text
ID: re-bonaerense-2026
Activa: Sí
Fecha: [vacío]
Fecha visible: 2026
Prioridad: 10
Tipo: Proyecto institucional
Título: 2.º Encuentro de RE Bonaerense
Bajada: La E.E.S. Nº 18 compartió micro relatos del proyecto “Estudiantes hacen memoria” junto con otras instituciones de la región.
Imagen: assets/img/re-bonaerense-2024.jpg
Botón texto: Ver Vida escolar
Botón URL: vida-escolar.html
Inicio: Sí
Comunicados: No
Vida escolar: Sí
```

- [ ] **Step 4: Verificar permisos**

La Sheet no debe quedar editable públicamente. Sólo cuentas autorizadas de la escuela/propietario tienen edición. El Web App leerá como propietario.

---

### Task 7: Desplegar Web App de Novedades y conectar producción

**Files:**
- Modify: `assets/js/novedades-config.js`
- Create: `tests/probe_novedades_live.py`
- Modify: `.github/workflows/test-public.yml`

**Interfaces:**
- Consumes: URL `/exec` real del Apps Script.
- Produces: endpoint productivo consultable con `?section=inicio`.

- [ ] **Step 1: Desplegar Apps Script separado**

Seguir `apps-script/novedades/DEPLOY.md`. No reutilizar `Reservas Audiovisuales EES18 - PRODUCCIÓN`.

Antes de publicar, ejecutar desde Apps Script una función de lectura manual o `doGet` de prueba y verificar que el resultado sólo contiene campos públicos.

- [ ] **Step 2: Probar endpoint en navegador**

La URL:

```text
<EXEC>?section=inicio
```

debe devolver `{ "ok": true, "section": "inicio", "items": [...] }` con exactamente las tres publicaciones activas, en orden WhatsApp → Leer → RE Bonaerense.

- [ ] **Step 3: Configurar URL productiva**

Reemplazar en `assets/js/novedades-config.js`:

```javascript
window.EES18_NOVEDADES_API_URL = 'URL_EXEC_REAL';
```

La implementación debe usar la URL real obtenida en Step 1; no dejar texto sentinel como `URL_EXEC_REAL` en el commit.

- [ ] **Step 4: Escribir probe live antes de añadirlo al workflow**

`tests/probe_novedades_live.py` debe:
- leer la URL desde `assets/js/novedades-config.js`;
- GET `section=inicio` con timeout 20 s;
- exigir `ok=true`;
- exigir items lista y >= 3;
- exigir IDs `whatsapp-2026-09-07`, `leer-en-comunidad-2026-09-04`, `re-bonaerense-2026`;
- verificar que la respuesta no contiene `Activa`, `Actualizada`, direcciones de correo ni claves de escritura.

- [ ] **Step 5: Ejecutar probe local**

```bash
python tests/probe_novedades_live.py
```

Expected: PASS contra producción.

- [ ] **Step 6: Integrar CI**

En `.github/workflows/test-public.yml` agregar:

```yaml
node --check assets/js/novedades-config.js
node --check assets/js/novedades.js
```

Y en structure checks:

```yaml
node tests/novedades-backend.test.js
node tests/novedades-client.test.js
node tests/novedades-pages.test.js
```

Agregar step separado:

```yaml
- name: Probe deployed novedades Web App
  run: python tests/probe_novedades_live.py
```

- [ ] **Step 7: Commit**

```bash
git add assets/js/novedades-config.js tests/probe_novedades_live.py .github/workflows/test-public.yml
git commit -m "chore: connect novedades production endpoint"
```

---

### Task 8: Verificación editorial end-to-end y cierre

**Files:**
- No code change unless a test exposes a defect.
- Read: `docs/superpowers/specs/2026-09-07-novedades-sheet-design.md`

**Interfaces:**
- Verifica el contrato completo Sheet → Apps Script → GitHub Pages.

- [ ] **Step 1: Ejecutar suite completa**

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

Expected: todo PASS. Los probes de Reservas deben seguir sanos, demostrando aislamiento.

- [ ] **Step 2: Probar cambio sin deploy**

En la Sheet, modificar temporalmente la `Bajada` del Canal de WhatsApp agregando `PRUEBA EDITORIAL`, esperar como máximo el TTL documentado y recargar Inicio/Comunicados. Verificar que el texto aparece sin commit ni deploy del sitio. Restaurar el texto original.

- [ ] **Step 3: Probar ocultación sin deploy**

Cambiar `Activa` de RE Bonaerense a `No`, esperar TTL y verificar que desaparece de Inicio y Vida escolar dinámica pero el archivo histórico estático sigue disponible. Restaurar `Sí`.

- [ ] **Step 4: Probar fallback**

En una copia/local de la página o mediante test de unidad, configurar URL vacía/inválida y verificar que cada sección conserva su fallback y enlaces útiles sin error de JavaScript visible.

- [ ] **Step 5: Revisión visual manual**

Desktop y móvil:
- una tarjeta por vez en Inicio;
- flechas y puntos visibles;
- swipe móvil;
- links no abren pestaña nueva;
- imagen faltante usa placeholder;
- `prefers-reduced-motion` sin animación innecesaria;
- Comunicados y Vida escolar legibles.

- [ ] **Step 6: Verificar criterios del spec**

Confirmar explícitamente los 7 criterios de aceptación del spec, especialmente: edición sólo en Sheet, una sola fuente, backend independiente de Reservas y degradación segura.

- [ ] **Step 7: Commit final sólo si hubo ajustes de verificación**

```bash
git status --short
```

Si no hay cambios: no crear commit vacío. Si hubo correcciones derivadas de tests, volver a ejecutar la suite focalizada + completa antes de commit.
