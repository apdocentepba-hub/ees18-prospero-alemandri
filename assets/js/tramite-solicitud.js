(() => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 40 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

  const form = document.querySelector("#form-solicitud-analitico");
  if (!form) return;

  const statusBox = document.querySelector("#form-status");
  const submitButton = form.querySelector('button[type="submit"]');
  const motivo = form.elements.motivo;
  const otroMotivo = document.querySelector("#campo-otro-motivo");
  const documentoDestino = document.querySelector("#campo-documento-destino");
  const analiticoAnterior = document.querySelector("#campo-analitico-anterior");
  const solicitanteEsEstudiante = form.elements.solicitanteEsEstudiante;
  const datosSolicitante = document.querySelector("#datos-solicitante-tercero");
  const noRecuerda = form.elements.noRecuerdaAnios;

  function setStatus(message, state = "info") {
    statusBox.textContent = message;
    statusBox.dataset.state = state;
    statusBox.hidden = false;
  }

  function toggleMotivoFields() {
    const value = motivo.value;
    otroMotivo.hidden = value !== "otro";
    documentoDestino.hidden = value !== "otra_escuela";
    analiticoAnterior.hidden = !["perdida", "reposicion"].includes(value);

    const otro = form.elements.otroMotivo;
    const destino = form.elements.documentoDestinoArchivo;
    if (otro) otro.required = value === "otro";
    if (destino) destino.required = value === "otra_escuela";
  }

  function toggleSolicitanteFields() {
    const selected = form.querySelector('input[name="solicitanteEsEstudiante"]:checked');
    const isStudent = selected?.value === "si";
    datosSolicitante.hidden = isStudent || !selected;
    for (const name of ["solicitanteNombre", "vinculoEstudiante"]) {
      const input = form.elements[name];
      if (input) input.required = !isStudent && Boolean(selected);
    }
  }

  function collectYears() {
    const rows = [];
    for (let course = 1; course <= 6; course += 1) {
      const checked = form.querySelector(`input[name="curso"][value="${course}"]`);
      if (!checked?.checked) continue;
      const yearInput = form.querySelector(`input[name="anioCurso${course}"]`);
      rows.push({ curso: course, anio: noRecuerda.checked ? "" : (yearInput?.value || "") });
    }
    return rows;
  }

  function selectedFiles() {
    return [
      form.elements.dniArchivo,
      form.elements.partidaArchivo,
      form.elements.documentoDestinoArchivo,
      form.elements.analiticoAnteriorArchivo,
      form.elements.otraDocumentacionArchivo
    ].flatMap((input) => input?.files ? Array.from(input.files) : []);
  }

  function validateFiles() {
    const files = selectedFiles();
    let total = 0;
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error(`El archivo ${file.name} no tiene un formato permitido.`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo ${file.name} supera el máximo de 10 MB.`);
      }
      total += file.size;
    }
    if (total > MAX_TOTAL_SIZE) {
      throw new Error("La documentación adjunta supera el máximo total de 40 MB.");
    }
    return files;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",", 2)[1] : result;
        resolve({ name: file.name, type: file.type, size: file.size, base64 });
      };
      reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
      reader.readAsDataURL(file);
    });
  }

  async function buildPayload() {
    const files = validateFiles();
    const encoded = await Promise.all(files.map(fileToBase64));
    const byInput = async (input) => {
      const file = input?.files?.[0];
      if (!file) return null;
      return encoded.find((item) => item.name === file.name && item.size === file.size) || null;
    };

    const requesterChoice = form.querySelector('input[name="solicitanteEsEstudiante"]:checked')?.value || "";
    return {
      action: "crearSolicitud",
      estudiante: {
        apellido: form.elements.apellido.value.trim(),
        nombre: form.elements.nombre.value.trim(),
        dni: form.elements.dni.value.replace(/\D/g, ""),
        fechaNacimiento: form.elements.fechaNacimiento.value,
        localidadNacimiento: form.elements.localidadNacimiento.value.trim()
      },
      motivo: form.elements.motivo.value,
      otroMotivo: form.elements.otroMotivo?.value.trim() || "",
      institucionDestino: form.elements.institucionDestino.value.trim(),
      localidadDestino: form.elements.localidadDestino?.value.trim() || "",
      trayectoria: collectYears(),
      noRecuerdaAnios: noRecuerda.checked,
      solicitante: {
        esEstudiante: requesterChoice === "si",
        nombre: requesterChoice === "si"
          ? `${form.elements.apellido.value.trim()} ${form.elements.nombre.value.trim()}`
          : (form.elements.solicitanteNombre?.value.trim() || ""),
        vinculo: requesterChoice === "si" ? "Estudiante" : (form.elements.vinculoEstudiante?.value.trim() || ""),
        telefono: form.elements.telefono.value.trim(),
        email: form.elements.email.value.trim()
      },
      archivos: {
        dni: await byInput(form.elements.dniArchivo),
        partida: await byInput(form.elements.partidaArchivo),
        documentoDestino: await byInput(form.elements.documentoDestinoArchivo),
        analiticoAnterior: await byInput(form.elements.analiticoAnteriorArchivo),
        otraDocumentacion: await byInput(form.elements.otraDocumentacionArchivo)
      }
    };
  }

  async function submitSolicitud(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const endpoint = String(window.EES18_TRAMITES_API_URL || "").trim();
    if (!endpoint) {
      setStatus("La solicitud digital todavía no está habilitada. La página ya está preparada, pero falta activar la conexión segura con Secretaría.", "error");
      return;
    }

    submitButton.disabled = true;
    setStatus("Preparando y enviando la documentación…");

    try {
      const payload = await buildPayload();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("No se pudo registrar la solicitud.");
      const result = await response.json();
      if (!result.ok) throw new Error(result.message || "No se pudo registrar la solicitud.");

      form.reset();
      toggleMotivoFields();
      toggleSolicitanteFields();
      setStatus(`Solicitud recibida. Guardá este código de seguimiento: ${result.codigoSeguimiento}`, "success");
    } catch (error) {
      setStatus(error?.message || "Ocurrió un error al enviar la solicitud. Intentá nuevamente.", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  motivo.addEventListener("change", toggleMotivoFields);
  form.querySelectorAll('input[name="solicitanteEsEstudiante"]').forEach((input) => {
    input.addEventListener("change", toggleSolicitanteFields);
  });
  noRecuerda.addEventListener("change", () => {
    form.querySelectorAll('input[name^="anioCurso"]').forEach((input) => {
      input.disabled = noRecuerda.checked;
      if (noRecuerda.checked) input.value = "";
    });
  });
  form.addEventListener("submit", submitSolicitud);

  toggleMotivoFields();
  toggleSolicitanteFields();
})();
