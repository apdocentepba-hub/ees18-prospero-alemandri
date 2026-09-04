from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name: str) -> str:
    return ROOT.joinpath(name).read_text(encoding="utf-8")


def test_identidad_visible_prioriza_ees18():
    index = read("index.html")
    assert '<title>E.E.S. Nº 18 “Próspero Alemandri”</title>' in index
    assert 'ENSPA · El Normal de Avellaneda' not in index
    assert 'Tradición ENSPA · identidad que continúa' not in index
    assert 'href="historia.html"' in index
    assert 'href="vida-escolar.html"' in index


def test_historia_institucional_publicada():
    path = ROOT / "historia.html"
    assert path.exists()
    historia = path.read_text(encoding="utf-8")
    for item in [
        "Nuestra historia",
        "15 de septiembre de 1901",
        "12 de junio de 1919",
        "Escuela Normal Mixta Nacional de Avellaneda",
        "1960",
        "Próspero G. Alemandri",
        "1971",
        "Escuela Normal Superior Próspero Alemandri",
        "E.E.S. Nº 18",
        "denominación histórica",
    ]:
        assert item in historia


def test_vida_escolar_publica_leer_en_comunidad_2026():
    path = ROOT / "vida-escolar.html"
    assert path.exists()
    vida = path.read_text(encoding="utf-8")
    for item in [
        "Leer en Comunidad",
        "Jornada de Bibliotecas Escolares Abiertas 2026",
        "4 de septiembre de 2026",
        "Una comunidad que sigue leyendo",
        'src="assets/img/leer-en-comunidad-2026.jpg"',
    ]:
        assert item in vida
    assert vida.index("Leer en Comunidad") < vida.index("2.º Encuentro de RE Bonaerense")
    assert (ROOT / "assets/img/leer-en-comunidad-2026.jpg").exists()


def test_vida_escolar_publica_re_bonaerense():
    path = ROOT / "vida-escolar.html"
    assert path.exists()
    vida = path.read_text(encoding="utf-8")
    for item in [
        "Vida escolar",
        "2.º Encuentro de RE Bonaerense",
        "Estudiantes hacen memoria",
        "micro relatos",
        'src="assets/img/re-bonaerense-2024.jpg"',
    ]:
        assert item in vida
    assert (ROOT / "assets/img/re-bonaerense-2024.jpg").exists()


def test_url_anterior_de_actividades_redirige():
    legacy = read("enspa-en-accion.html")
    assert 'url=vida-escolar.html' in legacy
    assert 'href="vida-escolar.html"' in legacy


def test_visitas_usa_identidad_actual():
    path = ROOT / "visitas-ees18.html"
    assert path.exists()
    visitas = path.read_text(encoding="utf-8")
    assert "Vení a conocer la E.E.S. Nº 18" in visitas
    assert "Vení a conocer ENSPA" not in visitas
