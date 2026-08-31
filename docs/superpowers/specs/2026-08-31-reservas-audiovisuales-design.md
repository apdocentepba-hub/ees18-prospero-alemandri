# Diseño — Nuevo sistema de reservas del Salón de Audiovisuales

Fecha: 31/08/2026

## Resumen aprobado

La experiencia docente se integra en `ees18avellaneda.edu.ar`: almanaque mensual, selección de día, módulos visibles con ocupados bloqueados, tildes sobre módulos libres, confirmación automática sin superposición, reservas semanales, cancelación por enlace seguro y sincronización con Google Calendar.

Se permite reservar el mismo día y hasta 60 días hacia adelante. Sábados, domingos y feriados quedan bloqueados. Se aceptan correos `@abc.gob.ar` y correos externos válidos.

## Horarios

### Turno mañana
- 07:30–08:30
- 08:30–09:30
- 09:50–10:50
- 10:50–11:50
- 11:50–12:50

### Turno tarde
- 13:00–14:00
- 14:00–15:00
- 15:20–16:20
- 16:20–17:20
- 17:20–18:20

Los módulos seleccionados a ambos lados de un recreo se consideran una única ocupación continua.

## Flujo

1. Abrir Docentes > Reservas del Salón de Audiovisuales.
2. Ver almanaque mensual dentro de la web.
3. Elegir día hábil.
4. Ver módulos de mañana y tarde.
5. Ocupados visibles pero bloqueados.
6. Libres seleccionables con casillas.
7. Seleccionar uno o varios módulos.
8. Completar docente, correo, curso, materia, recursos y observaciones.
9. Elegir reserva única o repetición semanal.
10. Confirmar.
11. El backend vuelve a validar disponibilidad con `LockService`.
12. Si continúa libre, guarda la reserva y crea el evento en Calendar.
13. Enviar correo de confirmación y enlace seguro de cancelación.

## Estados del almanaque

- Disponible
- Parcialmente ocupado
- Sin disponibilidad
- Bloqueado

La web pública no muestra quién hizo una reserva ni sus datos.

## Reserva semanal

La repetición semanal puede extenderse hasta una fecha dentro del límite de 60 días. Cada fecha se valida por separado. Se confirman las disponibles y se informa cuáles no pudieron reservarse. Todas las reservas generadas en una misma operación comparten un ID de grupo.

No se implementan inicialmente reglas quincenales ni recurrencias complejas.

## Cancelación

Cada reserva recibe un token seguro enviado por correo; en la base solo se conserva su hash. Al cancelar:

- estado `Cancelada`;
- se conserva el historial;
- se elimina el evento de Google Calendar;
- se libera el horario;
- se registra fecha/hora de cancelación;
- se envía correo de confirmación.

Para modificar una reserva se cancela y se crea una nueva.

## Datos y compatibilidad

Se conserva como base inicial `Sistema Reservas Salón Audiovisuales - BASE` y su hoja `Reservas`. Se agregan campos compatibles para módulos seleccionados, grupo recurrente, tipo de correo, hash de cancelación y estado de sincronización.

Google Calendar `Reservas - Salón Audiovisuales` sigue siendo el calendario operativo.

## Backend

Nuevo Web App de Google Apps Script con API pública limitada:

- `getAvailability(date)`
- `getMonthAvailability(year, month)`
- `createReservation(payload)`
- `cancelReservation(token)`
- `getReservationByCancelToken(token)`

No se exponen operaciones administrativas en la API pública.

La confirmación usa `LockService` y realiza una segunda verificación de disponibilidad inmediatamente antes de escribir para impedir dobles reservas concurrentes.

## Administración

La primera versión no tendrá panel administrativo público. La administración se hace desde la Google Sheet protegida por permisos de Drive, mediante una pestaña `Administración` para consultar/cancelar reservas y bloquear o desbloquear días.

## Feriados y cierres

Se incorpora una pestaña `Días bloqueados` con fecha, tipo, descripción y activo Sí/No. Allí se cargan los feriados nacionales del período y los cierres escolares extraordinarios. El sistema bloquea además sábados y domingos.

## Manejo de fallos

Una reserva nunca se muestra como confirmada si falla el guardado principal. Si falla el correo, la reserva sigue válida y el error queda pendiente de reintento. Si falla Calendar después de guardar, el horario permanece reservado y se marca sincronización pendiente para evitar dobles reservas.

## Migración segura

El sistema nuevo se desarrolla y prueba en paralelo. El Google Form vigente no se retira hasta que el nuevo flujo haya pasado pruebas de disponibilidad, concurrencia, recurrencias, cancelaciones, sincronización con Calendar y funcionamiento móvil/escritorio.

## Criterios de aceptación

- almanaque mensual correcto;
- disponibilidad correcta por módulo;
- doble reserva imposible bajo concurrencia;
- reserva única inmediata;
- repetición semanal parcial cuando haya conflictos;
- cancelación libera horario;
- Calendar sincronizado;
- correos de confirmación/cancelación;
- fines de semana, feriados y cierres bloqueados;
- máximo 60 días;
- responsive en celular y escritorio;
- privacidad de reservas ajenas;
- sistema vigente operativo durante la transición.

## Fuera de alcance inicial

- edición directa de reservas;
- recurrencias complejas;
- múltiples espacios;
- login obligatorio de docentes;
- panel administrativo público;
- retiro inmediato del formulario actual.
