# Diseño de la web institucional — E.E.S. Nº 18 “Próspero Alemandri”

Fecha: 21 de agosto de 2026

## Objetivo

Crear el sitio web institucional de la **ESCUELA DE EDUCACIÓN SECUNDARIA Nº 18 “PRÓSPERO ALEMANDRI”** de Avellaneda, preservando visualmente la identidad histórica asociada a ENSPA, pero utilizando como denominación principal y oficial el nuevo nombre de la escuela secundaria.

El sitio debe comunicar seriedad, pertenencia, trayectoria educativa pública y facilidad de acceso a información para estudiantes, familias, docentes y comunidad.

## Enfoque tecnológico

Sitio estático, liviano y responsive basado en HTML5, CSS3 y JavaScript sin frameworks. Esta arquitectura prioriza mantenimiento sencillo, carga rápida y compatibilidad con publicación mediante GitHub Pages u otro hosting estático.

## Identidad visual

La referencia estética será la identidad histórica de ENSPA observada en su imaginería institucional y fachada.

### Paleta propuesta

- Celeste institucional principal: `#55AEEB`
- Azul institucional oscuro: `#123F5A`
- Azul intermedio: `#2778B8`
- Blanco: `#FFFFFF`
- Fondo gris muy claro: `#F5F7F9`
- Texto principal: `#1F2933`
- Texto secundario: `#52606D`

La paleta es una interpretación web inspirada en los tonos celeste/azul asociados visualmente al ENSPA; no se presenta como manual de marca oficial.

### Estilo

- Diseño formal e institucional.
- Predominio de blancos y celestes.
- Tipografía sans-serif clara y de alta legibilidad.
- Bordes discretos y sombras mínimas.
- Uso moderado de iconografía.
- Fotografías reales de la institución cuando estén disponibles y autorizadas.
- Sin animaciones llamativas ni estética comercial.
- Buen contraste y accesibilidad.

## Marca y denominación

La cabecera principal mostrará:

**ESCUELA DE EDUCACIÓN SECUNDARIA Nº 18**

**“PRÓSPERO ALEMANDRI”**

La referencia a ENSPA aparecerá como elemento secundario de continuidad histórica, por ejemplo: “Comunidad educativa con tradición ENSPA”, evitando presentar ENSPA como la denominación oficial actual de la secundaria.

## Arquitectura de información

### 1. Inicio

- Encabezado institucional.
- Hero con fotografía institucional o composición sobria.
- Nombre completo de la escuela.
- Mensaje breve de bienvenida.
- Accesos rápidos a novedades, calendario, documentación y contacto.
- Próximas fechas importantes.
- Últimas novedades.
- Presentación breve de las orientaciones.

### 2. Institución

- Quiénes somos.
- Historia y vínculo con ENSPA.
- Proyecto institucional.
- Equipo de conducción.
- Espacios institucionales.
- Información de la sede.

### 3. Propuesta educativa

Secciones para las orientaciones informadas actualmente:

- Comunicación.
- Ciencias Sociales.
- Lenguas Extranjeras.
- Ciencias Naturales.

También se podrá destacar el acompañamiento de trayectorias y los proyectos integradores con continuidad de estudios y mundo del trabajo.

### 4. Comunidad educativa

- Estudiantes.
- Familias.
- Docentes.
- Equipo de Orientación Escolar.
- Centro de Estudiantes.
- Biblioteca.
- Laboratorio.
- Área de audiovisuales.

### 5. Novedades

Sistema visual de publicaciones institucionales con fecha, categoría, título, resumen e imagen opcional.

La primera versión será estática y preparada para convertir las novedades en datos JSON o integrar más adelante un sistema de administración sin rediseñar el sitio.

### 6. Calendario

- Próximas fechas importantes.
- Mesas, jornadas, actos, inscripciones y comunicados relevantes.
- Visualización prioritaria de eventos próximos.
- Eventos vencidos ocultos automáticamente en una fase posterior.

### 7. Documentación y enlaces útiles

- Formularios.
- Comunicados.
- Régimen académico.
- Documentación de estudiantes.
- Enlaces oficiales de Provincia de Buenos Aires.
- Material institucional descargable.

### 8. Contacto

- Dirección institucional.
- Teléfono, correo y horarios cuando sean confirmados.
- Mapa de ubicación.
- Redes sociales oficiales cuando sean confirmadas.

## Navegación

Menú principal de escritorio:

`Inicio | Institución | Propuesta educativa | Comunidad | Novedades | Calendario | Documentación | Contacto`

En teléfonos se convertirá en menú desplegable accesible.

## Página inicial: composición

1. Franja institucional superior.
2. Cabecera con identidad visual y menú.
3. Hero institucional.
4. Accesos rápidos.
5. Novedades destacadas.
6. Próximas fechas.
7. Orientaciones.
8. Sección “Nuestra escuela”.
9. Recursos para la comunidad.
10. Contacto y ubicación.
11. Pie institucional.

## Componentes reutilizables

- Header / navegación.
- Footer.
- Tarjeta de novedad.
- Tarjeta de evento.
- Acceso rápido.
- Tarjeta de orientación.
- Botón institucional.
- Título de sección.
- Aviso institucional destacado.

## Estructura de archivos prevista

```text
/
├── index.html
├── institucion.html
├── propuesta-educativa.html
├── comunidad.html
├── novedades.html
├── calendario.html
├── documentacion.html
├── contacto.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   ├── img/
│   │   ├── institucional/
│   │   ├── novedades/
│   │   └── logos/
│   └── docs/
└── README.md
```

## Datos y contenidos

No se inventarán teléfonos, correos, autoridades, redes sociales ni datos administrativos. Los campos no confirmados se dejarán preparados para completar después.

Como datos de contexto verificados para estructurar el sitio se contemplan las orientaciones Comunicación, Ciencias Sociales, Lenguas Extranjeras y Ciencias Naturales, y espacios como biblioteca, laboratorio, audiovisuales, Equipo de Orientación Escolar y Centro de Estudiantes.

## Responsive y accesibilidad

- Diseño mobile-first.
- Navegación por teclado.
- Estados `focus` visibles.
- Textos alternativos en imágenes.
- Contraste suficiente.
- HTML semántico.
- Tamaños táctiles adecuados.
- Respeto de preferencias de movimiento reducido.

## Rendimiento

- Sin frameworks pesados.
- Imágenes optimizadas.
- JavaScript mínimo.
- CSS organizado por componentes.
- Fuentes del sistema o carga web optimizada.

## Evolución futura

La arquitectura permitirá incorporar posteriormente:

- Administración de novedades.
- Calendario automático.
- Formularios institucionales.
- Galería multimedia.
- Integración con redes oficiales.
- Buscador.
- Panel de gestión protegido.

Estas funciones no forman parte de la primera implementación salvo pedido expreso.

## Criterios de aceptación de la primera versión

- Nombre oficial nuevo visible y jerarquizado.
- Identidad visual claramente vinculada al legado ENSPA mediante celeste, azul y blanco.
- Apariencia formal e institucional.
- Navegación completa y responsive.
- Página inicial funcional.
- Secciones principales preparadas.
- Sin datos institucionales inventados.
- Código simple de mantener.
