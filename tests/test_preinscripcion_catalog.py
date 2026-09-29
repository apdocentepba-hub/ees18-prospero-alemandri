import http.client
import importlib.util
from pathlib import Path

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
