const menuToggle = document.getElementById('menu-toggle');
const primaryNav = document.getElementById('primary-nav');

const ingresoStylesheet = document.querySelector('link[href="assets/css/ingreso-2027.css"]');
if (!ingresoStylesheet) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'assets/css/ingreso-2027.css';
  document.head.appendChild(stylesheet);
}

if (primaryNav && !primaryNav.querySelector('a[href="ingreso-2027.html"]')) {
  const ingresoNavLink = document.createElement('a');
  ingresoNavLink.href = 'ingreso-2027.html';
  ingresoNavLink.textContent = 'Ingreso 2027';
  const contactLink = primaryNav.querySelector('a[href="#contacto"]');
  primaryNav.insertBefore(ingresoNavLink, contactLink || null);
}

const serviceStrip = document.querySelector('.service-strip');
if (serviceStrip && !document.getElementById('ingreso-2027-campaign')) {
  serviceStrip.insertAdjacentHTML('afterend', `
    <section class="ingreso-campaign" id="ingreso-2027-campaign" aria-labelledby="ingreso-2027-title">
      <div class="container ingreso-campaign__grid">
        <div class="reveal">
          <span class="ingreso-campaign__eyebrow">Ingreso 2027 · E.E.S. Nº 18</span>
          <h2 id="ingreso-2027-title">Elegí ENSPA.<br><span>Conocé tu próxima secundaria.</span></h2>
          <p class="ingreso-campaign__lead">Una escuela pública con más de 100 años de historia en Avellaneda, Ciclo Básico común y cuatro orientaciones para construir tu recorrido.</p>
          <div class="ingreso-campaign__actions">
            <a class="ingreso-campaign__button ingreso-campaign__button--primary" href="ingreso-2027.html">Conocer Ingreso 2027</a>
            <a class="ingreso-campaign__button" href="visitas-enspa.html">Vení a conocer ENSPA</a>
          </div>
        </div>
        <ul class="ingreso-campaign__facts reveal" aria-label="Características de la propuesta ENSPA">
          <li><strong>4 orientaciones</strong><span>Comunicación · Sociales · Lenguas · Naturales</span></li>
          <li><strong>Ciclo Básico común</strong><span>1º, 2º y 3º año</span></li>
          <li><strong>Comunidad ENSPA</strong><span>Biblioteca · EOE · Audiovisuales · Centro de Estudiantes</span></li>
          <li><strong>Turnos mañana y tarde</strong><span>Una propuesta secundaria en Avellaneda</span></li>
        </ul>
      </div>
    </section>
  `);
}

if (menuToggle && primaryNav) {
  const setMenu = (open) => {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    primaryNav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  };

  menuToggle.addEventListener('click', () => {
    setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
}

const yearNode = document.getElementById('current-year');
if (yearNode) yearNode.textContent = String(new Date().getFullYear());

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealNodes = document.querySelectorAll('.reveal');

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealNodes.forEach((node) => node.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

  revealNodes.forEach((node) => observer.observe(node));
}
