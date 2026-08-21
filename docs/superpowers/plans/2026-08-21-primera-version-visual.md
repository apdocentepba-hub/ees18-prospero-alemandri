# Primera versión visual — E.E.S. Nº 18 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una portada institucional visual, responsive y navegable para la E.E.S. Nº 18 “Próspero Alemandri”.

**Architecture:** Sitio estático basado en HTML5, CSS3 y JavaScript sin frameworks. La primera entrega prioriza una página `index.html` completa, una hoja de estilos central y JavaScript mínimo para navegación móvil y comportamiento visual básico.

**Tech Stack:** HTML5, CSS3, JavaScript ES2022, Node.js built-in assertions para verificaciones estructurales.

**Spec:** `docs/superpowers/specs/2026-08-21-web-institucional-design.md`

## Global Constraints

- Nombre oficial principal: ESCUELA DE EDUCACIÓN SECUNDARIA Nº 18 “PRÓSPERO ALEMANDRI”.
- Identidad inspirada visualmente en ENSPA mediante celeste, azul y blanco.
- No inventar teléfonos, correos, autoridades ni redes sociales.
- Diseño formal, institucional, responsive y accesible.
- Sin frameworks ni dependencias pesadas.

---

### Task 1: Verificaciones estructurales iniciales

**Files:**
- Create: `tests/site.test.js`

**Interfaces:**
- Consumes: `index.html`, `assets/css/styles.css`, `assets/js/main.js`.
- Produces: verificaciones repetibles de identidad, secciones clave y assets.

- [ ] **Step 1: Write the failing test**

Crear un test Node que compruebe la existencia de `index.html`, el nombre oficial, navegación, secciones `novedades`, `calendario`, `orientaciones`, `comunidad`, vínculo a CSS/JS y atributos accesibles del menú móvil.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/site.test.js`
Expected: FAIL porque `index.html` y los assets todavía no existen.

- [ ] **Step 3: Keep the test unchanged until production files satisfy it**

El test será el contrato mínimo de la primera versión.

### Task 2: Portada semántica e institucional

**Files:**
- Create: `index.html`

**Interfaces:**
- Produces: estructura semántica de la portada, IDs de secciones y hooks para CSS/JS.

- [ ] **Step 1: Implement minimal semantic HTML to satisfy structural assertions**

Crear header, navegación, hero, accesos rápidos, novedades, calendario, orientaciones, comunidad, institución, contacto y footer.

- [ ] **Step 2: Run structural test**

Run: `node tests/site.test.js`
Expected: todavía puede fallar por assets CSS/JS ausentes.

### Task 3: Sistema visual responsive

**Files:**
- Create: `assets/css/styles.css`

**Interfaces:**
- Consumes: clases e IDs definidos en `index.html`.
- Produces: diseño institucional celeste/azul/blanco, responsive y accesible.

- [ ] **Step 1: Implement palette, typography, spacing and layout**

Definir variables CSS, header sticky, hero con composición geométrica, tarjetas, grillas, estados hover/focus, footer y breakpoints móviles.

- [ ] **Step 2: Verify CSS is linked and contains required tokens**

Run: `node tests/site.test.js`
Expected: puede seguir fallando sólo por JS si falta.

### Task 4: Navegación y microinteracciones

**Files:**
- Create: `assets/js/main.js`

**Interfaces:**
- Consumes: `#menu-toggle`, `#primary-nav`, `.reveal`.
- Produces: menú móvil, cierre al navegar, año dinámico y reveal progresivo respetando reduced motion.

- [ ] **Step 1: Implement minimal behavior**

Agregar manejo de `aria-expanded`, apertura/cierre del menú y comportamiento seguro cuando JavaScript está deshabilitado.

- [ ] **Step 2: Run structural test**

Run: `node tests/site.test.js`
Expected: PASS.

### Task 5: Verificación visual y cierre de rama

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: sitio completo.
- Produces: instrucciones mínimas de visualización y estado del proyecto.

- [ ] **Step 1: Verify generated files from the branch**

Comprobar que `index.html`, CSS, JS y test sean recuperables desde GitHub en `feat/primera-version-visual`.

- [ ] **Step 2: Update README**

Documentar el objetivo del sitio, estructura principal y rama de desarrollo.

- [ ] **Step 3: Final verification**

Run: `node tests/site.test.js`
Expected: PASS sin warnings propios del test.

- [ ] **Step 4: Open a draft pull request**

Base: `main`
Head: `feat/primera-version-visual`
Draft: true
