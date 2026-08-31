# Despliegue piloto · Reservas de Audiovisuales

Este despliegue debe probarse sin tocar la base ni el calendario reales.

## Script Properties obligatorias

Configurar en **Configuración del proyecto → Propiedades de la secuencia de comandos**:

- `RESERVAS_SPREADSHEET_ID` = `1mvbJGjwWWFi7RI1cWCtqppALxGre7WUKg9u0_YeR2Hk`
- `RESERVAS_CALENDAR_ID` = `classroom108484736585769598885@group.calendar.google.com`

La primera propiedad apunta a la copia **Sistema Reservas Salón Audiovisuales - PILOTO**.
La segunda apunta al calendario secundario vacío **Clase de prueba Informatica**.

No usar el ID de la base real ni el calendario `Reservas - Salón Audiovisuales` durante esta fase.

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
2. Ejecutar `setupReservationSystem()` una vez.
3. Autorizar Sheets, Calendar y Mail cuando Google lo solicite.
4. Verificar que la planilla usada sea la copia PILOTO.
5. Verificar que el Calendar usado sea `Clase de prueba Informatica`.

## Despliegue

- Implementar → Nueva implementación → Aplicación web.
- Ejecutar como: propietario del script.
- Acceso: el nivel necesario para que docentes puedan usar el formulario web institucional.
- Copiar la URL `/exec`.

## Prueba mínima antes de conectar el sitio

1. `?action=health` debe responder `ok:true`.
2. `?action=availability&date=YYYY-MM-DD` debe devolver únicamente estados de módulos, nunca nombres ni correos.
3. Crear una reserva única de prueba.
4. Verificar fila nueva en la copia PILOTO.
5. Verificar evento en `Clase de prueba Informatica`.
6. Verificar correo de confirmación.
7. Abrir el enlace de cancelación del correo.
8. Cancelar y comprobar que la fila queda `Cancelada`, el evento desaparece y la franja vuelve a estar libre.
9. Probar una recurrencia semanal con una fecha ocupada y comprobar confirmación parcial.

## Conexión con la web

Sólo después de que todo lo anterior funcione, colocar la URL `/exec` en:

`assets/js/reservas-config.js`

```js
window.EES18_RESERVAS_API_URL = 'URL_DEL_WEB_APP';
```

Mientras esa URL permanezca vacía, el sitio no puede confirmar reservas accidentalmente.
