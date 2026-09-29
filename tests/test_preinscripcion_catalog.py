import http.client
import importlib.util
from pathlib import Path

from openpyxl import Workbook

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'build_preinscripcion_catalog.py'
spec = importlib.util.spec_from_file_location('preinscripcion_catalog', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeResponse:
    def __init__(self, payload=None, error=None):
        self.payload = payload
        self.error = error

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        if self.error:
            raise self.error
        return self.payload


def test_fetch_source_retries_incomplete_chunked_response(monkeypatch):
    responses = iter([
        FakeResponse(error=http.client.IncompleteRead(b'parcial', 840)),
        FakeResponse(payload=b'ok'),
    ])
    calls = {'count': 0}

    def fake_urlopen(*args, **kwargs):
        calls['count'] += 1
        return next(responses)

    monkeypatch.setattr(module.urllib.request, 'urlopen', fake_urlopen)

    assert module.fetch_source() == 'ok'
    assert calls['count'] == 2


def test_build_rows_from_xlsx_filters_primary_state_and_private(tmp_path):
    workbook_path = tmp_path / 'nomina.xlsx'
    wb = Workbook()
    ws = wb.active
    ws.title = 'Nómina de Unidades de Servicio'
    for _ in range(6):
        ws.append([])
    ws.append([
        'Código Distrito DGCyE', 'CUE', 'Anexo', 'Clave Provincial',
        'Sector de gestión', 'Nombre del Establecimiento', 'Localidad',
        'Modalidad', 'Nivel', 'Código de Organización'
    ])
    ws.append(['005', '6000001', '0', '0005PP0001', 'Estatal', 'EP Nº 1', 'WILDE', 'Educación Común', 'Primario', 'PP'])
    ws.append(['005', '6000002', '0', '0005PP0002', 'Privado', 'COLEGIO PRIMARIO', 'AVELLANEDA', 'Educación Común', 'Primario', 'PP'])
    ws.append(['005', '6000003', '0', '0005MS0003', 'Estatal', 'SECUNDARIA Nº 3', 'WILDE', 'Educación Común', 'Secundario', 'MS'])
    wb.save(workbook_path)

    rows = module.build_rows_from_xlsx(workbook_path, [{'codigo': 5, 'nombre': 'AVELLANEDA'}])

    assert len(rows) == 2
    assert {row['gestion'] for row in rows} == {'Estatal', 'Privada'}
    assert {row['id'] for row in rows} == {'0005PP0001', '0005PP0002'}
    assert {row['localidad'] for row in rows} == {'WILDE', 'AVELLANEDA'}
    assert all(row['distritoCodigo'] == 5 for row in rows)
