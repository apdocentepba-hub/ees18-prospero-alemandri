(() => {
  'use strict';

  const form = document.getElementById('contact-form');
  const result = document.getElementById('contact-result');
  const submit = document.getElementById('contact-submit');
  const apiUrl = String(window.EES18_RESERVAS_API_URL || '').trim();

  if (!form || !result || !submit) return;

  let requestCounter = 0;

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function setResult(message, state) {
    result.hidden = false;
    result.dataset.state = state || 'info';
    result.textContent = message;
  }

  function cleanupJsonp(script, callbackName, timer) {
    if (timer) window.clearTimeout(timer);
    if (script && script.parentNode) script.parentNode.removeChild(script);
    try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
  }

  function requestJsonp(action, params) {
    return new Promise((resolve, reject) => {
      if (!apiUrl) {
        reject(new Error('SERVICE_NOT_CONFIGURED'));
        return;
      }

      requestCounter += 1;
      const callbackName = `ees18ContactCallback_${Date.now()}_${requestCounter}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({ action, callback: callbackName });
      Object.entries(params || {}).forEach(([key, value]) => query.set(key, String(value)));
      let timer = null;

      window[callbackName] = (payload) => {
        cleanupJsonp(script, callbackName, timer);
        resolve(payload || {});
      };

      script.src = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${query.toString()}`;
      script.async = true;
      script.onerror = () => {
        cleanupJsonp(script, callbackName, timer);
        reject(new Error('NETWORK_ERROR'));
      };
      timer = window.setTimeout(() => {
        cleanupJsonp(script, callbackName, timer);
        reject(new Error('TIMEOUT'));
      }, 20000);
      document.head.appendChild(script);
    });
  }

  function friendlyError(code) {
    if (code === 'CONTACT_INVALID_EMAIL') return 'Ingresá un correo electrónico válido.';
    if (code === 'CONTACT_INVALID_SUBJECT') return 'Completá un asunto válido.';
    if (code === 'CONTACT_INVALID_MESSAGE') return 'Completá el mensaje.';
    if (code === 'CONTACT_RATE_LIMITED') return 'Esperá un minuto antes de enviar otro mensaje con el mismo correo.';
    if (code === 'CONTACT_SPAM_REJECTED') return 'No se pudo enviar el mensaje.';
    return 'No se pudo enviar el mensaje. Probá nuevamente.';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const payload = {
      email: String(data.get('email') || '').trim(),
      subject: String(data.get('subject') || '').trim(),
      message: String(data.get('message') || '').trim(),
      website: String(data.get('website') || '').trim()
    };

    if (!isValidEmail(payload.email)) {
      setResult('Ingresá un correo electrónico válido.', 'error');
      return;
    }
    if (!payload.subject || !payload.message) {
      setResult('Completá el asunto y el mensaje.', 'error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Enviando…';
    setResult('Enviando mensaje…', 'info');

    try {
      const response = await requestJsonp('contact', { payload: JSON.stringify(payload) });
      if (!response.ok) {
        setResult(friendlyError(response.code), 'error');
        return;
      }

      form.reset();
      setResult('Mensaje enviado correctamente a la E.E.S. Nº 18.', 'success');
    } catch (_) {
      setResult('No se pudo enviar el mensaje. Probá nuevamente.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Enviar mensaje';
    }
  });
})();
