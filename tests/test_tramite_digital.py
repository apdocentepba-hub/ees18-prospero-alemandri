from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return ROOT.joinpath(path).read_text(encoding="utf-8")


def test_acceso_digital_desde_pases_y_equivalencias():
    home = read("index.html")
    tramite = read("pases-equivalencias.html")
    assert 'href="pases-equivalencias.html"' in home
    assert 'href="solicitar-analitico.html"' in tramite
    assert 'href="estado-tramite.html"' in tramite


def test_pases_y_equivalencias_muestra_requisitos_base():
    tramite = read("pases-equivalencias.html")
    for item in [
        "Copia actualizada del DNI",
        "Copia de la Partida de Nacimiento",
        "institución de destino",
        "Analítico Parcial",
        "FINES"
    ]:
        assert item in tramite


def test_formulario_solicitud_tiene_datos_obligatorios():
    html = read("solicitar-analitico.html")
    for field in [
        'name="apellido"', 'name="nombre"', 'name="dni"',
        'name="fechaNacimiento"', 'name="localidadNacimiento"',
        'name="motivo"', 'name="institucionDestino"',
        'name="telefono"', 'name="email"',
        'name="dniArchivo"', 'name="partidaArchivo"'
    ]:
        assert field in html
    assert 'No recuerdo los años' in html
    for curso in range(1, 7):
        assert f'value="{curso}"' in html


def test_formulario_acepta_solo_documentos_permitidos():
    html = read("solicitar-analitico.html")
    assert 'accept=".pdf,.jpg,.jpeg,.png"' in html
    js = read("assets/js/tramite-solicitud.js")
    assert "10 * 1024 * 1024" in js
    assert "40 * 1024 * 1024" in js


def test_consulta_publica_pide_dni_y_codigo():
    html = read("estado-tramite.html")
    assert 'name="dni"' in html
    assert 'name="codigoSeguimiento"' in html
    assert 'id="resultado-estado"' in html


def test_consulta_publica_no_expone_campos_internos():
    html = read("estado-tramite.html")
    js = read("assets/js/tramite-estado.js")
    public = (html + js).lower()
    for forbidden in [
        "carpeta drive", "observación interna", "observacion interna",
        "calificaciones", "partida adjunta", "dni adjunto",
        "referencia seguimiento"
    ]:
        assert forbidden not in public
    for required in ["apellidoNombre", "dni", "estado"]:
        assert required in js


def test_configuracion_backend_no_contiene_secretos():
    config = read("assets/js/tramite-config.js")
    assert 'window.EES18_TRAMITES_API_URL' in config
    lowered = config.lower()
    for forbidden in ["client_secret", "private_key", "access_token", "refresh_token"]:
        assert forbidden not in lowered


def test_paginas_cargan_config_antes_de_scripts_funcionales():
    solicitud = read("solicitar-analitico.html")
    estado = read("estado-tramite.html")
    assert solicitud.index("tramite-config.js") < solicitud.index("tramite-solicitud.js")
    assert estado.index("tramite-config.js") < estado.index("tramite-estado.js")


def test_no_se_publican_ids_internos_de_drive():
    public_paths = [
        "index.html", "pases-equivalencias.html", "certificado-analitico.html",
        "solicitar-analitico.html", "estado-tramite.html",
        "assets/js/tramite-config.js", "assets/js/tramite-solicitud.js",
        "assets/js/tramite-estado.js"
    ]
    text = "\n".join(read(path) for path in public_paths)
    for internal_id in [
        "1M8kLoW2IA6pu8z_IrFp8efe0BPWXcW4JqdQFSaK300Y",
        "1Ms43-LM-TwzNbHETCY2-XrElUlcAGIYg",
        "1ctdZBXvTTW8mxXhjCGbsi7GGJ3sEy55M"
    ]:
        assert internal_id not in text
