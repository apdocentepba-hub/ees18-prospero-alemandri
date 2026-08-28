from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name: str) -> str:
    return ROOT.joinpath(name).read_text(encoding="utf-8")


def test_seo_and_share_metadata():
    for name in ["index.html", "ingreso-2027.html"]:
        html = read(name)
        assert 'rel="canonical"' in html
        assert 'property="og:title"' in html
        assert 'property="og:description"' in html
        assert 'property="og:url"' in html
        assert 'name="twitter:card"' in html
        assert 'application/ld+json' in html
        assert 'rel="manifest" href="site.webmanifest"' in html
    assert (ROOT / "sitemap.xml").exists()
    assert (ROOT / "robots.txt").exists()
    assert (ROOT / "site.webmanifest").exists()


def test_ingreso_has_faq_visits_and_whatsapp_share():
    ingreso = read("ingreso-2027.html")
    assert '<details' in ingreso
    assert 'Preguntas frecuentes' in ingreso
    assert 'href="visitas-ees18.html"' in ingreso
    assert 'wa.me/?text=' in ingreso
    assert 'mailto:secundaria18avellaneda@abc.gob.ar' in ingreso
    visitas = ROOT / "visitas-ees18.html"
    assert visitas.exists()
    visitas_html = read("visitas-ees18.html")
    assert 'Vení a conocer la E.E.S. Nº 18' in visitas_html
    assert 'fecha a confirmar' in visitas_html.lower()
    assert 'secundaria18avellaneda@abc.gob.ar' in visitas_html


def test_reputation_pages_have_publishable_structure():
    accion = read("vida-escolar.html")
    comunicados = read("comunicados.html")
    for category in ["Proyectos", "Ciencias", "Comunicación", "Lenguas", "Sociales", "Cultura y deporte"]:
        assert category in accion
    assert 'Ingreso 2027' in accion
    assert 'información confirmada' in comunicados.lower()
    assert 'Ingreso 2027' in comunicados


def test_404_is_institutional():
    path = ROOT / "404.html"
    assert path.exists()
    html = read("404.html")
    assert 'Página no encontrada' in html
    assert 'ingreso-2027.html' in html
    assert 'index.html' in html
