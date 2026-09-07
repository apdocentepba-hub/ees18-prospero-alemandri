(() => {
  'use strict';

  const counterRoot = document.querySelector('[data-visitor-counter]');
  const counterValue = document.getElementById('visitor-count');
  if (!counterRoot || !counterValue || typeof fetch !== 'function') return;

  const endpoint = 'https://counterapi.com/api/ees18avellaneda.edu.ar/view/home-visits-from-2026-09-07-v1';
  const storageKey = 'ees18avellaneda:visitor-counted:2026-09-07-v1';

  let countedThisSession = false;
  try {
    countedThisSession = sessionStorage.getItem(storageKey) === '1';
  } catch (_) {
    countedThisSession = false;
  }

  const requestUrl = countedThisSession ? `${endpoint}?readOnly=true` : endpoint;

  fetch(requestUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Visitor counter HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const value = Number(payload && payload.value);
      if (!Number.isFinite(value) || value < 0) throw new Error('Invalid visitor counter value');

      counterValue.textContent = new Intl.NumberFormat('es-AR').format(Math.trunc(value));
      counterRoot.hidden = false;

      if (!countedThisSession) {
        try {
          sessionStorage.setItem(storageKey, '1');
        } catch (_) {
          // El contador sigue funcionando aunque el navegador bloquee sessionStorage.
        }
      }
    })
    .catch(() => {
      counterRoot.hidden = true;
    });
})();
