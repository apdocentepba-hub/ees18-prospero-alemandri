(() => {
  'use strict';

  const loading = document.getElementById('cancel-loading');
  const details = document.getElementById('cancel-details');
  const result = document.getElementById('cancel-result');
  const button = document.getElementById('cancel-confirm');
  const dateNode = document.getElementById('cancel-date');
  const timeNode = document.getElementById('cancel-time');
  const courseNode = document.getElementById('cancel-course');
  const subjectNode = document.getElementById('cancel-subject');
  if (!loading || !details || !result || !button) return;

  const API_URL = String(window.EES18_RESERVAS_API_URL || '').trim();
  const token = new URLSearchParams(window.location.search).get('token') || '';
  let requestCounter = 0;

  const cleanup = (script, callbackName, timer) => {
    if (timer) window.clearTimeout(timer);
    if (script && script.parentNode) script.parentNode.removeChild(script);
    try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
  };

  const request = (action) => new Promise((resolve, reject) => {
    if (!API_URL) {
      reject(new Error('SERVICE_NOT_CONFIGURED'));
      return;
    }

    requestCounter += 1;
    const callbackName = `ees18CancelCallback_${Date.now()}_${requestCounter}`;
    const script = document.createElement('script');
    const query = new URLSearchParams({ action, token, callback: callbackName });
    let timer = null;

    window[callbackName] = (payload) => {
      cleanup(script, callbackName, timer);
      resolve(payload || {});
    };
    script.src = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${query.toString()}`;
    script.async = true;
    script.onerror = () => {
      cleanup(script, callbackName, timer);
      reject(new Error('NETWORK_ERROR'));
    };
    timer = window.setTimeout(() => {
      cleanup(script, callbackName, timer);
      reject(new Error('TIMEOUT'));
    }, 15000);
    document.head.appendChild(script);
  });

  const formatDate = (isoDate) => {
    const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return String(isoDate || '');
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  };

  const showResult = (message, state = 'info') => {
    result.hidden = false;
    result.dataset.state = state;
    result.innerHTML = message;
  };

  async function loadReservation() {
    details.hidden = true;
    button.disabled = true;

    if (!token) {
      loading.hidden = true;
      showResult('<strong>El enlace de cancelación no es válido.</strong><span>Usá el enlace completo recibido en el correo de confirmación.</span>', 'error');
      return;
    }

    if (!API_URL) {
      loading.hidden = true;
      showResult('<strong>Sistema de cancelación en preparación.</strong><span>La reserva no fue modificada. La validación en línea se habilitará cuando finalice el despliegue de prueba.</span>', 'pilot');
      return;
    }

    try {
      const response = await request('cancelLookup');
      loading.hidden = true;
      if (!response.ok) {
        const used = response.code === 'ALREADY_CANCELLED';
        showResult(
          used
            ? '<strong>Esta reserva ya fue cancelada.</strong><span>El enlace no puede volver a modificarla.</span>'
            : '<strong>El enlace de cancelación no es válido.</strong><span>No se realizó ningún cambio.</span>',
          used ? 'info' : 'error'
        );
        return;
      }

      const reservation = response.reservation || {};
      dateNode.textContent = formatDate(reservation.date);
      timeNode.textContent = `${reservation.start || '—'} a ${reservation.end || '—'}`;
      courseNode.textContent = reservation.course || '—';
      subjectNode.textContent = reservation.subject || '—';
      details.hidden = false;
      result.hidden = true;
      button.disabled = false;
    } catch (error) {
      loading.hidden = true;
      showResult('<strong>No pudimos validar la reserva.</strong><span>Intentá nuevamente dentro de unos minutos. No se realizó ningún cambio.</span>', 'error');
    }
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    showResult('<strong>Cancelando reserva…</strong><span>Estamos liberando el horario.</span>');

    try {
      const response = await request('cancel');
      if (!response.ok) {
        if (response.code === 'ALREADY_CANCELLED') {
          details.hidden = true;
          showResult('<strong>Esta reserva ya estaba cancelada.</strong><span>El horario ya no está ocupado por esta reserva.</span>', 'info');
          return;
        }
        throw new Error(response.code || 'REQUEST_ERROR');
      }

      details.hidden = true;
      showResult('<strong>Reserva cancelada.</strong><span>El horario volvió a quedar disponible. Si necesitás otro horario, podés hacer una nueva reserva.</span>', 'success');
    } catch (error) {
      showResult('<strong>No pudimos completar la cancelación.</strong><span>La página no asumirá que está cancelada sin confirmación del servidor. Intentá nuevamente.</span>', 'error');
      button.disabled = false;
    } finally {
      button.removeAttribute('aria-busy');
    }
  });

  loadReservation();
})();
