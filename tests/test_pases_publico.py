from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzcsTW4uWja9zVi83a441jgjbBz0j9WDjX_LXQzm6gdnR2FTsUXPDIunWfvKtlbWxEN/exec"


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
