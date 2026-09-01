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
if not BASE_URL.startswith("https://script.google.com/") or not BASE_URL.endswith("/exec"):
    raise SystemExit("Reservation Web App URL is not a valid Apps Script /exec URL")

ALLOWED_SLOT_IDS = {"M1", "M2", "M3", "M4", "M5", "T1", "T2", "T3", "T4", "T5"}
ORDERED_SLOT_IDS = ["M1", "M2", "M3", "M4", "M5", "T1", "T2", "T3", "T4", "T5"]
FORBIDDEN_PUBLIC_FIELDS = ("teacher", "profesor", "correo", "email", "materia", "course", "curso")
E2E_MARKER = "PRUEBA ASYNC 20260901-1426"


def get_json(params):
    url = BASE_URL + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "EES18-reservas-production-probe/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"Unexpected HTTP status: {response.status}")
        return json.loads(response.read().decode("utf-8"))


def timed_get_json(label, params):
    started = time.perf_counter()
    payload = get_json(params)
    elapsed = time.perf_counter() - started
    print(f"LATENCY {label}: {elapsed:.3f}s")
    return payload, elapsed


health, health_latency = timed_get_json("health", {"action": "health"})
assert health.get("ok") is True, health
assert health.get("service") == "reservas-audiovisuales", health
assert health.get("environment") == "production", health

month_cold, month_cold_latency = timed_get_json("month-cold", {
    "action": "month",
    "year": "2026",
    "month": "9",
})
assert month_cold.get("ok") is True, month_cold
assert isinstance(month_cold.get("days"), dict), month_cold
assert month_cold["days"], "month endpoint returned no days"
for iso_date, day_info in month_cold["days"].items():
    assert isinstance(day_info, dict), (iso_date, day_info)
    assert isinstance(day_info.get("occupiedSlotIds"), list), (
        f"Production month contract missing occupiedSlotIds for {iso_date}: {day_info}"
    )
    assert set(day_info["occupiedSlotIds"]).issubset(ALLOWED_SLOT_IDS), (iso_date, day_info)

serialized_month = json.dumps(month_cold, ensure_ascii=False).lower()
for forbidden in FORBIDDEN_PUBLIC_FIELDS:
    assert forbidden not in serialized_month, f"Public month availability leaked forbidden field: {forbidden}"

month_warm, month_warm_latency = timed_get_json("month-warm", {
    "action": "month",
    "year": "2026",
    "month": "9",
})
assert month_warm.get("ok") is True, month_warm
assert month_warm.get("days") == month_cold.get("days"), "month responses changed between consecutive reads"

availability, availability_cold_latency = timed_get_json("availability-cold", {
    "action": "availability",
    "date": "2026-09-01",
})
assert availability.get("ok") is True, availability
assert availability.get("date") == "2026-09-01", availability
assert availability.get("status") in {"available", "partial", "full", "blocked"}, availability
assert isinstance(availability.get("slots"), list), availability
assert len(availability["slots"]) == 10, availability

availability_warm, availability_warm_latency = timed_get_json("availability-warm", {
    "action": "availability",
    "date": "2026-09-01",
})
assert availability_warm.get("ok") is True, availability_warm
assert availability_warm.get("slots") == availability.get("slots"), "availability changed between consecutive reads"

serialized = json.dumps(availability, ensure_ascii=False).lower()
for forbidden in FORBIDDEN_PUBLIC_FIELDS:
    assert forbidden not in serialized, f"Public availability leaked forbidden field: {forbidden}"

external_email_probe, guard_latency = timed_get_json("external-email-guard", {
    "action": "create",
    "payload": json.dumps({
        "mode": "single",
        "date": "INVALID",
        "slotIds": ["M1"],
        "teacher": "Prueba CI",
        "email": "prueba@gmail.com",
        "course": "PRUEBA",
        "subject": "PRUEBA",
        "resources": {},
    }, ensure_ascii=False),
})
assert external_email_probe.get("ok") is False, external_email_probe
assert external_email_probe.get("code") == "INSTITUTIONAL_EMAIL_REQUIRED", external_email_probe

# One-shot controlled E2E probe for the async confirmation cutover.
selected_date = None
selected_slot = None
for iso_date in sorted(month_warm["days"]):
    if iso_date < "2026-09-02":
        continue
    day_info = month_warm["days"][iso_date]
    if day_info.get("status") not in {"available", "partial"}:
        continue
    occupied = set(day_info.get("occupiedSlotIds") or [])
    free_slots = [slot_id for slot_id in ORDERED_SLOT_IDS if slot_id not in occupied]
    if free_slots:
        selected_date = iso_date
        selected_slot = free_slots[0]
        break

assert selected_date and selected_slot, "No future free slot found for controlled async E2E probe"

create_payload = {
    "mode": "single",
    "date": selected_date,
    "slotIds": [selected_slot],
    "teacher": "PRUEBA TECNICA ASYNC",
    "email": "secundaria18avellaneda@abc.gob.ar",
    "course": E2E_MARKER,
    "subject": E2E_MARKER,
    "resources": {},
    "observations": "Prueba técnica controlada de confirmación asíncrona; eliminar/cancelar al finalizar.",
}
create_response, create_latency = timed_get_json("create-async-e2e", {
    "action": "create",
    "payload": json.dumps(create_payload, ensure_ascii=False),
})
assert create_response.get("ok") is True, create_response
assert create_response.get("confirmed") == 1, create_response
assert create_response.get("secondaryProcessing") in {"queued", "pending"}, create_response
created = (create_response.get("reservations") or [None])[0]
assert created and created.get("id"), create_response
reservation_id = created["id"]
print("ASYNC_E2E", json.dumps({
    "marker": E2E_MARKER,
    "reservation_id": reservation_id,
    "date": selected_date,
    "slot": selected_slot,
    "secondaryProcessing": create_response.get("secondaryProcessing"),
    "create_latency": round(create_latency, 3),
}, ensure_ascii=False, sort_keys=True))

# The room must be occupied immediately, independently of Calendar/Mail completion.
time.sleep(1)
after_create, after_create_latency = timed_get_json("availability-after-create", {
    "action": "availability",
    "date": selected_date,
})
assert after_create.get("ok") is True, after_create
slot_after_create = next((slot for slot in after_create.get("slots", []) if slot.get("id") == selected_slot), None)
assert slot_after_create is not None, after_create
assert slot_after_create.get("available") is False, after_create

print(
    "reservation Web App production probe OK:",
    health.get("environment"),
    availability.get("status"),
    f"{availability.get('free')}/{availability.get('total')} free slots",
    "month slot contract OK",
    "external email blocked",
    "async create queued",
)
print(
    "LATENCY SUMMARY",
    json.dumps({
        "health": round(health_latency, 3),
        "month_cold": round(month_cold_latency, 3),
        "month_warm": round(month_warm_latency, 3),
        "availability_cold": round(availability_cold_latency, 3),
        "availability_warm": round(availability_warm_latency, 3),
        "external_email_guard": round(guard_latency, 3),
        "create_async_e2e": round(create_latency, 3),
        "availability_after_create": round(after_create_latency, 3),
    }, sort_keys=True),
)
