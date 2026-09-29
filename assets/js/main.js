const ENSPA_LOGO_SRC = 'https://isfd100-bue.infd.edu.ar/sitio/wp-content/uploads/2020/10/celeste_cristina.jpg';

document.querySelectorAll('.enspa-logo').forEach((logo) => {
  if (logo.getAttribute('src') !== ENSPA_LOGO_SRC) logo.src = ENSPA_LOGO_SRC;
});

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

const normalizeProgramName = (value) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/^\d+\.\s*/, '')
  .trim();

/* Biblioteca de programas: altas y correcciones curriculares del 29/09/2026. */
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('programs-root')) return;

  const programUpdates = {
    'com-6|ingles': '1KqcBHfZ0suDfaoIC2SRGSWgQT18IOzqU',
    'soc-6|ingles': '1X64o8VlnRZASxnFSk8bIPF-KolVDaAZn',
    'len-6|ingles': '10_H4fjWK_hONkUMng-t5mfWwAsCbfKbn',
    'nat-6|ingles': '1xgxk0eiZcOkf641fAjW3os_dRi3KwhdC',
    'len-6|estudios interculturales en ingles ii': '18f9ePkS7Sdj-X9CsU55sPePuaVpGDLuD'
  };

  document.querySelectorAll('.program-card').forEach((card) => {
    const title = card.querySelector('h5');
    if (!title) return;
    const key = `${card.dataset.filter}|${normalizeProgramName(title.textContent)}`;
    const id = programUpdates[key];
    if (!id) return;

    card.classList.remove('program-card--missing');
    let state = card.querySelector('.program-state, .program-state--ok');
    if (!state) {
      state = document.createElement('span');
      title.insertAdjacentElement('afterend', state);
    }
    state.className = 'program-state--ok';
    state.textContent = 'Programa disponible';

    let link = card.querySelector('a');
    if (!link) {
      link = document.createElement('a');
      card.appendChild(link);
    }
    link.href = `https://drive.google.com/file/d/${id}/view?usp=sharing`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Ver programa →';
  });

  /* El plan oficial incluye Geografía en 5.º de Lenguas Extranjeras. */
  const lenguas5 = document.querySelector('.year-block[data-filter="len-5"]');
  if (lenguas5) {
    const grid = lenguas5.querySelector('.program-grid');
    const cards = [...lenguas5.querySelectorAll('.program-card')];
    const hasGeografia = cards.some((card) => normalizeProgramName(card.querySelector('h5')?.textContent) === 'geografia');

    if (grid && !hasGeografia) {
      const card = document.createElement('article');
      card.className = 'program-card program-card--missing';
      card.dataset.name = 'geografia';
      card.dataset.filter = 'len-5';
      card.innerHTML = '<small>Lenguas Extranjeras · 5.º</small><h5>8. Geografía</h5><span class="program-state">Programa todavía no disponible</span>';

      const interculturales = [...grid.querySelectorAll('.program-card')].find((item) =>
        normalizeProgramName(item.querySelector('h5')?.textContent).startsWith('estudios interculturales en ingles')
      );
      if (interculturales) interculturales.before(card);
      else grid.appendChild(card);
    }

    [...lenguas5.querySelectorAll('.program-card')].forEach((card, index) => {
      const title = card.querySelector('h5');
      if (!title) return;
      title.textContent = `${index + 1}. ${title.textContent.replace(/^\d+\.\s*/, '')}`;
    });
  }

  document.querySelectorAll('.year-block').forEach((year) => {
    const cards = [...year.querySelectorAll('.program-card')];
    const available = cards.filter((card) => card.querySelector('.program-state--ok')).length;
    const badge = year.querySelector('.year-count');
    if (badge) badge.textContent = `${available} de ${cards.length} disponibles`;
  });

  const totalPill = document.getElementById('count-visible');
  const availablePill = document.querySelector('.summary-pill--ok');
  const missingPill = document.querySelector('.summary-pill--missing');
  if (totalPill) totalPill.textContent = '159 espacios curriculares';
  if (availablePill) availablePill.textContent = '143 programas disponibles';
  if (missingPill) missingPill.textContent = '16 pendientes';
});

/* Plan de estudios: completar 5.º Lenguas y distinguir Interculturales I/II. */
document.addEventListener('DOMContentLoaded', () => {
  const lenguas = document.querySelector('#lenguas .orientation-years');
  if (!lenguas) return;

  const years = [...lenguas.querySelectorAll('.oriented-year')];
  const year5 = years.find((year) => year.querySelector('h3')?.textContent.trim().startsWith('5'));
  const year6 = years.find((year) => year.querySelector('h3')?.textContent.trim().startsWith('6'));

  if (year5) {
    const list = year5.querySelector('.subject-list');
    const items = [...year5.querySelectorAll('li')];
    if (list && !items.some((li) => li.textContent.trim() === 'Geografía')) {
      const geografia = document.createElement('li');
      geografia.textContent = 'Geografía';
      const historia = items.find((li) => li.textContent.trim() === 'Historia');
      if (historia) historia.insertAdjacentElement('afterend', geografia);
      else list.appendChild(geografia);
    }
    [...year5.querySelectorAll('li')].forEach((li) => {
      if (li.textContent.trim() === 'Estudios Interculturales en Inglés') {
        li.textContent = 'Estudios Interculturales en Inglés I';
      }
    });
  }

  if (year6) {
    [...year6.querySelectorAll('li')].forEach((li) => {
      if (li.textContent.trim() === 'Estudios Interculturales en Inglés') {
        li.textContent = 'Estudios Interculturales en Inglés II';
      }
    });
  }
});
