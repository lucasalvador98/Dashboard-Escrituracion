from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from utils.google_sheets import cargar_datos
from utils.stock_data import generar_excel
from utils.firma_data import generar_firma_excel
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

_creds_json = None

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