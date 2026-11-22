"""
Configuración de las pruebas unitarias del backend.
Se usa una base de datos temporal y claves de prueba, así las
pruebas nunca tocan la base de datos real ni necesitan el .env.
"""

import os
import sys
import tempfile

import pytest

CARPETA_TEMPORAL = tempfile.mkdtemp(prefix="cronica-pruebas-")

os.environ["DB_PATH"] = os.path.join(CARPETA_TEMPORAL, "pruebas.db")
os.environ["SECRET_KEY"] = "clave-solo-para-pruebas-unitarias"
os.environ["DEMO_CORREO"] = "demo@cronica.com"
os.environ["DEMO_PASSWORD"] = "clave-demo-pruebas"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as modulo_app  # noqa: E402


@pytest.fixture
def cliente():
    modulo_app.app.config["TESTING"] = True
    with modulo_app.app.test_client() as cliente:
        yield cliente


@pytest.fixture
def token_demo(cliente):
    respuesta = cliente.post(
        "/api/auth/login",
        json={"correo": "demo@cronica.com", "password": "clave-demo-pruebas"},
    )
    assert respuesta.status_code == 200
    return respuesta.get_json()["token"]
