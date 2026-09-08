import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "assets" / "js" / "novedades-config.js"
EXPECTED_IDS = {
    "inicio": [
        "whatsapp-2026-09-07",
        "leer-en-comunidad-2026-09-04",
        "re-bonaerense-2026",
    ],
    "comunicados": ["whatsapp-2026-09-07"],
    "vida-escolar": [
        "leer-en-comunidad-2026-09-04",
        "re-bonaerense-2026",
    ],
}
FORBIDDEN_KEYS = {
    "Activa", "Actualizada", "activa", "actualizada", "email", "token",
    "write", "update", "delete", "post", "doPost",
}


def read_endpoint() -> str:
    source = CONFIG.read_text(encoding="utf-8")
    match = re.search(r"EES18_NOVEDADES_API_URL\s*=\s*['\"]([^'\"]*)['\"]", source)
    assert match, "No se encontró EES18_NOVEDADES_API_URL en novedades-config.js"
    endpoint = match.group(1).strip()
    assert endpoint.startswith("https://script.google.com/macros/s/"), "Endpoint de Novedades inválido"
    assert endpoint.endswith("/exec"), "El endpoint productivo debe terminar en /exec"
    return endpoint


def fetch_text(url: str) -> tuple[str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "EES18-Novedades-Probe/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        assert 200 <= response.status < 300, f"HTTP inesperado: {response.status}"
        return response.read().decode("utf-8", errors="replace"), response.headers.get("Content-Type", "")


def parse_json(raw: str, content_type: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        preview = re.sub(r"\s+", " ", raw[:500]).strip()
        raise AssertionError(
            f"El endpoint no devolvió JSON. Content-Type={content_type!r}. Inicio={preview!r}"
        ) from error


def assert_payload(section: str, payload: dict) -> None:
    assert payload.get("ok") is True, f"{section}: no respondió ok=true: {payload}"
    assert payload.get("section") == section, f"{section}: sección inesperada: {payload.get('section')}"
    items = payload.get("items")
    assert isinstance(items, list), f"{section}: items debe ser una lista"

    ids = [item.get("id") for item in items if isinstance(item, dict)]
    expected = EXPECTED_IDS[section]
    assert ids == expected, f"{section}: IDs/orden inesperados: {ids}"

    for item in items:
        assert isinstance(item, dict), f"{section}: cada novedad debe ser un objeto"
        leaked = FORBIDDEN_KEYS.intersection(item.keys())
        assert not leaked, f"{section}: el payload expone claves internas: {sorted(leaked)}"


def main() -> None:
    endpoint = read_endpoint()

    for section in EXPECTED_IDS:
        url = endpoint + "?" + urllib.parse.urlencode({"section": section})
        raw, content_type = fetch_text(url)
        payload = parse_json(raw, content_type)
        assert_payload(section, payload)

    callback = "ees18Probe"
    jsonp_url = endpoint + "?" + urllib.parse.urlencode({"section": "inicio", "callback": callback})
    raw, content_type = fetch_text(jsonp_url)
    assert "javascript" in content_type.lower(), f"JSONP debe devolver JavaScript, llegó {content_type!r}"
    prefix = callback + "("
    assert raw.startswith(prefix) and raw.endswith(");"), f"JSONP inválido: {raw[:120]!r}"
    payload = json.loads(raw[len(prefix):-2])
    assert_payload("inicio", payload)

    print("probe_novedades_live.py: OK")


if __name__ == "__main__":
    main()
