# Web App — Preinscripción a 1.º año 2027

Formulario público de la E.E.S. Nº 18 “Próspero Alemandri” para registrar preinscripciones de ingresantes a 1.º año del ciclo lectivo 2027.

## Alcance

- No requiere inicio de sesión.
- No solicita documentación ni archivos.
- No asigna vacantes ni realiza matrícula definitiva.
- Guarda la información en Google Sheets.
- Impide una segunda preinscripción con el mismo DNI del ingresante.
- Envía un acuse de recepción al correo del adulto responsable.
- Distrito y escuela de procedencia se validan también en servidor.
- Aplica rate limiting por visitante/correo y un honeypot anti-bot.
- Neutraliza valores que podrían interpretarse como fórmulas en Google Sheets.
- Las funciones administrativas terminan en `_` para que no sean invocables mediante `google.script.run` desde el formulario público.

## Archivos del proyecto Apps Script

Copiar al mismo proyecto:

- `Code.gs`
- `Setup.gs`
- `Catalogos.gs`
- `Formulario.html`
- `appsscript.json`

## Planilla de Secretaría

La aplicación usa dos pestañas:

1. `Preinscripciones 2027`: registros recibidos.
2. `CatalogoPrimarias`: instantánea local de escuelas primarias oficiales y privadas usada por los desplegables.

El catálogo publicado en el repositorio se genera a partir de la **Nómina de Establecimientos con Matrícula Inicial 2026** de la DGCyE, hoja `Nómina de Unidades de Servicio`, filtrando Nivel Primario y sector de gestión estatal/privado.

## Configuración inicial

1. Crear o elegir una planilla de Google Sheets destinada a Secretaría.
2. En Apps Script, copiar los archivos de este directorio.
3. Desde el editor de Apps Script ejecutar una vez la función privada:

```javascript
configurarPreinscripcion2027_('ID_DE_LA_PLANILLA');
```

La función:

- valida el acceso a la planilla;
- guarda `PREINSCRIPCION_SPREADSHEET_ID` y los nombres de pestañas en Script Properties;
- crea/valida `Preinscripciones 2027`;
- descarga la instantánea del catálogo desde el repositorio institucional;
- crea/actualiza `CatalogoPrimarias`.

Mientras el catálogo esté todavía en una rama de desarrollo puede pasarse una URL alternativa desde el editor:

```javascript
configurarPreinscripcion2027_(
  'ID_DE_LA_PLANILLA',
  'URL_RAW_DEL_JSON_DE_PRIMARIAS'
);
```

Luego de publicar en `main`, la función privada `actualizarCatalogoPrimarias2027_()` usa por defecto:

`https://raw.githubusercontent.com/apdocentepba-hub/ees18-prospero-alemandri/main/data/preinscripcion-2027-primarias.json`

También puede ejecutarse `usarCatalogoPrincipalPreinscripcion2027_()` para forzar la propiedad y recargar el catálogo publicado en `main`.

## Despliegue

En Apps Script:

1. `Implementar` → `Nueva implementación` para la primera publicación, o `Administrar implementaciones` → editar para actualizar una implementación existente.
2. Tipo: `Aplicación web`.
3. `Ejecutar como`: la cuenta propietaria que tiene acceso a la planilla.
4. Acceso: `Cualquier persona`.
5. En una actualización, seleccionar **Nueva versión** para conservar la misma URL `/exec`.
6. Conservar la URL final `/exec` y usarla en `ingreso-2027.html`.

URL productiva actual:

`https://script.google.com/macros/s/AKfycbx7Q2JdDdo8LshoWIf2AHSde80TUYM5MTBEezGCatdPuwFQYMKo7RmNRnzlRujJka_dYQ/exec`

No publicar una URL provisoria `/dev`.

## Datos guardados

- Fecha y hora de recepción.
- Apellido y nombre del ingresante.
- DNI del ingresante.
- Código de distrito y distrito.
- Identificador y nombre de la escuela de procedencia.
- Gestión y localidad de la escuela.
- Apellido y nombre del adulto responsable.
- DNI del adulto responsable.
- Vínculo.
- Teléfono.
- Correo electrónico.
- Estado inicial `RECIBIDA`.
- Observaciones internas.
- Estado del correo de recepción.

## Actualización del padrón de escuelas

La instantánea del repositorio se genera mediante:

- `scripts/build_preinscripcion_catalog.py`
- `.github/workflows/build-preinscripcion-catalog.yml`

Luego de actualizar el JSON publicado, ejecutar desde el editor de Apps Script:

```javascript
actualizarCatalogoPrimarias2027_();
```

El formulario no consulta DGCyE en tiempo real: usa esta copia controlada para evitar que una caída o cambio del sitio oficial interrumpa las preinscripciones.

## Pruebas mínimas antes de publicar

1. Elegir `AVELLANEDA` y comprobar que aparecen escuelas estatales y privadas.
2. Cambiar a otro distrito y comprobar que cambia la lista de escuelas.
3. Elegir `OTRA / NO APARECE EN LA LISTA` y verificar que el nombre manual sea obligatorio.
4. Realizar un envío válido y verificar la fila con estado `RECIBIDA`.
5. Repetir el mismo DNI del ingresante y verificar que el sistema no cree una segunda fila.
6. Verificar el correo automático de recepción.
7. Probar un correo inválido y un DNI inválido.
8. Probar desde celular.
9. Confirmar que el aviso de no asignación de vacante se vea antes del botón de envío, en la confirmación y en el correo.
10. Verificar que un envío con el honeypot `website` informado sea rechazado.
11. Verificar que valores que comiencen con `=`, `+`, `-` o `@` se guarden como texto y no como fórmula.

## Mensaje institucional obligatorio

**LA PREINSCRIPCIÓN NO IMPLICA LA ASIGNACIÓN AUTOMÁTICA DE UNA VACANTE. LA INSTITUCIÓN INFORMARÁ POSTERIORMENTE CÓMO CONTINUAR CON EL PROCESO DE INSCRIPCIÓN.**
