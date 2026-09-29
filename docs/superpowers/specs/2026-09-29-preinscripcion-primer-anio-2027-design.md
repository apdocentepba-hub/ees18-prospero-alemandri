# Diseño — Preinscripción a 1.º año 2027

Fecha: 2026-09-29

## Objetivo

Crear un formulario público, simple y apto para celular para que las familias realicen la preinscripción de ingresantes a 1.º año del ciclo lectivo 2027 de la E.E.S. Nº 18 “Próspero Alemandri” (ENSPA).

El formulario será una precarga administrativa. No reemplaza la matrícula ni confirma una vacante.

## Alcance

La primera versión solicita únicamente datos. No requiere inicio de sesión ni carga de documentación.

### Datos del ingresante

- Apellido y nombre.
- DNI.
- Distrito de la escuela primaria de procedencia.
- Escuela primaria de procedencia.

### Datos del adulto responsable

- Apellido y nombre.
- DNI.
- Vínculo con el/la estudiante: Padre / Madre / Tutor.
- Teléfono.
- Correo electrónico.

Todos los campos son obligatorios.

## Selección de distrito y escuela

### Distritos

El formulario reutilizará el catálogo de 137 distritos bonaerenses ya empleado por AlertasAPD.

El desplegable se mostrará ordenado alfabéticamente, pero conservará internamente el código distrital oficial para evitar ambigüedades.

### Escuelas primarias

Al seleccionar un distrito se habilitará un segundo desplegable con las escuelas de Nivel Primario de ese distrito, incluyendo gestión estatal y privada.

La fuente del padrón será el Mapa Escolar / información oficial de la DGCyE. El sistema usará una copia local del catálogo y no dependerá de consultar el visor oficial en tiempo real.

Cada registro del catálogo deberá conservar, cuando la fuente lo provea:

- distrito;
- código distrital;
- nombre de la institución;
- clave o identificador oficial;
- sector de gestión (estatal/privada);
- localidad, si estuviera disponible.

El desplegable mostrará una etiqueta suficientemente descriptiva para distinguir instituciones con nombres similares.

Siempre se agregará la opción `OTRA / NO APARECE EN LA LISTA`. Al elegirla se habilitará un campo de texto obligatorio para escribir el nombre de la escuela.

## Arquitectura

Se reutilizará el patrón ya existente del formulario de Solicitud de Analítico Final:

1. Web App de Google Apps Script accesible sin cuenta Google.
2. Interfaz HTML con estética institucional del ENSPA.
3. Persistencia en Google Sheets.
4. Validación tanto en navegador como en servidor.
5. Correo automático de acuse de recepción al adulto responsable.

El catálogo de primarias se almacenará como dato local administrado por el sistema, preferentemente en una pestaña `CatalogoPrimarias` de la misma planilla o en un recurso equivalente controlado por Apps Script. Esto evita que una caída o cambio del Mapa Escolar impida completar el formulario.

## Planilla de Secretaría

La pestaña principal se llamará `Preinscripciones 2027` y tendrá, como mínimo, las siguientes columnas:

- Fecha y hora de recepción.
- Apellido y nombre del ingresante.
- DNI del ingresante.
- Código de distrito.
- Distrito.
- Identificador oficial de escuela, si corresponde.
- Escuela de procedencia.
- Gestión de la escuela.
- Apellido y nombre del adulto responsable.
- DNI del adulto responsable.
- Vínculo.
- Teléfono.
- Correo electrónico.
- Estado.
- Observaciones internas.
- Correo de recepción.

Estado inicial: `RECIBIDA`.

## Prevención de duplicados

Antes de guardar, el servidor comprobará si ya existe una preinscripción para el mismo DNI de ingresante.

En caso de coincidencia, no se creará silenciosamente una segunda fila. El formulario informará que ya existe una preinscripción y que, si necesitan corregir datos, deberán comunicarse con Secretaría.

## Mensaje final obligatorio

Antes del botón de envío deberá mostrarse en un bloque de alto contraste, en negrita y claramente visible:

**IMPORTANTE: LA PREINSCRIPCIÓN NO IMPLICA LA ASIGNACIÓN AUTOMÁTICA DE UNA VACANTE. LA INSTITUCIÓN INFORMARÁ POSTERIORMENTE CÓMO CONTINUAR CON EL PROCESO DE INSCRIPCIÓN.**

El mismo concepto deberá repetirse en la pantalla de confirmación y en el correo automático de recepción.

## Correo automático

Al enviar correctamente el formulario, el adulto responsable recibirá un acuse de recepción que confirme únicamente que la preinscripción fue registrada.

El correo no deberá afirmar que existe una vacante asignada ni que la matrícula está confirmada.

## Experiencia de uso

- Diseño mobile-first.
- Campos grandes y legibles.
- DNI y teléfono con teclado numérico en celular.
- Distrito con búsqueda o selección rápida si el componente utilizado lo permite.
- Escuela deshabilitada hasta elegir distrito.
- Mensajes de error específicos y cercanos al campo correspondiente.
- Botón de envío deshabilitado mientras se procesa la solicitud para evitar dobles envíos.

## Fuente y actualización del padrón escolar

La información de escuelas se tomará de la fuente pública oficial de la DGCyE / Mapa Escolar. El Mapa Escolar actual permite descargar información de sus capas y la DGCyE lo presenta como una herramienta de información georreferenciada del sistema educativo.

El padrón utilizado por el formulario se tratará como una instantánea controlada. La fecha de actualización deberá quedar registrada para poder renovarlo antes de futuras campañas de inscripción.

## Pruebas mínimas antes de publicar

1. Distrito Avellaneda: verificar que liste primarias estatales y privadas.
2. Otro distrito: verificar que cambie completamente el conjunto de escuelas.
3. `OTRA / NO APARECE EN LA LISTA`: verificar apertura y obligatoriedad del campo manual.
4. Envío válido: verificar fila completa en Sheets y correo de recepción.
5. DNI de ingresante repetido: verificar rechazo de duplicado.
6. Correo inválido: verificar validación.
7. Prueba desde celular.
8. Confirmar que ninguna pantalla ni correo sugiera que la vacante quedó asignada.

## Fuera de alcance de esta versión

- Carga de archivos o documentación.
- Selección de turno.
- Asignación automática de vacantes.
- Matrícula definitiva.
- Acceso de las familias a un panel privado.
