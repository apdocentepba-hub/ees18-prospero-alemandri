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


def get_json(params):
    url = BASE_URL + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "EES18-reservas-pilot-write/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))

chosen = None
for date in ("2026-09-03", "2026-09-04"):
    availability = get_json({"action": "availability", "date": date})
    if not availability.get("ok"):
        continue
    for slot in reversed(availability.get("slots", [])):
        if slot.get("available"):
            chosen = (date, slot["id"], slot["start"], slot["end"])
            break
    if chosen:
        break

if not chosen:
    raise SystemExit("No free pilot slot found on 2026-09-03 or 2026-09-04")

date, slot_id, start, end = chosen
payload = {
    "mode": "single",
    "date": date,
    "repeatUntil": "",
    "slotIds": [slot_id],
    "teacher": "PRUEBA SISTEMA",
    "email": "martin.nicolas.podubinio@gmail.com",
    "course": "PRUEBA",
    "subject": "PRUEBA SISTEMA RESERVAS",
    "resources": {
        "projector": False,
        "speakers": False,
        "schoolNotebook": False,
        "internet": False,
    },
    "observations": "PRUEBA PILOTO AUTOMATIZADA. CANCELAR AL FINALIZAR LA VERIFICACION."
}

result = get_json({"action": "create", "payload": json.dumps(payload, ensure_ascii=False, separators=(",", ":"))})
if not result.get("ok") or result.get("confirmed") != 1:
    raise SystemExit("Pilot reservation creation failed: " + json.dumps(result, ensure_ascii=False))

reservation = result["reservations"][0]
print("PILOT_RESERVATION_CREATED")
print("id=" + reservation["id"])
print("date=" + reservation["date"])
print("slot=" + slot_id)
print("time=" + reservation["start"] + "-" + reservation["end"])
