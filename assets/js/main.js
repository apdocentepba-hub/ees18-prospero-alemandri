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

const analyticCard = [...document.querySelectorAll('.procedure-card')]
  .find((card) => card.querySelector('h3')?.textContent.trim() === 'Títulos y analíticos');

if (analyticCard) {
  const status = analyticCard.querySelector('.status-pill');
  if (status) {
    const link = document.createElement('a');
    link.className = 'status-pill';
    link.href = 'certificado-analitico.html';
    link.textContent = 'Ver requisitos →';
    status.replaceWith(link);
  }
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
