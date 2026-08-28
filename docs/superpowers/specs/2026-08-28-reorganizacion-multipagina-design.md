# Reorganización multipágina de la web institucional

Fecha: 28/08/2026

## Objetivo

Transformar la web actual de la E.E.S. Nº 18 “Próspero Alemandri” desde una portada extensa con muchas secciones ancladas (`#institucion`, `#orientaciones`, `#tramites`, etc.) hacia una arquitectura multipágina clara, manteniendo el diseño visual actual, la identidad institucional y la navegación dentro de la misma pestaña del navegador.

## Principios de diseño

- Mantener colores, tipografías, jerarquía visual y estilo general actuales.
- Usar **E.E.S. Nº 18 “Próspero Alemandri”** como denominación principal.
- Reservar **ENSPA / El Normal** para contexto histórico.
- La portada debe funcionar como resumen y distribuidor de accesos, no como documento largo.
- Toda navegación interna debe usar la misma pestaña; no se utilizará `target="_blank"` en enlaces internos ni en enlaces externos institucionales salvo una excepción futura expresamente justificada.
- Conservar URLs antiguas relevantes mediante redirecciones para no romper enlaces compartidos.
- Priorizar accesibilidad, navegación móvil y enlaces claros.

## Arquitectura de navegación

El encabezado principal será compartido por todas las páginas y tendrá estas pestañas:

1. **Inicio** → `index.html`
2. **Nuestra escuela** → `nuestra-escuela.html`
3. **Propuesta educativa** → `propuesta-educativa.html`
4. **Trámites** → `tramites.html`
5. **Vida escolar** → `vida-escolar.html`
6. **Ingreso 2027** → `ingreso-2027.html`
7. **Contacto** → `contacto.html`

La pestaña correspondiente a la página actual deberá mostrar un estado visual activo.

## Portada (`index.html`)

La portada se simplificará y conservará sólo información de alto valor:

- Hero institucional con nombre actual de la escuela.
- Cuatro accesos rápidos principales.
- **Novedad destacada** de Vida escolar con imagen, título, resumen y botón “Ver actividad”.
- Próxima fecha o aviso institucional breve.
- Resumen de Ingreso 2027.
- Acceso a trámites frecuentes.
- Pie de página institucional.

Se retirarán de la portada los bloques extensos de autoridades, orientaciones completas, comunidad, trámites completos y contacto detallado. Esos contenidos migrarán a sus páginas específicas.

## Nuestra escuela (`nuestra-escuela.html`)

Reunirá:

- Presentación institucional.
- Denominación oficial y CUE.
- Autoridades.
- Espacios y servicios de la escuela.
- Dirección y datos básicos.
- Tarjeta destacada de **Nuestra historia** que enlaza a `historia.html`.

`historia.html` se mantiene como página propia y utiliza el mismo encabezado común.

## Propuesta educativa (`propuesta-educativa.html`)

Reunirá:

- Explicación del Ciclo Básico.
- Presentación de las cuatro orientaciones.
- Breve descripción de cada orientación.
- Acceso claro a `plan-estudios.html` para ver materias año por año.

`plan-estudios.html` se mantiene como página de detalle y adopta el encabezado común.

## Trámites (`tramites.html`)

Funcionará como centro de Secretaría y mostrará tarjetas de acceso a:

- Pases y equivalencias.
- Solicitud de pase / analítico parcial.
- Consulta de estado del trámite.
- Títulos y analíticos finales.
- Boleto estudiantil.
- Constancias y certificados (cuando estén disponibles).
- Documentación escolar futura.

Las páginas existentes (`pases-equivalencias.html`, `consultar-estado.html`, `certificado-analitico.html`, `boleto-estudiantil.html`) se conservarán como páginas de detalle y usarán la misma navegación común.

## Vida escolar (`vida-escolar.html`)

Pasará a ser una pestaña principal y visible desde toda la web.

### Primera publicación

**2.º Encuentro de RE Bonaerense**

- Se utilizará la imagen original correcta proporcionada por la escuela.
- El archivo defectuoso actual `assets/img/re-bonaerense-2024.jpg` será reemplazado por una versión válida derivada del original de 900 × 1350 px.
- La publicación tendrá título, fecha/contexto, imagen, texto institucional y categoría.
- La portada mostrará una tarjeta resumida de esta publicación con miniatura y enlace a Vida escolar.

### Futuras publicaciones

La página debe admitir nuevas actividades en orden cronológico mediante tarjetas consistentes, sin necesidad de rediseñar la estructura cada vez.

## Contacto (`contacto.html`)

Reunirá:

- Dirección institucional.
- Correo oficial.
- Horarios de Secretaría.
- CUE.
- Accesos a canales oficiales que se confirmen.
- Referencia al Mapa Educativo Nacional.

## Navegación y misma pestaña

- Todos los enlaces internos serán relativos y abrirán en la misma pestaña.
- Se eliminarán los `target="_blank"` existentes en páginas como Historia.
- Los enlaces externos oficiales también se abrirán en la misma pestaña según la preferencia definida para este proyecto.
- Cada subpágina tendrá un enlace claro a Inicio y conservará el menú principal completo.

## Compatibilidad de URLs antiguas

Se mantendrán páginas de redirección para:

- `enspa-en-accion.html` → `vida-escolar.html`
- `visitas-enspa.html` → la página vigente correspondiente a visitas / ingreso.

Si durante la auditoría aparecen otras URLs antiguas ya compartidas, se conservarán mediante redirecciones equivalentes.

## Componente común de encabezado

Como el sitio es estático y no usa un motor de plantillas, se mantendrá el encabezado sincronizado en las páginas HTML. Las pruebas automáticas verificarán que todas las páginas públicas principales tengan:

- nombre institucional correcto;
- menú principal;
- misma lista de pestañas;
- enlace activo correspondiente;
- ausencia de enlaces internos con `target="_blank"`.

No se introduce un framework ni JavaScript de renderizado de plantillas para evitar complejidad innecesaria.

## Imagen de RE Bonaerense

El archivo actual del repositorio tiene un tamaño anormalmente pequeño y no corresponde adecuadamente con la imagen original. La implementación reemplazará ese recurso por una copia válida del archivo fuente proporcionado en la conversación.

La imagen se optimizará para web conservando proporción y legibilidad. Se validará que:

- sea un JPEG/PNG real y decodificable;
- cargue desde GitHub Pages;
- mantenga texto legible;
- no se deforme por CSS;
- tenga `alt` descriptivo.

## SEO y metadatos

- Mantener canonical actuales de GitHub Pages hasta que `ees18avellaneda.edu.ar` esté efectivamente delegado y configurado.
- Actualizar sitemap con las nuevas páginas.
- Mantener `ENSPA` como `alternateName` únicamente en datos estructurados/historia para búsquedas históricas.
- Actualizar títulos y descripciones de las nuevas páginas.

## Manejo de errores

- No se eliminará ninguna URL existente sin una redirección o sustituto claro.
- La página 404 conservará navegación completa y accesos útiles.
- Recursos de imagen faltantes deberán detectarse mediante pruebas estructurales.
- Si una sección aún no tiene contenido confirmado, se mostrará como “Próximamente” sólo dentro de su página correspondiente y no ocupará espacio destacado en la portada.

## Pruebas

Antes de integrar a `main` se ejecutará la suite de GitHub Actions y se ampliará para comprobar:

1. existencia de las nuevas páginas;
2. navegación principal consistente;
3. ausencia de `target="_blank"` en páginas públicas;
4. enlaces internos a archivos existentes;
5. presencia visible de Vida escolar en la portada y menú;
6. presencia de la actividad RE Bonaerense en portada y `vida-escolar.html`;
7. existencia y tamaño mínimo razonable de la imagen de RE Bonaerense;
8. redirecciones de URLs antiguas;
9. sintaxis JavaScript válida;
10. estructura HTML básica de páginas principales.

La implementación se hará en una rama separada, se abrirá un PR y sólo se integrará a `main` si toda la suite pasa.

## Fuera de alcance de esta reorganización

- Activar el dominio `ees18avellaneda.edu.ar` antes de que RIU complete la delegación.
- Conectar todavía la consulta pública de estado con Apps Script.
- Crear un CMS o panel administrativo de noticias.
- Modificar la identidad visual aprobada.

## Resultado esperado

La web deja de sentirse como una única página extensa y pasa a comportarse como un sitio institucional organizado: una portada breve, pestañas claras y páginas específicas, con Vida escolar visible, navegación consistente y la imagen de RE Bonaerense funcionando correctamente.