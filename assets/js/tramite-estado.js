(() => {
  const form = document.querySelector("#form-consulta-estado");
  if (!form) return;

  const statusBox = document.querySelector("#consulta-status");
  const resultBox = document.querySelector("#resultado-estado");
  const resultName = document.querySelector("#resultado-nombre");
  const resultDni = document.querySelector("#resultado-dni");
  const resultStatus = document.querySelector("#resultado-estado-texto");
  const submitButton = form.querySelector('button[type="submit"]');

  function setStatus(message, state = "info") {
    statusBox.textContent = message;
    statusBox.dataset.state = state;
    statusBox.hidden = false;
  }

  function renderEstado({ apellidoNombre, dni, estado }) {
    resultName.textContent = apellidoNombre || "";
    resultDni.textContent = dni || "";
    resultStatus.textContent = estado || "";
    resultBox.hidden = false;
  }

  async function consultar(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    resultBox.hidden = true;
    const endpoint = String(window.EES18_TRAMITES_API_URL || "").trim();
    if (!endpoint) {
      setStatus("La consulta digital todavía no está habilitada. La página ya está preparada, pero falta activar la conexión segura con Secretaría.", "error");
      return;
    }

    const dni = form.elements.dni.value.replace(/\D/g, "");
    const codigo = form.elements.codigoSeguimiento.value.trim().toUpperCase();
    submitButton.disabled = true;
    setStatus("Consultando el estado…");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "consultarEstado", dni, codigoSeguimiento: codigo })
      });
      if (!response.ok) throw new Error("No se pudo consultar el trámite.");
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || "No encontramos un trámite con esos datos.");
      renderEstado({ apellidoNombre: data.apellidoNombre, dni: data.dni, estado: data.estado });
      statusBox.hidden = true;
    } catch (error) {
      setStatus(error?.message || "No se pudo consultar el trámite.", "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  form.addEventListener("submit", consultar);
})();
