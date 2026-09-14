# ENSPA · Completa Carrera online

Flujo administrativo:

1. La persona completa el formulario web sin iniciar sesión.
2. Adjunta únicamente DNI frente y DNI dorso (PDF/JPG/PNG, hasta 10 MB cada archivo).
3. La solicitud se registra en `SOLICITUDES COMPLETA CARRERA - EES18`, pestaña `Solicitudes`, con estado `PENDIENTE`.
4. Secretaría revisa la fila. Para autorizarla debe cambiar `Estado` a `APROBADA` y marcar `CONFIRMAR PARA ACTA`.
5. Sólo con ambas condiciones la solicitud alimenta las actas.
6. Los alumnos se agrupan por materia + año de la materia + orientación + turno. Cada acta admite hasta 30 alumnos; si hay más, se crea otra parte.
7. `RESULTADO ACTA` se completa automáticamente con el enlace al/los documento/s correspondiente/s.
8. Si se desmarca la confirmación o la solicitud deja de estar `APROBADA`, el alumno sale de la versión activa del acta en la siguiente sincronización.

## Configuración inicial

Ejecutar una sola vez:

```javascript
configurarCompletaCarrera(
  '1dv8GYdzfP5QW1q6aBisE0S1H4bJNEUSq6Klw1qNsyAk',
  '1Qyr4YCbPKl9amhrA2SSyXjD7wtR19hhC',
  '1T4u9cLSerNZn-GWM4Td_NTVnSHt2Nn3A237kIZFUIBI',
  '1FyLpIdcH5dS5MuN1tMZIrKWkY9rluCtk'
);
```

Eso configura la planilla, la carpeta de adjuntos, la plantilla v6, la carpeta de actas e instala el trigger de edición.

Antes de una mesa se pueden fijar los datos comunes del acta con:

```javascript
configurarDatosActa('SEPTIEMBRE 2026', 'dd/mm/2026', 'A completar');
```

Mientras esos datos no se definan, el sistema deja `A completar` y nunca inventa fecha, libro o folio.

## Seguridad del flujo

El envío del formulario nunca genera un acta por sí solo. La condición de salida a actas es estricta: `Estado = APROBADA` **y** `CONFIRMAR PARA ACTA = TRUE`.
