# Despliegue producción · Reservas de Audiovisuales

Este despliegue es el único que puede escribir en la BASE y en el calendario real.

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

El backend valida las tres propiedades antes de atender cualquier acción. Si `PRODUCTION` no coincide exactamente con BASE + Calendar real, devuelve `ENVIRONMENT_CONFIGURATION_MISMATCH` y no procesa reservas.

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
9. `Code.gs`

## Inicialización

1. Configurar las tres Script Properties.
2. Guardar todos los archivos.
3. Ejecutar `setupReservationSystem()` una vez.
4. Autorizar Sheets, Calendar y Mail.
5. Confirmar que no se eliminaron ni reescribieron reservas históricas.
6. Confirmar que `Administración` se genera a partir de la BASE.

`setupReservationSystem()` es aditivo: agrega únicamente columnas/hojas faltantes y reconstruye la vista administrativa; no elimina las reservas históricas de `Reservas`.

## Despliegue

- Implementar → Nueva implementación → Aplicación web.
- Ejecutar como: propietario del script.
- Acceso: el necesario para los docentes que usarán el sitio institucional.
- Guardar la URL `/exec` como **URL DE PRODUCCIÓN**.

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
5. Verificar el correo de confirmación y su token.
6. Ejecutar `cancelLookup`.
7. Ejecutar `cancel`.
8. Verificar fila `Cancelada`, fecha de cancelación, sincronización `OK`, evento eliminado y correo de cancelación.
9. Confirmar que un segundo lookup devuelve `ALREADY_CANCELLED`.

La fila de la prueba debe conservarse como historial cancelado; no borrar manualmente la trazabilidad.

## Corte de la web

Después de completar el E2E:

1. Reemplazar `window.EES18_RESERVAS_API_URL` en `assets/js/reservas-config.js` por la URL `/exec` de producción.
2. Cambiar los textos de `reservas-audiovisuales.html` y `docentes.html` para retirar `Etapa piloto`.
3. Convertir el nuevo calendario en acceso principal.
4. Mantener temporalmente el Google Form anterior como contingencia secundaria.
5. Mantener GitHub Actions en sólo lectura: tests + probe, sin pasos de creación/cancelación.
6. Ejecutar CI completo y confirmar `success` antes de mergear el PR.

## Rollback

Si falla la producción:

1. No borrar datos de BASE.
2. Volver el enlace principal de Docentes al Google Form vigente.
3. Retirar o vaciar temporalmente `EES18_RESERVAS_API_URL` si es necesario impedir nuevas escrituras desde la interfaz nueva.
4. Corregir el backend en un despliegue nuevo; no editar a ciegas el historial existente.
5. Usar el backup pre-producción únicamente si fuera necesario recuperar estructura o comparar datos; no reemplazar BASE automáticamente.
