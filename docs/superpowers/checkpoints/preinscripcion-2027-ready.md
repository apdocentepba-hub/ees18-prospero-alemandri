# Preinscripción 1.º año 2027 — checkpoint

Estado al 29/09/2026:

- Formulario público implementado en `apps-script/preinscripcion-2027/`.
- Backend con validación, prevención de DNI duplicado y acuse por correo.
- Catálogo de 137 distritos de AlertasAPD.
- Instantánea DGCyE 2026: 7.434 escuelas primarias, 135 distritos cubiertos, gestión estatal y privada.
- Página `ingreso-2027.html` integrada con placeholder `PREINSCRIPCION_WEB_APP_URL` hasta desplegar Apps Script.
- CI específico de preinscripción verde antes de abrir PR.

Pendiente para publicación efectiva:

1. Crear/configurar planilla de Secretaría.
2. Crear proyecto Apps Script con los archivos del directorio.
3. Ejecutar `configurarPreinscripcion2027(ID_PLANILLA)`.
4. Desplegar como Web App pública y obtener URL `/exec`.
5. Reemplazar `PREINSCRIPCION_WEB_APP_URL` en la página pública.
6. Ejecutar prueba end-to-end y publicar.
