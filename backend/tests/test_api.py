"""Tests de humo para la API de Escrituración.

Correr con:
  pip install pytest httpx
  pytest backend/tests/ -v
"""

from fastapi.testclient import TestClient
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app

client = TestClient(app)


def test_root_endpoint():
    """GET / debe responder OK."""
    resp = client.get("/")
    assert resp.status_code == 200
    assert "Bienvenido" in resp.json()["message"]


def test_refresh_endpoint():
    """POST /refresh debe limpiar caché y responder OK."""
    resp = client.post("/refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "Caché limpiada" in data["message"]


def test_refresh_es_idempotente():
    """POST /refresh puede llamarse múltiples veces sin efecto secundario."""
    r1 = client.post("/refresh")
    r2 = client.post("/refresh")
    assert r1.status_code == 200
    assert r2.status_code == 200


def test_escrituracion_sin_credenciales():
    """GET /escrituracion sin GOOGLE creds debe dar error 500."""
    # Reset creds para simular falta de configuración
    import app as app_module
    app_module._creds_json = None

    # Temporalmente sacar la variable de entorno
    old = os.environ.pop("GOOGLE_CLOUD_SERVICE_ACCOUNT", None)
    try:
        resp = client.get("/escrituracion?limit=1")
        assert resp.status_code == 500
        assert "GOOGLE_CLOUD_SERVICE_ACCOUNT" in resp.json()["detail"]
    finally:
        if old is not None:
            os.environ["GOOGLE_CLOUD_SERVICE_ACCOUNT"] = old
        app_module._creds_json = None


def test_escrituracion_paginacion():
    """GET /escrituracion debe aceptar skip y limit."""
    resp = client.get("/escrituracion?skip=0&limit=5")
    # Sin credenciales debería fallar, pero probamos que la ruta existe
    assert resp.status_code in (200, 500)


def test_stock_exportar_sin_filtros():
    """GET /stock/exportar sin filtros debe responder."""
    resp = client.get("/stock/exportar")
    # Sin credenciales de Google → 500, pero verificamos que no sea 404
    assert resp.status_code in (200, 500)


def test_firma_exportar_sin_filtros():
    """GET /stock/firma/exportar sin filtros debe responder."""
    resp = client.get("/stock/firma/exportar")
    assert resp.status_code in (200, 500)


def test_cors_headers():
    """Los endpoints deben incluir CORS headers."""
    resp = client.get("/")
    assert "access-control-allow-origin" in resp.headers
