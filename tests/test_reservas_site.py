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


def test_reservas_page_is_integrated_under_docentes_as_active_system():
    html = read("reservas-audiovisuales.html")
    assert 'href="docentes.html" aria-current="page"' in html
    assert "Sistema de reservas activo" in html
    assert "Etapa piloto" not in html
    assert "Sistema nuevo en etapa de prueba" not in html
    assert "assets/css/reservas-audiovisuales.css" in html
    assert "assets/js/reservas-config.js" in html
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


def test_docentes_promotes_new_system_and_keeps_old_form_as_contingency():
    html = read("docentes.html")
    assert "1HR7ok7hQN-RQJx8bdS8ld2MRbA1dAMv8bazhk_KQrXw/viewform" in html
    assert 'href="reservas-audiovisuales.html"' in html
    assert "Reservar Salón de Audiovisuales" in html
    assert "Contingencia" in html
    assert "Piloto" not in html
    assert "Sistema actual" not in html
    assert "Probar nuevo sistema de reservas" not in html


def test_reservas_config_uses_deployed_https_web_app():
    config = read("assets/js/reservas-config.js")
    assert "window.EES18_RESERVAS_API_URL = 'https://script.google.com/macros/s/" in config
    assert "/exec';" in config
    assert "EES18_RESERVAS_API_URL = '';" not in config


def test_cancel_page_hides_booking_data_until_token_validation():
    html = read("cancelar-reserva.html")
    assert 'id="cancel-loading"' in html
    assert 'id="cancel-details"' in html
    assert 'id="cancel-confirm"' in html
    assert 'id="cancel-result"' in html
    assert 'id="cancel-details" hidden' in html
    assert 'id="cancel-confirm"' in html and "disabled" in html
    assert "Profesor/a" not in html
    assert "Correo docente" not in html
