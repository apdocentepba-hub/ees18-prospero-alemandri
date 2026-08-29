# Reorganización multipágina Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la portada extensa actual en un sitio institucional multipágina, con navegación común, Vida escolar visible, recursos correctos y enlaces que permanezcan en la misma pestaña.

**Architecture:** El sitio seguirá siendo estático en GitHub Pages. `index.html` quedará como portada-resumen y el contenido se dividirá en páginas temáticas (`nuestra-escuela.html`, `propuesta-educativa.html`, `tramites.html`, `vida-escolar.html`, `contacto.html`) que compartirán la misma navegación y estilos existentes, sin introducir frameworks ni un sistema de plantillas.

**Tech Stack:** HTML5, CSS3, JavaScript vanilla, GitHub Pages, GitHub Actions, pruebas Node/pytest existentes.

**Spec:** `docs/superpowers/specs/2026-08-28-reorganizacion-multipagina-design.md`

## Global Constraints

- Mantener colores, tipografías y lenguaje visual actual.
- Nombre principal: `E.E.S. Nº 18 “Próspero Alemandri”`.
- `ENSPA` y `El Normal` sólo como referencias históricas.
- Todos los enlaces deben navegar en la misma pestaña; no usar `target="_blank"`.
- Mantener las URLs antiguas importantes mediante redirecciones.
- Mantener los canonical de GitHub Pages hasta que el dominio EDU.AR esté delegado y activo.
- No conectar en esta tarea la consulta pública con Apps Script.

---

### Task 1: Contrato de navegación y pruebas de arquitectura

**Files:**
- Modify: `tests/site.test.js`
- Modify: `tests/test_site.py`

**Interfaces:**
- Consumes: archivos HTML públicos del repositorio.
- Produces: contrato automático que exige las nuevas páginas, navegación multipágina, Vida escolar visible, ausencia de `target="_blank"` y presencia del recurso de RE Bonaerense.

- [ ] **Step 1: Escribir las pruebas que deben fallar**

Agregar aserciones para que existan `nuestra-escuela.html`, `propuesta-educativa.html`, `tramites.html`, `contacto.html` y `vida-escolar.html`; que la portada enlace a las siete pestañas principales; que no existan enlaces `target="_blank"`; que `index.html` incluya `2.º Encuentro de RE Bonaerense` y `assets/img/re-bonaerense-2024.jpg`; y que las redirecciones antiguas sigan presentes.

- [ ] **Step 2: Ejecutar pruebas y verificar fallo**

Run: `python -m pytest tests -q && node tests/site.test.js`
Expected: FAIL porque las nuevas páginas y el nuevo contrato todavía no están implementados.

- [ ] **Step 3: Mantener sólo pruebas de comportamiento observable**

No comprobar clases CSS internas innecesarias; comprobar páginas, enlaces, textos, ausencia de nuevas pestañas y archivos de recursos.

- [ ] **Step 4: Commit**

`git commit -m "test: definir arquitectura multipágina"`

### Task 2: Portada breve y páginas principales

**Files:**
- Modify: `index.html`
- Create: `nuestra-escuela.html`
- Create: `propuesta-educativa.html`
- Create: `tramites.html`
- Create: `contacto.html`
- Modify: `assets/css/home-layout.css`
- Modify: `assets/css/styles.css`

**Interfaces:**
- Consumes: estilos visuales y contenido institucional existente.
- Produces: navegación principal `Inicio | Nuestra escuela | Propuesta educativa | Trámites | Vida escolar | Ingreso 2027 | Contacto` y portada de resumen.

- [ ] **Step 1: Reducir `index.html`**

Conservar hero, accesos rápidos, novedad RE Bonaerense con miniatura y botón a `vida-escolar.html`, bloque breve de agenda, bloque breve de Ingreso 2027 y accesos de Trámites. Retirar los desarrollos largos de autoridades, orientaciones, comunidad y contacto.

- [ ] **Step 2: Crear `nuestra-escuela.html`**

Incluir identidad institucional, CUE `061097100`, autoridades, espacios, dirección `Av. Manuel Belgrano 355`, horarios y acceso a `historia.html`.

- [ ] **Step 3: Crear `propuesta-educativa.html`**

Incluir Ciclo Básico, cuatro orientaciones y CTA a `plan-estudios.html`.

- [ ] **Step 4: Crear `tramites.html`**

Incluir tarjetas a `pases-equivalencias.html`, `consultar-estado.html`, `certificado-analitico.html`, `boleto-estudiantil.html` y placeholders sólo para trámites todavía no publicados.

- [ ] **Step 5: Crear `contacto.html`**

Incluir dirección, correo `secundaria18avellaneda@abc.gob.ar`, horarios de Secretaría, CUE y acceso al Mapa Educativo en la misma pestaña.

- [ ] **Step 6: Ajustar CSS**

Reutilizar tokens, botones, tarjetas y espaciado existentes; agregar únicamente reglas necesarias para las páginas índice y estado activo de navegación.

- [ ] **Step 7: Ejecutar pruebas**

Run: `python -m pytest tests -q && node tests/site.test.js`
Expected: las aserciones de páginas y navegación pasan; la imagen todavía puede quedar pendiente hasta Task 4.

- [ ] **Step 8: Commit**

`git commit -m "feat: reorganizar portada y páginas principales"`

### Task 3: Navegación común en páginas de detalle

**Files:**
- Modify: `historia.html`
- Modify: `plan-estudios.html`
- Modify: `ingreso-2027.html`
- Modify: `vida-escolar.html`
- Modify: `comunicados.html`
- Modify: `pases-equivalencias.html`
- Modify: `consultar-estado.html`
- Modify: `certificado-analitico.html`
- Modify: `boleto-estudiantil.html`
- Modify: `404.html`

**Interfaces:**
- Consumes: contrato de navegación de Task 2.
- Produces: todas las páginas públicas con el mismo menú completo y navegación en la misma pestaña.

- [ ] **Step 1: Reemplazar encabezados secundarios**

Cada página debe mostrar el menú principal completo y marcar su sección padre con `aria-current="page"` cuando corresponda.

- [ ] **Step 2: Eliminar nuevas pestañas**

Eliminar todos los `target="_blank"` y mantener `rel` sólo donde sea útil por seguridad, sin cambiar la pestaña.

- [ ] **Step 3: Revisar enlaces de regreso**

Sustituir enlaces del tipo `index.html#institucion` por la página temática nueva (`nuestra-escuela.html`, `propuesta-educativa.html`, `tramites.html`, etc.).

- [ ] **Step 4: Ejecutar pruebas**

Run: `python -m pytest tests -q && node tests/site.test.js`
Expected: PASS para navegación y ausencia de `target="_blank"`.

- [ ] **Step 5: Commit**

`git commit -m "refactor: unificar navegación multipágina"`

### Task 4: Vida escolar e imagen RE Bonaerense

**Files:**
- Modify: `vida-escolar.html`
- Replace binary: `assets/img/re-bonaerense-2024.jpg`
- Modify: `index.html`
- Modify: `assets/css/actualidad.css`

**Interfaces:**
- Consumes: imagen original 900 × 1350 proporcionada por la escuela.
- Produces: JPEG válido, visible en portada y Vida escolar, sin deformación.

- [ ] **Step 1: Reemplazar el archivo defectuoso**

Usar la imagen fuente original, conservar relación 2:3 y generar un JPEG web válido con tamaño suficiente para mantener legible el texto.

- [ ] **Step 2: Mostrar miniatura en Inicio**

La tarjeta destacada debe incluir `<img src="assets/img/re-bonaerense-2024.jpg" ...>` y enlazar a `vida-escolar.html`.

- [ ] **Step 3: Ajustar la publicación completa**

Mantener título `2.º Encuentro de RE Bonaerense`, proyecto `Estudiantes hacen memoria`, texto institucional y `alt` descriptivo.

- [ ] **Step 4: Verificar recurso**

Comprobar que el archivo existe, su firma corresponde a JPEG y su tamaño es razonable para una imagen 900 × 1350.

- [ ] **Step 5: Ejecutar pruebas**

Run: `python -m pytest tests -q && node tests/site.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "fix: restaurar imagen y destacar vida escolar"`

### Task 5: Redirecciones, sitemap y verificación final

**Files:**
- Modify: `enspa-en-accion.html`
- Modify: `visitas-enspa.html`
- Modify: `sitemap.xml`
- Modify: `site.webmanifest`
- Modify: `404.html`

**Interfaces:**
- Consumes: arquitectura final de Tasks 2–4.
- Produces: compatibilidad con URLs antiguas, sitemap actualizado y entrada consistente desde errores.

- [ ] **Step 1: Mantener redirecciones antiguas**

`enspa-en-accion.html` debe redirigir a `vida-escolar.html`; `visitas-enspa.html` debe redirigir a la URL vigente de visitas/Ingreso 2027.

- [ ] **Step 2: Actualizar sitemap**

Agregar `nuestra-escuela.html`, `propuesta-educativa.html`, `tramites.html`, `vida-escolar.html`, `contacto.html` y conservar las páginas de detalle relevantes. No indexar páginas de redirección.

- [ ] **Step 3: Revisar manifest y 404**

Mantener el nombre actual de la escuela y navegación útil sin referencias visibles a ENSPA salvo contexto histórico.

- [ ] **Step 4: Ejecutar suite completa**

Run: `python -m pytest tests -q`
Expected: PASS.

Run: `node --check assets/js/main.js && node tests/site.test.js`
Expected: PASS.

- [ ] **Step 5: Abrir PR y esperar GitHub Actions**

El workflow `Test public site` debe finalizar con `conclusion: success` sobre el SHA final.

- [ ] **Step 6: Integrar a `main`**

Sólo hacer merge si el PR es mergeable y todas las pruebas del SHA final están en verde.
