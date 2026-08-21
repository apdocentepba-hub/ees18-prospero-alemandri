from pathlib import Path

HTML = Path(__file__).resolve().parents[1].joinpath("index.html").read_text(encoding="utf-8")


def require(text):
    assert text in HTML, f"Falta contenido requerido: {text}"


def test_portal_secundario_enspa():
    require('class="enspa-logo"')
    require('id="tramites"')
    require('id="estudiantes"')
    require('id="familias"')
    require('id="docentes"')
    require('id="orientaciones"')
    require('id="calendario"')
    require('E.E.S. Nº 18')
    require('PRÓSPERO ALEMANDRI')
    require('Av. Belgrano 311')


def test_no_contenido_terciario():
    forbidden = [
        'ISFD Nº 100', 'ISFD N° 100', 'Instituto Superior de Formación Docente',
        'Profesorado de Educación', 'carreras terciarias', 'ingresantes 2025'
    ]
    for item in forbidden:
        assert item not in HTML, f"Contenido de nivel terciario detectado: {item}"


def test_tramites_basicos_presentes():
    for item in [
        'Inscripciones', 'Constancias y certificados', 'Pases y equivalencias',
        'Títulos y analíticos', 'Boleto estudiantil'
    ]:
        require(item)


def test_accesibilidad_minima():
    require('href="#contenido"')
    require('aria-controls="primary-nav"')
    require('aria-expanded="false"')
