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
payload = {
    "mode": "single",
    "date": "2026-09-02",
    "slotIds": ["M1"],
    "teacher": "PRUEBA DIAGNOSTICO",
    "email": "secundaria18avellaneda@abc.gob.ar",
    "course": "PRUEBA",
    "subject": "PRUEBA",
    "resources": {},
    "observations": "Diagnóstico de solo lectura"
}
params = {
    "action": "diagnoseCreate",
    "payload": json.dumps(payload, ensure_ascii=False),
}
url = BASE_URL + "?" + urllib.parse.urlencode(params)
request = urllib.request.Request(url, headers={"User-Agent": "EES18-reservas-diagnose-once/1.0"})
with urllib.request.urlopen(request, timeout=60) as response:
    result = json.loads(response.read().decode("utf-8"))

print("DIAGNOSE_CREATE", json.dumps(result, ensure_ascii=False, sort_keys=True))
assert result.get("ok") is True, result
assert result.get("stage") == "READY", result
assert result.get("target", {}).get("canEdit") is True, result
