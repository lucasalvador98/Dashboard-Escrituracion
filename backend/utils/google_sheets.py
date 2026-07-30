import gspread
import pandas as pd
from datetime import datetime, timedelta
import json
import threading
import time
from typing import List, Dict, Any, Optional, Callable
from enum import Enum
from gspread import exceptions as gspread_exceptions

# ─── Caché en memoria con TTL ─────────────────────────────────────────────────
_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL = timedelta(minutes=5)  # Ajustable: 5 minutos entre refrescos
MAX_RETRIES = 3
_RETRY_DELAYS = [1, 2, 4]  # segundos

# ─── Mapeo de errores ──────────────────────────────────────────────────────
class ErrorCode(Enum):
    SHEETS_UNREACHABLE = "SHEETS_UNREACHABLE"
    CACHE_EMPTY = "CACHE_EMPTY"
    CONFIG_MISSING = "CONFIG_MISSING"
    INTERNAL_ERROR = "INTERNAL_ERROR"

# ─── Rastreo de intentos de recuperación ───────────────────────────────────────
_retry_attempts = {}


def _create_error_response(code: str, message: str, detail=None):
    """Crea una respuesta de error estructurada."""
    return {
        "code": code,
        "message": message,
        "detail": detail,
        "timestamp": datetime.now().isoformat()
    }

def _get_cached(key, fetch_fn):
    """
    Cache decorator-like con soporte para retorno de datos obsoletos si la recuperación falla.
    Actualiza contador de intentos de recuperación fallida para este key.
    """
    now = datetime.now()
    with _cache_lock:
        entry = _cache.get(key)
        if entry and entry["expires_at"] > now:
            print(f"[CACHE] HIT — sirviendo desde caché (expira {entry['expires_at'].strftime('%H:%M:%S')})")
            
            # Reinciar contador de reintentos cuando datos válidos salen del caché
            global _retry_attempts
            if key in _retry_attempts:
                del _retry_attempts[key]
            return entry["data"]

    # Cache miss o expirado — intentar obtener nuevo desde Google Sheets
    print(f"[CACHE] MISS/expirado — intentando recuperar de Google Sheets...")
    
    data = None
    attempt = 0
    error_message = None
    last_exc = None
    
    while attempt < MAX_RETRIES:
        try:
            print(f"[RETRY] Intento {attempt + 1}/{MAX_RETRIES}")
            data = fetch_fn()
            error_message = None
            last_exc = None
            break
        except Exception as e:
            error_message = str(e)
            last_exc = e
            attempt += 1
            if attempt < MAX_RETRIES:
                wait_time = _RETRY_DELAYS[min(attempt - 1, len(_RETRY_DELAYS) - 1)]
                print(f"[RETRY] Error: {error_message}. Esperando {wait_time}s...")
                time.sleep(wait_time)
    
    with _cache_lock:
        if data is not None:
            # Guardar datos frescos y resetear contador de reintentos fallidos
            _cache[key] = {"data": data, "expires_at": now + CACHE_TTL}
            if key in _retry_attempts:
                del _retry_attempts[key]
            print(f"[CACHE] Almacenado hasta { (now + CACHE_TTL).strftime('%H:%M:%S') }")
        else:
            # Si encontramos datos en caché y están aún casi válidos (dentro de 1 minuto de expiración), usarlos
            if entry and entry["expires_at"] > now:
                print(f"[CACHE] FALLBACK — recuperación fallida, sirviendo datos obsoletos (<1min)")
                if key not in _retry_attempts:
                    _retry_attempts[key] = {"failed_attempts": 0, "first_failed": now}
                _retry_attempts[key]["failed_attempts"] += 1
                return entry["data"]
            # Si no hay datos en caché válidos, registrar fallo y error
            else:
                print(f"[CACHE] FALLBACK — sin datos en caché, registro de error")
                if key not in _retry_attempts:
                    _retry_attempts[key] = {"failed_attempts": 0, "first_failed": now}
                _retry_attempts[key]["failed_attempts"] += 1
                raise Exception(f"Google Sheets no disponible después de {MAX_RETRIES} intentos: {error_message}")

    if data is not None:
        print(f"[CACHE] EXITOSO — datos obtenidos después de {attempt} reintentos")
        return data
    else:
        return None  # Nunca debería llegar aquí, pero para mayor seguridad


def _fetch_with_retry(sheet_url, creds_json):
    """Envoltorio con reintentos para todas las operaciones de Google Sheets.
    Aplica 3x retraso exponencial (1, 2, 4 segundos) entre reintentos.
    """
    for attempt in range(MAX_RETRIES):
        try:
            return _fetch_from_google(sheet_url, creds_json)
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                raise
            wait_time = _RETRY_DELAYS[attempt]
            print(f"[RETRY] Error al obtener datos de Sheets, reintentando en {wait_time}s (intento {attempt + 1}/{MAX_RETRIES}): {str(e)}")
            time.sleep(wait_time)


def _fetch_from_google(sheet_url, creds_json):
    """Función interna que realmente llama a Google Sheets."""
    gc = gspread.service_account_from_dict(creds_json)
    sh = gc.open_by_url(sheet_url)
    worksheet = sh.get_worksheet(0)
    data = worksheet.get_all_records()
    df = pd.DataFrame(data)
    return _procesar_dataframe(df)


# Conservar _fetch_from_google para backward compatibility - wrapped con reintentos
_fetch_from_google = _fetch_with_retry


def cargar_datos(sheet_url, creds_json):
    """
    Carga datos desde Google Sheets con caché en memoria.
    La primera llamada va a Google Sheets; las siguientes dentro del TTL (5 min)
    sirven desde caché.
    """
    return _get_cached(sheet_url, lambda: _fetch_from_google(sheet_url, creds_json))


def limpiar_cache():
    """Limpia toda la caché en memoria. Útil para refresh forzado."""
    with _cache_lock:
        _cache.clear()
    print("[CACHE] Limpiada completamente por solicitud del usuario")

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