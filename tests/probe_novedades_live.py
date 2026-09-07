import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "assets" / "js" / "novedades-config.js"
EXPECTED_IDS = [
    "whatsapp-2026-09-07",
    "leer-en-comunidad-2026-09-04",
    "re-bonaerense-2026",
]


def read_endpoint() -> str:
    source = CONFIG.read_text(encoding="utf-8")
    match = re.search(r"EES18_NOVEDADES_API_URL\s*=\s*['\"]([^'\"]*)['\"]", source)
    assert match, "No se encontró EES18_NOVEDADES_API_URL en novedades-config.js"
    endpoint = match.group(1).strip()
    assert endpoint.startswith("https://script.google.com/macros/s/"), "Endpoint de Novedades inválido"
    assert endpoint.endswith("/exec"), "El endpoint productivo debe terminar en /exec"
    return endpoint


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "EES18-Novedades-Probe/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        assert 200 <= response.status < 300, f"HTTP inesperado: {response.status}"
        raw = response.read().decode("utf-8", errors="replace")
        try:
            return json.loads(raw)
        except json.JSONDecodeError as error:
            content_type = response.headers.get("Content-Type", "")
            preview = re.sub(r"\s+", " ", raw[:500]).strip()
            raise AssertionError(
                f"El endpoint no devolvió JSON. Content-Type={content_type!r}. Inicio={preview!r}"
            ) from error


def main() -> None:
    endpoint = read_endpoint()
    url = endpoint + "?" + urllib.parse.urlencode({"section": "inicio"})
    payload = fetch_json(url)

    assert payload.get("ok") is True, f"Novedades no respondió ok=true: {payload}"
    assert payload.get("section") == "inicio", f"Sección inesperada: {payload.get('section')}"
    items = payload.get("items")
    assert isinstance(items, list), "items debe ser una lista"
    assert len(items) >= 3, f"Se esperaban al menos 3 novedades y llegaron {len(items)}"

    ids = [item.get("id") for item in items if isinstance(item, dict)]
    for expected_id in EXPECTED_IDS:
        assert expected_id in ids, f"Falta seed productivo: {expected_id}"
    assert ids[:3] == EXPECTED_IDS, f"Orden productivo inesperado: {ids[:3]}"

    forbidden_keys = {
        "Activa", "Actualizada", "activa", "actualizada", "email", "token",
        "write", "update", "delete", "post", "doPost",
    }
    for item in items:
        assert isinstance(item, dict), "Cada novedad debe ser un objeto"
        leaked = forbidden_keys.intersection(item.keys())
        assert not leaked, f"El payload expone claves internas: {sorted(leaked)}"

    print("probe_novedades_live.py: OK")


if __name__ == "__main__":
    main()
