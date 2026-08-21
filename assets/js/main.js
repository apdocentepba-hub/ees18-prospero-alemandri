const menuToggle = document.getElementById('menu-toggle');
const primaryNav = document.getElementById('primary-nav');

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

const orientationsSection = document.getElementById('orientaciones');
const orientationGrid = orientationsSection?.querySelector('.orientation-grid');

if (orientationsSection && orientationGrid) {
  const planCta = document.createElement('div');
  planCta.className = 'study-plan-cta reveal';
  planCta.innerHTML = '<div><strong>Plan de estudios año por año</strong><div>Ciclo Básico común y, próximamente, materias de 4º a 6º por orientación.</div></div><a href="plan-estudios.html">Ver plan de estudios →</a>';
  orientationGrid.insertAdjacentElement('afterend', planCta);

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = 'assets/css/plan-estudios.css';
  document.head.appendChild(styleLink);
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
