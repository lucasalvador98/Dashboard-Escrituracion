from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from utils.google_sheets import cargar_datos, limpiar_cache, _get_cached, _retry_attempts
from utils.stock_data import generar_excel
from utils.firma_data import generar_firma_excel
import json
import os
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
import gspread
from gspread import exceptions as gspread_exceptions

# Cargar variables de entorno
load_dotenv()

_creds_json = None

# ─── Mapeo de errores estructurados ───────────────────────────────────────
class ErrorCode:
    SHEETS_UNREACHABLE = "SHEETS_UNREACHABLE"
    CACHE_EMPTY = "CACHE_EMPTY"
    CONFIG_MISSING = "CONFIG_MISSING"
    INTERNAL_ERROR = "INTERNAL_ERROR"

def _create_error_response(code: str, message: str, detail=None):
    """Crea una respuesta de error estructurada."""
    error_response = {
        "code": code,
        "message": message,
        "detail": detail,
        "timestamp": datetime.now().isoformat()
    }
    return error_response

def _get_creds():
    """Lazy load de credenciales Google — necesario solo para endpoints que usan Sheets."""
    global _creds_json
    if _creds_json is None:
        raw = os.getenv("GOOGLE_CLOUD_SERVICE_ACCOUNT")
        if not raw:
            raise RuntimeError("GOOGLE_CLOUD_SERVICE_ACCOUNT no está configurada")
        _creds_json = json.loads(raw)
    return _creds_json

app = FastAPI()

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://reporte-escrituracion.duckdns.org",
        "http://localhost:3000",
        "http://5.161.118.67:8506"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Escrituración"}


@app.get("/health")
def health_check():
    """Endpoint de salud que verifica el estado de Sheets y la caché."""
    health_status = {
        "status": "ok",
        "sheets": "reachable",
        "cache": {"has_data": False, "ttl_seconds": 300},
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # Verificar si hay datos en caché
        from utils.google_sheets import _cache, CACHE_TTL
        if _cache:
            for key, entry in _cache.items():
                ttl_seconds = (entry["expires_at"] - datetime.now()).total_seconds()
                if ttl_seconds > 0:
                    health_status["cache"]["has_data"] = True
                    health_status["cache"]["ttl_seconds"] = int(ttl_seconds)
                    break
        
        # Probar conexión a Sheets si hay credenciales
        from utils.google_sheets import _fetch_from_google
        try:
            sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
            creds = _get_creds()
            # Hacer una solicitud rápida sin procesamiento completo
            import gspread
            gc = gspread.service_account_from_dict(creds)
            sh = gc.open_by_url(sheet_url)
            # Simple test - solo verificar que podemos acceder
            health_status["sheets"] = "reachable"
        except Exception as sheets_error:
            health_status["sheets"] = "unreachable"
            health_status["status"] = "degraded"
            health_status["sheets_error"] = str(sheets_error)
        
        # Si no hay datos en caché o Sheets no está disponible, marcar como degradado
        if not health_status["cache"]["has_data"]:
            if health_status["sheets"] == "reachable":
                health_status["status"] = "degraded"
            else:
                health_status["status"] = "error"
    
    except Exception as e:
        health_status["status"] = "error"
        health_status["error"] = str(e)
    
    return health_status

@app.post("/refresh")
def refrescar_cache():
    """Limpia la caché del backend para forzar recarga desde Google Sheets."""
    try:
        limpiar_cache()
        return {"status": "ok", "message": "Caché limpiada. El próximo GET /escrituracion recargará datos frescos."}
    except Exception as e:
        error_info = _create_error_response(
            ErrorCode.INTERNAL_ERROR,
            "Error al limpiar caché",
            f"Detalle técnico: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=error_info)


@app.get("/escrituracion")
def obtener_datos(skip: int = 0, limit: int = 50, filtro_estado: str = None):
    try:
        sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
        datos = cargar_datos(sheet_url, _get_creds())

        # Aplicar filtro por estado si se proporciona
        if filtro_estado:
            datos = [item for item in datos if item.get("Estado") == filtro_estado]

        # Aplicar paginación
        total = len(datos)
        datos = datos[skip: skip + limit]

        return {"total": total, "data": datos}
    except Exception as e:
        error_info = _create_error_response(
            ErrorCode.INTERNAL_ERROR,
            "Error al procesar los datos",
            f"Detalle técnico: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=error_info)


@app.get("/stock/exportar")
def exportar_excel_stock(
    departamento: str = Query(None),
    localidad: str = Query(None),
    barrio: str = Query(None),
):
    """
    Genera un Excel con el formato del modelo de VILLA CARLOS PAZ,
    usando los datos de escrituración filtrados por depto/localidad/barrio,
    solo registros finalizadas (Finalizada sin Entregar y Entregada).
    """
    try:
        sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
        datos = cargar_datos(sheet_url, _get_creds())

        # Filtrar solo finalizadas
        estados_validos = ["Finalizada sin Entregar", "Entregada"]
        datos = [d for d in datos if d.get("Estado") in estados_validos]

        # Filtrar por ubicación
        if departamento:
            datos = [d for d in datos if (d.get("Departamento") or "").upper() == departamento.upper()]
        if localidad:
            datos = [d for d in datos if (d.get("Localidad") or "").upper() == localidad.upper()]
        if barrio:
            datos = [d for d in datos if (d.get("Barrio") or "").upper() == barrio.upper()]

        # Armar título
        partes = [p for p in [departamento, localidad, barrio] if p]
        titulo = " / ".join(partes) if partes else "Todas las ubicaciones"
        subtitulo = "TU CASA TU ESCRITURA - Ley 9811"

        buffer = generar_excel(datos, titulo=titulo, subtitulo=subtitulo)
        filename = f"Stock_{partes[-1] if partes else 'General'}.xlsx".replace(" ", "_")

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar Excel: {str(e)}")


@app.get("/stock/firma/exportar")
def exportar_firma_excel(
    departamento: str = Query(None),
    localidad: str = Query(None),
    barrio: str = Query(None),
    fecha: str = Query(""),
    hora: str = Query(""),
    lugar: str = Query(""),
    escribano_nombre: str = Query(""),
    escribano_tel: str = Query(""),
    escribano_mail: str = Query(""),
):
    """
    Genera un Excel con formato FIRMA (En Trámite) para un evento de firma.
    """
    try:
        sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
        datos = cargar_datos(sheet_url, _get_creds())

        # Filtrar solo En Trámite
        datos = [d for d in datos if (d.get("Estado") or "").strip() == "En Trámite"]

        # Filtrar por ubicación
        if departamento:
            datos = [d for d in datos if (d.get("Departamento") or "").upper() == departamento.upper()]
        if localidad:
            datos = [d for d in datos if (d.get("Localidad") or "").upper() == localidad.upper()]
        if barrio:
            datos = [d for d in datos if (d.get("Barrio") or "").upper() == barrio.upper()]

        partes = [p for p in [departamento, localidad, barrio] if p]
        titulo = " / ".join(partes) if partes else "En Trámite"

        buffer = generar_firma_excel(
            datos, titulo=titulo,
            fecha=fecha, hora=hora, lugar=lugar,
            escribano_nombre=escribano_nombre,
            escribano_tel=escribano_tel,
            escribano_mail=escribano_mail,
        )
        filename = f"Firma_{partes[-1] if partes else 'General'}.xlsx".replace(" ", "_")

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar Excel de firma: {str(e)}")


@app.get("/escrituracion")
def obtener_datos(skip: int = 0, limit: int = 50, filtro_estado: str = None):
    try:
        sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
        datos = cargar_datos(sheet_url, _get_creds())

        # Aplicar filtro por estado si se proporciona
        if filtro_estado:
            datos = [item for item in datos if item.get("Estado") == filtro_estado]

        # Aplicar paginación
        total = len(datos)
        datos = datos[skip: skip + limit]

        return {"total": total, "data": datos}
    except Exception as e:
        error_info = _create_error_response(
            ErrorCode.INTERNAL_ERROR,
            "Error al procesar los datos",
            f"Detalle técnico: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=error_info)
def obtener_datos(skip: int = 0, limit: int = 50, filtro_estado: str = None):
    try:
        sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
        datos = cargar_datos(sheet_url, _get_creds())

        # Aplicar filtro por estado si se proporciona
        if filtro_estado:
            datos = [item for item in datos if item.get("Estado") == filtro_estado]

        # Aplicar paginación
        total = len(datos)
        datos = datos[skip: skip + limit]

        return {"total": total, "data": datos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar los datos: {str(e)}")


# ─── Stock / Exportar Excel ──────────────────────────────────────────────────

@app.get("/stock/exportar")
def exportar_excel_stock(
    departamento: str = Query(None),
    localidad: str = Query(None),
    barrio: str = Query(None),
):
    """
    Genera un Excel con el formato del modelo de VILLA CARLOS PAZ,
    usando los datos de escrituración filtrados por depto/localidad/barrio,
    solo registros finalizadas (Finalizada sin Entregar y Entregada).
    """
    try:
        sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
        datos = cargar_datos(sheet_url, _get_creds())

        # Filtrar solo finalizadas
        estados_validos = ["Finalizada sin Entregar", "Entregada"]
        datos = [d for d in datos if d.get("Estado") in estados_validos]

        # Filtrar por ubicación
        if departamento:
            datos = [d for d in datos if (d.get("Departamento") or "").upper() == departamento.upper()]
        if localidad:
            datos = [d for d in datos if (d.get("Localidad") or "").upper() == localidad.upper()]
        if barrio:
            datos = [d for d in datos if (d.get("Barrio") or "").upper() == barrio.upper()]

        # Armar título
        partes = [p for p in [departamento, localidad, barrio] if p]
        titulo = " / ".join(partes) if partes else "Todas las ubicaciones"
        subtitulo = "TU CASA TU ESCRITURA - Ley 9811"

        buffer = generar_excel(datos, titulo=titulo, subtitulo=subtitulo)
        filename = f"Stock_{partes[-1] if partes else 'General'}.xlsx".replace(" ", "_")

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar Excel: {str(e)}")


# ─── Stock En Trámite / Exportar FIRMA Excel ─────────────────────────────────

@app.get("/stock/firma/exportar")
def exportar_firma_excel(
    departamento: str = Query(None),
    localidad: str = Query(None),
    barrio: str = Query(None),
    fecha: str = Query(""),
    hora: str = Query(""),
    lugar: str = Query(""),
    escribano_nombre: str = Query(""),
    escribano_tel: str = Query(""),
    escribano_mail: str = Query(""),
):
    """
    Genera un Excel con formato FIRMA (En Trámite) para un evento de firma.
    """
    try:
        sheet_url = "https://docs.google.com/spreadsheets/d/1V9vXwMQJjd4kLdJZQncOSoWggQk8S7tBKxbOSEIUoQ8/edit#gid=1593263408"
        datos = cargar_datos(sheet_url, _get_creds())

        # Filtrar solo En Trámite
        datos = [d for d in datos if (d.get("Estado") or "").strip() == "En Trámite"]

        # Filtrar por ubicación
        if departamento:
            datos = [d for d in datos if (d.get("Departamento") or "").upper() == departamento.upper()]
        if localidad:
            datos = [d for d in datos if (d.get("Localidad") or "").upper() == localidad.upper()]
        if barrio:
            datos = [d for d in datos if (d.get("Barrio") or "").upper() == barrio.upper()]

        partes = [p for p in [departamento, localidad, barrio] if p]
        titulo = " / ".join(partes) if partes else "En Trámite"

        buffer = generar_firma_excel(
            datos, titulo=titulo,
            fecha=fecha, hora=hora, lugar=lugar,
            escribano_nombre=escribano_nombre,
            escribano_tel=escribano_tel,
            escribano_mail=escribano_mail,
        )
        filename = f"Firma_{partes[-1] if partes else 'General'}.xlsx".replace(" ", "_")

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar Excel de firma: {str(e)}")