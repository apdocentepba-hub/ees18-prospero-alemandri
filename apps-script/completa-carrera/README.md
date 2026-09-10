# Completa Carrera — formulario web

Formulario público de inscripción sin inicio de sesión, siguiendo el mismo patrón del formulario de Analítico Final.

## Funciones

- Hasta 3 materias por solicitud.
- Plan vigente u otro plan/año escrito por la persona.
- DNI frente y DNI dorso como dos archivos obligatorios (PDF/JPG/PNG, hasta 10 MB cada uno).
- Crea o reutiliza una carpeta por alumno dentro de `COMPLETA CARRERA` con formato `DNI - APELLIDO NOMBRE`.
- Guarda allí ambos archivos del DNI con el ID de solicitud en el nombre.
- Registra cada inscripción en `SOLICITUDES COMPLETA CARRERA - EES18`.

## Recursos

- Planilla: `1dv8GYdzfP5QW1q6aBisE0S1H4bJNEUSq6Klw1qNsyAk`
- Carpeta raíz: `1TLq7nh_GGnji54JbN3cG3sXA57WFIN-j`

## Despliegue

Crear un proyecto de Apps Script, copiar `Logic.gs`, `Code.gs`, `Formulario.html` y `appsscript.json`, y desplegar como aplicación web:

- Ejecutar como: propietario del script.
- Quién tiene acceso: cualquiera.

De esa forma la persona que completa el formulario no necesita iniciar sesión.
