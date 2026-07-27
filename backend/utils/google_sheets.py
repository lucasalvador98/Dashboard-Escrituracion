import gspread
import pandas as pd
from datetime import datetime, timedelta
import json
import threading

# ─── Caché en memoria con TTL ─────────────────────────────────────────────────
_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL = timedelta(minutes=5)  # Ajustable: 5 minutos entre refrescos

def _get_cached(key, fetch_fn):
    """
    Cache decorator-like: si hay dato en caché y no expiró, lo devuelve.
    Si expiró o no existe, llama a fetch_fn(), guarda y devuelve.
    Thread-safe para producción con múltiples workers.
    """
    now = datetime.now()
    with _cache_lock:
        entry = _cache.get(key)
        if entry and entry["expires_at"] > now:
            print(f"[CACHE] HIT — sirviendo desde caché (expira {entry['expires_at'].strftime('%H:%M:%S')})")
            return entry["data"]

    # Cache miss — obtener datos
    print(f"[CACHE] MISS — consultando Google Sheets...")
    data = fetch_fn()

    with _cache_lock:
        _cache[key] = {"data": data, "expires_at": now + CACHE_TTL}

    print(f"[CACHE] Almacenado hasta { (now + CACHE_TTL).strftime('%H:%M:%S') }")
    return data


def _fetch_from_google(sheet_url, creds_json):
    """Función interna que realmente llama a Google Sheets."""
    gc = gspread.service_account_from_dict(creds_json)
    sh = gc.open_by_url(sheet_url)
    worksheet = sh.get_worksheet(0)
    data = worksheet.get_all_records()
    df = pd.DataFrame(data)
    return _procesar_dataframe(df)


def cargar_datos(sheet_url, creds_json):
    """
    Carga datos desde Google Sheets con caché en memoria.
    La primera llamada va a Google Sheets; las siguientes dentro del TTL (5 min)
    sirven desde caché.
    """
    return _get_cached(sheet_url, lambda: _fetch_from_google(sheet_url, creds_json))

def _procesar_dataframe(df):
    """Procesa el DataFrame: convierte fechas, calcula diferencias."""
    # Validar y convertir las fechas al formato ISO
    columnas_fecha = [
        "Fecha Ingreso Colegio de Escribanos",
        "Fecha de Sorteo",
        "Fecha de Aceptacion",
        "Fecha de Firma",
        "Fecha de Ingreso al Registro",
        "Fecha de envío PT digital"
    ]
    for columna in columnas_fecha:
        if columna in df.columns:
            df[columna] = pd.to_datetime(df[columna], format="%d/%m/%Y", errors="coerce")
            df[columna] = df[columna].dt.strftime("%Y-%m-%d").fillna("N/A")  # Reemplazar fechas inválidas por "N/A"

    # Calcular diferencias entre pares de fechas
    pares_fechas = [
        ('Fecha Ingreso Colegio de Escribanos', 'Fecha de Sorteo', 'diferencia_ingreso_sorteo'),
        ('Fecha de Sorteo', 'Fecha de Aceptacion', 'diferencia_sorteo_aceptacion'),
        ('Fecha de Aceptacion', 'Fecha de Firma', 'diferencia_aceptacion_firma'),
        ('Fecha de Firma', 'Fecha de Ingreso al Registro', 'diferencia_firma_ingreso'),
        ('Fecha de Ingreso al Registro', 'Fecha de envío PT digital', 'diferencia_ingreso_testimonio')
    ]

    for fecha1, fecha2, diff_col in pares_fechas:
        df[diff_col] = (pd.to_datetime(df[fecha2], errors="coerce") - pd.to_datetime(df[fecha1], errors="coerce")).dt.days
        df[diff_col] = df[diff_col].fillna("N/A")  # Reemplazar NaN por "N/A"

    # Imprimir los datos procesados para depuración
    print("Datos procesados con semaforización:")
    print(df.head())

    return df.to_dict(orient="records")