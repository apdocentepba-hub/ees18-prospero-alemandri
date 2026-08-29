from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_PATH = ROOT / "assets" / "img" / "re-bonaerense-2024.jpg"


def test_re_bonaerense_es_jpeg_valido_y_no_un_archivo_roto():
    assert IMAGE_PATH.exists(), "Falta la imagen de RE Bonaerense"
    assert IMAGE_PATH.stat().st_size >= 20_000, "La imagen quedó vacía o excesivamente degradada"

    with Image.open(IMAGE_PATH) as image:
        assert image.format == "JPEG"
        width, height = image.size
        assert width >= 280, f"Ancho insuficiente: {width}px"
        assert height >= 420, f"Alto insuficiente: {height}px"
        image.verify()
