# Diseño — Nuevo sistema de reservas del Salón de Audiovisuales

Fecha: 31/08/2026

## 1. Objetivo

Reemplazar progresivamente el Google Form actual por una experiencia integrada en la web institucional de la E.E.S. Nº18, manteniendo durante el desarrollo el sistema vigente como respaldo.

El nuevo sistema debe permitir que un docente consulte disponibilidad real, seleccione uno o más módulos horarios, confirme una reserva sin superposición y reciba una confirmación por correo. Las reservas seguirán sincronizadas con la base institucional y con Google Calendar.

## 2. Principios de diseño

- La experiencia del docente ocurre dentro de `ees18avellaneda.edu.ar`.
- Google Calendar queda como backend operativo/sincronización, no como interfaz principal.
- La planilla actual `Sistema Reservas Salón Audiovisuales - BASE` se conserva como fuente histórica y base administrativa inicial.
- El sistema actual no se desactiva hasta que la nueva versión esté probada y aprobada.
- La disponibilidad debe verificarse tanto al mostrarla como inmediatamente antes de confirmar una reserva.
- No se exponen públicamente nombres de docentes, cursos, materias, correos ni detalles internos de reservas ajenas.

## 3. Flujo docente

1. El docente ingresa a `Docentes > Reservas del Salón de Audiovisuales`.
2. Visualiza un almanaque mensual dentro de la web.
3. Elige un día hábil disponible.
4. El sistema muestra todos los módulos del turno mañana y tarde.
5. Los módulos ocupados aparecen visibles pero bloqueados.
6. Los módulos libres aparecen seleccionables mediante casillas/tildes.
7. El docente selecciona uno o más módulos.
8. Si selecciona módulos consecutivos separados por un recreo, se consideran una sola ocupación continua.
9. El sistema resume la selección antes de continuar.
10. El docente completa sus datos y los recursos requeridos.
11. Al confirmar, el backend vuelve a comprobar la disponibilidad en una operación protegida contra concurrencia.
12. Si continúa libre, la reserva queda Confirmada automáticamente.
13. Se guarda en la base, se crea el evento en Google Calendar y se actualiza inmediatamente el almanaque web.
14. El docente recibe un correo de confirmación con el detalle y un enlace seguro de cancelación.

## 4. Franjas horarias

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

Los recreos entre módulos no se ofrecen como franjas independientes. Si una selección abarca módulos a ambos lados de un recreo, el salón se considera ocupado durante todo el intervalo comprendido.

Ejemplo: seleccionar 08:30–09:30 y 09:50–10:50 produce una única reserva de 08:30–10:50.

## 5. Estados del calendario

Cada día del almanaque podrá representarse con un estado visual simple:

- Disponible
- Parcialmente ocupado
- Sin disponibilidad
- Bloqueado

Sábados, domingos y feriados quedan bloqueados.

La interfaz no mostrará públicamente quién reservó un módulo. Solo indicará que está ocupado.

## 6. Ventana de reserva

- Se permite reservar el mismo día si todavía existe disponibilidad.
- Se permite reservar hasta 60 días hacia adelante.
- No se aceptan fechas pasadas.
- Sábados, domingos y feriados no admiten reservas.
- Administración puede bloquear excepcionalmente un día hábil completo cuando exista jornada institucional, acto, mantenimiento u otra causa escolar.

## 7. Correos admitidos

Se aceptan:

- cuentas institucionales `@abc.gob.ar`;
- Gmail y otros correos válidos.

El sistema identifica visualmente los correos institucionales, pero la confirmación es automática para todos los correos válidos si no existe conflicto horario.

## 8. Confirmación automática y concurrencia

La reserva usa confirmación automática.

Para evitar que dos personas reserven el mismo módulo simultáneamente:

1. el frontend consulta disponibilidad;
2. el docente selecciona módulos;
3. al presionar Confirmar, el backend adquiere un bloqueo de corta duración;
4. vuelve a consultar las reservas confirmadas para esa fecha;
5. si alguna franja dejó de estar libre, se rechaza únicamente esa confirmación y se devuelve la disponibilidad actualizada;
6. si todas continúan libres, se registra la reserva y recién después se libera el bloqueo.

La disponibilidad mostrada en pantalla nunca se considera garantía hasta el momento de confirmación.

## 9. Datos de una reserva

Campos mínimos:

- ID de reserva
- Fecha de creación
- Estado
- Fecha de reserva
- Hora desde
- Hora hasta
- Módulos seleccionados
- Profesor/a
- Correo docente
- Tipo de correo: institucional / externo
- Curso
- Materia o espacio curricular
- Turno
- Usa cañón
- Usa parlantes
- Usa notebook de la escuela
- Necesita internet
- Observaciones
- ID de evento de Google Calendar
- Token seguro de cancelación o hash asociado
- Fecha de cancelación, si corresponde
- Última actualización

La estructura debe poder convivir con los campos actuales de la hoja `Reservas` para facilitar la migración.

## 10. Reservas recurrentes

Se admiten dos modalidades:

### Reserva única

Una fecha específica.

### Repetición semanal

El docente selecciona una fecha inicial, módulos y una fecha final de repetición dentro del límite de 60 días.

El sistema evalúa cada fecha individualmente:

- confirma las fechas disponibles;
- omite las que tengan conflicto;
- informa claramente el resultado.

Ejemplo: `6 fechas solicitadas · 5 confirmadas · 1 no disponible`.

No se implementan inicialmente recurrencias quincenales, múltiples días por semana ni reglas complejas.

## 11. Cancelaciones

Cada reserva confirmada genera un enlace seguro enviado al correo del docente.

Desde ese enlace puede cancelar su propia reserva.

Al cancelar:

- el estado pasa a `Cancelada`;
- el registro histórico no se elimina;
- se cancela/elimina el evento correspondiente de Google Calendar;
- las franjas vuelven a quedar disponibles en la web;
- se registra fecha y hora de cancelación;
- se envía correo de confirmación.

No se permite editar una reserva existente en la primera versión. Para cambiar fecha u horario, el docente cancela y crea una nueva.

## 12. Vista administrativa

La administración contará con una vista separada de la experiencia docente.

Funciones mínimas:

- ver reservas con datos completos;
- filtrar por fecha, docente, curso, turno y estado;
- cancelar una reserva;
- bloquear un día hábil completo;
- desbloquear un día previamente bloqueado;
- identificar reservas recurrentes como grupo;
- consultar conflictos o errores de sincronización;
- abrir el evento correspondiente en Google Calendar cuando exista.

La vista administrativa no será pública ni se enlazará desde navegación abierta sin un mecanismo de acceso apropiado.

## 13. Backend propuesto

### Fuente de datos inicial

Google Sheets existente: `Sistema Reservas Salón Audiovisuales - BASE`.

### Calendario

Google Calendar existente: `Reservas - Salón Audiovisuales`.

### API

Un Web App de Google Apps Script separado de la interfaz pública deberá exponer únicamente operaciones controladas, por ejemplo:

- `getAvailability(date)`
- `getMonthAvailability(year, month)`
- `createReservation(payload)`
- `cancelReservation(token)`
- `getReservationByCancelToken(token)`

Las operaciones administrativas deben estar separadas de las rutas públicas.

## 14. Frontend propuesto

Nueva página web dedicada, por ejemplo:

`reservas-audiovisuales.html`

Componentes principales:

1. Encabezado y explicación breve.
2. Almanaque mensual.
3. Leyenda de disponibilidad.
4. Panel del día seleccionado.
5. Lista de franjas mañana/tarde con casillas.
6. Resumen de selección.
7. Formulario de datos docentes y recursos.
8. Selector de modalidad: única / semanal.
9. Confirmación final.
10. Pantalla de resultado.

El frontend debe ser responsive y usable desde celular.

## 15. Feriados

La primera versión debe bloquear automáticamente feriados nacionales aplicables a la Argentina.

La fuente concreta de feriados se definirá en implementación priorizando una fuente estable y cacheable. Si la consulta externa falla, el backend deberá conservar una lista/caché vigente para evitar habilitar accidentalmente un feriado conocido.

## 16. Manejo de errores

Casos previstos:

- franja ocupada entre selección y confirmación;
- Google Calendar temporalmente no disponible;
- error al enviar correo;
- datos incompletos o correo inválido;
- fecha fuera del rango permitido;
- día no habilitado;
- token de cancelación inválido o ya utilizado;
- repetición semanal con algunas fechas en conflicto.

Una reserva no debe mostrarse como Confirmada si el guardado de la reserva falla.

Si el registro se guardó correctamente pero falla un servicio secundario como el correo, la reserva continúa válida y se registra el error para reintento/seguimiento.

## 17. Migración

El desarrollo se realiza en paralelo al sistema vigente.

Fases:

1. construir frontend y backend nuevos contra una copia o entorno de prueba;
2. probar disponibilidad, concurrencia, recurrencias y cancelaciones;
3. validar sincronización con Calendar;
4. hacer pruebas con usuarios controlados;
5. publicar la nueva página sin retirar todavía el Google Form;
6. cuando el nuevo flujo quede validado, convertirlo en acceso principal;
7. conservar el sistema anterior temporalmente como contingencia;
8. retirar el formulario solo después de un período estable.

## 18. Criterios de aceptación

El sistema estará listo para reemplazar al formulario actual cuando:

- el almanaque mensual se cargue correctamente;
- los módulos libres y ocupados sean correctos;
- no sea posible producir una doble reserva mediante dos solicitudes simultáneas;
- las reservas únicas se reflejen inmediatamente;
- las recurrencias semanales confirmen solo fechas disponibles;
- las cancelaciones liberen automáticamente los módulos;
- Google Calendar quede sincronizado;
- los correos de confirmación/cancelación funcionen;
- sábados, domingos, feriados y días bloqueados no puedan reservarse;
- el límite de 60 días se aplique;
- la interfaz funcione correctamente en computadora y celular;
- la información privada de otras reservas no sea visible desde la web pública;
- el sistema actual continúe operativo durante la transición.

## 19. Fuera de alcance de la primera versión

- edición directa de una reserva confirmada;
- recurrencias quincenales o reglas complejas;
- reservas de múltiples espacios físicos;
- login obligatorio de docentes;
- exposición pública de datos personales de reservas;
- reemplazo inmediato del sistema vigente sin etapa paralela de prueba.
