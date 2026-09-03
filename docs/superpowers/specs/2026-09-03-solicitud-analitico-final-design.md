# Solicitud de Analítico Final — Diseño

## Objetivo

Crear una aplicación web independiente para que egresadas y egresados de la E.E.S. Nº 18 “Próspero Alemandri” envíen una solicitud de analítico final y la documentación necesaria. La aplicación sólo recibe solicitudes: no emite el analítico, no cambia su estado ni publica seguimiento.

## Acceso

- Aplicación web independiente basada en Google Apps Script HTML Service.
- Acceso público, sin inicio de sesión con Google.
- El Web App se despliega ejecutando como la cuenta institucional y con acceso para cualquier persona.
- La web institucional pública no se modifica hasta contar con la URL definitiva del despliegue.

## Datos solicitados

### Datos personales

- Apellido, tal como figura en el DNI — obligatorio.
- Nombre, tal como figura en el DNI — obligatorio.
- DNI — obligatorio.
- Fecha de nacimiento — obligatorio.
- Lugar / localidad de nacimiento — obligatorio.
- Correo electrónico — obligatorio.
- Celular / WhatsApp — obligatorio.

### Motivo

El motivo es opcional. Opciones:

- Continuar estudios o inscribirse.
- Presentar en un trabajo.
- Realizar un trámite personal.
- Otro.

Si elige “Otro”, se habilita una aclaración.

### Trayectoria en la E.E.S. Nº 18

- Orientación / modalidad — obligatorio:
  - Comunicación.
  - Ciencias Sociales.
  - Lenguas Extranjeras.
  - Ciencias Naturales.
  - Otra / No recuerdo.
- Si selecciona “Otra / No recuerdo”, se habilita una aclaración opcional.
- Último curso cursado — obligatorio.
- División — obligatorio.
- Turno del último año — obligatorio, sólo “Mañana” o “Tarde”.
- Año calendario en que cursó ese último curso — obligatorio.
- Año en que aprobó la última materia — obligatorio.

### Estudios en otra escuela

Se pregunta si cursó algún año de la secundaria en otra escuela.

- Si responde “No”, no se solicita documentación adicional por este punto.
- Si responde “Sí”, se exige adjuntar un analítico parcial, certificado o constancia oficial de la escuela anterior.

## Documentación

Formatos permitidos: PDF, JPG/JPEG y PNG. Máximo 10 MB por archivo.

Obligatorios:

1. DNI frente.
2. DNI dorso.
3. Partida de nacimiento.

Condicional:

4. Analítico parcial / certificado de la escuela anterior, sólo si declaró haber cursado algún año en otra escuela.

Cada archivo se carga por separado.

## Persistencia para Secretaría

La aplicación usa Script Properties:

- `PENDING_SPREADSHEET_ID`: planilla donde se registran las solicitudes.
- `PENDING_SHEET_NAME`: pestaña de solicitudes; por defecto `Solicitudes`.
- `REQUESTS_FOLDER_ID`: carpeta raíz de Drive para adjuntos.

Cada envío genera un ID interno `SOL-AAAA-XXXXXXXX`, crea una carpeta por solicitud y registra una fila con estado inicial `RECIBIDA`.

Archivos en la carpeta de la solicitud:

- `01 - DNI FRENTE - <nombre original>`
- `02 - DNI DORSO - <nombre original>`
- `03 - PARTIDA NACIMIENTO - <nombre original>`
- `04 - ANALITICO PARCIAL ESCUELA ANTERIOR - <nombre original>` cuando corresponda.

La planilla registra los datos del formulario, presencia de adjuntos, URL de la carpeta Drive y resultado del intento de envío del correo de recepción.

## Correo al egresado

Después de guardar correctamente la solicitud se intenta enviar un correo al email escrito por la persona.

El correo:

- confirma que la solicitud fue recibida;
- informa la fecha de recepción;
- explica que Secretaría revisará la documentación y se comunicará si necesita algo más;
- no incluye DNI;
- no incluye respuestas del formulario;
- no incluye nombres de archivos;
- no adjunta documentos.

No se verifica previamente que el correo pertenezca a la persona. Si el correo fue escrito incorrectamente, la solicitud igualmente queda registrada; un error de correo no revierte ni elimina el envío.

## UX y validación

- Diseño responsive, claro y de una sola página.
- Los campos condicionales aparecen sólo cuando corresponden.
- Antes del envío se valida formato y tamaño de archivos en cliente y nuevamente en servidor.
- Durante el envío se bloquea el botón para evitar duplicados accidentales.
- Éxito: “Tu solicitud fue recibida”.
- El mensaje aclara que Secretaría revisará la documentación.
- Un fallo al enviar el correo no se muestra como fallo de la solicitud si los datos y archivos ya se guardaron.

## Fuera de alcance

- Seguimiento público del estado.
- Emisión automática del analítico.
- Modificación de notas, matrices o documentación académica.
- Inicio de sesión con Google.
- Envío por correo de copias del DNI, respuestas o adjuntos.
- Integración con la web pública antes de tener la URL definitiva del Web App.
