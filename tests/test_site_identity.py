import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def svg_size(path: Path):
    root = ET.fromstring(path.read_text(encoding="utf-8"))
    return root.attrib.get("width"), root.attrib.get("height")


def test_identidad_local_y_iconos_instalables():
    logo = ROOT / "assets" / "img" / "logo-ees18.jpg"
    icon_192 = ROOT / "assets" / "img" / "icon-192.svg"
    icon_512 = ROOT / "assets" / "img" / "icon-512.svg"
    favicon = ROOT / "favicon.svg"

    for path in (logo, icon_192, icon_512, favicon):
        assert path.exists(), f"Falta asset de identidad: {path.relative_to(ROOT)}"
        assert path.stat().st_size > 0

    assert svg_size(icon_192) == ("192", "192")
    assert svg_size(icon_512) == ("512", "512")
    assert svg_size(favicon) == ("64", "64")


def test_manifest_declara_iconos_locales():
    manifest = json.loads((ROOT / "site.webmanifest").read_text(encoding="utf-8"))
    assert manifest["icons"] == [
        {"src": "assets/img/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml"},
        {"src": "assets/img/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml"},
    ]
