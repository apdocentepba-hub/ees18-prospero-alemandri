function doGet(e) {
  const view = normalizeText_(e && e.parameter && e.parameter.view, 30).toLowerCase();
  const file = view === 'estado' ? 'Estado' : 'Formulario';
  const title = view === 'estado'
    ? 'Estado del trámite · E.E.S. Nº 18'
    : 'Analítico Parcial / Pase · E.E.S. Nº 18';
  return HtmlService
    .createTemplateFromFile(file)
    .evaluate()
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function blobToFilePayload_(blob) {
  if (!blob || typeof blob.getBytes !== 'function') return null;
  const bytes = blob.getBytes();
  if (!bytes || !bytes.length) return null;
  return {
    name: normalizeText_(blob.getName() || 'archivo', 160),
    type: normalizeText_(blob.getContentType(), 100),
    size: bytes.length,
    base64: Utilities.base64Encode(bytes)
  };
}

function crearSolicitudDesdeFormulario(formObject) {
  const form = formObject || {};
  let trayectoria = [];
  try {
    trayectoria = JSON.parse(String(form.trayectoriaJson || '[]'));
    if (!Array.isArray(trayectoria)) trayectoria = [];
  } catch (error) {
    trayectoria = [];
  }

  return crearSolicitud({
    action: 'crearSolicitud',
    estudiante: {
      apellido: form.apellido,
      nombre: form.nombre,
      dni: form.dni,
      fechaNacimiento: form.fechaNacimiento,
      localidadNacimiento: form.localidadNacimiento
    },
    motivo: form.motivo,
    otroMotivo: form.otroMotivo,
    institucionDestino: form.institucionDestino,
    localidadDestino: form.localidadDestino,
    trayectoria: trayectoria,
    noRecuerdaAnios: String(form.noRecuerdaAnios || '') === 'si',
    solicitante: {
      esEstudiante: String(form.solicitanteEsEstudiante || '') === 'si',
      nombre: String(form.solicitanteEsEstudiante || '') === 'si'
        ? (normalizeText_(form.apellido, 100) + ' ' + normalizeText_(form.nombre, 100)).trim()
        : form.solicitanteNombre,
      vinculo: String(form.solicitanteEsEstudiante || '') === 'si'
        ? 'Estudiante'
        : form.vinculoEstudiante,
      telefono: form.telefono,
      email: form.email
    },
    archivos: {
      dni: blobToFilePayload_(form.dniArchivo),
      partida: blobToFilePayload_(form.partidaArchivo),
      documentoDestino: blobToFilePayload_(form.documentoDestinoArchivo),
      analiticoAnterior: blobToFilePayload_(form.analiticoAnteriorArchivo),
      otraDocumentacion: blobToFilePayload_(form.otraDocumentacionArchivo)
    }
  });
}
