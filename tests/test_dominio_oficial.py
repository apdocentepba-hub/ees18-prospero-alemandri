from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = "https://apdocentepba-hub.github.io/ees18-prospero-alemandri"
OFFICIAL = "https://ees18avellaneda.edu.ar"


def read(path):
    return ROOT.joinpath(path).read_text(encoding="utf-8")


def test_paginas_publicas_no_referencian_dominio_anterior():
    for path in ROOT.glob("*.html"):
        assert OLD not in path.read_text(encoding="utf-8"), path.name


def test_paginas_principales_tienen_canonical_oficial():
    pages = {
        "index.html": f'{OFFICIAL}/',
        "tramites.html": f'{OFFICIAL}/tramites.html',
        "pases-equivalencias.html": f'{OFFICIAL}/pases-equivalencias.html',
        "consultar-estado.html": f'{OFFICIAL}/consultar-estado.html',
        "nuestra-escuela.html": f'{OFFICIAL}/nuestra-escuela.html',
        "propuesta-educativa.html": f'{OFFICIAL}/propuesta-educativa.html',
        "vida-escolar.html": f'{OFFICIAL}/vida-escolar.html',
        "ingreso-2027.html": f'{OFFICIAL}/ingreso-2027.html',
        "contacto.html": f'{OFFICIAL}/contacto.html',
    }
    for path, url in pages.items():
        assert f'<link rel="canonical" href="{url}">' in read(path), path


def test_sitemap_y_robots_usan_dominio_oficial():
    sitemap = read("sitemap.xml")
    robots = read("robots.txt")
    assert OLD not in sitemap
    assert OFFICIAL in sitemap
    assert f"Sitemap: {OFFICIAL}/sitemap.xml" in robots


def test_manifest_usa_raiz_del_dominio_oficial():
    manifest = read("site.webmanifest")
    assert '"start_url": "/"' in manifest
    assert '"scope": "/"' in manifest
    assert '/ees18-prospero-alemandri/' not in manifest
