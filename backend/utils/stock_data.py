import io
import os
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODELO_PATH = DATA_DIR / "VILLA CARLOS PAZ (TU CASA TU ESCRITURA- ENTREGA) 08 07 26 (1).xlsx"
EXCEL_ABSOLUTO = Path(os.environ.get("STOCK_EXCEL_PATH", "/home/lucaa/ESCRITURACION/VILLA CARLOS PAZ (TU CASA TU ESCRITURA- ENTREGA) 08 07 26 (1).xlsx"))

COLUMNS = [
    ("NRO", 6),
    ("BARRIO", 27),
    ("MZA", 7),
    ("LOTE", 7),
    ("APELLIDO Y NOMBRE", 42),
    ("DNI", 20),
    ("Teléfono", 21),
    ("COTITULAR - Nombre y Apellido", 35),
    ("COTITULAR - DNI", 24),
    ("Tel. Cotitular", 41),
    ("ASISTENCIA", 15),
]

# Mapping: (excel_col_index, field_name) — 1-indexed columns from the real Excel
EXCEL_COL_MAP = [
    (1, "nro"),
    (2, "Barrio"),
    (3, "Mza"),
    (4, "Lote"),
    (7, "Beneficiario"),
    (8, "DNI"),
    (9, "Telefono"),
    (10, "Cotitular"),
    (11, "CotitularDNI"),
    (12, "TelefonoCotitular"),
    (13, "Asistencia"),
]

THIN_BORDER = Border(
    left=Side(style="thin", color="000000"),
    right=Side(style="thin", color="000000"),
    top=Side(style="thin", color="000000"),
    bottom=Side(style="thin", color="000000"),
)

HEADER_FILL = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")


def _get_excel_path():
    """Retorna la ruta al Excel de stock, probando ubicaciones."""
    if MODELO_PATH.exists():
        return MODELO_PATH
    if EXCEL_ABSOLUTO.exists():
        return EXCEL_ABSOLUTO
    return None


def leer_datos_excel():
    """
    Lee el archivo Excel de VILLA CARLOS PAZ y devuelve sus datos
    como lista de dicts con los field names usados en el frontend.
    """
    path = _get_excel_path()
    if not path:
        return []

    wb = load_workbook(path)
    ws = wb.active
    datos = []

    for row in ws.iter_rows(min_row=4, values_only=True):
        if not row or not row[0]:
            continue
        item = {}
        for col_idx, field_name in EXCEL_COL_MAP:
            val = row[col_idx - 1] if col_idx - 1 < len(row) else None
            item[field_name] = str(val).strip() if val is not None else ""
        datos.append(item)

    wb.close()
    return datos


def generar_excel(datos, titulo="", subtitulo=""):
    """
    Genera un Excel en memoria con el formato del modelo de VILLA CARLOS PAZ.
    - datos: lista de dicts con keys: Barrio, Beneficiario, DNI, etc.
    - titulo: texto del título (ej: nombre del departamento/localidad)
    - subtitulo: texto del subtítulo
    Devuelve un BytesIO con el .xlsx listo para descargar.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Hoja1"

    col_count = len(COLUMNS)

    # ── Anchos de columna ──
    for i, (_, width) in enumerate(COLUMNS, 1):
        ws.column_dimensions[get_column_letter(i)].width = width

    # ── Fila 1: Título (merged) ──
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=col_count)
    cell_titulo = ws.cell(1, 1, titulo or "")
    cell_titulo.font = Font(name="Arial", size=18, bold=True)
    cell_titulo.alignment = Alignment(horizontal="center", vertical="center")

    # ── Fila 2: Subtítulo (merged) ──
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=col_count)
    cell_sub = ws.cell(2, 1, subtitulo or "")
    cell_sub.font = Font(name="Arial", size=14, bold=True)
    cell_sub.alignment = Alignment(horizontal="center", vertical="center")

    # ── Fila 3: Headers ──
    for i, (label, _) in enumerate(COLUMNS, 1):
        cell = ws.cell(3, i, label)
        cell.font = Font(name="Arial", size=11, bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = THIN_BORDER
        cell.fill = HEADER_FILL

    # ── Filas de datos ──
    for idx, item in enumerate(datos, 1):
        row_num = idx + 3

        ws.cell(row_num, 1, idx).font = Font(name="Arial", size=12)
        ws.cell(row_num, 1).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 1).border = THIN_BORDER

        ws.cell(row_num, 2, item.get("Barrio") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 2).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 2).border = THIN_BORDER

        ws.cell(row_num, 3, item.get("Mza") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 3).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 3).border = THIN_BORDER

        ws.cell(row_num, 4, item.get("Lote") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 4).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 4).border = THIN_BORDER

        ws.cell(row_num, 5, item.get("Beneficiario") or item.get("APELLIDO Y NOMBRE") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 5).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 5).border = THIN_BORDER

        ws.cell(row_num, 6, item.get("DNI") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 6).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 6).border = THIN_BORDER

        ws.cell(row_num, 7, item.get("Telefono") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 7).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 7).border = THIN_BORDER

        ws.cell(row_num, 8, item.get("Cotitular") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 8).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 8).border = THIN_BORDER

        ws.cell(row_num, 9, item.get("CotitularDNI") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 9).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 9).border = THIN_BORDER

        ws.cell(row_num, 10, item.get("TelefonoCotitular") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 10).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 10).border = THIN_BORDER

        ws.cell(row_num, 11, item.get("Asistencia") or "").font = Font(name="Arial", size=12)
        ws.cell(row_num, 11).alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row_num, 11).border = THIN_BORDER

    # Guardar en memoria
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
