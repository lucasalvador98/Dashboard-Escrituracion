import math
import os
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

STOCK_FILE = DATA_DIR / "VILLA CARLOS PAZ (TU CASA TU ESCRITURA- ENTREGA) 08 07 26 (1).xlsx"

COLUMNS = [
    "NRO",
    "BARRIO",
    "MZA",
    "LOTE",
    "APELLIDO_Y_NOMBRE",
    "DNI",
    "TELEFONO",
    "COTITULAR_NOMBRE",
    "COTITULAR_DNI",
    "TELEFONO_COTITULAR",
    "ASISTENCIA",
]


def _clean(val):
    """Convierte NaN/None a None, números a string."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        # DNI o teléfono: si es float sin decimales, convertirlo
        if val == val and not math.isnan(val):
            s = str(int(val)) if val == int(val) else str(val)
            return s
    return val


def cargar_stock():
    """
    Lee el Excel de stock y devuelve los registros como lista de dicts.
    El Excel tiene:
      - Fila 1: título (merged)
      - Fila 2: subtítulo (merged)
      - Fila 3: headers
      - Filas 4+: datos
    """
    if not STOCK_FILE.exists():
        return []

    df = pd.read_excel(
        STOCK_FILE,
        sheet_name="Hoja1",
        header=2,  # fila 3 (0-indexed) son headers
        dtype={"DNI": str, "COTITULAR - DNI": str},
    )

    # Eliminar duplicados de segunda MZA/LOTE
    cols = list(df.columns)
    if len(cols) >= 6:
        df = df.drop(columns=[cols[4], cols[5]], errors="ignore")
    cols = list(df.columns)

    # Renombrar columnas
    mapper = {
        cols[0]: "NRO",
        cols[1]: "BARRIO",
        cols[2]: "MZA",
        cols[3]: "LOTE",
        cols[4]: "APELLIDO_Y_NOMBRE",
        cols[5]: "DNI",
        cols[6]: "TELEFONO",
        cols[7]: "COTITULAR_NOMBRE",
        cols[8]: "COTITULAR_DNI",
        cols[9]: "TELEFONO_COTITULAR",
        cols[10]: "ASISTENCIA",
    }
    df.rename(columns=mapper, inplace=True)

    # Limpiar: sacar filas sin nombre
    df = df.dropna(subset=["APELLIDO_Y_NOMBRE"]).reset_index(drop=True)

    # Convertir todo a dicts limpios
    records = []
    for _, row in df.iterrows():
        rec = {col: _clean(row.get(col)) for col in COLUMNS}
        rec["NRO"] = int(rec["NRO"]) if rec["NRO"] is not None else None
        records.append(rec)

    return records


def obtener_archivo_stock():
    """Devuelve la ruta del archivo Excel si existe."""
    return STOCK_FILE if STOCK_FILE.exists() else None
