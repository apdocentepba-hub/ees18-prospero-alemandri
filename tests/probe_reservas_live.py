import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = (ROOT / "assets/js/reservas-config.js").read_text(encoding="utf-8")

match = re.search(r"EES18_RESERVAS_API_URL\s*=\s*'([^']+)'", CONFIG)
if not match:
    raise SystemExit("No deployed reservation Web App URL configured")

BASE_URL = match.group(1)
if not BASE_URL.startswith("https://script.google.com/") or not BASE_URL.endswith("/exec"):
    raise SystemExit("Reservation Web App URL is not a valid Apps Script /exec URL")


def get_json(params):
    url = BASE_URL + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "EES18-reservas-pilot-probe/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"Unexpected HTTP status: {response.status}")
        return json.loads(response.read().decode("utf-8"))


health = get_json({"action": "health"})
assert health.get("ok") is True, health
assert health.get("service") == "reservas-audiovisuales", health

availability = get_json({"action": "availability", "date": "2026-09-01"})
assert availability.get("ok") is True, availability
assert availability.get("date") == "2026-09-01", availability
assert availability.get("status") in {"available", "partial", "full", "blocked"}, availability
assert isinstance(availability.get("slots"), list), availability
assert len(availability["slots"]) == 10, availability

serialized = json.dumps(availability, ensure_ascii=False).lower()
for forbidden in ("teacher", "profesor", "correo", "email", "materia", "course", "curso"):
    assert forbidden not in serialized, f"Public availability leaked forbidden field: {forbidden}"

print(
    "reservation Web App live probe OK:",
    availability.get("status"),
    f"{availability.get('free')}/{availability.get('total')} free slots",
)
