#!/usr/bin/env python3
"""Build the 2027 preinscription primary-school snapshot from DGCyE open data."""

from __future__ import annotations

import csv
import http.client
import io
import json
import re
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DISTRICTS_PATH = ROOT / "data" / "preinscripcion-2027-distritos.json"
OUTPUT_PATH = ROOT / "data" / "preinscripcion-2027-primarias.json"
SOURCE_META_PATH = ROOT / "data" / "preinscripcion-2027-source.json"
SOURCE_URL = (
    "https://catalogo.datos.gba.gob.ar/dataset/"
    "4becb4b7-0a21-4fef-8f2c-30df7f345a01/resource/"
    "3951210e-7e0e-4fed-bbf1-0183e704c9ae/download/"
    "establecimientos-educativos-14092026.csv"
)


def norm(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return text


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def first(row: dict[str, str], *names: str) -> str:
    for name in names:
        value = row.get(name)
        if value is not None and clean(value):
            return clean(value)
    return ""


def decode_payload(payload: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return payload.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise RuntimeError("No se pudo decodificar el CSV oficial.")


def fetch_source() -> str:
    last_error = None
    for attempt in range(1, 5):
        request = urllib.request.Request(
            SOURCE_URL,
            headers={"User-Agent": "EES18-Preinscripcion-2027/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return decode_payload(response.read())
        except http.client.IncompleteRead as error:
            last_error = error
            if attempt < 4:
                time.sleep(0.5 * attempt)
    raise RuntimeError("La fuente oficial interrumpió la descarga luego de 4 intentos.") from last_error


def detect_delimiter(text: str) -> str:
    first_line = next((line for line in text.splitlines() if line.strip()), "")
    return ";" if first_line.count(";") > first_line.count(",") else ","


def parse_district_code(clave: str, valid_codes: set[int]) -> int | None:
    compact = re.sub(r"[^A-Za-z0-9]", "", clave or "").upper()
    candidates: list[str] = []
    for pattern in (r"^[A-Z](\d{3})", r"^(\d{3})[A-Z]", r"^[A-Z]\d?(\d{3})"):
        match = re.search(pattern, compact)
        if match:
            candidates.append(match.group(1))
    candidates.extend(re.findall(r"\d{3}", compact[:8]))
    for value in candidates:
        code = int(value)
        if code in valid_codes:
            return code
    return None


def sector_label(raw: str) -> str | None:
    value = norm(raw)
    if "estatal" in value:
        return "Estatal"
    if "privad" in value:
        return "Privada"
    return None


def build_rows(text: str, districts: list[dict[str, object]]) -> list[dict[str, object]]:
    district_names = {int(item["codigo"]): str(item["nombre"]) for item in districts}
    valid_codes = set(district_names)
    delimiter = detect_delimiter(text)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise RuntimeError("El CSV oficial no tiene encabezados.")

    normalized_fields = {name: norm(name) for name in reader.fieldnames}
    schools: dict[tuple[int, str], dict[str, object]] = {}

    for raw_row in reader:
        row = {normalized_fields[key]: value for key, value in raw_row.items() if key is not None}
        nivel = first(row, "nivel")
        if "primar" not in norm(nivel):
            continue

        gestion = sector_label(first(row, "sector"))
        if not gestion:
            continue

        clave = first(row, "clave")
        district_code = parse_district_code(clave, valid_codes)
        if district_code is None:
            continue

        school_id = first(row, "establecimiento_id") or clave or first(row, "cue")
        nombre = first(row, "establecimiento_nombre")
        if not school_id or not nombre:
            continue

        cue = first(row, "cue")
        anexo = first(row, "anexo")
        cue_anexo = cue + (("-" + anexo) if anexo else "") if cue else ""
        record = {
            "distritoCodigo": district_code,
            "distrito": district_names[district_code],
            "id": school_id,
            "nombre": nombre,
            "gestion": gestion,
            "clave": clave,
            "cueAnexo": cue_anexo,
            "nroEscuela": first(row, "nro_escuela", "numero_escuela"),
            "modalidad": first(row, "modalidad"),
            "municipio": first(row, "municipio_nombre", "munipio_nombre"),
        }
        schools.setdefault((district_code, school_id), record)

    result = list(schools.values())
    result.sort(key=lambda item: (int(item["distritoCodigo"]), norm(item["nombre"]), str(item["id"])))
    return result


def main() -> None:
    districts = json.loads(DISTRICTS_PATH.read_text(encoding="utf-8"))
    if len(districts) != 137:
        raise RuntimeError(f"Se esperaban 137 distritos y hay {len(districts)}.")

    source = fetch_source()
    schools = build_rows(source, districts)
    if len(schools) < 1000:
        raise RuntimeError(f"El filtro devolvió solo {len(schools)} primarias; se aborta para no publicar un padrón incompleto.")

    avellaneda = [row for row in schools if row["distritoCodigo"] == 5]
    sectors = {row["gestion"] for row in avellaneda}
    if not {"Estatal", "Privada"}.issubset(sectors):
        raise RuntimeError("El padrón de Avellaneda no contiene gestión estatal y privada.")

    covered = {int(row["distritoCodigo"]) for row in schools}
    if len(covered) < 130:
        raise RuntimeError(f"El padrón cubre solo {len(covered)} distritos; se aborta.")

    OUTPUT_PATH.write_text(json.dumps(schools, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    SOURCE_META_PATH.write_text(
        json.dumps(
            {
                "fuente": "DGCyE / Datos Abiertos PBA — Establecimientos educativos",
                "url": SOURCE_URL,
                "generadoUtc": datetime.now(timezone.utc).isoformat(),
                "cantidadPrimarias": len(schools),
                "distritosCubiertos": len(covered),
                "filtro": "nivel contiene PRIMAR; sector Estatal o Privado/Privada",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Generadas {len(schools)} primarias en {len(covered)} distritos.")


if __name__ == "__main__":
    main()
