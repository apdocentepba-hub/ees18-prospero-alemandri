# Despliegue piloto · Reservas de Audiovisuales

Este despliegue debe probarse sin tocar la base ni el calendario reales.

## Script Properties obligatorias

Configurar en **Configuración del proyecto → Propiedades de la secuencia de comandos**:

- `RESERVAS_ENVIRONMENT` = `PILOT`
- `RESERVAS_SPREADSHEET_ID` = `1mvbJGjwWWFi7RI1cWCtqppALxGre7WUKg9u0_YeR2Hk`
- `RESERVAS_CALENDAR_ID` = `classroom108484736585769598885@group.calendar.google.com`

La primera propiedad activa la protección de entorno. Las otras dos apuntan exclusivamente a:

- Sheet: **Sistema Reservas Salón Audiovisuales - PILOTO**.
- Calendar: **Clase de prueba Informatica**.

El backend rechaza la ejecución con `ENVIRONMENT_CONFIGURATION_MISMATCH` si `PILOT` se combina con la BASE o con el calendario real `Reservas - Salón Audiovisuales`.

## Archivos a copiar al proyecto Apps Script independiente

Copiar como archivos `.gs` separados:

1. `Config.gs`
2. `Data.gs`
3. `Availability.gs`
4. `AdminSetup.gs`
5. `Reservations.gs`
6. `CalendarSync.gs`
7. `Mail.gs`
8. `Cancellations.gs`
9. `Code.gs`

## Preparación

1. Guardar todos los archivos.
2. Configurar las tres Script Properties anteriores.
3. Ejecutar `setupReservationSystem()` una vez.
4. Autorizar Sheets, Calendar y Mail cuando Google lo solicite.
5. Verificar que la planilla usada sea la copia PILOTO.
6. Verificar que el Calendar usado sea `Clase de prueba Informatica`.

## Despliegue

- Implementar → Nueva implementación → Aplicación web.
- Ejecutar como: propietario del script.
- Acceso: el nivel necesario para que docentes puedan usar el formulario web institucional.
- Copiar la URL `/exec`.

## Prueba mínima antes de conectar el sitio

1. `?action=health` debe responder `ok:true`, `service:"reservas-audiovisuales"` y `environment:"pilot"`.
2. `?action=availability&date=YYYY-MM-DD` debe devolver únicamente estados de módulos, nunca nombres ni correos.
3. Crear una reserva única de prueba.
4. Verificar fila nueva en la copia PILOTO.
5. Verificar evento en `Clase de prueba Informatica`.
6. Verificar correo de confirmación.
7. Abrir el enlace de cancelación del correo.
8. Cancelar y comprobar que la fila queda `Cancelada`, el evento desaparece y la franja vuelve a estar libre.
9. Probar una recurrencia semanal con una fecha ocupada y comprobar confirmación parcial.

## Conexión con la web

La URL del piloto sólo debe usarse durante pruebas. No debe ser la URL final del sitio en producción.

`assets/js/reservas-config.js`

```js
window.EES18_RESERVAS_API_URL = 'URL_DEL_WEB_APP_PILOTO';
```

Antes de pasar a producción, crear un despliegue separado siguiendo `DEPLOY-PRODUCCION.md` y comprobar que `health.environment` sea `production`.
