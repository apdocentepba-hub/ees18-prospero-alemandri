from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzcsTW4uWja9zVi83a441jgjbBz0j9WDjX_LXQzm6gdnR2FTsUXPDIunWfvKtlbWxEN/exec"
STATUS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxP5YxRdkQnv1HlBbtcgmjlTQVkOMhx5srbduPaN4xcBIaSrXTFr10zGU95Z7bPWjLC/exec"


def read(path):
    return ROOT.joinpath(path).read_text(encoding="utf-8")


def test_inicio_enlaza_pases_y_equivalencias():
    html = read("index.html")
    assert 'href="pases-equivalencias.html"' in html
    assert "Pases y equivalencias" in html


def test_pases_publica_requisitos_principales():
    html = read("pases-equivalencias.html")
    for texto in [
        "Solicitud de Certificado de Estudios",
        "Copia actualizada del DNI",
        "Copia de la Partida de Nacimiento",
        "Constancia de solicitud de vacante",
        "FINES",
        "Analítico Parcial",
        "Reposición o pérdida"
    ]:
        assert texto in html


def test_pases_enlaza_al_webapp_operativo():
    html = read("pases-equivalencias.html")
    assert f'href="{WEBAPP_URL}"' in html
    assert "Solicitar Pase / Analítico Parcial" in html


def test_ruta_anterior_redirige_al_webapp():
    html = read("solicitar-analitico.html")
    assert WEBAPP_URL in html
    assert 'http-equiv="refresh"' in html
    assert "Abrir formulario de solicitud" in html


def test_titulos_queda_diferenciado_del_circuito_de_pases():
    html = read("index.html")
    assert "Títulos y analíticos finales" in html


def test_pases_ofrece_progreso_y_consulta_de_estado():
    html = read("pases-equivalencias.html")
    assert "Progreso del estado de Pase / Analítico" in html
    assert 'href="consultar-estado.html"' in html
    assert "Consultar estado" in html


def test_consulta_estado_usa_dni_y_no_codigo():
    html = read("consultar-estado.html")
    assert 'name="dni"' in html.lower()
    assert 'inputmode="numeric"' in html.lower()
    assert "Consultar por DNI" in html
    assert "Código de seguimiento" not in html
    for texto in [
        "Solicitud recibida",
        "Documentación en revisión",
        "Analítico en confección",
        "Trámite finalizado",
    ]:
        assert texto in html


def test_consulta_estado_carga_cliente_publico():
    html = read("consultar-estado.html")
    assert 'assets/js/status-config.js' in html
    assert 'assets/js/estado-publico.js' in html
    js = read("assets/js/estado-publico.js")
    assert "normalizarDni" in js
    assert "callback" in js
    assert "estado" in js
    assert "fechaActualizacion" in js


def test_consulta_estado_apunta_al_webapp_publico_desplegado():
    config = read("assets/js/status-config.js")
    assert STATUS_WEBAPP_URL in config
    assert "window.EES18_STATUS_API_URL" in config


def test_estado_publico_no_inyecta_respuesta_del_backend_como_html():
    js = read("assets/js/estado-publico.js")
    assert "setSuccessResult" in js
    assert "textContent = estado" in js
    assert "textContent = `Última actualización: ${fechaActualizacion}`" in js
