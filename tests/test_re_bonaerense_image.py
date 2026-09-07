from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_PATH = ROOT / "assets" / "img" / "re-bonaerense-2024.jpg"


def test_re_bonaerense_es_jpeg_valido_y_no_un_archivo_roto():
    assert IMAGE_PATH.exists(), "Falta la imagen de RE Bonaerense"
    assert IMAGE_PATH.stat().st_size >= 20_000, "La imagen quedó vacía o excesivamente degradada"

    with Image.open(IMAGE_PATH) as image:
        assert image.format == "JPEG"
        assert image.size == (280, 420)
        image.verify()


def test_re_bonaerense_se_muestra_a_resolucion_nativa_en_vida_escolar():
    vida = (ROOT / "vida-escolar.html").read_text(encoding="utf-8")
    css = (ROOT / "assets" / "css" / "multipage.css").read_text(encoding="utf-8")

    assert 'src="assets/img/re-bonaerense-2024.jpg"' in vida
    assert 'width="280" height="420"' in vida
    assert 'summary_large_image' not in vida
    assert '.feature-story img{display:block;width:280px;max-width:100%;height:auto' in css


def test_portada_usa_fuente_dinamica_para_imagenes_de_novedades():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    news_js = (ROOT / "assets" / "js" / "novedades.js").read_text(encoding="utf-8")

    assert 'data-news-section="inicio"' in index
    assert 'assets/js/novedades.js' in index
    assert 'createHomeNewsCard' in news_js
    assert 'image.src = item.image' in news_js
