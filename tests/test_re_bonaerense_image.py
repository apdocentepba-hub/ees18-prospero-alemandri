from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_PATH = ROOT / "assets" / "img" / "re-bonaerense-2024.jpg"


def test_re_bonaerense_es_jpeg_valido_con_resolucion_web():
    assert IMAGE_PATH.exists(), "Falta la imagen de RE Bonaerense"
    assert IMAGE_PATH.stat().st_size >= 100_000, "La imagen quedó demasiado comprimida o reducida"

    with Image.open(IMAGE_PATH) as image:
        assert image.format == "JPEG"
        assert image.size == (900, 1350)
        image.verify()
