(() => {
  const form = document.querySelector('#form-solicitud-analitico');
  if (!form) return;

  const motivo = form.elements.motivo;
  const otroMotivo = document.querySelector('#campo-otro-motivo');
  const documentoDestino = document.querySelector('#campo-documento-destino');
  const analiticoAnterior = document.querySelector('#campo-analitico-anterior');
  const datosSolicitante = document.querySelector('#datos-solicitante-tercero');
  const noRecuerda = form.elements.noRecuerdaAnios;
  const status = document.querySelector('#form-status');

  function toggleMotivo() {
    const value = motivo.value;
    otroMotivo.hidden = value !== 'otro';
    documentoDestino.hidden = value !== 'otra_escuela';
    analiticoAnterior.hidden = !['perdida', 'reposicion'].includes(value);
    form.elements.otroMotivo.required = value === 'otro';
    form.elements.documentoDestinoArchivo.required = value === 'otra_escuela';
  }

  function toggleSolicitante() {
    const selected = form.querySelector('input[name="solicitanteEsEstudiante"]:checked');
    const tercero = selected?.value === 'no';
    datosSolicitante.hidden = !tercero;
    form.elements.solicitanteNombre.required = Boolean(tercero);
    form.elements.vinculoEstudiante.required = Boolean(tercero);
  }

  function toggleAnios() {
    form.querySelectorAll('input[name^="anioCurso"]').forEach((input) => {
      input.disabled = noRecuerda.checked;
      if (noRecuerda.checked) input.value = '';
    });
  }

  motivo.addEventListener('change', toggleMotivo);
  form.querySelectorAll('input[name="solicitanteEsEstudiante"]').forEach((input) => input.addEventListener('change', toggleSolicitante));
  noRecuerda.addEventListener('change', toggleAnios);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    status.hidden = false;
    status.dataset.state = 'error';
    status.textContent = 'La solicitud digital todavía no está habilitada. El formulario ya está publicado para revisión, pero falta activar la conexión segura con Drive y la bandeja de Secretaría.';
  });

  toggleMotivo();
  toggleSolicitante();
  toggleAnios();
})();
