# E.E.S. Nº 18 “Próspero Alemandri”

Sitio web institucional de la **Escuela de Educación Secundaria Nº 18 “Próspero Alemandri”**, Avellaneda.

Sitio público: **https://ees18avellaneda.edu.ar/**

## Contenido

- Información institucional y autoridades.
- Propuesta educativa y plan de estudios.
- Trámites escolares, pases y analíticos.
- Consulta pública del estado de trámites por DNI mediante Web App independiente.
- Vida escolar, comunicados e Ingreso 2027.
- Diseño responsive y accesibilidad básica.

## Publicación

El sitio se publica mediante GitHub Pages desde la rama `main` y utiliza el dominio institucional `ees18avellaneda.edu.ar`.

La consulta pública de trámites usa un Web App de Google Apps Script independiente del formulario de solicitudes. La web sólo muestra el estado público y la fecha de actualización; no expone nombre, teléfono, correo ni documentación adjunta.

## Verificación

La integración continua ejecuta:

- pruebas Python con `pytest`;
- verificación de sintaxis JavaScript;
- controles estructurales del sitio.
