# Matrícula y reputación web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fortalecer la captación de matrícula 2027 y la reputación digital de la E.E.S. Nº 18 mediante mejoras concretas de SEO, compartibilidad, visita a la escuela y contenido institucional verificable.

**Architecture:** Mantener el sitio estático existente en GitHub Pages y sumar páginas/enlaces livianos sin introducir backend ni dependencias. Los contactos de familias se canalizan por correo institucional hasta que exista un formulario con backend seguro. El contenido institucional nuevo no inventa fechas, vacantes ni actividades.

**Tech Stack:** HTML5, CSS, JavaScript vanilla, GitHub Pages, pytest/Node checks existentes.

**Spec:** Conversación de trabajo del proyecto ENSPA · Ingreso 2027.

## Global Constraints

- No inventar fechas, requisitos, vacantes, teléfonos, actividades ni testimonios.
- No publicar nombres ni datos personales de estudiantes.
- Mantener identidad visual azul/celeste ENSPA y navegación responsive.
- Priorizar 1.º año e Ingreso 2027.
- Usar el correo institucional ya existente en el sitio para contacto.
- No agregar analítica ni trackers de terceros.

---

### Task 1: SEO y compartibilidad

**Files:**
- Modify: `index.html`
- Modify: `ingreso-2027.html`
- Create: `sitemap.xml`
- Create: `robots.txt`
- Create: `site.webmanifest`
- Test: `tests/test_ingreso_2027.py`

- [ ] Agregar canonical, Open Graph y Twitter Card a portada e Ingreso 2027.
- [ ] Agregar JSON-LD tipo `School` sin dirección callejera no confirmada.
- [ ] Crear sitemap con páginas públicas principales.
- [ ] Crear robots.txt apuntando al sitemap.
- [ ] Crear manifest básico sin iconos inventados.
- [ ] Extender tests para comprobar metadatos y archivos SEO.

### Task 2: Visitas y conversión

**Files:**
- Create: `visitas-enspa.html`
- Modify: `ingreso-2027.html`
- Modify: `assets/css/ingreso-2027.css`
- Test: `tests/test_ingreso_2027.py`

- [ ] Crear página “Vení a conocer ENSPA” con explicación de futuras visitas y CTA al correo institucional.
- [ ] Incorporar FAQ de ingreso en `ingreso-2027.html` usando `<details>` accesibles.
- [ ] Agregar CTA a visitas y contacto institucional.
- [ ] Agregar botón de compartir por WhatsApp sin trackers.
- [ ] Validar responsive y accesibilidad básica.

### Task 3: Reputación y contenido

**Files:**
- Modify: `enspa-en-accion.html`
- Modify: `comunicados.html`
- Modify: `assets/css/actualidad.css`
- Test: `tests/test_ingreso_2027.py`

- [ ] Agregar pautas visibles de qué tipo de material se publicará en ENSPA en acción.
- [ ] Agregar categorías: proyectos, ciencias, comunicación, lenguas, sociales, cultura/deporte.
- [ ] Reforzar en Comunicados que solo se publicará información confirmada por la institución.
- [ ] Agregar enlaces cruzados a Ingreso 2027 y portada.

### Task 4: Recuperación de navegación y 404

**Files:**
- Create: `404.html`
- Modify: `assets/js/main.js`
- Test: `tests/site.test.js`

- [ ] Crear 404 institucional con accesos a Inicio, Ingreso 2027 y Trámites.
- [ ] Mantener sintaxis JS válida y navegación existente.
- [ ] Verificar que los enlaces de Actualidad sigan funcionando.

### Task 5: Verificación y entrega

**Files:**
- Modify: `.github/workflows/test-public.yml` solo si hace falta ampliar cobertura.

- [ ] Ejecutar suite Python completa.
- [ ] Ejecutar `node --check assets/js/main.js`.
- [ ] Ejecutar checks JS vigentes que representen el sitio actual.
- [ ] Abrir PR, revisar diff y fusionar solo con checks en verde.
