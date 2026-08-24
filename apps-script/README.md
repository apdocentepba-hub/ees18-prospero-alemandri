# Backend de Trámites - Google Apps Script

Este directorio contiene la capa privada prevista para conectar la web institucional con Google Drive y la bandeja interna de Secretaría. El formulario público no debe considerarse habilitado hasta que el Web App esté desplegado, configurado y probado de punta a punta.

## Flujo del trámite

1. La web envía una solicitud de Analítico Parcial / Pase desde **Pases y equivalencias**.
2. Apps Script crea una carpeta individual dentro de `SOLICITUDES WEB/2026`.
3. Guarda DNI, partida y demás adjuntos admitidos.
4. Registra el caso en `Solicitudes_Analiticos_Pendientes`.
5. El caso queda en revisión y **NO** pasa automáticamente al seguimiento oficial.
6. Secretaría verifica que la persona sea alumno/exalumno, registra la fuente de verificación y controla la documentación.
7. Si el mismo DNI ya ingresó antes, la bandeja marca `Posible duplicado` para revisión; no rechaza automáticamente.
8. Solo con `Vínculo EES18 = VERIFICADO`, `Estado documentación = VALIDADA` y `Aprobado para iniciar = Sí` puede ejecutarse `promoverSolicitudValidada(rowIndex)`.
9. Después del alta oficial, la consulta pública puede mostrar únicamente apellido/nombre, DNI y `Estado del trámite`.

`Validacion.gs` contiene las funciones de trazabilidad de la revisión. Registrar una validación nunca activa por sí sola `Aprobado para iniciar`; la aprobación final queda bajo decisión de Secretaría.

## Script Properties requeridas

Configurar en Apps Script > Project Settings > Script Properties:

- `PENDING_SPREADSHEET_ID`: ID de `Solicitudes_Analiticos_Pendientes`.
- `PENDING_SHEET_NAME`: `Solicitudes`.
- `REQUESTS_FOLDER_ID`: ID de `ENSPA/PASES MARTIN/SOLICITUDES WEB/2026`.
- `OFFICIAL_SPREADSHEET_ID`: ID de la hoja nativa que se autorice como seguimiento operativo.
- `OFFICIAL_SHEET_NAME`: pestaña del seguimiento operativo.
- `OFFICIAL_HEADER_ROW`: `5` para la estructura actual del seguimiento.
- `INDEX_SPREADSHEET_ID`: ID de la hoja nativa que se autorice como índice operativo de libros matrices.
- `INDEX_SHEET_NAME`: pestaña del índice operativo.
- `INDEX_HEADER_ROW`: fila de encabezados del índice, normalmente `1`.
- `ANALITICOS_FOLDER_ID`: ID de `PASES MARTIN`, donde están los analíticos individuales nativos.
- `CONFLICT_SHEET_NAME`: opcional; por defecto `Conflictos Libro-Folio`.

Los IDs son configuración privada. No deben publicarse en el JavaScript del sitio.

## Libro y Folio

Los analíticos individuales existentes guardan los datos en la pestaña `Carga`:

- nombre del alumno: `C11`;
- DNI: `H12`;
- Libro Matriz: `D132`;
- Folio: `G132`.

La sincronización usa el DNI como identificador principal y aplica estas reglas:

- si Libro/Folio están vacíos en seguimiento o índice, los completa;
- si ya coinciden, no modifica nada;
- si el mismo DNI tiene Libro/Folio distintos, registra `CONFLICTO` y no sobrescribe;
- si el mismo Libro + Folio aparece asignado a otro DNI, registra `CONFLICTO` y no sobrescribe;
- si el índice fue completado manualmente, ese dato se conserva y se compara antes de escribir.

Funciones disponibles:

- `sincronizarLibroFolioDesdeAnalitico(spreadsheetId)`: cruza un analítico individual.
- `reconstruirIndiceDesdeAnaliticos()`: recorre los analíticos nativos existentes para iniciar/completar el índice digital.
- `sincronizarLibroFolioRecientes()`: procesa archivos modificados desde la última sincronización.
- `instalarSincronizacionHorariaLibroFolio()`: instala un disparador horario una vez que la configuración operativa esté aprobada.

No instalar el disparador antes de probar la sincronización sobre copias operativas y revisar los conflictos detectados.

## Punto técnico pendiente: los archivos oficiales actuales son XLSX

Actualmente tanto `Seguimiento_Analiticos_y_Pases.xlsx` como `Indice_Libros_Matrices.xlsx` son archivos Excel almacenados en Drive. `SpreadsheetApp` trabaja de forma segura con Google Sheets nativos y no debe intentar editar o convertir silenciosamente esos XLSX.

Los XLSX originales deben permanecer intactos. Para activar escritura automática en vivo se necesita una decisión operativa explícita:

1. conservar los XLSX como respaldo/exportación y utilizar copias nativas de Google Sheets como bases operativas; o
2. implementar otro backend que edite XLSX de manera controlada.

Hasta resolver esto, la bandeja intermedia puede usarse y el código del flujo queda preparado, pero la promoción automática al seguimiento y la sincronización Libro/Folio no deben activarse contra los XLSX.

## Despliegue del formulario público

1. Crear un proyecto de Apps Script bajo una cuenta autorizada de la escuela.
2. Incorporar `Code.gs`, `Validacion.gs` y `appsscript.json`.
3. Configurar las Script Properties.
4. Desplegar como Web App ejecutándose como el usuario que despliega.
5. Confirmar que la cuenta permite acceso anónimo (`Anyone`) sin cuenta Google. Si la política de Workspace no lo permite, usar un endpoint alternativo y no habilitar cargas anónimas hasta resolverlo.
6. Hacer pruebas exclusivamente con archivos ficticios/sintéticos, sin DNI reales.
7. Verificar carpeta creada, adjuntos, fila en la bandeja y correo con código de seguimiento.
8. Verificar consulta por DNI de prueba + código.
9. Verificar que una solicitud no pueda pasar al seguimiento sin las tres validaciones internas.
10. Recién entonces colocar la URL verificada del Web App en `assets/js/tramite-config.js` y publicar el formulario como operativo.

## Seguridad y privacidad

- El código de seguimiento se guarda hasheado en la bandeja.
- La consulta pública exige DNI + código de seguimiento.
- La respuesta pública devuelve únicamente apellido/nombre, DNI y estado.
- Los adjuntos quedan privados en Drive y nunca se devuelven como enlaces públicos.
- La web no contiene IDs internos de Drive ni credenciales.
- La promoción al seguimiento no se expone como acción pública.
- Los archivos se validan por tipo y tamaño tanto en cliente como en servidor.
- Los conflictos Libro/Folio nunca se corrigen sobrescribiendo automáticamente: requieren revisión humana.
