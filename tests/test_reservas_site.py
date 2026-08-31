from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_reservas_page_has_calendar_slots_and_form():
    html = read("reservas-audiovisuales.html")
    for marker in (
        'id="booking-calendar"',
        'id="selected-date-title"',
        'id="morning-slots"',
        'id="afternoon-slots"',
        'id="selection-summary"',
        'id="booking-form"',
        'id="booking-result"',
    ):
        assert marker in html


def test_reservas_page_is_integrated_under_docentes():
    html = read("reservas-audiovisuales.html")
    assert 'href="docentes.html" aria-current="page"' in html
    assert "Sistema nuevo en etapa de prueba" in html
    assert "assets/css/reservas-audiovisuales.css" in html
    assert "assets/js/reservas-audiovisuales.js" in html


def test_public_reservation_page_does_not_expose_private_booking_fields():
    html = read("reservas-audiovisuales.html")
    forbidden = (
        "Responsable que confirma",
        "Motivo conflicto/rechazo",
        "ID evento calendario",
        "Hash cancelación",
        "Sistema Reservas Salón Audiovisuales - BASE",
    )
    for value in forbidden:
        assert value not in html


def test_docentes_keeps_current_form_during_pilot():
    html = read("docentes.html")
    assert "1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw/viewform" in html
