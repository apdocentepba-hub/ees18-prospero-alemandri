from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT.joinpath("index.html").read_text(encoding="utf-8")
JS = ROOT.joinpath("assets/js/main.js").read_text(encoding="utf-8")


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


def test_ciclo_basico_comun():
    plan_path = ROOT / "plan-estudios.html"
    assert plan_path.exists(), "Falta la página Plan de estudios"
    plan = plan_path.read_text(encoding="utf-8")
    for item in [
        'Ciclo Básico común', '1º año', '2º año', '3º año',
        'Ciencias Naturales', 'Ciencias Sociales', 'Educación Artística',
        'Educación Física', 'Inglés', 'Matemática', 'Prácticas del Lenguaje',
        'Construcción de Ciudadanía', 'Biología', 'Físico-Química',
        'Geografía', 'Historia'
    ]:
        assert item in plan, f"Falta contenido del plan: {item}"


def test_ciclo_orientado_completo():
    plan = ROOT.joinpath("plan-estudios.html").read_text(encoding="utf-8")
    for orientation in ['Comunicación', 'Ciencias Sociales', 'Lenguas Extranjeras', 'Ciencias Naturales']:
        assert orientation in plan, f"Falta orientación: {orientation}"
    for year in ['4º año', '5º año', '6º año']:
        assert plan.count(year) >= 4, f"Faltan recorridos de {year} en las orientaciones"
    for subject in [
        'Introducción a la Comunicación', 'Observatorio de Medios',
        'Economía Política', 'Sociología', 'Proyecto de Investigación en Ciencias Sociales',
        'Portugués I', 'Portugués II', 'Portugués III', 'Francés I', 'Francés II', 'Francés III',
        'Fundamentos de la Química', 'Ciencias de la Tierra', 'Química del Carbono',
        'Biología, Genética y Sociedad', 'Física Clásica y Moderna'
    ]:
        assert subject in plan, f"Falta materia del ciclo orientado: {subject}"


def test_portada_reorganizada():
    require('id="comunidad"')
    require('class="current-grid"')
    require('href="plan-estudios.html"')
    require('href="assets/css/home-layout.css"')
    require('Propuesta educativa')
    require('Comunidad educativa')
    require('Actualidad y agenda')

    nav_start = HTML.index('<nav class="primary-nav"')
    nav_end = HTML.index('</nav>', nav_start)
    nav = HTML[nav_start:nav_end]
    assert 'href="#institucion"' in nav
    assert 'href="#orientaciones"' in nav
    assert 'href="#tramites"' in nav
    assert 'href="#comunidad"' in nav
    assert 'href="#calendario"' in nav
    assert 'href="#contacto"' in nav
    assert 'href="#estudiantes"' not in nav
    assert 'href="#familias"' not in nav
    assert 'href="#docentes"' not in nav


def test_plan_no_se_duplica_desde_javascript():
    assert 'study-plan-cta' not in JS
    assert 'plan-estudios.css' not in JS


def test_contacto_institucional():
    require('secundaria18avellaneda@abc.gob.ar')
    require('Lunes a viernes · 9:00 a 11:00')
    require('Lunes a viernes · 14:00 a 16:00')


def test_accesibilidad_minima():
    require('href="#contenido"')
    require('aria-controls="primary-nav"')
    require('aria-expanded="false"')
