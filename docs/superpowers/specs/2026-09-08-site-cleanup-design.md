# E.E.S. Nº 18 — limpieza integral, consistencia e identidad local

Fecha: 2026-09-08
Estado: diseño aprobado en conversación; pendiente de plan de implementación
Base: `main` @ `ca1416239accfee43655de51ce63aced30c8e172`

## 1. Objetivo

Hacer una pasada integral de limpieza editorial, UX, SEO e identidad sobre el sitio público de la E.E.S. Nº 18 sin introducir un CMS nuevo ni modificar los backends productivos que ya funcionan.

El resultado debe sentirse terminado y coherente: sin placeholders públicos, sin canales obsoletos, con navegación y footer uniformes, con assets institucionales servidos localmente y con páginas operativas fuera del índice de buscadores.

## 2. Restricciones y no objetivos

No se modifica la lógica productiva de:

- Reservas del Salón de Audiovisuales.
- Cancelación de reservas.
- Formulario de contacto.
- Consulta pública de estado por DNI.
- Solicitud de Analítico Final.
- Backend de Novedades ni el esquema/estructura de su Google Sheet.
- Contador público de visitas de Inicio.

La única escritura prevista sobre la Sheet de Novedades es editorial: reemplazar en la fila de Leer en Comunidad la ruta de las tiras por la ruta de la imagen consolidada, una vez que ese asset ya esté publicado y verificado.

No se crea un sistema de templates, framework, CMS, generador estático ni pipeline de build adicional. El sitio continúa siendo HTML/CSS/JS estático sobre GitHub Pages.

No se inventan datos institucionales, fechas de visitas, teléfonos, autoridades ni imágenes nuevas de la escuela.

## 3. Navegación principal

Todas las páginas públicas con header completo deben usar exactamente el mismo menú principal, en este orden:

1. Inicio
2. Nuestra escuela
3. Propuesta educativa
4. Estudiantes y familias
5. Docentes
6. Vida escolar
7. Ingreso 2027
8. Contacto

Las páginas internas marcan como `aria-current="page"` la sección madre correspondiente:

- Historia → Nuestra escuela.
- Plan de estudios → Propuesta educativa.
- Trámites, Pases, Consulta por DNI, Analítico Final y Boleto → Estudiantes y familias.
- Reservas y Cancelación → Docentes.
- Comunicados → Vida escolar.
- Visitas → Ingreso 2027.

Las páginas de detalle incorporan navegación contextual/breadcrumbs simples cuando ayude a volver a la sección madre, sin duplicar el menú principal.

## 4. Footer uniforme

Todas las páginas con layout institucional completo usan el mismo footer conceptual:

- E.E.S. Nº 18 “Próspero Alemandri”.
- Av. Manuel Belgrano 355 · Avellaneda.
- `secundaria18avellaneda@abc.gob.ar`.
- enlaces consistentes a las áreas principales.
- acceso al canal oficial de WhatsApp.
- año dinámico.

El contador público de visitas de Inicio se conserva. Mantiene el comportamiento actual: si `counterapi.com` responde correctamente se muestra el valor; si el servicio externo falla, el contador se oculta silenciosamente sin afectar la navegación ni el resto de la página.

## 5. Limpieza editorial por página

### Inicio

- Mantener hero, accesos rápidos, Novedades, “Lo más consultado” y contador de visitas.
- Eliminar por completo la sección “Agenda” mientras no existan fechas institucionales reales.
- Mantener WhatsApp como canal institucional visible.
- No mostrar textos de tipo “Próximamente” o “A confirmar” como contenido principal.

### Nuestra escuela

- Reemplazar `Vicedirección · Turno tarde — A confirmar` por `Motyl Nadezhda`.
- Mantener el resto de autoridades y datos institucionales existentes.

### Contacto

- Eliminar la fila `Teléfono — A confirmar`.
- Mantener dirección, CUE, correo, horarios y formulario de contacto.
- No inventar un número telefónico.

### Docentes

- Corregir la descripción del sistema vigente: las reservas son de un único día; no existe modalidad semanal.
- Eliminar completamente el Google Form antiguo de contingencia y todo texto que lo promocione.
- Eliminar la tarjeta pública de Carro Tecnológico hasta que exista una interfaz pública real.
- Mantener el sistema web vigente de Reservas como único canal de reserva publicado.
- Mantener accesos institucionales útiles (ABC, Comunicados, Contacto).

### Trámites

- Mantener Pases/equivalencias, Consulta por DNI, Analítico Final y Boleto Estudiantil.
- Eliminar las tarjetas vacías `Constancias y certificados` e `Formularios escolares` hasta que exista información real.

### Comunicados

- Después del hero, mostrar directamente la lista dinámica de comunicados.
- Eliminar las tres tarjetas explicativas `Fecha visible`, `Mensaje completo` y `Canal institucional`.
- Mantener fallback de servicio y accesos a Vida escolar/Contacto.

### Vida escolar

- Mantener las novedades dinámicas arriba.
- Convertir las publicaciones estáticas existentes en un bloque explícito `Archivo de actividades destacadas` o equivalente.
- Conservar el contenido histórico de Leer en Comunidad y RE Bonaerense sin duplicarlo conceptualmente como si fueran dos fuentes actuales distintas.
- Eliminar las seis tarjetas vacías de categorías con `Nuevas publicaciones próximamente`.
- Mantener acceso a Comunicados.

### Ingreso 2027

No se anuncia una visita que no está confirmada.

La página de Ingreso 2027 se conserva porque sí aporta propuesta educativa y orientación a familias. Sus acciones principales pasan a ser:

1. `Seguir novedades por WhatsApp` → canal oficial.
2. `Contacto institucional`.
3. `Ver plan de estudios`.

Se elimina el protagonismo de `Vení a conocer la E.E.S. Nº 18` mientras no haya una fecha o actividad real confirmada.

`visitas-ees18.html` se mantiene por compatibilidad y enlaces históricos, pero deja de promocionarse activamente. Su texto debe expresar que actualmente no hay una jornada publicada, sin usar un placeholder prometiendo una fecha futura.

## 6. Identidad local y assets

### Logo

El emblema que hoy se carga desde `isfd100-bue.infd.edu.ar` pasa a servirse desde el propio repositorio.

Objetivos:

- conservar la apariencia del emblema actual;
- no redibujarlo ni alterar su identidad;
- eliminar la dependencia de un servidor externo para el header/hero;
- reemplazar todas las referencias remotas por un asset local, por ejemplo `assets/img/logo-ees18.jpg`.

### Favicon y PWA

A partir del emblema local se preparan assets de identidad para navegador y accesos directos:

- favicon;
- icono 192×192;
- icono 512×512.

`site.webmanifest` declara los iconos correspondientes.

### Imagen para compartir

Inicio, Ingreso 2027 y Vida escolar deben declarar `og:image` y `twitter:image` usando una imagen institucional local y estable. No se fabrica una fotografía o escena inexistente; se reutiliza identidad institucional real.

## 7. Normalización de imágenes editoriales

### RE Bonaerense

El archivo `assets/img/re-bonaerense-2024.jpg` se normaliza a un nombre coherente con el contenido publicado en 2026, por ejemplo `assets/img/re-bonaerense-2026.jpg`.

Se actualizan todas las referencias en HTML, seed editorial y tests. No debe quedar una referencia productiva al nombre 2024 para una publicación identificada como 2026.

### Leer en Comunidad

Las diez tiras `leer-en-comunidad-2026-01.jpg` … `10.jpg` se consolidan en una única imagen final preservando exactamente el contenido y orden originales.

Después de la consolidación:

- Inicio/Vida escolar usan una sola imagen.
- el seed editorial usa esa imagen única.
- la Sheet de Novedades se actualiza para apuntar a esa imagen única.
- se elimina del renderer la lógica especial de recomposición de 10 tiras.
- los assets segmentados pueden eliminarse una vez que no tengan consumidores.

El cambio no altera texto, colores ni contenido del afiche.

## 8. Indexación y SEO

### `noindex,follow`

Las siguientes páginas siguen funcionando, pero no deben competir como resultados de búsqueda:

- `cancelar-reserva.html`.
- `enspa-en-accion.html`.
- `visitas-enspa.html`.
- `solicitar-analitico.html`.
- `visitas-ees18.html` mientras sea una página auxiliar sin actividad confirmada.

Se usa `<meta name="robots" content="noindex,follow">`.

### Sitemap

`sitemap.xml` contiene sólo páginas públicas que se desea indexar. Se eliminan páginas operativas, puentes y auxiliares `noindex`.

`robots.txt` mantiene acceso general y referencia al sitemap.

### Metadata social

Se mantiene metadata canonical y se completa `og:image`/Twitter image en las páginas principales definidas en la sección de identidad.

## 9. Cache y dependencias

Cuando un CSS o JS compartido cambie de forma visible, las páginas que lo consumen deben usar un identificador/versionado coherente para evitar que navegadores o CDN combinen HTML nuevo con assets viejos.

Se eliminan dependencias sin consumidores derivadas de esta limpieza, especialmente la lógica temporal de recomposición del afiche cuando quede reemplazada por una imagen consolidada. El contador de visitas y sus assets se conservan.

## 10. Reglas editoriales resultantes

- No publicar placeholders del tipo `A confirmar`, `Próximamente` o `Información en preparación` como tarjetas/filas permanentes.
- Si un dato institucional no existe, se omite hasta que sea confirmado.
- Si una actividad futura no está confirmada, no se anuncia como si fuera inminente.
- Un único canal vigente por función cuando existe uno definitivo (ej.: Reservas).
- Novedades dinámicas son la fuente actual; contenido estático de Vida escolar se presenta como archivo/memoria.

## 11. Estrategia de implementación

Se implementará en una rama aislada desde `main` y mediante TDD/regresión estructural:

1. tests RED de contenido obsoleto y contratos de consistencia;
2. limpieza de contenido y navegación;
3. identidad local y normalización de assets;
4. SEO/noindex/sitemap;
5. actualización editorial de una única ruta de imagen en la Sheet de Novedades para el afiche consolidado;
6. suite completa y probes productivos existentes;
7. revisión final del diff;
8. PR y merge sólo con evidencia GREEN.

No se realizan escrituras en los backends de Reservas, Contacto, Estado, Analítico Final ni Novedades.

## 12. Criterios de aceptación

La entrega se considera terminada sólo si se verifica todo lo siguiente:

1. No aparece `A confirmar`, `Próximamente` ni `Información en preparación` como contenido visible de las páginas públicas de uso normal.
2. `Motyl Nadezhda` figura como Vicedirectora de Turno Tarde.
3. Contacto no muestra un teléfono inexistente.
4. Docentes no menciona reservas semanales ni contiene el Google Form viejo ni la tarjeta pública de Carro Tecnológico.
5. Inicio no contiene la sección Agenda y conserva el contador público de visitas con su fallback silencioso actual.
6. Vida escolar diferencia novedades actuales de archivo y no tiene seis categorías vacías.
7. Comunicados muestra la lista real sin tres tarjetas introductorias innecesarias.
8. Todas las páginas con header institucional comparten el mismo menú principal.
9. Todas las páginas con footer institucional comparten el mismo conjunto de datos y accesos.
10. Trámites no muestra funciones inexistentes.
11. Ingreso 2027 prioriza WhatsApp, Contacto y Plan de estudios; no promociona visitas sin actividad confirmada.
12. Ninguna página institucional depende del dominio del ISFD 100 para mostrar el logo.
13. Manifest/favicon/iconos están configurados con assets locales.
14. Inicio, Ingreso 2027 y Vida escolar tienen imagen social local.
15. RE Bonaerense usa un nombre de asset coherente con 2026.
16. Leer en Comunidad usa una sola imagen final y la Sheet apunta a ella.
17. Páginas operativas/puente/auxiliares definidas llevan `noindex,follow` y no están en sitemap.
18. La suite automatizada completa pasa.
19. Los probes productivos de Reservas y Novedades continúan pasando sin cambios funcionales.
20. GitHub Pages publica exitosamente el merge final.

## 13. Rollback

La limpieza se entrega mediante PR único y commits lógicos. Si una parte visual produce una regresión, puede revertirse el PR sin afectar los backends productivos. La Sheet sólo se modifica para reemplazar la ruta de imagen de Leer en Comunidad una vez que la imagen única ya esté publicada y verificada.