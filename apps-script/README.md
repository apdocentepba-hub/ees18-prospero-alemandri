# Backend de Trámites - Google Apps Script

Este directorio contiene la capa privada que conecta el formulario público con Google Drive y la bandeja interna de Secretaría.

## Flujo

1. La web envía una solicitud.
2. Apps Script crea una carpeta individual dentro de `SOLICITUDES WEB/2026`.
3. Guarda los adjuntos.
4. Registra el caso en `Solicitudes_Analiticos_Pendientes`.
5. El caso queda en revisión y NO pasa automáticamente al seguimiento oficial.
6. Secretaría verifica `Vínculo EES18`, `Estado documentación` y `Aprobado para iniciar`.
7. Solo después puede ejecutarse `promoverSolicitudValidada(rowIndex)`.

## Script Properties requeridas

Configurar en Apps Script > Project Settings > Script Properties:

- `PENDING_SPREADSHEET_ID`: ID de la hoja `Solicitudes_Analiticos_Pendientes`.
- `PENDING_SHEET_NAME`: `Solicitudes`.
- `REQUESTS_FOLDER_ID`: ID de `ENSPA/PASES MARTIN/SOLICITUDES WEB/2026`.
- `OFFICIAL_SPREADSHEET_ID`: solo cuando Secretaría autorice una hoja nativa de Google Sheets como seguimiento operativo.
- `OFFICIAL_SHEET_NAME`: nombre de la pestaña del seguimiento operativo.

Los IDs no deben publicarse en el JavaScript del sitio.

## Punto técnico pendiente: seguimiento oficial XLSX

`Seguimiento_Analiticos_y_Pases.xlsx` está almacenado como archivo Excel. Apps Script/SpreadsheetApp no debe intentar convertirlo, reemplazarlo o reexportarlo automáticamente porque eso puede alterar fórmulas, validaciones o formato.

Por seguridad, la promoción automática al seguimiento queda preparada para una hoja nativa de Google Sheets. Antes de activar esa parte se debe elegir una estrategia aprobada:

1. mantener el XLSX intacto como respaldo y crear una versión operativa nativa de Google Sheets; o
2. implementar un backend distinto capaz de editar el XLSX binario de forma controlada.

Hasta tomar esa decisión, la recepción, archivo y validación intermedia pueden funcionar normalmente y no modifican el XLSX.

## Despliegue

1. Crear un proyecto de Apps Script bajo una cuenta autorizada.
2. Copiar `Code.gs` y `appsscript.json`.
3. Configurar las Script Properties.
4. Desplegar como Web App ejecutándose como el usuario que despliega.
5. Verificar si la cuenta permite acceso `Anyone`/anónimo. Si la política de Workspace no lo permite, no publicar el formulario hasta disponer de un endpoint alternativo.
6. Hacer una solicitud de prueba con archivos ficticios sin datos reales.
7. Verificar que se cree una carpeta y una fila en la bandeja pendiente.
8. Probar la consulta con DNI + código.
9. Recién entonces colocar la URL del Web App en `assets/js/tramite-config.js`.

## Seguridad

- El código de seguimiento se guarda hasheado en la bandeja.
- La consulta pública exige DNI + código de seguimiento.
- La respuesta pública devuelve solo apellido/nombre, DNI y estado.
- Los adjuntos quedan en Drive y nunca se exponen mediante links públicos.
- La promoción al seguimiento no puede ser invocada desde la web pública.
