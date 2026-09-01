(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.EES18ReservasEmailPolicy = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isInstitutionalEmail(email) {
    return /^[^\s@]+@abc\.gob\.ar$/.test(normalizeEmail(email));
  }

  function validateInstitutionalEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return { ok: false, code: 'INVALID_EMAIL' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, code: 'INVALID_EMAIL' };
    }
    if (!isInstitutionalEmail(normalized)) {
      return { ok: false, code: 'INSTITUTIONAL_EMAIL_REQUIRED' };
    }
    return { ok: true, email: normalized };
  }

  return Object.freeze({
    isInstitutionalEmail,
    validateInstitutionalEmail
  });
});

(function initInstitutionalEmailGuard() {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const policy = window.EES18ReservasEmailPolicy;
  const form = document.getElementById('booking-form');
  const emailInput = document.getElementById('teacher-email');
  const emailKind = document.getElementById('email-kind');
  const bookingResult = document.getElementById('booking-result');
  if (!policy || !form || !emailInput || !emailKind || !bookingResult) return;

  const defaultHelp = 'Solo se admiten correos institucionales @abc.gob.ar.';

  function renderEmailState() {
    const value = emailInput.value.trim();
    if (!value) {
      emailInput.removeAttribute('aria-invalid');
      emailKind.textContent = defaultHelp;
      return;
    }

    const validation = policy.validateInstitutionalEmail(value);
    if (validation.ok) {
      emailInput.removeAttribute('aria-invalid');
      emailKind.textContent = 'Correo institucional válido';
      return;
    }

    emailInput.setAttribute('aria-invalid', 'true');
    emailKind.textContent = validation.code === 'INSTITUTIONAL_EMAIL_REQUIRED'
      ? 'Para reservar usá tu correo @abc.gob.ar'
      : 'Revisá el formato del correo institucional';
  }

  emailInput.addEventListener('input', renderEmailState);

  form.addEventListener('submit', function (event) {
    const validation = policy.validateInstitutionalEmail(emailInput.value);
    if (validation.ok) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    renderEmailState();
    bookingResult.hidden = false;
    bookingResult.dataset.state = 'error';
    bookingResult.innerHTML = validation.code === 'INSTITUTIONAL_EMAIL_REQUIRED'
      ? '<strong>Necesitás un correo institucional.</strong><span>Las reservas están habilitadas únicamente para cuentas @abc.gob.ar.</span>'
      : '<strong>Revisá el correo.</strong><span>Ingresá una cuenta institucional válida terminada en @abc.gob.ar.</span>';
    emailInput.focus();
  }, true);

  renderEmailState();
})();
