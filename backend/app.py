from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from utils.google_sheets import cargar_datos
import json
import os  # Asegúrate de importar os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()
creds_json = json.loads(os.getenv("GOOGLE_CLOUD_SERVICE_ACCOUNT"))

app = FastAPI()

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Permitir solicitudes desde el frontend
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