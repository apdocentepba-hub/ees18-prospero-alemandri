import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_PATH = ROOT / "assets" / "img" / "re-bonaerense-2026.jpg"
SEED_PATH = ROOT / "data" / "novedades-seed.json"


def test_re_bonaerense_es_jpeg_valido_y_no_un_archivo_roto():
    assert IMAGE_PATH.exists(), "Falta la imagen normalizada de RE Bonaerense"
    assert IMAGE_PATH.stat().st_size >= 20_000, "La imagen quedó vacía o excesivamente degradada"

    with Image.open(IMAGE_PATH) as image:
        assert image.format == "JPEG"
        assert image.size == (280, 420)
        image.verify()


def test_re_bonaerense_usa_la_imagen_2026_en_la_fuente_editorial():
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    item = next(row for row in seed if row["ID"] == "re-bonaerense-2026")

    assert item["Imagen"] == "assets/img/re-bonaerense-2026.jpg"
    assert item["Vida escolar"] == "Sí"
    assert item["Inicio"] == "Sí"


def test_sitio_dinamico_renderiza_imagenes_sin_html_inyectado():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    news_js = (ROOT / "assets" / "js" / "novedades.js").read_text(encoding="utf-8")

    assert 'data-news-section="inicio"' in index
    assert 'assets/js/novedades.js' in index
    assert 'createHomeNewsCard' in news_js
    assert 'image.src = item.image' in news_js
    assert 'textContent' in news_js
    assert 'posterStripUrls' not in news_js
