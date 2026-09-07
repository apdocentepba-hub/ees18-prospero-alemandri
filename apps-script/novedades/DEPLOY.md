# Despliegue de Novedades EES18

Este backend es **independiente** del Web App de Reservas/Contacto.

## 1. Crear el proyecto

Crear un proyecto nuevo de Google Apps Script con nombre:

`Novedades EES18 - PRODUCCIÓN`

Copiar exactamente estos archivos del repositorio:

- `Config.gs`
- `Data.gs`
- `Code.gs`

## 2. Configurar la fuente

En **Configuración del proyecto → Propiedades de la secuencia de comandos**, crear:

`NOVEDADES_SPREADSHEET_ID=<ID de la Google Sheet Novedades EES18 - BASE>`

La planilla debe contener una pestaña llamada `Novedades` con las cabeceras definidas en el diseño del proyecto.

## 3. Implementar como aplicación web

En Apps Script:

1. `Implementar → Nueva implementación`.
2. Tipo: `Aplicación web`.
3. Ejecutar como: propietario del proyecto.
4. Acceso: cualquier persona que pueda abrir la aplicación web pública.
5. Implementar y conservar la URL terminada en `/exec`.

El Web App sólo expone `doGet`; no existe `doPost` ni operación pública de escritura.

## 4. Conectar el sitio

Copiar la URL `/exec` en:

`assets/js/novedades-config.js`

como valor de:

```javascript
window.EES18_NOVEDADES_API_URL = 'https://script.google.com/macros/s/.../exec';
```

No reutilizar la URL ni el proyecto de `Reservas Audiovisuales EES18 - PRODUCCIÓN`.

## 5. Verificación

Antes de activar el contenido dinámico en `main`, comprobar:

- `?section=inicio` devuelve `{ "ok": true, ... }`;
- `?section=comunicados` filtra correctamente;
- `?section=vida-escolar` filtra correctamente;
- un callback JSONP válido devuelve JavaScript;
- no existe ruta pública de escritura;
- editar o desactivar una fila en la Sheet se refleja luego del TTL de caché (120 segundos como máximo esperado).
