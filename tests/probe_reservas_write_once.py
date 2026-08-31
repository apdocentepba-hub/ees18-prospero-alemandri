import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = (ROOT / "assets/js/reservas-config.js").read_text(encoding="utf-8")
match = re.search(r"EES18_RESERVAS_API_URL\s*=\s*'([^']+)'", CONFIG)
if not match:
    raise SystemExit("No reservation Web App URL configured")

BASE_URL = match.group(1)
payload = {
    "action": "create",
    "payload": {
        "mode": "single",
        "date": "2026-09-03",
        "repeatUntil": "",
        "slotIds": ["M1"],
        "teacher": "PRUEBA SISTEMA AUTOMATICA",
        "email": "pilot-reservas@example.com",
        "course": "PILOTO",
        "subject": "Prueba técnica del sistema",
        "resources": {
            "projector": False,
            "speakers": False,
            "schoolNotebook": False,
            "internet": False,
        },
        "observations": "Reserva técnica creada por el piloto. No corresponde a una reserva docente real.",
    },
}

request = urllib.request.Request(
    BASE_URL,
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "User-Agent": "EES18-reservas-pilot-write-probe/1.0",
    },
    method="POST",
)

with urllib.request.urlopen(request, timeout=45) as response:
    result = json.loads(response.read().decode("utf-8"))

if result.get("ok") is True:
    assert result.get("confirmed") == 1, result
    reservations = result.get("reservations") or []
    assert len(reservations) == 1, result
    assert reservations[0].get("date") == "2026-09-03", result
    assert reservations[0].get("start") == "07:30", result
    assert reservations[0].get("end") == "08:30", result
    print("pilot write probe CREATED", reservations[0].get("id"))
elif result.get("code") == "CONFLICT":
    print("pilot write probe slot already occupied; no duplicate created")
else:
    raise AssertionError(result)
