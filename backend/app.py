from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from utils.google_sheets import cargar_datos
from utils.stock_data import cargar_stock, obtener_archivo_stock
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()
creds_json = json.loads(os.getenv("GOOGLE_CLOUD_SERVICE_ACCOUNT"))

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
        datos = cargar_datos(sheet_url, creds_json)

        # Aplicar filtro por estado si se proporciona
        if filtro_estado:
            datos = [item for item in datos if item.get("Estado") == filtro_estado]

        # Aplicar paginación
        total = len(datos)
        datos = datos[skip: skip + limit]

        return {"total": total, "data": datos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar los datos: {str(e)}")


# ─── Stock / Personas ─────────────────────────────────────────────────────────

@app.get("/stock-personas")
def obtener_stock():
    """Devuelve los datos del Excel de beneficiarios como JSON."""
    try:
        datos = cargar_stock()
        return {"total": len(datos), "data": datos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer stock: {str(e)}")


@app.get("/stock-personas/exportar")
def exportar_stock():
    """Descarga el Excel original de beneficiarios."""
    archivo = obtener_archivo_stock()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo de stock no encontrado")
    return FileResponse(
        path=str(archivo),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=archivo.name,
    )