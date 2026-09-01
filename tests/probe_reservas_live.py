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
FORBIDDEN_PUBLIC_FIELDS = ("teacher", "profesor", "correo", "email", "materia", "course", "curso")


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

# Safe guard-path probe: INVALID date guarantees no reservation can be created.
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

print(
    "reservation Web App production probe OK:",
    health.get("environment"),
    availability.get("status"),
    f"{availability.get('free')}/{availability.get('total')} free slots",
    "month slot contract OK",
    "external email blocked",
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
    }, sort_keys=True),
)
