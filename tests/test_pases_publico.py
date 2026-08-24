from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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


def test_pases_muestra_acceso_visible_al_formulario():
    html = read("pases-equivalencias.html")
    assert 'href="solicitar-analitico.html"' in html
    assert "Solicitar Pase / Analítico Parcial" in html


def test_formulario_publico_tiene_los_datos_obligatorios():
    html = read("solicitar-analitico.html")
    for campo in [
        'name="apellido"', 'name="nombre"', 'name="dni"',
        'name="fechaNacimiento"', 'name="localidadNacimiento"',
        'name="motivo"', 'name="institucionDestino"',
        'name="telefono"', 'name="email"',
        'name="dniArchivo"', 'name="partidaArchivo"'
    ]:
        assert campo in html
    assert "No necesitás una cuenta Google" in html
    assert "todavía no está habilitada" in read("assets/js/tramite-solicitud.js")


def test_titulos_queda_diferenciado_del_circuito_de_pases():
    html = read("index.html")
    assert "Títulos y analíticos finales" in html
