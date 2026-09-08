import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def test_identidad_local_y_iconos_instalables():
    logo = ROOT / "assets" / "img" / "logo-ees18.jpg"
    icon_192 = ROOT / "assets" / "img" / "icon-192.png"
    icon_512 = ROOT / "assets" / "img" / "icon-512.png"
    favicon = ROOT / "favicon.ico"

    for path in (logo, icon_192, icon_512, favicon):
        assert path.exists(), f"Falta asset de identidad: {path.relative_to(ROOT)}"
        assert path.stat().st_size > 0

    with Image.open(icon_192) as image:
        assert image.format == "PNG"
        assert image.size == (192, 192)
    with Image.open(icon_512) as image:
        assert image.format == "PNG"
        assert image.size == (512, 512)
    with Image.open(favicon) as image:
        assert image.format == "ICO"


def test_manifest_declara_iconos_png():
    manifest = json.loads((ROOT / "site.webmanifest").read_text(encoding="utf-8"))
    assert manifest["icons"] == [
        {"src": "assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"},
    ]
