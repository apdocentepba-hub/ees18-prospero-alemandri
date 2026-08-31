# Reservas del Salón de Audiovisuales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un sistema de reservas del Salón de Audiovisuales integrado en la web de la E.E.S. Nº18, con almanaque mensual, módulos libres/ocupados, confirmación automática sin doble reserva, recurrencia semanal, cancelación segura por correo y sincronización con Google Sheets + Google Calendar.

**Architecture:** La web pública seguirá en GitHub Pages. `reservas-audiovisuales.html` será la página institucional que contiene el sistema visual; durante el piloto cargará el frontend nuevo sin reemplazar el Google Form actual. La lógica de negocio se implementará en un Web App independiente de Google Apps Script conectado a la hoja `Sistema Reservas Salón Audiovisuales - BASE` y al calendario `Reservas - Salón Audiovisuales`; el código fuente del Web App quedará versionado en `apps-script/reservas-audiovisuales/` para poder auditarlo y copiarlo completo al proyecto de Apps Script.

**Tech Stack:** HTML5, CSS3, JavaScript vanilla, Google Apps Script, Google Sheets, Google Calendar, MailApp, LockService, GitHub Pages, GitHub Actions, Node.js para pruebas del frontend y pytest para regresiones del sitio.

**Spec:** `docs/superpowers/specs/2026-08-31-reservas-audiovisuales-design.md`

## Global Constraints

- Mantener operativo el Google Form actual hasta que el nuevo sistema esté probado y aprobado.
- No exponer nombres, correos, cursos, materias ni observaciones de reservas ajenas en la interfaz pública.
- Franjas mañana: `07:30–08:30`, `08:30–09:30`, `09:50–10:50`, `10:50–11:50`, `11:50–12:50`.
- Franjas tarde: `13:00–14:00`, `14:00–15:00`, `15:20–16:20`, `16:20–17:20`, `17:20–18:20`.
- Selecciones a ambos lados de un recreo se guardan como una ocupación continua entre la primera hora de inicio y la última hora de fin.
- Se permite reservar el mismo día y hasta 60 días hacia adelante.
- Sábados, domingos y fechas activas en `Días bloqueados` no pueden reservarse.
- Correos `@abc.gob.ar` y correos externos válidos se confirman automáticamente si no existe conflicto.
- Toda escritura de reserva debe revalidar disponibilidad bajo `LockService` inmediatamente antes de guardar.
- Las recurrencias iniciales son únicamente semanales y cada fecha se resuelve de forma independiente.
- Los tokens de cancelación se envían en claro por correo pero sólo se guarda su hash en la base.
- No crear panel administrativo público en la primera versión; administración se resuelve en Google Sheets.
- GitHub Pages no debe publicar una URL de Apps Script hasta que el Web App haya sido desplegado y probado.

---

## File Structure

### Web pública

- `reservas-audiovisuales.html` — página institucional del sistema.
- `assets/css/reservas-audiovisuales.css` — estilos del almanaque, módulos, formulario y estados.
- `assets/js/reservas-audiovisuales.js` — estado del frontend, selección, validaciones y cliente de transporte.
- `assets/js/reservas-config.js` — URL del Web App; comienza vacía en la rama de prototipo y se completa únicamente al desplegar.
- `cancelar-reserva.html` — pantalla institucional que explica/contiene el flujo de cancelación una vez activo.
- `docentes.html` — mantiene el formulario actual y agrega acceso de prueba al nuevo sistema hasta el corte definitivo.
- `sitemap.xml` — incorpora únicamente la página pública definitiva cuando se apruebe el piloto.

### Backend versionado

- `apps-script/reservas-audiovisuales/Code.gs` — entrada Web App y despacho de acciones públicas.
- `apps-script/reservas-audiovisuales/Config.gs` — IDs, nombres de hojas, franjas y constantes.
- `apps-script/reservas-audiovisuales/Data.gs` — lectura/escritura de Sheets y normalización de filas históricas.
- `apps-script/reservas-audiovisuales/Availability.gs` — disponibilidad diaria/mensual, 60 días y bloqueos.
- `apps-script/reservas-audiovisuales/Reservations.gs` — creación única/recurrente y concurrencia.
- `apps-script/reservas-audiovisuales/Cancellations.gs` — token/hash y cancelación.
- `apps-script/reservas-audiovisuales/CalendarSync.gs` — creación/eliminación/reintento de eventos.
- `apps-script/reservas-audiovisuales/Mail.gs` — confirmaciones y cancelaciones.
- `apps-script/reservas-audiovisuales/AdminSetup.gs` — creación de columnas/pestañas auxiliares y vistas administrativas.

### Tests

- `tests/reservas-audiovisuales.test.js` — reglas puras y estructura del frontend.
- `tests/test_reservas_site.py` — integración estructural con el sitio.
- `tests/apps-script-reservas.test.js` — carga de `.gs` en VM con dobles mínimos para probar reglas puras sin Google.
- `.github/workflows/test-public.yml` — añade checks de los nuevos JS y tests.

---

### Task 1: Contrato horario y funciones puras del frontend

**Files:**
- Create: `assets/js/reservas-audiovisuales.js`
- Create: `tests/reservas-audiovisuales.test.js`
- Modify: `.github/workflows/test-public.yml`

**Interfaces:**
- Produces: `window.EES18ReservasRules` con `SLOTS`, `buildContinuousRange(slotIds)`, `isInstitutionalEmail(email)`, `isValidEmail(email)`, `buildWeeklyDates(startIso, endIso)`.
- Later tasks consume estas funciones para renderizar y construir el payload.

- [ ] **Step 1: Escribir pruebas que fallen para las franjas exactas**

```js
const assert = require('assert');
const rules = require('../assets/js/reservas-audiovisuales.js');
assert.deepStrictEqual(rules.SLOTS.MANANA.map(s => s.id), ['M1','M2','M3','M4','M5']);
assert.deepStrictEqual(rules.SLOTS.TARDE.map(s => s.id), ['T1','T2','T3','T4','T5']);
assert.deepStrictEqual(rules.buildContinuousRange(['M2','M3']), { start: '08:30', end: '10:50' });
assert.strictEqual(rules.isInstitutionalEmail('docente@abc.gob.ar'), true);
assert.strictEqual(rules.isValidEmail('nombre@gmail.com'), true);
```

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `node tests/reservas-audiovisuales.test.js`
Expected: FAIL porque el módulo todavía no exporta las reglas.

- [ ] **Step 3: Implementar las funciones puras y exportarlas para navegador/Node**

Usar un wrapper UMD simple:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EES18ReservasRules = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SLOTS = {
    MANANA: [
      { id:'M1', start:'07:30', end:'08:30' },
      { id:'M2', start:'08:30', end:'09:30' },
      { id:'M3', start:'09:50', end:'10:50' },
      { id:'M4', start:'10:50', end:'11:50' },
      { id:'M5', start:'11:50', end:'12:50' }
    ],
    TARDE: [
      { id:'T1', start:'13:00', end:'14:00' },
      { id:'T2', start:'14:00', end:'15:00' },
      { id:'T3', start:'15:20', end:'16:20' },
      { id:'T4', start:'16:20', end:'17:20' },
      { id:'T5', start:'17:20', end:'18:20' }
    ]
  };
  // implementación completa en el archivo real
  return { SLOTS, buildContinuousRange, isInstitutionalEmail, isValidEmail, buildWeeklyDates };
});
```

La selección sólo puede contener módulos del mismo turno y debe formar un tramo ordenado sin saltar módulos intermedios. El recreo entre M2/M3 o T2/T3 no rompe la continuidad.

- [ ] **Step 4: Añadir check de sintaxis y test al workflow**

Agregar:

```yaml
node --check assets/js/reservas-audiovisuales.js
node tests/reservas-audiovisuales.test.js
```

- [ ] **Step 5: Ejecutar suite completa**

Run: `pytest -q && node tests/site.test.js && node tests/reservas-audiovisuales.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "test: definir reglas horarias de reservas"`

---

### Task 2: Página visual con almanaque y módulos seleccionables

**Files:**
- Create: `reservas-audiovisuales.html`
- Create: `assets/css/reservas-audiovisuales.css`
- Modify: `assets/js/reservas-audiovisuales.js`
- Create: `tests/test_reservas_site.py`
- Modify: `tests/site.test.js`

**Interfaces:**
- Consumes: `EES18ReservasRules`.
- Produces: elementos con IDs estables `booking-calendar`, `selected-date-title`, `morning-slots`, `afternoon-slots`, `selection-summary`, `booking-form`, `booking-result`.

- [ ] **Step 1: Escribir test estructural que falle**

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_reservas_page_has_calendar_and_form():
    html = (ROOT / 'reservas-audiovisuales.html').read_text(encoding='utf-8')
    for marker in ['booking-calendar','morning-slots','afternoon-slots','booking-form','booking-result']:
        assert f'id="{marker}"' in html
```

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pytest tests/test_reservas_site.py -q`
Expected: FAIL porque la página no existe.

- [ ] **Step 3: Crear la página con navegación institucional actual**

La página debe usar `styles.css`, `multipage.css` y `reservas-audiovisuales.css`, mantener `Docentes` como sección activa y contener una nota visible: `Sistema nuevo en etapa de prueba. La reserva actual continúa disponible desde el área Docentes.`

- [ ] **Step 4: Implementar almanaque mensual accesible**

Renderizar 7 columnas `Lun` a `Dom`, botones por día con `aria-label`, `data-date="YYYY-MM-DD"`, y clases de estado `is-available`, `is-partial`, `is-full`, `is-blocked`. Fines de semana y fechas fuera de 0–60 días se renderizan deshabilitadas.

- [ ] **Step 5: Implementar módulos visibles y ocupados bloqueados**

Cada slot debe renderizarse como checkbox dentro de label. Los ocupados tienen `disabled` y texto `Ocupado`; los libres `Disponible`. No mostrar datos del titular de la reserva.

- [ ] **Step 6: Implementar selección continua**

Al marcar M2 y M3, el resumen debe indicar `08:30 a 10:50 · 2 módulos`. Si se intenta marcar M2 y M4 sin M3, el frontend corrige/deshace la selección y muestra `Seleccioná módulos consecutivos del mismo turno.`

- [ ] **Step 7: Responsive y accesibilidad**

En <= 760 px, el calendario ocupa ancho completo y los slots pasan a una columna. Usar `:focus-visible`, `aria-live="polite"` en el resumen y respetar `prefers-reduced-motion`.

- [ ] **Step 8: Ejecutar tests**

Run: `pytest tests/test_reservas_site.py -q && node tests/reservas-audiovisuales.test.js`
Expected: PASS.

- [ ] **Step 9: Commit**

`git commit -m "feat: crear calendario visual de reservas"`

---

### Task 3: Formulario docente, reserva única y semanal

**Files:**
- Modify: `reservas-audiovisuales.html`
- Modify: `assets/js/reservas-audiovisuales.js`
- Modify: `assets/css/reservas-audiovisuales.css`
- Modify: `tests/reservas-audiovisuales.test.js`

**Interfaces:**
- Produces: `buildReservationPayload(form, state)` con forma:

```js
{
  mode: 'single' | 'weekly',
  date: 'YYYY-MM-DD',
  repeatUntil: 'YYYY-MM-DD' | '',
  slotIds: ['M2','M3'],
  start: '08:30',
  end: '10:50',
  teacher: 'Nombre Apellido',
  email: 'docente@abc.gob.ar',
  course: '5° 2°',
  subject: 'Geografía',
  shift: 'Mañana',
  resources: { projector:true, speakers:false, schoolNotebook:true, internet:true },
  observations: ''
}
```

- [ ] **Step 1: Probar validación de modalidad semanal**

```js
assert.deepStrictEqual(
  rules.buildWeeklyDates('2026-09-01','2026-09-29'),
  ['2026-09-01','2026-09-08','2026-09-15','2026-09-22','2026-09-29']
);
```

Añadir casos para final >60 días y final anterior al inicio.

- [ ] **Step 2: Implementar campos**

Campos obligatorios: docente, correo, curso, materia. Recursos como checkboxes Sí/No. Modalidad radio `Una fecha` / `Repetir semanalmente`; el segundo muestra `repeat-until` con máximo 60 días desde hoy y no menor a la fecha elegida.

- [ ] **Step 3: Validar correo**

Aceptar cualquier correo sintácticamente válido; mostrar badge `Correo institucional` si termina exactamente en `@abc.gob.ar` ignorando mayúsculas.

- [ ] **Step 4: Confirmación previa**

Antes de enviar, mostrar fecha(s), horario continuo, módulos, docente, curso y recursos. El botón final debe decir `Confirmar reserva` y bloquearse mientras la operación está en curso.

- [ ] **Step 5: Tests**

Run: `node tests/reservas-audiovisuales.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: completar formulario y recurrencia semanal"`

---

### Task 4: Backend de disponibilidad y compatibilidad con la hoja histórica

**Files:**
- Create: `apps-script/reservas-audiovisuales/Config.gs`
- Create: `apps-script/reservas-audiovisuales/Data.gs`
- Create: `apps-script/reservas-audiovisuales/Availability.gs`
- Create: `apps-script/reservas-audiovisuales/Code.gs`
- Create: `tests/apps-script-reservas.test.js`
- Modify: `.github/workflows/test-public.yml`

**Interfaces:**
- Produces: `getAvailability(dateIso)`, `getMonthAvailability(year, month)`, `isDateBookable(dateIso, now)`, `getOccupiedSlots(dateIso)`.
- Hoja principal: `Reservas`.
- Hoja de bloqueos: `Días bloqueados`.

- [ ] **Step 1: Testear reglas puras del backend**

Cargar `Config.gs` + `Availability.gs` en `vm` y comprobar:

```js
assert.strictEqual(isWeekend_('2026-09-05'), true);
assert.strictEqual(isWeekend_('2026-09-07'), false);
assert.strictEqual(overlaps_('08:30','10:50','09:50','10:50'), true);
assert.strictEqual(overlaps_('08:30','09:30','09:50','10:50'), false);
```

- [ ] **Step 2: Definir constantes exactas**

`SPREADSHEET_ID = '1o8G7tD-w1FBA4LB3zC3SEtx4hVXKvALSupGnHEMqHkQ'`, `RESERVAS_SHEET = 'Reservas'`, `BLOCKED_DAYS_SHEET = 'Días bloqueados'`, timezone `America/Argentina/Buenos_Aires`, ventana `60`.

El ID de Calendar se lee de la hoja `Configuración` en lugar de duplicarlo en código.

- [ ] **Step 3: Normalizar filas históricas**

`Data.gs` debe leer encabezados por nombre y no por posición fija. Considerar ocupadas las filas cuyo `Estado` sea `Confirmada` o cuyo estado de sincronización posterior indique reserva válida pendiente de Calendar. Ignorar `Cancelada`, `Rechazada` y `Conflicto de horario`.

- [ ] **Step 4: Mapear una reserva histórica a slots**

Una fila `08:30–10:50` marca M2 y M3 ocupados; una fila `13:00–15:00` marca T1 y T2; si una reserva no encaja exactamente en los módulos, todo slot con intersección temporal queda ocupado para no habilitar una doble reserva.

- [ ] **Step 5: Implementar `getMonthAvailability` sin datos personales**

Retornar únicamente:

```js
{
  ok: true,
  days: {
    '2026-09-01': { status:'partial', free:7, total:10 },
    '2026-09-05': { status:'blocked', free:0, total:10 }
  }
}
```

- [ ] **Step 6: Ejecutar tests y sintaxis**

Run: `node tests/apps-script-reservas.test.js`
Expected: PASS.

Añadir al workflow `node --check` sobre una copia temporal `.js` no es confiable por sintaxis Apps Script; usar el test VM para los archivos que contienen lógica pura.

- [ ] **Step 7: Commit**

`git commit -m "feat: implementar disponibilidad de reservas"`

---

### Task 5: Creación atómica de reservas y recurrencias

**Files:**
- Create: `apps-script/reservas-audiovisuales/Reservations.gs`
- Modify: `apps-script/reservas-audiovisuales/Data.gs`
- Modify: `apps-script/reservas-audiovisuales/Code.gs`
- Modify: `tests/apps-script-reservas.test.js`

**Interfaces:**
- Produces: `createReservation(payload)`.
- Respuesta única exitosa:

```js
{ ok:true, requested:1, confirmed:1, conflicts:[], reservations:[{ id:'...', date:'2026-09-01', start:'08:30', end:'10:50' }] }
```

- Respuesta recurrente parcial:

```js
{ ok:true, requested:5, confirmed:4, conflicts:['2026-09-15'], reservations:[...] }
```

- [ ] **Step 1: Escribir tests para expansión semanal y conflictos parciales**

Simular fechas ocupadas y verificar que una recurrencia no falle completa por una sola fecha.

- [ ] **Step 2: Validar payload en servidor**

Revalidar email, fecha, 60 días, bloqueos, slots permitidos, continuidad, turno, longitudes de texto y modalidad. Nunca confiar en valores `start/end` enviados por cliente: recalcularlos desde `slotIds`.

- [ ] **Step 3: Usar `LockService.getScriptLock()`**

Flujo obligatorio dentro del lock:

```js
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
  // releer reservas y bloqueos
  // volver a comprobar cada fecha
  // append de las fechas todavía libres
} finally {
  lock.releaseLock();
}
```

- [ ] **Step 4: Escribir cada instancia como fila independiente**

Generar UUID por reserva y UUID de grupo para recurrencias. Conservar columnas históricas y añadir nuevas columnas al final mediante `AdminSetup.gs`, nunca reordenar las existentes.

- [ ] **Step 5: Marcar sincronización**

Añadir columnas `ID grupo`, `Módulos`, `Tipo correo`, `Hash cancelación`, `Fecha cancelación`, `Estado sincronización`, `Último error sincronización`. Estado inicial tras append: `PENDIENTE_CALENDAR`.

- [ ] **Step 6: Test de carrera lógico**

Dos llamadas simuladas al mismo bloque deben producir una sola confirmación; la segunda recibe conflicto tras la relectura.

- [ ] **Step 7: Commit**

`git commit -m "feat: crear reservas con bloqueo y recurrencia"`

---

### Task 6: Google Calendar, correo y recuperación de fallos secundarios

**Files:**
- Create: `apps-script/reservas-audiovisuales/CalendarSync.gs`
- Create: `apps-script/reservas-audiovisuales/Mail.gs`
- Modify: `apps-script/reservas-audiovisuales/Reservations.gs`
- Modify: `apps-script/reservas-audiovisuales/AdminSetup.gs`

**Interfaces:**
- Produces: `syncReservationToCalendar_(reservation)`, `sendReservationConfirmation_(reservation, rawToken)`, `retryPendingCalendarSync()`.

- [ ] **Step 1: Crear evento de Calendar después del guardado principal**

Título: `Audiovisuales · {curso} · {materia}`. Descripción contiene docente, correo, recursos e ID de reserva. No usar Google Calendar como fuente primaria de disponibilidad.

- [ ] **Step 2: Si Calendar funciona**

Guardar `ID evento calendario`, cambiar `Estado sincronización` a `OK` y mantener `Estado` = `Confirmada`.

- [ ] **Step 3: Si Calendar falla**

Mantener la fila como reserva válida/ocupante, `Estado sincronización = PENDIENTE_CALENDAR`, guardar mensaje corto del error y no liberar el horario.

- [ ] **Step 4: Implementar reintento idempotente**

`retryPendingCalendarSync()` sólo procesa filas pendientes sin ID de evento. Instalar disparador cada 15 minutos durante piloto o ejecutar manualmente; nunca crear dos eventos para la misma fila.

- [ ] **Step 5: Generar token de cancelación**

Usar `Utilities.getUuid()` + bytes aleatorios derivados con `Utilities.computeDigest`, enviar el token crudo sólo por correo y guardar `SHA-256(token)` en la fila.

- [ ] **Step 6: Correo de confirmación**

Asunto: `Reserva confirmada · Salón de Audiovisuales`. Incluir fecha, horario, curso, materia, recursos y enlace de cancelación. Si MailApp falla, registrar `MAIL_PENDING` sin invalidar la reserva.

- [ ] **Step 7: Commit**

`git commit -m "feat: sincronizar reservas y enviar confirmaciones"`

---

### Task 7: Cancelación segura

**Files:**
- Create: `apps-script/reservas-audiovisuales/Cancellations.gs`
- Modify: `apps-script/reservas-audiovisuales/Code.gs`
- Create: `cancelar-reserva.html`
- Modify: `assets/css/reservas-audiovisuales.css`
- Modify: `tests/test_reservas_site.py`
- Modify: `tests/apps-script-reservas.test.js`

**Interfaces:**
- Produces: `getReservationByCancelToken(token)` y `cancelReservation(token)`.

- [ ] **Step 1: Test de token inválido/usado**

Token inexistente -> `{ok:false, code:'INVALID_TOKEN'}`. Reserva ya cancelada -> `{ok:false, code:'ALREADY_CANCELLED'}`.

- [ ] **Step 2: Buscar por hash, nunca por token crudo**

Calcular SHA-256 del token recibido y comparar con la columna `Hash cancelación`.

- [ ] **Step 3: Cancelar bajo LockService**

Releer fila, cambiar `Estado` a `Cancelada`, registrar `Fecha cancelación` y `Última actualización` antes de liberar el lock.

- [ ] **Step 4: Eliminar evento Calendar**

Si existe ID, buscarlo y eliminarlo. Si falla, registrar error administrativo sin volver a marcar la reserva como activa.

- [ ] **Step 5: Enviar confirmación de cancelación**

Correo con fecha/horario cancelados y enlace al sistema para crear una nueva reserva.

- [ ] **Step 6: Página de cancelación**

`cancelar-reserva.html` no debe mostrar datos hasta validar token. Sólo enseña la propia reserva y botón `Cancelar esta reserva`.

- [ ] **Step 7: Commit**

`git commit -m "feat: agregar cancelación segura por correo"`

---

### Task 8: Pestañas administrativas y días bloqueados

**Files:**
- Create: `apps-script/reservas-audiovisuales/AdminSetup.gs`
- Modify: `apps-script/reservas-audiovisuales/Data.gs`
- Modify: `apps-script/reservas-audiovisuales/Availability.gs`

**Interfaces:**
- Produces: `setupReservationSystem()`, `ensureBlockedDaysSheet_()`, `ensureAdministrationSheet_()`.

- [ ] **Step 1: Crear `Días bloqueados` sin destruir datos existentes**

Encabezados exactos: `Fecha | Tipo | Descripción | Activo | Fecha actualización`. Validación de Tipo: `FERIADO`, `CIERRE ESCOLAR`; Activo: `Sí`, `No`.

- [ ] **Step 2: Crear `Administración` como vista operativa**

La pestaña contiene QUERY/FILTER o datos sincronizados desde `Reservas` con columnas útiles: fecha, horario, docente, curso, materia, estado, grupo, sincronización, evento. No duplicar datos sensibles en una hoja pública; el archivo mantiene permisos actuales de Drive.

- [ ] **Step 3: Añadir enlaces de Calendar con fórmula**

Sólo si existe ID de evento. No depender de esa fórmula para ninguna lógica.

- [ ] **Step 4: Cargar feriados en la puesta en marcha**

La implementación no inventará fechas. Antes del despliegue, contrastar los feriados nacionales que caigan dentro de los próximos 60 días con el calendario oficial argentino y cargarlos en `Días bloqueados` como `FERIADO` activo.

- [ ] **Step 5: Ejecutar `setupReservationSystem()` sobre una copia de prueba**

Verificar que no reordena ni elimina columnas de `Reservas` y que crea sólo las columnas nuevas faltantes.

- [ ] **Step 6: Commit**

`git commit -m "feat: preparar administración y días bloqueados"`

---

### Task 9: Integración frontend ↔ Web App y modo piloto

**Files:**
- Create: `assets/js/reservas-config.js`
- Modify: `assets/js/reservas-audiovisuales.js`
- Modify: `reservas-audiovisuales.html`
- Modify: `docentes.html`
- Modify: `tests/site.test.js`
- Modify: `tests/test_reservas_site.py`

**Interfaces:**
- `window.EES18_RESERVAS_API_URL` contiene la URL del despliegue una vez creado.
- Frontend consume respuestas sanitizadas de disponibilidad/creación/cancelación.

- [ ] **Step 1: Configuración segura antes de despliegue**

Contenido inicial:

```js
window.EES18_RESERVAS_API_URL = '';
```

Con URL vacía, la página muestra `Sistema en preparación` y no habilita el botón final; nunca cae silenciosamente al formulario viejo.

- [ ] **Step 2: Desplegar Web App de prueba**

Copiar los archivos completos de `apps-script/reservas-audiovisuales/` a un proyecto Apps Script independiente, ejecutar `setupReservationSystem()` contra una copia de la base, autorizar Sheets/Calendar/Mail y desplegar como Web App con ejecución bajo la cuenta propietaria y acceso apropiado para docentes.

- [ ] **Step 3: Completar `reservas-config.js` con la URL real emitida por Google**

No publicar el commit hasta comprobar lectura de disponibilidad y una reserva de prueba end-to-end.

- [ ] **Step 4: Mantener ambos accesos en `docentes.html`**

Durante piloto:
- botón principal visible `Probar nuevo sistema de reservas` → `reservas-audiovisuales.html`;
- tarjeta secundaria `Sistema actual` → Google Form existente.

No retirar el Form.

- [ ] **Step 5: Prueba end-to-end controlada**

Crear una reserva de prueba en una fecha/hora libre, verificar fila, evento Calendar y correo; cancelar desde enlace; confirmar que la franja vuelve a libre.

- [ ] **Step 6: Recurrencia parcial**

Crear una serie semanal donde una fecha esté previamente ocupada; verificar que las restantes se confirman y la UI lista el conflicto sin revelar el titular previo.

- [ ] **Step 7: Commit**

`git commit -m "feat: conectar sistema de reservas en modo piloto"`

---

### Task 10: Regresión, publicación controlada y corte futuro

**Files:**
- Modify: `.github/workflows/test-public.yml`
- Modify: `sitemap.xml`
- Modify: `README.md`
- Modify: `tests/site.test.js`
- Modify: `tests/test_reservas_site.py`

**Interfaces:**
- Produces: PR de piloto verificable; no elimina el sistema viejo.

- [ ] **Step 1: Ejecutar suite completa**

Run:

```bash
pytest -q
node --check assets/js/main.js
node --check assets/js/estado-publico.js
node --check assets/js/status-config.js
node --check assets/js/reservas-audiovisuales.js
node --check assets/js/reservas-config.js
node tests/site.test.js
node tests/reservas-audiovisuales.test.js
node tests/apps-script-reservas.test.js
```

Expected: todo PASS.

- [ ] **Step 2: Revisar privacidad automáticamente**

Añadir aserciones que la página pública y los fixtures de respuesta no contengan `Correo docente`, `Profesor/a`, nombres de hojas internas no necesarias ni IDs de Calendar/Sheet.

- [ ] **Step 3: Añadir página al sitemap sólo cuando el piloto se publique**

`https://ees18avellaneda.edu.ar/reservas-audiovisuales.html`.

- [ ] **Step 4: Actualizar README**

Documentar que el sistema nuevo está en piloto y que el formulario anterior continúa disponible como contingencia.

- [ ] **Step 5: Abrir PR como draft**

Descripción con: arquitectura, pruebas, pasos manuales de Apps Script, URL de entorno de prueba y checklist de validación. No fusionar hasta revisión visual y prueba real.

- [ ] **Step 6: Criterio para convertirlo en principal**

Sólo después de pruebas reales exitosas: cambiar `docentes.html` para que el nuevo sistema sea el acceso principal y dejar el Form como `Sistema anterior / contingencia` durante un período estable. El retiro definitivo del Form es una tarea posterior y explícita.

- [ ] **Step 7: Commit**

`git commit -m "test: cerrar piloto de reservas audiovisuales"`

---

## Self-review del plan

- Cobertura del spec: almanaque, franjas exactas, privacidad, mismo día, 60 días, fines de semana, días bloqueados, correo institucional/externo, LockService, recurrencia semanal parcial, cancelación por hash, Calendar, correo, administración en Sheet y transición con Form quedan cubiertos.
- Dependencia externa de feriados: eliminada en tiempo real; la tabla `Días bloqueados` es la fuente operativa y se carga contra fuente oficial antes del despliegue.
- Concurrencia: toda confirmación y cancelación que modifica ocupación usa LockService y relectura.
- Compatibilidad: se leen encabezados por nombre y las columnas nuevas se agregan al final; no se reemplaza la base histórica.
- Publicación: la URL real del Web App sólo entra en configuración después de una prueba end-to-end; hasta entonces el nuevo sistema no puede confirmar reservas.
