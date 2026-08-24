# Trámite digital de Analíticos y Pases - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar en la web institucional un circuito de solicitud y consulta de analíticos/pases, con una bandeja intermedia de validación y una capa Apps Script preparada para guardar documentación en Drive y promover casos validados al seguimiento oficial.

**Architecture:** GitHub Pages mantiene la interfaz pública. Google Apps Script actúa como backend privado para registrar solicitudes, guardar archivos en Drive, consultar estados y promover únicamente casos validados. La bandeja `Solicitudes_Analiticos_Pendientes` queda separada de `Seguimiento_Analiticos_y_Pases.xlsx`.

**Tech Stack:** HTML5, CSS3, JavaScript vanilla, Python/pytest para pruebas estáticas, Google Apps Script, Google Drive/Sheets.

**Spec:** `docs/superpowers/specs/2026-08-24-tramite-analiticos-digital-design.md`

## Global Constraints

- No borrar, mover ni reemplazar contenido existente de Drive por defecto.
- Una solicitud web NO entra al seguimiento oficial hasta que Secretaría valide vínculo EES18 y documentación.
- El formulario público no requiere cuenta Google.
- Teléfono y correo son obligatorios.
- DNI y partida de nacimiento son adjuntos base obligatorios.
- La consulta pública muestra solamente apellido/nombre, DNI y estado.
- La consulta pública requiere DNI + código de seguimiento.
- No exponer credenciales, enlaces internos de Drive ni observaciones internas.
- Mantener la identidad visual ENSPA actual.
- No modificar `CNAME` ni el dominio personalizado.

---

### Task 1: Accesos públicos del trámite

**Files:**
- Modify: `index.html`
- Modify: `certificado-analitico.html`
- Test: `tests/test_site.py`

**Interfaces:**
- Produces: enlaces estáticos a `solicitar-analitico.html` y `estado-tramite.html`.

- [ ] **Step 1: Escribir pruebas fallidas**

Agregar asserts que exijan enlaces estáticos visibles a ambas páginas y que no dependan de JavaScript.

- [ ] **Step 2: Verificar que fallen**

Run: `pytest tests/test_site.py -q`
Expected: FAIL porque las páginas/enlaces todavía no existen.

- [ ] **Step 3: Implementar enlaces mínimos**

Agregar dos acciones dentro del trámite de analíticos: `Solicitar Analítico Parcial / Pase` y `Consultar estado del trámite`.

- [ ] **Step 4: Ejecutar pruebas**

Run: `pytest tests/test_site.py -q`
Expected: las pruebas nuevas de enlaces pasan o fallan solamente por páginas todavía inexistentes.

- [ ] **Step 5: Commit**

`git commit -m "feat: agregar accesos al tramite digital"`

### Task 2: Formulario público de solicitud

**Files:**
- Create: `solicitar-analitico.html`
- Create: `assets/css/tramite-digital.css`
- Create: `assets/js/tramite-solicitud.js`
- Test: `tests/test_site.py`

**Interfaces:**
- Consumes: `window.EES18_TRAMITES_API_URL` cuando exista.
- Produces: payload con datos personales, motivo, trayectoria declarada, solicitante y archivos.

- [ ] **Step 1: Escribir pruebas fallidas**

Exigir en HTML: apellido, nombre, DNI, fecha y localidad de nacimiento, motivo, institución destino, cursos 1.º-6.º, `No recuerdo los años`, solicitante, teléfono, correo y archivos DNI/partida.

- [ ] **Step 2: Verificar fallo**

Run: `pytest tests/test_site.py -q`
Expected: FAIL porque la página no existe.

- [ ] **Step 3: Crear formulario semántico**

Usar campos obligatorios, motivos condicionales y carga `accept=".pdf,.jpg,.jpeg,.png"`. No enviar si no hay endpoint configurado; mostrar mensaje claro de configuración pendiente en lugar de perder datos.

- [ ] **Step 4: Implementar JavaScript de interacción**

Funciones públicas internas: `toggleMotivoFields()`, `toggleSolicitanteFields()`, `collectYears()`, `validateFiles()`, `submitSolicitud()`.

Validar 10 MB por archivo y 40 MB por solicitud antes de enviar.

- [ ] **Step 5: Ejecutar pruebas**

Run: `pytest tests/test_site.py -q`
Expected: PASS para estructura/formulario.

- [ ] **Step 6: Commit**

`git commit -m "feat: crear formulario de solicitud de analitico"`

### Task 3: Consulta pública de estado

**Files:**
- Create: `estado-tramite.html`
- Create: `assets/js/tramite-estado.js`
- Reuse: `assets/css/tramite-digital.css`
- Test: `tests/test_site.py`

**Interfaces:**
- Consumes: DNI + código de seguimiento.
- Produces: vista limitada a `apellido_nombre`, `dni`, `estado`.

- [ ] **Step 1: Escribir prueba fallida**

Exigir que la página solicite DNI y código, y que no contenga campos internos como Drive, observaciones, notas o documentación.

- [ ] **Step 2: Verificar fallo**

Run: `pytest tests/test_site.py -q`
Expected: FAIL.

- [ ] **Step 3: Crear página y render seguro**

Implementar `renderEstado({apellidoNombre,dni,estado})` que solo inserte esos tres valores mediante `textContent`.

- [ ] **Step 4: Ejecutar pruebas**

Run: `pytest tests/test_site.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: agregar consulta publica de estado"`

### Task 4: Contrato de configuración del backend

**Files:**
- Create: `assets/js/tramite-config.js`
- Modify: `solicitar-analitico.html`
- Modify: `estado-tramite.html`
- Test: `tests/test_site.py`

**Interfaces:**
- Produces: `window.EES18_TRAMITES_API_URL` con cadena vacía hasta desplegar Apps Script.

- [ ] **Step 1: Escribir prueba**

Exigir que ambas páginas carguen `tramite-config.js` antes del script funcional y que no exista ninguna credencial/secret en ese archivo.

- [ ] **Step 2: Implementar configuración**

Contenido inicial: `window.EES18_TRAMITES_API_URL = "";` con comentario de despliegue.

- [ ] **Step 3: Ejecutar pruebas**

Run: `pytest tests/test_site.py -q`
Expected: PASS.

- [ ] **Step 4: Commit**

`git commit -m "chore: preparar configuracion del backend de tramites"`

### Task 5: Código Apps Script del backend

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/appsscript.json`
- Create: `apps-script/README.md`
- Create: `apps-script/tests.md`

**Interfaces:**
- `doPost(e)` recibe acciones `crearSolicitud` y `consultarEstado`.
- `crearSolicitud(payload)` devuelve `{ok,idSolicitud,codigoSeguimiento}`.
- `consultarEstado(dni,codigo)` devuelve exclusivamente `{ok,apellidoNombre,dni,estado}` o error genérico.
- La promoción a seguimiento queda en función interna `promoverSolicitudValidada(rowIndex)` y nunca se invoca desde la web pública.

- [ ] **Step 1: Implementar constantes de IDs**

Usar Script Properties para IDs de carpeta y planillas; no hardcodear secretos en GitHub.

- [ ] **Step 2: Implementar creación de solicitud**

Validar campos, generar `SOL-YYYY-NNNNNN` y código aleatorio, crear carpeta en `SOLICITUDES WEB/2026`, guardar adjuntos decodificados y append en `Solicitudes_Analiticos_Pendientes`.

- [ ] **Step 3: Implementar consulta de estado**

Buscar por DNI + hash/código; devolver solo tres campos públicos. Antes de alta oficial, usar estados públicos simples como `Solicitud recibida, pendiente de validación`.

- [ ] **Step 4: Implementar promoción interna**

Solo permitir promoción cuando `Vínculo EES18=VERIFICADO`, `Estado documentación=VALIDADA` y `Aprobado para iniciar=Sí`. Antes de append, comprobar duplicado activo por DNI. Escribir únicamente las columnas seguras del seguimiento oficial.

- [ ] **Step 5: Documentar despliegue y pruebas manuales**

Explicar Script Properties necesarias, despliegue como Web App y prueba de acceso anónimo. Si la cuenta no permite anónimo, detener despliegue y usar backend alternativo sin cambiar el frontend.

- [ ] **Step 6: Commit**

`git commit -m "feat: preparar backend Apps Script de tramites"`

### Task 6: Pruebas estáticas y revisión de seguridad

**Files:**
- Modify: `tests/test_site.py`

**Interfaces:**
- Verifica estructura pública y ausencia de fugas obvias.

- [ ] **Step 1: Añadir pruebas de seguridad**

Comprobar que no aparezcan IDs de Drive internos conocidos, claves, `Seguimiento_Analiticos_y_Pases.xlsx` ni observaciones internas en HTML/JS público.

- [ ] **Step 2: Ejecutar suite completa**

Run: `pytest tests/test_site.py -q`
Expected: PASS.

- [ ] **Step 3: Inspeccionar diff**

Confirmar que `CNAME` no fue creado/modificado y que el diseño ENSPA se preserva.

- [ ] **Step 4: Commit**

`git commit -m "test: cubrir tramite digital y privacidad"`

### Task 7: Publicación segura

**Files:**
- No cambios funcionales adicionales.

**Interfaces:**
- Publica frontend solamente cuando el endpoint real esté desplegado y probado.

- [ ] **Step 1: Crear PR desde branch de trabajo a main**
- [ ] **Step 2: Revisar patch completo**
- [ ] **Step 3: Verificar endpoint desplegado**
- [ ] **Step 4: Completar `tramite-config.js` con URL pública del Web App**
- [ ] **Step 5: Re-ejecutar pruebas y revisar que no haya secretos**
- [ ] **Step 6: Merge a main**
- [ ] **Step 7: Verificar GitHub Pages en `/index.html`, `/solicitar-analitico.html` y `/estado-tramite.html`**
