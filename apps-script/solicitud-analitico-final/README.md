# Web App — Solicitud de Analítico Final

Aplicación independiente para recibir solicitudes de analítico final de egresadas y egresados de la E.E.S. Nº 18 “Próspero Alemandri”.

## Archivos del proyecto Apps Script

Copiar al mismo proyecto:

- `Code.gs`
- `Setup.gs`
- `Formulario.html`
- `appsscript.json`

## Recursos necesarios

1. Una planilla de Google Sheets para Secretaría.
2. Una carpeta de Google Drive donde se guardarán las carpetas y adjuntos de cada solicitud.

La aplicación no necesita una cuenta Google por parte del egresado. El propietario del Web App sí debe tener acceso a la planilla y a la carpeta configuradas.

## Configuración inicial

En el editor de Apps Script, ejecutar una vez:

```javascript
configurarAnaliticoFinal('ID_DE_LA_PLANILLA', 'ID_DE_LA_CARPETA');
```

La función:

- valida que ambos recursos sean accesibles;
- guarda `PENDING_SPREADSHEET_ID`, `PENDING_SHEET_NAME=Solicitudes` y `REQUESTS_FOLDER_ID` en Script Properties;
- crea o valida la pestaña `Solicitudes` y sus encabezados.

No vuelve a escribir encabezados si la hoja ya contiene una estructura distinta: en ese caso se detiene para evitar sobrescribir datos.

## Despliegue

En Apps Script:

1. `Implementar` → `Nueva implementación`.
2. Tipo: `Aplicación web`.
3. `Ejecutar como`: la cuenta propietaria/institucional que tiene acceso a la planilla y Drive.
4. Acceso: `Cualquier persona`.
5. Implementar y conservar la URL `/exec` resultante.

La web institucional no debe apuntar al formulario hasta validar esa URL definitiva.

## Prueba funcional antes de publicar

Realizar al menos dos envíos de prueba:

### Caso A — toda la secundaria en E.E.S. Nº 18

- Completar los campos obligatorios.
- Marcar `No` en estudios en otra escuela.
- Adjuntar DNI frente, DNI dorso y partida.
- Verificar:
  - fila nueva con estado `RECIBIDA`;
  - carpeta nueva en Drive;
  - tres archivos con prefijos `01`, `02` y `03`;
  - correo de recepción sin respuestas ni adjuntos.

### Caso B — cursó parte en otra escuela

- Marcar `Sí` en estudios en otra escuela.
- Confirmar que el analítico parcial pasa a ser obligatorio.
- Adjuntar los cuatro documentos.
- Verificar que se guarde `04 - ANALITICO PARCIAL ESCUELA ANTERIOR`.

## Política del correo

El correo automático es únicamente un acuse de recepción. Incluye la fecha de recepción y explica que Secretaría revisará la documentación.

No incluye:

- DNI;
- apellido o nombre de la persona;
- respuestas del formulario;
- nombres de archivos;
- archivos adjuntos.

Si el correo fue escrito incorrectamente o `MailApp` falla, la solicitud ya guardada sigue siendo válida y la columna `Correo de recepción` queda como `NO ENVIADO`.

## Límites de archivos

- PDF (`application/pdf`).
- JPG/JPEG (`image/jpeg`).
- PNG (`image/png`).
- Máximo 10 MB por archivo.

La validación se ejecuta en el navegador y nuevamente en el servidor.
