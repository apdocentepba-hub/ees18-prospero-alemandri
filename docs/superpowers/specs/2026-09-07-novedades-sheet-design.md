# Diseño: novedades administrables desde Google Sheets

Fecha: 2026-09-07

## Objetivo

Permitir que la E.E.S. Nº 18 administre las novedades del sitio sin editar HTML ni GitHub. Las publicaciones se cargarán en una única Google Sheet y podrán aparecer en Inicio, Comunicados y/o Vida escolar según columnas de publicación.

El cambio debe conservar la estética actual, no afectar el sistema de reservas/contacto y seguir mostrando contenido útil aunque la fuente dinámica esté temporalmente caída.

## Alternativas consideradas

### 1. Google Sheet + Web App de Apps Script separado — recomendada

Una hoja actúa como fuente editorial y un Web App de Apps Script expone sólo lectura pública en JSON/JSONP. El sitio consume ese endpoint.

Ventajas:
- Martín o personal autorizado puede editar sin tocar código.
- No se mezcla con el backend productivo de reservas.
- Bajo costo y mantenimiento simple con herramientas que la escuela ya usa.
- Permite activar/desactivar, ordenar y publicar por sección.

Costo:
- Requiere una implementación inicial de Apps Script y conservar el Web App desplegado.

### 2. Archivo JSON en GitHub

Las novedades vivirían en un archivo del repositorio.

Ventajas:
- Muy simple técnicamente.
- Sin dependencia de Google Apps Script.

Desventaja decisiva:
- Sigue requiriendo editar GitHub para cada publicación, por lo que no cumple el objetivo principal.

### 3. CMS completo

Usar un sistema de administración dedicado.

Ventajas:
- Panel editorial más avanzado.

Desventajas:
- Complejidad, mantenimiento, autenticación y superficie de falla innecesarios para el tamaño actual del sitio.

Se adopta la alternativa 1.

## Arquitectura

### Fuente editorial

Crear una Google Sheet, preferentemente en la cuenta institucional o en una ubicación compartida controlada por la escuela, con una pestaña `Novedades`.

Columnas propuestas:

| Columna | Uso |
| --- | --- |
| `ID` | Identificador estable y único |
| `Activa` | `Sí/No`; controla si puede publicarse |
| `Fecha` | Fecha visible y criterio principal de orden |
| `Prioridad` | Número opcional para fijar una publicación por encima de otras |
| `Tipo` | Etiqueta editorial: Institucional, Vida escolar, Proyecto, etc. |
| `Título` | Título visible |
| `Bajada` | Resumen corto para tarjetas/carrusel |
| `Cuerpo` | Texto más completo para Comunicados/Vida escolar cuando corresponda |
| `Imagen` | URL de imagen opcional |
| `Botón texto` | Texto del CTA opcional |
| `Botón URL` | Destino del CTA opcional |
| `Inicio` | `Sí/No`; habilita aparición en portada |
| `Comunicados` | `Sí/No`; habilita aparición en Comunicados |
| `Vida escolar` | `Sí/No`; habilita aparición en Vida escolar |
| `Actualizada` | Marca temporal de edición/publicación |

No se usará una columna de secciones con texto libre porque tres columnas booleanas reducen errores editoriales y son más fáciles de validar.

### API pública de sólo lectura

Crear un proyecto separado de Apps Script, por ejemplo `Novedades EES18 - PRODUCCIÓN`.

Responsabilidades:
- Leer la pestaña `Novedades`.
- Normalizar fechas, `Sí/No`, URLs y texto.
- Ignorar filas incompletas o inactivas.
- Devolver sólo campos públicos.
- Ordenar por `Prioridad` y luego por `Fecha` descendente.
- Permitir filtro por sección: `inicio`, `comunicados`, `vida-escolar`.
- Responder JSON y JSONP para compatibilidad segura con el sitio estático.
- No exponer operaciones de escritura desde la web pública.

Este Web App será independiente del backend de Audiovisuales/Contacto para evitar que una publicación editorial pueda degradar reservas.

## Portada: carrusel de novedades

La sección actual `Novedad destacada` se convertirá en `Novedades destacadas`.

Comportamiento:
- Una tarjeta visible por vez.
- Orden inicial: más nueva/prioritaria primero.
- Flechas anterior/siguiente.
- Indicadores de posición.
- Swipe táctil en móvil.
- Sin autoplay; la noticia no cambia sola mientras una persona está leyendo.
- Imagen opcional: si una novedad no tiene imagen, se usa una composición institucional sin imagen en vez de un espacio roto.
- Botón opcional con URL configurable desde la Sheet.
- Accesibilidad con botones reales, etiquetas `aria` y navegación por teclado.

Carga inicial propuesta:
1. Canal oficial de WhatsApp — 7/09/2026.
2. Leer en Comunidad — 4/09/2026.
3. 2.º Encuentro de RE Bonaerense — 2026, con la fecha exacta disponible si se confirma; mientras tanto no se inventará día/mes.

## Comunicados

`comunicados.html` dejará de tener cada comunicado escrito manualmente en el HTML y renderizará las filas activas con `Comunicados = Sí`.

Cada comunicado mostrará como mínimo:
- fecha,
- tipo,
- título,
- bajada/cuerpo,
- CTA si existe.

La noticia del canal oficial de WhatsApp quedará cargada desde la Sheet como contenido inicial.

## Vida escolar

La página conservará sus secciones y estética actuales, pero las actividades que deban administrarse desde la Sheet se renderizarán desde las filas con `Vida escolar = Sí`.

No se elimina contenido histórico no migrado hasta comprobar que su representación dinámica conserva texto e imágenes correctamente.

La migración inicial incluirá:
- Leer en Comunidad 2026.
- 2.º Encuentro de RE Bonaerense 2026.

## Flujo de datos

1. El editor modifica una fila en Google Sheets.
2. El Web App lee y normaliza los datos.
3. El navegador solicita la lista pública correspondiente a la sección.
4. JavaScript valida la respuesta y renderiza las tarjetas.
5. No hay escritura desde el sitio hacia la Sheet.

Los cambios editoriales deben reflejarse sin nuevo deploy del sitio. Se admite una caché corta para evitar lecturas excesivas; objetivo: propagación en pocos minutos, no instantánea al segundo.

## Manejo de errores

El sitio no debe quedar vacío ni romper layout si Google/Apps Script falla.

Reglas:
- Timeout de red acotado.
- Si la API falla o devuelve datos inválidos, mostrar un bloque de respaldo estable con enlace a `comunicados.html`.
- No mostrar HTML recibido desde la Sheet sin sanitización.
- URLs permitidas sólo con `https:` y enlaces internos relativos válidos.
- Filas inválidas se omiten; una fila rota no bloquea el resto.
- La consola puede registrar el fallo para diagnóstico, sin mostrar detalles técnicos al usuario final.

## Seguridad

- La Sheet permanece editable sólo por cuentas autorizadas.
- El Web App es público únicamente para lectura.
- No existe endpoint público para editar, borrar o crear novedades.
- Se escapan todos los textos antes de insertarlos en el DOM.
- No se reutiliza el Web App de reservas.

## Archivos/componentes previstos

Sitio:
- `index.html`: contenedor del carrusel y fallback.
- `comunicados.html`: contenedor dinámico para comunicados.
- `vida-escolar.html`: contenedor dinámico para publicaciones migradas.
- `assets/js/novedades.js`: cliente, validación, render y carrusel.
- `assets/js/novedades-config.js`: URL pública del Web App.
- CSS de actualidad/home: estilos del carrusel y estados de carga/error.

Apps Script nuevo:
- `Code.gs`: endpoint público.
- `Data.gs`: lectura/normalización de la Sheet.
- `Config.gs`: ID de spreadsheet, nombre de hoja y constantes.

## Datos iniciales

Se crearán tres filas iniciales para validar el flujo completo:

### Canal oficial de WhatsApp
- Activa: Sí
- Inicio: Sí
- Comunicados: Sí
- Vida escolar: No
- Fecha: 07/09/2026
- Título: `Canal oficial de WhatsApp`
- Botón: `📢 Seguir el canal de WhatsApp`
- URL: `https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l`

### Leer en Comunidad
- Activa: Sí
- Inicio: Sí
- Comunicados: No
- Vida escolar: Sí
- Fecha: 04/09/2026
- Imagen: material actual ya publicado en el sitio

### 2.º Encuentro de RE Bonaerense
- Activa: Sí
- Inicio: Sí
- Comunicados: No
- Vida escolar: Sí
- Año: 2026
- No se inventará una fecha exacta si no está confirmada.

## Testing

### JavaScript
- Orden por prioridad/fecha.
- Filtrado por sección.
- Omisión de filas inválidas/inactivas.
- Sanitización de texto y URLs.
- Carrusel: siguiente, anterior, límites, indicadores y swipe.
- Fallback ante timeout/respuesta inválida.

### Apps Script
- Normalización de columnas.
- Sólo filas activas.
- Filtro de sección.
- Orden consistente.
- JSONP callback sanitizado.
- No existe acción de escritura pública.

### Integración
- Inicio muestra las tres novedades iniciales en el orden correcto.
- Comunicados incluye Canal oficial de WhatsApp.
- Vida escolar incluye Leer en Comunidad y RE Bonaerense.
- Desactivar una fila en la Sheet la retira del sitio sin deploy.
- Editar título/bajada cambia el sitio sin deploy.
- Caída simulada de API conserva fallback y navegación.

## Criterios de aceptación

1. Una persona autorizada puede publicar u ocultar una novedad modificando sólo la Google Sheet.
2. No hace falta tocar GitHub para cambios editoriales comunes.
3. Inicio muestra un carrusel manual accesible con novedades activas.
4. Comunicados y Vida escolar consumen la misma fuente sin duplicar contenido editorial.
5. El canal oficial de WhatsApp aparece como publicación administrable.
6. Reservas y Contacto no se modifican ni comparten backend con Novedades.
7. Una falla del servicio de novedades no rompe el sitio.
