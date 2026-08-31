(() => {
  const form = document.getElementById('status-form');
  const input = document.getElementById('dni');
  const result = document.getElementById('status-result');
  const button = document.getElementById('status-submit');

  if (!form || !input || !result || !button) return;

  const API_URL = String(window.EES18_STATUS_API_URL || '').trim();
  let requestCounter = 0;

  const normalizarDni = (value) => String(value || '').replace(/\D/g, '');

  const setResult = (message, state = 'info') => {
    result.hidden = false;
    result.dataset.state = state;
    result.innerHTML = message;
  };

  const cleanupJsonp = (script, callbackName, timer) => {
    if (timer) window.clearTimeout(timer);
    if (script && script.parentNode) script.parentNode.removeChild(script);
    try {
      delete window[callbackName];
    } catch (error) {
      window[callbackName] = undefined;
    }
  };

  const consultar = (dni) => new Promise((resolve, reject) => {
    if (!API_URL) {
      reject(new Error('SERVICE_NOT_CONFIGURED'));
      return;
    }

    requestCounter += 1;
    const callbackName = `ees18EstadoCallback_${Date.now()}_${requestCounter}`;
    const script = document.createElement('script');
    const separator = API_URL.includes('?') ? '&' : '?';
    const src = `${API_URL}${separator}action=estado&dni=${encodeURIComponent(dni)}&callback=${encodeURIComponent(callbackName)}`;

    let timer = null;

    window[callbackName] = (payload) => {
      cleanupJsonp(script, callbackName, timer);
      resolve(payload || {});
    };

    script.src = src;
    script.async = true;
    script.onerror = () => {
      cleanupJsonp(script, callbackName, timer);
      reject(new Error('NETWORK_ERROR'));
    };

    timer = window.setTimeout(() => {
      cleanupJsonp(script, callbackName, timer);
      reject(new Error('TIMEOUT'));
    }, 12000);

    document.head.appendChild(script);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dni = normalizarDni(input.value);

    if (dni.length < 6 || dni.length > 10) {
      setResult('<strong>Revisá el DNI.</strong><br>Ingresá únicamente el número de documento, con o sin puntos.', 'error');
      input.focus();
      return;
    }

    input.value = dni;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setResult('Consultando el estado del trámite…');

    try {
      const response = await consultar(dni);

      if (!response.ok || !response.encontrado) {
        setResult('<strong>No encontramos un trámite disponible para consulta.</strong><br>Verificá el DNI. Si la solicitud fue reciente, puede estar todavía pendiente de incorporación al seguimiento.', 'error');
        return;
      }

      const estado = String(response.estado || 'Estado no informado');
      const fechaActualizacion = String(response.fechaActualizacion || 'Sin fecha informada');

      setResult(
        `<strong>${estado}</strong><br><span>Última actualización: ${fechaActualizacion}</span>`,
        'success'
      );
    } catch (error) {
      if (error && error.message === 'SERVICE_NOT_CONFIGURED') {
        setResult('<strong>La consulta por DNI ya está preparada.</strong><br>Falta activar el servicio de consulta de Secretaría. Mientras tanto, podés comunicarte con la escuela.', 'error');
      } else {
        setResult('<strong>No pudimos realizar la consulta en este momento.</strong><br>Intentá nuevamente dentro de unos minutos.', 'error');
      }
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
})();
