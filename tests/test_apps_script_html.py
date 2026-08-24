from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return ROOT.joinpath(path).read_text(encoding="utf-8")


def test_apps_script_tiene_formulario_html_nativo_para_carga_sin_cors():
    code = read("apps-script/Code.gs")
    formulario = read("apps-script/Formulario.html")
    assert "function doGet(e)" in code
    assert "function crearSolicitudDesdeFormulario(formObject)" in code
    assert "HtmlService.createTemplateFromFile('Formulario')" in code
    assert "google.script.run" in formulario
    assert "crearSolicitudDesdeFormulario" in formulario
    for field in [
        'name="apellido"', 'name="nombre"', 'name="dni"',
        'name="fechaNacimiento"', 'name="localidadNacimiento"',
        'name="motivo"', 'name="institucionDestino"',
        'name="telefono"', 'name="email"',
        'name="dniArchivo"', 'name="partidaArchivo"'
    ]:
        assert field in formulario


def test_apps_script_tiene_consulta_html_nativa():
    code = read("apps-script/Code.gs")
    estado = read("apps-script/Estado.html")
    assert "HtmlService.createTemplateFromFile('Estado')" in code
    assert "google.script.run" in estado
    assert "consultarEstado" in estado
    assert 'name="dni"' in estado
    assert 'name="codigoSeguimiento"' in estado
    for forbidden in ["Carpeta Drive", "Observación interna", "Partida adjunta", "DNI adjunto"]:
        assert forbidden not in estado


def test_formulario_html_no_necesita_login_google_en_su_logica_cliente():
    formulario = read("apps-script/Formulario.html").lower()
    for forbidden in ["accounts.google.com", "google-signin", "oauth", "iniciar sesión con google"]:
        assert forbidden not in formulario
