# Diseño del sistema digital de Analíticos y Pases

Fecha: 2026-08-24

## Objetivo

Convertir el sector de Trámites de la web de la E.E.S. Nº 18 en la puerta de entrada para solicitudes de analíticos parciales y pases, integrando la recepción de datos y documentación con Google Drive y el seguimiento interno de Secretaría.

El sistema debe reducir carga manual, evitar duplicación de datos, conservar la estructura de Drive existente y mantener separados los pedidos todavía no validados de los trámites oficialmente iniciados.

## Regla principal de negocio

Una solicitud enviada desde la web **NO se incorpora automáticamente** a `Seguimiento_Analiticos_y_Pases.xlsx`.

Primero queda en una bandeja de solicitudes pendientes. Recién cuando personal de Secretaría confirma que la documentación presentada es válida y suficiente para iniciar el trámite, el sistema incorpora/actualiza el registro correspondiente en `Seguimiento_Analiticos_y_Pases.xlsx`.

Flujo:

`Solicitud web -> Pendiente de revisión -> Documentación observada o validada -> Si se valida: alta en seguimiento oficial -> Confección -> Firma -> Inspección -> Entrega/finalización`

## Acceso público desde la web

Dentro de `Trámites -> Títulos y analíticos` habrá dos acciones principales:

1. `Solicitar Analítico Parcial / Pase`
2. `Consultar estado del trámite`

La identidad visual debe conservar el diseño actual de la web institucional: celestes y azules ENSPA, `Libre Baskerville` en títulos y `Source Sans 3` en interfaz.

## Formulario de solicitud

No requiere cuenta Google.

### Datos del estudiante

Obligatorios:

- Apellido.
- Nombre.
- DNI.
- Fecha de nacimiento.
- Lugar/localidad de nacimiento.
- Lugar o institución donde necesita presentar el documento.

### Motivo de la solicitud

Opciones iniciales:

- Pase a otra escuela.
- Presentación en FINES.
- Pérdida de un analítico parcial previamente entregado.
- Nueva copia/reposición de analítico parcial.
- Otro motivo, con explicación obligatoria.

El formulario será condicional según el motivo.

### Trayectoria informada por el solicitante

Se podrá marcar qué cursos realizó en la institución:

- 1.º
- 2.º
- 3.º
- 4.º
- 5.º
- 6.º

Para cada curso marcado podrá indicar el año calendario en que lo cursó, si lo recuerda.

Debe existir la opción `No recuerdo los años`.

Esta información sirve como referencia para Secretaría y nunca reemplaza la verificación de antecedentes académicos oficiales.

### Datos de quien solicita

Pregunta inicial:

`¿La persona que realiza la solicitud es el propio estudiante?`

Si la respuesta es no, solicitar:

- Apellido y nombre de quien solicita.
- Vínculo o relación con el estudiante.

En todos los casos serán obligatorios:

- Correo electrónico de contacto.
- Teléfono de contacto.

## Documentación a adjuntar

Documentación base obligatoria:

- DNI.
- Partida de nacimiento.

Documentación condicional:

- Si se traslada a otra institución: constancia/pase/solicitud de vacante o documento de la institución de destino, según el requisito definitivo que confirme Secretaría.
- Si es para FINES: el pase podrá registrarse como `NO REQUERIDO`.
- Si perdió un analítico anterior: podrá adjuntar copia o foto del anterior si la conserva, sin que sea obligatorio salvo que Secretaría disponga otra cosa.
- Si existen antecedentes de otra institución: analítico parcial, certificado o constancia oficial correspondiente, cuando aplique.
- Campo adicional para otra documentación.

Los requisitos podrán ajustarse cuando Secretaría confirme el procedimiento definitivo, sin cambiar la arquitectura del sistema.

## Seguridad de archivos

Para carga sin cuenta Google:

- aceptar inicialmente PDF, JPG, JPEG y PNG;
- definir límite de tamaño por archivo y por solicitud;
- rechazar ejecutables y tipos no permitidos;
- validar servidor y cliente;
- no exponer enlaces internos de Drive al público;
- no incluir credenciales o IDs sensibles en JavaScript público;
- limitar la información devuelta por la consulta de estado.

## Organización propuesta en Drive

Se conserva lo existente. No se borra, mueve ni reemplaza ningún archivo actual por defecto.

Agregar dentro de `ENSPA/PASES MARTIN`:

```text
SOLICITUDES WEB
└── 2026
    ├── PENDIENTES
    │   └── DNI - APELLIDO NOMBRE - ID_SOLICITUD
    │       ├── 01 - DNI
    │       ├── 02 - PARTIDA NACIMIENTO
    │       ├── 03 - DOCUMENTO DESTINO
    │       ├── 04 - ANALITICO ANTERIOR
    │       └── OTROS
    ├── OBSERVADAS
    └── VALIDADAS
```

La carpeta física del trámite puede moverse entre `PENDIENTES`, `OBSERVADAS` y `VALIDADAS`, o mantener una ubicación estable con un estado lógico, según resulte más seguro durante la implementación. Se priorizará evitar romper enlaces internos.

## Bandeja de solicitudes pendientes

Debe existir una base separada del seguimiento oficial para almacenar solicitudes todavía no validadas.

Campos mínimos internos:

- ID de solicitud.
- Fecha y hora de recepción.
- Datos del estudiante.
- Datos del solicitante.
- Teléfono.
- Correo.
- Motivo.
- Institución/lugar de presentación.
- Cursos y años declarados.
- Referencias a archivos recibidos.
- Estado de revisión.
- Documentación faltante/observada.
- Fecha de validación.
- Usuario o responsable que valida, si técnicamente resulta viable.

Estados iniciales de esta bandeja:

- `RECIBIDA`
- `EN REVISION`
- `OBSERVADA`
- `VALIDADA`
- `RECHAZADA / DUPLICADA`, si corresponde

## Alta en el seguimiento oficial

Solo al confirmar `VALIDADA` se incorporará el caso a `Seguimiento_Analiticos_y_Pases.xlsx`.

No se deben eliminar ni modificar datos existentes que no correspondan al trámite procesado.

Al dar de alta un caso validado, el sistema podrá completar automáticamente los campos seguros disponibles, por ejemplo:

- Apellido y nombre.
- DNI.
- Escuela/institución destino.
- Localidad.
- Presencia de DNI.
- Presencia de partida.
- Presencia o no requerimiento de pase.
- Estado de documentación.

La información académica, materias, calificaciones y equivalencias requerirá verificación humana.

## Estados del trámite oficial

La planilla interna puede tener más detalle que la web.

Estados de referencia:

- Documentación validada.
- Analítico en confección.
- Analítico realizado.
- Pendiente de firma institucional.
- Firmado por la institución.
- Enviado a Inspección.
- En revisión/firma en Inspección.
- Documentación finalizada.
- Disponible para retiro / enviado al destinatario.
- Trámite finalizado.
- Observado / requiere corrección.

## Consulta pública de estado

La web no mostrará tablas, columnas internas ni documentos.

La respuesta pública queda limitada a:

- Apellido y nombre.
- DNI.
- Estado del trámite.

Ejemplo:

`PEREZ JUAN - DNI 50123456 - Estado del trámite: Enviado a Inspección`

No se mostrarán archivos, calificaciones, observaciones internas, institución destino, fechas administrativas ni enlaces de Drive.

La implementación deberá evitar que una búsqueda pública simple por DNI revele información de terceros. Se recomienda combinar DNI con un código de seguimiento o mecanismo equivalente, aunque la salida visible siga mostrando únicamente los tres campos acordados.

## Generación del analítico

Una vez validado el trámite se podrá automatizar progresivamente:

1. localizar la plantilla institucional `ANALITICO EN BLANCO`;
2. crear una copia individual para el estudiante;
3. completar datos personales seguros ya validados;
4. dejar el documento como borrador para revisión de Secretaría;
5. mantener control humano sobre antecedentes, materias, notas y equivalencias;
6. registrar posteriormente fecha de realización, firma, envío y devolución en el seguimiento.

## Libro y folio / índice de matrices

`Seguimiento_Analiticos_y_Pases.xlsx` incorpora las columnas `Libro` y `Folio`.

Existe además la carpeta `ENSPA/Indice de libros matrices` y el archivo `Indice_Libros_Matrices.xlsx`, con:

- Apellido y nombre.
- DNI.
- Libro.
- Folio.

Objetivo posterior: cuando Libro y Folio se registren en el seguimiento oficial, alimentar automáticamente el índice digital de matrices y permitir búsqueda rápida por apellido, nombre o DNI.

## Arquitectura técnica prevista

La web pública sigue alojada en GitHub Pages.

GitHub Pages no debe conectarse directamente a Drive con credenciales. Se utilizará una capa de backend/intermediación para:

- recibir el formulario;
- validar datos y archivos;
- guardar adjuntos;
- registrar la solicitud pendiente;
- consultar estado público;
- promover una solicitud validada al seguimiento oficial;
- ejecutar automatizaciones posteriores.

La tecnología concreta del backend se seleccionará en el plan de implementación priorizando bajo costo, mantenimiento sencillo y compatibilidad con Drive.

## Evolución futura

El módulo de Analíticos/Pases será el piloto para una Secretaría digital reutilizable.

El mismo patrón podrá aplicarse a:

- constancias de alumno regular;
- certificados;
- equivalencias;
- pases;
- inscripciones;
- documentación escolar;
- otros formularios internos o públicos.

Principio general: `el dato se carga una sola vez y se reutiliza donde corresponda`.

## Fuera de alcance de esta primera implementación

Hasta confirmar requisitos con Secretaría:

- no automatizar materias o calificaciones;
- no definir como definitiva la documentación específica para cada excepción;
- no reemplazar la planilla oficial existente;
- no mover analíticos actuales;
- no modificar el dominio personalizado mientras continúe pendiente la delegación;
- no publicar documentación interna ni datos sensibles.

## Criterios de éxito de la primera versión

La primera versión se considera funcional cuando:

1. una persona puede iniciar la solicitud desde la web sin cuenta Google;
2. puede adjuntar la documentación permitida;
3. la solicitud aparece en una bandeja interna separada;
4. Secretaría puede revisarla sin que todavía figure en el seguimiento oficial;
5. al validarla, el caso pasa al seguimiento oficial sin borrar datos existentes;
6. el ciudadano puede consultar un estado público limitado a apellido/nombre, DNI y estado;
7. la estructura queda preparada para automatizar la generación del analítico y Libro/Folio en etapas posteriores.
