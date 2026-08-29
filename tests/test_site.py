from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PRINCIPAL = [
    "index.html",
    "nuestra-escuela.html",
    "propuesta-educativa.html",
    "tramites.html",
    "vida-escolar.html",
    "ingreso-2027.html",
    "contacto.html",
]
DETAIL = [
    "historia.html",
    "plan-estudios.html",
    "comunicados.html",
    "pases-equivalencias.html",
    "consultar-estado.html",
    "certificado-analitico.html",
    "boleto-estudiantil.html",
    "404.html",
]
NAV_LINKS = [
    "index.html",
    "nuestra-escuela.html",
    "propuesta-educativa.html",
    "tramites.html",
    "vida-escolar.html",
    "ingreso-2027.html",
    "contacto.html",
]


def read(name):
    return ROOT.joinpath(name).read_text(encoding="utf-8")


def test_paginas_principales_existen():
    for name in PRINCIPAL + DETAIL:
        assert ROOT.joinpath(name).exists(), f"Falta la página pública {name}"


def test_identidad_actual_en_portada():
    html = read("index.html")
    assert "ESCUELA DE EDUCACIÓN SECUNDARIA Nº 18" in html
    assert "PRÓSPERO ALEMANDRI" in html
    assert "E.E.S. Nº 18" in html


def test_portada_es_resumen_y_distribuidor():
    html = read("index.html")
    for href in NAV_LINKS:
        assert f'href="{href}"' in html, f"La portada debe enlazar {href}"
    assert "2.º Encuentro de RE Bonaerense" in html
    assert 'src="assets/img/re-bonaerense-2024.jpg"' in html
    assert 'href="vida-escolar.html"' in html
    assert 'href="tramites.html"' in html
    assert 'href="propuesta-educativa.html"' in html
    assert 'href="nuestra-escuela.html"' in html


def test_navegacion_comun_y_misma_pestana():
    for name in PRINCIPAL + DETAIL:
        html = read(name)
        for href in NAV_LINKS:
            assert f'href="{href}"' in html, f"{name} debe enlazar {href}"
        assert 'target="_blank"' not in html, f"{name} abre una pestaña nueva"


def test_nuestra_escuela_reune_informacion_institucional():
    html = read("nuestra-escuela.html")
    for item in [
        "061097100",
        "Ana Lanni",
        "Adriana Celeste Caceres",
        "Anabella Centurión",
        "María de los Ángeles Dimola",
        "Biblioteca",
        "Sala de Audiovisuales",
        "EOE",
        "Centro de Estudiantes",
        "SUM",
        "Cooperadora",
        "Patio para Educación Física",
        "Av. Manuel Belgrano 355",
        "historia.html",
    ]:
        assert item in html, f"Falta contenido institucional: {item}"


def test_propuesta_educativa_y_plan():
    proposal = read("propuesta-educativa.html")
    for item in ["Ciclo Básico", "Comunicación", "Ciencias Sociales", "Lenguas Extranjeras", "Ciencias Naturales"]:
        assert item in proposal
    assert 'href="plan-estudios.html"' in proposal

    plan = read("plan-estudios.html")
    for item in [
        "Ciclo Básico común", "1º año", "2º año", "3º año",
        "Ciencias Naturales", "Ciencias Sociales", "Educación Artística",
        "Educación Física", "Inglés", "Matemática", "Prácticas del Lenguaje",
        "Construcción de Ciudadanía", "Biología", "Físico-Química",
        "Geografía", "Historia",
    ]:
        assert item in plan, f"Falta contenido del plan: {item}"
    for orientation in ["Comunicación", "Ciencias Sociales", "Lenguas Extranjeras", "Ciencias Naturales"]:
        assert orientation in plan
    for year in ["4º año", "5º año", "6º año"]:
        assert plan.count(year) >= 4
    for subject in [
        "Introducción a la Comunicación", "Observatorio de Medios",
        "Economía Política", "Sociología", "Proyecto de Investigación en Ciencias Sociales",
        "Portugués I", "Portugués II", "Portugués III", "Francés I", "Francés II", "Francés III",
        "Fundamentos de la Química", "Ciencias de la Tierra", "Química del Carbono",
        "Biología, Genética y Sociedad", "Física Clásica y Moderna",
    ]:
        assert subject in plan


def test_orientaciones_arrancan_todas_cerradas():
    plan = read("plan-estudios.html")
    assert plan.count('class="orientation-study"') == 4
    for orientation_id in ["comunicacion", "sociales", "lenguas", "naturales"]:
        assert f'<details class="orientation-study" id="{orientation_id}">' in plan


def test_centro_de_tramites_enlaza_detalles():
    html = read("tramites.html")
    for href in [
        "pases-equivalencias.html",
        "consultar-estado.html",
        "certificado-analitico.html",
        "boleto-estudiantil.html",
    ]:
        assert f'href="{href}"' in html


def test_vida_escolar_publicada_y_visible():
    home = read("index.html")
    vida = read("vida-escolar.html")
    for html in [home, vida]:
        assert "2.º Encuentro de RE Bonaerense" in html
        assert 'assets/img/re-bonaerense-2024.jpg' in html
    assert "Estudiantes hacen memoria" in vida
    assert "micro relatos" in vida


def test_contacto_institucional_en_pagina_propia():
    html = read("contacto.html")
    for item in [
        "secundaria18avellaneda@abc.gob.ar",
        "Lunes a viernes",
        "9:00 a 11:00",
        "14:00 a 16:00",
        "Av. Manuel Belgrano 355",
        "061097100",
        "mapa.educacion.gob.ar/legajo/061097100",
    ]:
        assert item in html


def test_no_contenido_terciario_en_portada():
    html = read("index.html")
    forbidden = [
        "ISFD Nº 100", "ISFD N° 100", "Profesorado de Educación",
        "carreras terciarias", "ingresantes 2025",
    ]
    for item in forbidden:
        assert item not in html


def test_certificado_analitico_se_conserva():
    tramite = read("certificado-analitico.html")
    for item in [
        "Certificado Analítico", "Solicitud de Certificado de Estudios",
        "Copia actualizada del DNI", "Copia de la Partida de Nacimiento",
        "Constancia de solicitud de vacante", "Analítico Parcial",
        "NO SE RECIBE documentación incompleta", "NO SE INICIA el trámite",
    ]:
        assert item in tramite


def test_boleto_estudiantil_se_conserva():
    boleto = read("boleto-estudiantil.html")
    for item in [
        "Boleto Especial Educativo", "18 de febrero de 2026",
        "CUIL sin guiones", "Presioná “Siguiente”",
        "https://www.gba.gob.ar/transporte/boleto_estudiantil",
        "https://boleto.gba.gob.ar/modulos/boleto/publico.php",
        "https://denuncias-bes.transporte.gba.gob.ar",
    ]:
        assert item in boleto


def test_redirecciones_historicas():
    assert "vida-escolar.html" in read("enspa-en-accion.html")
    old_visit = read("visitas-enspa.html")
    assert "visitas-ees18.html" in old_visit or "ingreso-2027.html" in old_visit


def test_accesibilidad_minima_y_javascript():
    html = read("index.html")
    js = read("assets/js/main.js")
    assert 'href="#contenido"' in html
    assert 'aria-controls="primary-nav"' in html
    assert 'aria-expanded="false"' in html
    assert "aria-expanded" in js
    assert "prefers-reduced-motion" in js
