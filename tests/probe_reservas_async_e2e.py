import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = (ROOT / "assets/js/reservas-config.js").read_text(encoding="utf-8")
match = re.search(r"EES18_RESERVAS_API_URL\s*=\s*'([^']+)'", CONFIG)
if not match:
    raise SystemExit("No deployed reservation Web App URL configured")

BASE_URL = match.group(1)
MARKER = "PRUEBA ASYNC CONTROL 20260901-1630"
PAYLOAD = {
    "mode": "single",
    "date": "2026-09-02",
    "slotIds": ["M1"],
    "teacher": "PRUEBA TECNICA ASYNC",
    "email": "secundaria18avellaneda@abc.gob.ar",
    "course": MARKER,
    "subject": MARKER,
    "resources": {},
    "observations": "Prueba técnica controlada de confirmación asíncrona. Eliminar al finalizar.",
}

url = BASE_URL + "?" + urllib.parse.urlencode({
    "action": "create",
    "payload": json.dumps(PAYLOAD, ensure_ascii=False),
})
request = urllib.request.Request(url, headers={"User-Agent": "EES18-reservas-async-e2e/1.0"})
started = time.perf_counter()
with urllib.request.urlopen(request, timeout=30) as response:
    body = json.loads(response.read().decode("utf-8"))
elapsed = time.perf_counter() - started
print(f"ASYNC_CREATE_LATENCY {elapsed:.3f}s")
print("ASYNC_CREATE_RESPONSE", json.dumps(body, ensure_ascii=False, sort_keys=True))
assert body.get("ok") is True, body
assert body.get("confirmed") == 1, body
assert body.get("secondaryProcessing") in {"queued", "pending"}, body
reservation = (body.get("reservations") or [None])[0]
assert reservation and reservation.get("id"), body
print("ASYNC_CREATE_ID", reservation["id"])
