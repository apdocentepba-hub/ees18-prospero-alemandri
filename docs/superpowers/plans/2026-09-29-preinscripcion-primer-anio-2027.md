# Preinscripción a 1.º año 2027 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar una preinscripción 2027 sin login para ingresantes a 1.º año, con distrito + escuela primaria dependientes, guardado en Google Sheets, prevención de duplicados y acuse por correo.

**Architecture:** Se reutiliza el patrón del Web App de Apps Script de Analítico Final. El formulario consulta catálogos locales de distritos y primarias, valida los datos en cliente/servidor y guarda una fila en `Preinscripciones 2027`; el sitio institucional enlaza al Web App cuando se configure la URL `/exec`.

**Tech Stack:** HTML/CSS/JavaScript, Google Apps Script, Google Sheets, GitHub Pages, Node.js tests existentes en el repositorio.

**Spec:** `docs/superpowers/specs/2026-09-29-preinscripcion-primer-anio-2027-design.md`

## Global Constraints

- No solicitar ni adjuntar documentación.
- Todos los campos definidos en la especificación son obligatorios.
- Distritos: catálogo de 137 distritos bonaerenses ya usado por AlertasAPD.
- Primarias: gestión estatal y privada, fuente oficial DGCyE/Mapa Escolar, con instantánea local.
- Incluir `OTRA / NO APARECE EN LA LISTA`.
- Rechazar un segundo registro con el mismo DNI del ingresante.
- Estado inicial: `RECIBIDA`.
- Repetir de forma destacada que la preinscripción no asigna automáticamente una vacante.
- No habilitar selección de turno ni matrícula definitiva.

## Review Focus

- DNI con puntos/espacios debe normalizarse y detectar duplicados correctamente.
- Distrito válido con escuela que no pertenece a ese distrito debe rechazarse en servidor.
- Opción `OTRA` debe exigir nombre manual de escuela.
- Un error de MailApp no debe perder una preinscripción ya guardada.
- El formulario debe seguir siendo usable en celular y no permitir doble envío accidental.

---

### Task 1: Catálogo oficial de distritos y primarias

**Files:**
- Create: `apps-script/preinscripcion-2027/Catalogos.gs`
- Create: `data/preinscripcion-2027-distritos.json`
- Create: `data/preinscripcion-2027-primarias.json`
- Test: `tests/preinscripcion-2027.test.js`

**Interfaces:**
- Produces: `getDistritos() -> Array<{codigo,nombre}>`
- Produces: `getPrimariasPorDistrito(codigoDistrito) -> Array<{id,nombre,gestion,localidad}>`
- Produces: `resolverEscuela_(codigoDistrito, escuelaId, escuelaManual)` for server-side validation.

- [ ] **Step 1: Write failing tests** for 137 districts, Avellaneda presence, state/private schools, district filtering and `OTRA`.
- [ ] **Step 2: Run tests and confirm failure.**
- [ ] **Step 3: Build local snapshots from the official DGCyE source and implement catalog functions.**
- [ ] **Step 4: Run tests and confirm pass.**
- [ ] **Step 5: Commit.**

### Task 2: Apps Script backend and sheet setup

**Files:**
- Create: `apps-script/preinscripcion-2027/Code.gs`
- Create: `apps-script/preinscripcion-2027/Setup.gs`
- Create: `apps-script/preinscripcion-2027/appsscript.json`
- Create: `apps-script/preinscripcion-2027/README.md`
- Modify: `tests/preinscripcion-2027.test.js`

**Interfaces:**
- Consumes: catalog functions from Task 1.
- Produces: `crearPreinscripcionDesdeFormulario(form)`.
- Produces: `configurarPreinscripcion2027(spreadsheetId)` and `prepararHojaPreinscripciones2027()`.

- [ ] **Step 1: Add failing tests** for required fields, DNI/email validation, school/district consistency, duplicate DNI detection, `RECIBIDA`, and mail failure behavior.
- [ ] **Step 2: Run tests and confirm failure.**
- [ ] **Step 3: Implement setup and backend with LockService, strict headers and duplicate lookup.**
- [ ] **Step 4: Run tests and confirm pass.**
- [ ] **Step 5: Commit.**

### Task 3: Mobile-first public form

**Files:**
- Create: `apps-script/preinscripcion-2027/Formulario.html`
- Modify: `tests/preinscripcion-2027.test.js`

**Interfaces:**
- Consumes: `getDistritos`, `getPrimariasPorDistrito`, `crearPreinscripcionDesdeFormulario`.

- [ ] **Step 1: Add failing structural tests** for exact fields, dependent school selector, `OTRA`, disabled submit while sending, and exact vacancy warning copy.
- [ ] **Step 2: Run tests and confirm failure.**
- [ ] **Step 3: Implement the form using the ENSPA visual language and accessible mobile controls.**
- [ ] **Step 4: Run tests and confirm pass.**
- [ ] **Step 5: Commit.**

### Task 4: Integrate Ingreso 2027 page

**Files:**
- Modify: `ingreso-2027.html`
- Modify: `assets/css/ingreso-2027.css` only if needed for the new preinscription callout.
- Modify: `tests/preinscripcion-2027.test.js`

**Interfaces:**
- Produces a clear preinscription CTA that can point to the final Apps Script `/exec` URL without changing the rest of the campaign page.

- [ ] **Step 1: Add failing test** for the preinscription section and non-vacancy warning.
- [ ] **Step 2: Run tests and confirm failure.**
- [ ] **Step 3: Add the institutional CTA and explanatory copy.**
- [ ] **Step 4: Run tests and confirm pass.**
- [ ] **Step 5: Commit.**

### Task 5: Verification and deployment handoff

**Files:**
- Modify: `apps-script/preinscripcion-2027/README.md`

**Interfaces:**
- Produces exact setup/deploy/test instructions and the one configuration value needed by the static site: final `/exec` URL.

- [ ] **Step 1: Run `node --test tests/preinscripcion-2027.test.js`.** Expected: PASS.
- [ ] **Step 2: Run existing repository test suite if available.** Expected: no regressions.
- [ ] **Step 3: Verify source snapshot metadata/date and at least Avellaneda plus one other district.**
- [ ] **Step 4: Document Google Sheet/App Script deployment steps and final smoke tests.**
- [ ] **Step 5: Commit final documentation.**
