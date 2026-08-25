from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT.joinpath("index.html").read_text(encoding="utf-8")


def test_portada_promueve_ingreso_2027():
    assert 'Ingreso 2027' in INDEX
    assert 'Elegí ENSPA' in INDEX
    assert 'href="ingreso-2027.html"' in INDEX


def test_pagina_ingreso_2027_publicada():
    ingreso_path = ROOT / "ingreso-2027.html"
    assert ingreso_path.exists(), "Falta la página de Ingreso 2027"
    ingreso = ingreso_path.read_text(encoding="utf-8")
    for item in [
        'Ingreso 2027', 'Conocé tu próxima secundaria',
        'Comunicación', 'Ciencias Sociales', 'Lenguas Extranjeras', 'Ciencias Naturales',
        'Más de 100 años', 'secundaria18avellaneda@abc.gob.ar'
    ]:
        assert item in ingreso, f"Falta contenido de captación: {item}"
    assert 'href="plan-estudios.html"' in ingreso
    assert 'href="index.html"' in ingreso


def test_ingreso_no_publica_datos_no_confirmados():
    ingreso_path = ROOT / "ingreso-2027.html"
    if ingreso_path.exists():
        ingreso = ingreso_path.read_text(encoding="utf-8")
        assert 'vacantes disponibles' not in ingreso.lower()
        assert 'inscripción abierta' not in ingreso.lower()
