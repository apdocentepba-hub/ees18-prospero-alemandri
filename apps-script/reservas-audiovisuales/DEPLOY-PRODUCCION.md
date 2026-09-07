# Despliegue producción · Reservas de Audiovisuales y Contacto

Este despliegue es el único que puede escribir en la BASE y en el calendario real de Audiovisuales, y también procesa el formulario público de contacto del sitio.

## Estado previo verificado

- BASE: `Sistema Reservas Salón Audiovisuales - BASE`
- Spreadsheet ID: `1o8G7tD-w1FBA4LB3zC3SEtx4hVXKvALSupGnHEMqHkQ`
- Calendar real: `Reservas - Salón Audiovisuales`
- Calendar ID: `5780a0363aca1620734b2f154ddab8409488e28886e3232631f6d6b6ab4c5ebf@group.calendar.google.com`
- La BASE ya posee las 7 columnas adicionales requeridas y las hojas `Días bloqueados` y `Administración`.
- Existe un backup previo al corte: `Sistema Reservas Salón Audiovisuales - BACKUP PRE PRODUCCIÓN 2026-08-31`.

## Script Properties obligatorias

Configurar en **Configuración del proyecto → Propiedades de la secuencia de comandos**:

- `RESERVAS_ENVIRONMENT` = `PRODUCTION`
- `RESERVAS_SPREADSHEET_ID` = `1o8G7tD-w1FBA4LB3zC3SEtx4hVXKvALSupGnHEMqHkQ`
- `RESERVAS_CALENDAR_ID` = `5780a0363aca1620734b2f154ddab8409488e28886e3232631f6d6b6ab4c5ebf@group.calendar.google.com`

Las acciones de reservas validan las tres propiedades antes de procesarse. Si `PRODUCTION` no coincide exactamente con BASE + Calendar real, devuelve `ENVIRONMENT_CONFIGURATION_MISMATCH` y no procesa reservas. La acción pública `contact` es independiente de Sheets/Calendar y utiliza únicamente MailApp + CacheService.

## Archivos del backend

Copiar al proyecto Apps Script de producción, como archivos `.gs` separados y en la versión del PR correspondiente:

1. `Config.gs`
2. `Data.gs`
3. `Availability.gs`
4. `AdminSetup.gs`
5. `Reservations.gs`
6. `CalendarSync.gs`
7. `Mail.gs`
8. `Cancellations.gs`
9. `Contact.gs`
10. `Code.gs`

Para el cambio de formulario de contacto + avisos internos de Audiovisuales, los archivos que necesariamente cambian son `Reservations.gs`, `Mail.gs`, `Contact.gs` y `Code.gs`.

## Ruteo de correo esperado

### Audiovisuales

- Confirmación al docente: al correo `@abc.gob.ar` informado en la reserva.
- Aviso interno de cada reserva confirmada: `martin.nicolas.podubinio@gmail.com` y `audiovisualesenspa@gmail.com`.
- **No** enviar avisos de Audiovisuales a `secundaria18avellaneda@abc.gob.ar`.

### Formulario de contacto

- Acepta cualquier correo válido (Gmail, Hotmail/Outlook, Yahoo, ABC, etc.).
- Destino único: `secundaria18avellaneda@abc.gob.ar`.
- El correo ingresado por la persona se configura como `Reply-To`.

## Inicialización

1. Configurar las tres Script Properties.
2. Guardar todos los archivos.
3. Ejecutar `setupReservationSystem()` una vez si todavía no fue inicializado el proyecto.
4. Autorizar Sheets, Calendar y Mail.
5. Confirmar que no se eliminaron ni reescribieron reservas históricas.
6. Confirmar que `Administración` se genera a partir de la BASE.

`setupReservationSystem()` es aditivo: agrega únicamente columnas/hojas faltantes y reconstruye la vista administrativa; no elimina las reservas históricas de `Reservas`.

## Despliegue

- Implementar → Administrar implementaciones → Editar la implementación de producción (o crear una nueva implementación si corresponde).
- Seleccionar la versión nueva con los archivos actualizados.
- Ejecutar como: propietario del script.
- Mantener el acceso público necesario para la web institucional.
- Confirmar que la URL `/exec` siga siendo la configurada en `assets/js/reservas-config.js` o actualizarla si Google generó una URL distinta.

No reutilizar la URL del Web App piloto.

## Gate de sólo lectura

Antes de cualquier reserva de control:

1. Abrir `?action=health`.
2. Debe responder exactamente con `ok:true`, `service:"reservas-audiovisuales"` y `environment:"production"`.
3. Consultar `?action=availability&date=YYYY-MM-DD` para una fecha futura conocida.
4. Verificar que la respuesta contenga sólo disponibilidad y nunca docente, correo, curso ni materia.
5. Comparar una fecha con reservas existentes contra la BASE y Calendar real.

Si `health.environment` no es `production`, **no conectar la web**.

## Reserva de control end-to-end

Sólo después del gate de lectura:

1. Elegir un módulo libre futuro.
2. Crear una única reserva identificada como `PRUEBA SISTEMA PRODUCCIÓN`.
3. Verificar la fila en BASE.
4. Verificar el evento en `Reservas - Salón Audiovisuales`.
5. Verificar el correo de confirmación al docente.
6. Verificar que el aviso interno de la nueva reserva llegue a `martin.nicolas.podubinio@gmail.com` y `audiovisualesenspa@gmail.com`, y no a `secundaria18avellaneda@abc.gob.ar`.
7. Ejecutar `cancelLookup`.
8. Ejecutar `cancel`.
9. Verificar fila `Cancelada`, fecha de cancelación, sincronización `OK`, evento eliminado y correo de cancelación.
10. Confirmar que un segundo lookup devuelve `ALREADY_CANCELLED`.

La fila de la prueba debe conservarse como historial cancelado; no borrar manualmente la trazabilidad.

## Prueba de Contacto

1. Abrir `contacto.html` después de desplegar el backend.
2. Enviar un mensaje de prueba con un correo externo válido.
3. Confirmar recepción únicamente en `secundaria18avellaneda@abc.gob.ar`.
4. Confirmar que el mensaje contiene el correo, asunto y cuerpo enviados.
5. Usar **Responder** y verificar que el destinatario sea el correo externo ingresado.
6. Confirmar que un segundo envío inmediato con el mismo correo sea limitado temporalmente.

## Corte de la web

Después de completar las pruebas:

1. Confirmar que `window.EES18_RESERVAS_API_URL` apunte al `/exec` de producción vigente.
2. Mantener GitHub Actions en sólo lectura: tests + probe, sin pasos de creación/cancelación/envío de correo.
3. Ejecutar CI completo y confirmar `success` antes de mergear el PR que hace visible el formulario.

## Rollback

Si falla la producción:

1. No borrar datos de BASE.
2. Mantener intactas las reservas históricas.
3. Si falla Contacto, retirar temporalmente el formulario visible o volver al enlace `mailto:` institucional.
4. Si falla Audiovisuales, volver el enlace principal de Docentes al mecanismo de contingencia vigente.
5. Corregir el backend en un despliegue nuevo; no editar a ciegas el historial existente.
6. Usar el backup pre-producción únicamente si fuera necesario recuperar estructura o comparar datos; no reemplazar BASE automáticamente.
