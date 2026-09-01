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

SLOT_ORDER = ["M1", "M2", "M3", "M4", "M5", "T1", "T2", "T3", "T4", "T5"]
MARKER = "PRUEBA E2E V5 2026-09-01 18:05"
EMAIL = "secundaria18avellaneda@abc.gob.ar"


def get_json(params, timeout=75):
    url = BASE_URL + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "EES18-reservas-create-v5-once/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def choose_slot():
    for year, month in [(2026, 9), (2026, 10)]:
        month_data = get_json({"action": "month", "year": str(year), "month": str(month)}, timeout=45)
        assert month_data.get("ok") is True, month_data
        for iso_date in sorted(month_data.get("days", {})):
            if iso_date <= "2026-09-01":
                continue
            info = month_data["days"][iso_date]
            if info.get("status") not in {"available", "partial"}:
                continue
            occupied = set(info.get("occupiedSlotIds") or [])
            for slot_id in SLOT_ORDER:
                if slot_id not in occupied:
                    return iso_date, slot_id
    raise RuntimeError("No free slot found for controlled E2E")


date_iso, slot_id = choose_slot()
payload = {
    "mode": "single",
    "date": date_iso,
    "slotIds": [slot_id],
    "teacher": "PRUEBA TÉCNICA SISTEMA",
    "email": EMAIL,
    "course": "PRUEBA",
    "subject": MARKER,
    "resources": {},
    "observations": "Reserva técnica controlada para verificar Versión 5."
}
started = time.perf_counter()
result = get_json({"action": "create", "payload": json.dumps(payload, ensure_ascii=False)}, timeout=90)
elapsed = time.perf_counter() - started
print(f"E2E_CREATE_LATENCY {elapsed:.3f}s")
print("E2E_MARKER", MARKER)
print("E2E_DATE", date_iso)
print("E2E_SLOT", slot_id)
print("E2E_RESPONSE", json.dumps(result, ensure_ascii=False, sort_keys=True))
assert result.get("ok") is True, result
assert result.get("confirmed") == 1, result
reservations = result.get("reservations") or []
assert len(reservations) == 1, result
print("E2E_RESERVATION_ID", reservations[0].get("id", ""))
