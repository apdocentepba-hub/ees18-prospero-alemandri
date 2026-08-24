from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return ROOT.joinpath(path).read_text(encoding="utf-8")


def read_apps_script():
    return read("apps-script/Code.gs") + "\n" + read("apps-script/Validacion.gs")


def test_acceso_digital_desde_pases_y_equivalencias():
    home = read("index.html")
    tramite = read("pases-equivalencias.html")
    assert 'href="pases-equivalencias.html"' in home
    assert 'href="solicitar-analitico.html"' in tramite
    assert 'href="estado-tramite.html"' in tramite


def test_titulos_no_es_la_entrada_al_circuito_de_pases():
    titulos = read("certificado-analitico.html")
    assert 'href="solicitar-analitico.html"' not in titulos
    assert 'href="estado-tramite.html"' not in titulos


def test_formulario_y_consulta_vuelven_a_pases_y_equivalencias():
    solicitud = read("solicitar-analitico.html")
    estado = read("estado-tramite.html")
    assert 'href="pases-equivalencias.html"' in solicitud
    assert 'href="pases-equivalencias.html"' in estado


def test_pases_y_equivalencias_muestra_requisitos_base_y_los_ya_publicados():
    tramite = read("pases-equivalencias.html")
    for item in [
        "Solicitud de Certificado de Estudios",
        "Copia actualizada del DNI",
        "Copia de la Partida de Nacimiento",
        "Constancia de solicitud de vacante",
        "institución de destino",
        "Analítico Parcial",
        "Certificado Analítico",
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


def test_backend_usa_bandeja_intermedia_y_validacion_manual():
    code = read_apps_script()
    for symbol in [
        "function doPost(e)",
        "function crearSolicitud(payload)",
        "function consultarEstado(dni, codigoSeguimiento)",
        "function promoverSolicitudValidada(rowIndex)"
    ]:
        assert symbol in code
    assert "Vínculo EES18" in code
    assert "Estado documentación" in code
    assert "Aprobado para iniciar" in code
    assert "VERIFICADO" in code
    assert "VALIDADA" in code


def test_backend_alinea_encabezados_del_seguimiento_real():
    code = read_apps_script()
    assert "OFFICIAL_HEADER_ROW" in code
    for header in [
        "Apellido y nombre", "DNI", "Escuela destino", "Localidad",
        "Fotocopia DNI", "Partida nacimiento", "Pase a otra escuela",
        "Estado documentación", "Estado del trámite"
    ]:
        assert header in code
    assert "folder.getUrl()" in code


def test_bandeja_detecta_posibles_duplicados_y_guarda_trazabilidad_de_revision():
    code = read_apps_script()
    for symbol in [
        "function evaluarPosibleDuplicado_(pending, dni)",
        "function registrarValidacionSolicitud(rowIndex, datos)"
    ]:
        assert symbol in code
    for header in [
        "Fuente verificación EES18",
        "Fecha verificación EES18",
        "Responsable revisión",
        "Posible duplicado",
        "Fecha última actualización"
    ]:
        assert header in code
    assert "POSIBLE DUPLICADO" in code


def test_libro_folio_se_lee_del_pie_del_analitico_y_se_sincroniza_con_control_de_conflictos():
    code = read_apps_script()
    for symbol in [
        "function leerLibroFolioAnalitico_(spreadsheetId)",
        "function sincronizarLibroFolioDesdeAnalitico(spreadsheetId)",
        "function reconstruirIndiceDesdeAnaliticos()",
        "function registrarConflictoLibroFolio_"
    ]:
        assert symbol in code
    for cell in ["C11", "H12", "D132", "G132"]:
        assert cell in code
    assert "INDEX_SPREADSHEET_ID" in code
    assert "ANALITICOS_FOLDER_ID" in code
    assert "Libro" in code and "Folio" in code
    assert "CONFLICTO" in code


def test_libro_folio_no_sobrescribe_si_hay_diferencias_y_controla_duplicados():
    code = read_apps_script()
    assert "Libro/Folio diferente" in code
    assert "Libro/Folio ya asignado a otro DNI" in code
    assert "NO sobrescribe" in code
    assert "mismo DNI" in code


def test_backend_no_hardcodea_ids_privados():
    code = read_apps_script()
    assert "PropertiesService.getScriptProperties()" in code
    for internal_id in [
        "1M8kLoW2IA6pu8z_IrFp8efe0BPWXcW4JqdQFSaK300Y",
        "1Ms43-LM-TwzNbHETCY2-XrElUlcAGIYg",
        "1ctdZBXvTTW8mxXhjCGbsi7GGJ3sEy55M"
    ]:
        assert internal_id not in code


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
