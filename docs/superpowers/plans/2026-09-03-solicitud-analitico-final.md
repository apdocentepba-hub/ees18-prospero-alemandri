# Solicitud de Analítico Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar una Web App pública de Google Apps Script para recibir solicitudes de analítico final, guardar datos y adjuntos para Secretaría y enviar únicamente un acuse de recepción sin datos personales.

**Architecture:** Se crea un módulo aislado en `apps-script/solicitud-analitico-final/`. `Formulario.html` contiene la UI y validación cliente; `Code.gs` valida nuevamente, persiste una fila en Sheets, guarda archivos en Drive y envía un correo de recepción no sensible. La web pública queda sin cambios hasta disponer de la URL definitiva del Web App.

**Tech Stack:** Google Apps Script, HTML/CSS/JavaScript, Google Sheets, Google Drive, MailApp, Node.js para pruebas estructurales en CI.

**Spec:** `docs/superpowers/specs/2026-09-03-solicitud-analitico-final-design.md`

## Global Constraints

- Acceso público sin inicio de sesión con Google.
- La aplicación sólo recibe solicitudes; no emite ni controla analíticos.
- DNI frente, DNI dorso y partida de nacimiento son obligatorios.
- Analítico parcial previo es obligatorio sólo si la persona declara haber cursado algún año en otra escuela.
- Formatos: PDF, JPEG/JPG y PNG; máximo 10 MB por archivo.
- Turno: sólo `Mañana` o `Tarde`.
- Orientaciones: `Comunicación`, `Ciencias Sociales`, `Lenguas Extranjeras`, `Ciencias Naturales`, `Otra / No recuerdo`.
- El correo automático no puede incluir respuestas, DNI, nombres de archivos ni adjuntos.
- Si falla el correo, la solicitud ya guardada sigue siendo válida.
- No modificar la web pública hasta tener la URL definitiva del Web App.

---

### Task 1: Contrato RED del formulario y backend

**Files:**
- Create: `tests/analitico-final.test.js`
- Modify: `.github/workflows/test-public.yml`

**Interfaces:**
- Consumes: archivos todavía inexistentes del nuevo módulo.
- Produces: contrato automatizado que exige campos, opciones, adjuntos, política de email y configuración.

- [ ] **Step 1: Write the failing test**

Crear `tests/analitico-final.test.js` que lea `Formulario.html`, `Code.gs` y `appsscript.json`, y falle mientras el módulo no exista. Debe comprobar:

```js
assert.match(form, /name="apellido"/);
assert.match(form, /name="nombre"/);
assert.match(form, /name="dni"/);
assert.match(form, /name="localidadNacimiento"/);
assert.match(form, /name="email"/);
assert.match(form, /name="telefono"/);
assert.match(form, /Comunicación/);
assert.match(form, /Ciencias Sociales/);
assert.match(form, /Lenguas Extranjeras/);
assert.match(form, /Ciencias Naturales/);
assert.match(form, /Otra \/ No recuerdo/);
assert.match(form, /value="Mañana"/);
assert.match(form, /value="Tarde"/);
assert.match(form, /name="dniFrente"[^>]*required/);
assert.match(form, /name="dniDorso"[^>]*required/);
assert.match(form, /name="partida"[^>]*required/);
assert.match(form, /name="analiticoAnterior"/);
assert.match(code, /PENDING_SPREADSHEET_ID/);
assert.match(code, /REQUESTS_FOLDER_ID/);
assert.match(code, /01 - DNI FRENTE/);
assert.match(code, /02 - DNI DORSO/);
assert.match(code, /03 - PARTIDA NACIMIENTO/);
assert.match(code, /04 - ANALITICO PARCIAL ESCUELA ANTERIOR/);
assert.doesNotMatch(code, /attachments\s*:/);
```

También comprobar que el cuerpo del correo se construye con texto fijo y fecha, no con `dni`, `apellido`, `nombre` ni nombres de archivos.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/analitico-final.test.js`

Expected: FAIL porque `apps-script/solicitud-analitico-final/Formulario.html` todavía no existe.

- [ ] **Step 3: Add the test to CI**

Agregar `node tests/analitico-final.test.js` al bloque `Run JavaScript structure checks` de `.github/workflows/test-public.yml`.

- [ ] **Step 4: Open a draft PR and verify RED in GitHub Actions**

Expected: `Test public site` falla específicamente en `analitico-final.test.js`.

- [ ] **Step 5: Commit**

```bash
git add tests/analitico-final.test.js .github/workflows/test-public.yml
git commit -m "test: definir contrato de solicitud de analítico final"
```

### Task 2: Backend mínimo GREEN

**Files:**
- Create: `apps-script/solicitud-analitico-final/Code.gs`
- Create: `apps-script/solicitud-analitico-final/appsscript.json`

**Interfaces:**
- Produces: `doGet()`, `crearSolicitudDesdeFormulario(form)`, `getConfig_()`, `saveFile_()`, `requestId_()`.

- [ ] **Step 1: Implement configuration and entry point**

`getConfig_()` leerá `PENDING_SPREADSHEET_ID`, `PENDING_SHEET_NAME` (default `Solicitudes`) y `REQUESTS_FOLDER_ID`. `doGet()` servirá `Formulario` con viewport móvil.

- [ ] **Step 2: Implement server-side validation**

Validar DNI, email, campos requeridos, valores de turno/orientación, MIME y 10 MB por archivo. Requerir `analiticoAnterior` sólo cuando `cursoOtraEscuela === 'si'`.

- [ ] **Step 3: Implement persistence**

Crear ID `SOL-AAAA-XXXXXXXX`, carpeta por solicitud, guardar adjuntos con los cuatro prefijos del spec y agregar una fila a `Solicitudes` con estado `RECIBIDA`.

- [ ] **Step 4: Implement non-sensitive acknowledgment**

Después de guardar, intentar `MailApp.sendEmail` con asunto fijo y cuerpo que sólo incluya confirmación, fecha y próximos pasos. Capturar errores del correo sin revertir la solicitud.

- [ ] **Step 5: Verify test state**

Run: `node tests/analitico-final.test.js`

Expected: todavía puede fallar por falta de `Formulario.html`, pero las aserciones de backend deben quedar satisfechas una vez exista el archivo.

- [ ] **Step 6: Commit**

```bash
git add apps-script/solicitud-analitico-final/Code.gs apps-script/solicitud-analitico-final/appsscript.json
git commit -m "feat: agregar backend de solicitud de analítico final"
```

### Task 3: Formulario GREEN

**Files:**
- Create: `apps-script/solicitud-analitico-final/Formulario.html`

**Interfaces:**
- Consumes: `crearSolicitudDesdeFormulario(form)`.
- Produces: formulario responsive con validación y cargas condicionales.

- [ ] **Step 1: Build the exact approved fields**

Incluir todos los campos del spec, con `required` sólo donde corresponde y las opciones exactas de orientación y turno.

- [ ] **Step 2: Add conditional behavior**

`Otro` muestra aclaración; `Otra / No recuerdo` muestra aclaración; declarar estudios en otra escuela muestra y vuelve obligatorio `analiticoAnterior`.

- [ ] **Step 3: Add client file validation**

Aceptar sólo PDF/JPEG/PNG y rechazar archivos mayores a 10 MB antes de llamar a Apps Script.

- [ ] **Step 4: Add submission UX**

Bloquear el botón durante el envío. En éxito mostrar `Tu solicitud fue recibida` y explicar que Secretaría revisará la documentación. No tratar un fallo del correo como fallo de la solicitud.

- [ ] **Step 5: Run contract test**

Run: `node tests/analitico-final.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps-script/solicitud-analitico-final/Formulario.html
git commit -m "feat: crear formulario público de analítico final"
```

### Task 4: Setup y despliegue reproducible

**Files:**
- Create: `apps-script/solicitud-analitico-final/Setup.gs`
- Create: `apps-script/solicitud-analitico-final/README.md`

**Interfaces:**
- Produces: `configurarAnaliticoFinal(spreadsheetId, folderId)` y `prepararHojaSolicitudes()`.

- [ ] **Step 1: Add setup helpers**

Guardar IDs en Script Properties y crear/verificar encabezados de la pestaña `Solicitudes`.

- [ ] **Step 2: Document deployment**

Detallar copiar archivos a Apps Script, ejecutar setup una vez, desplegar como Web App `Ejecutar como: yo` y acceso `Cualquier persona`, y realizar una solicitud de prueba.

- [ ] **Step 3: Verify no public-site integration**

Confirmar que `certificado-analitico.html`, `tramites.html` y archivos de configuración pública no fueron modificados.

- [ ] **Step 4: Commit**

```bash
git add apps-script/solicitud-analitico-final/Setup.gs apps-script/solicitud-analitico-final/README.md
git commit -m "docs: preparar configuración y despliegue de analítico final"
```

### Task 5: CI GREEN y revisión final

**Files:**
- Verify only.

- [ ] **Step 1: Run GitHub Actions on the draft PR**

Expected: todas las pruebas existentes más `analitico-final.test.js` en verde.

- [ ] **Step 2: Review diff against spec**

Confirmar que no hay login, seguimiento, emisión automática, copia de respuestas por correo ni integración prematura con la web pública.

- [ ] **Step 3: Mark PR ready only when CI is green**

No mergear automáticamente; el siguiente paso después del código es desplegar el Apps Script y validar una solicitud real de prueba antes de publicar el enlace.
