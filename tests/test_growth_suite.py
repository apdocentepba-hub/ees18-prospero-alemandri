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


def test_ingreso_has_faq_contact_whatsapp_and_no_unconfirmed_visit_cta():
    ingreso = read("ingreso-2027.html")
    assert '<details' in ingreso
    assert 'Preguntas frecuentes' in ingreso
    assert 'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l' in ingreso
    assert 'mailto:secundaria18avellaneda@abc.gob.ar' in ingreso or 'href="contacto.html"' in ingreso
    assert 'href="visitas-ees18.html"' not in ingreso

    visitas = ROOT / "visitas-ees18.html"
    assert visitas.exists()
    visitas_html = read("visitas-ees18.html")
    assert 'no hay jornadas' in visitas_html.lower()
    assert 'fecha a confirmar' not in visitas_html.lower()
    assert 'secundaria18avellaneda@abc.gob.ar' in visitas_html


def test_reputation_pages_have_publishable_structure():
    vida = read("vida-escolar.html")
    comunicados = read("comunicados.html")
    assert 'data-news-section="vida-escolar"' in vida
    assert 'Archivo de actividades destacadas' in vida
    assert 'Ingreso 2027' in vida
    assert 'información confirmada' in comunicados.lower()
    assert 'Ingreso 2027' in comunicados


def test_404_is_institutional():
    path = ROOT / "404.html"
    assert path.exists()
    html = read("404.html")
    assert 'Página no encontrada' in html
    assert 'ingreso-2027.html' in html
    assert 'index.html' in html
