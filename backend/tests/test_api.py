"""
Pruebas unitarias de la API REST (backend/app.py).
Se ejecutan con:  python -m pytest -v
En el pipeline corren dentro de la imagen Docker "test" del backend.
"""

import uuid


def correo_nuevo():
    return f"prueba-{uuid.uuid4().hex[:8]}@correo.com"


# ---------------------------------------------------------
# Estado y datos iniciales
# ---------------------------------------------------------

def test_status_responde_ok(cliente):
    respuesta = cliente.get("/api/status")
    datos = respuesta.get_json()

    assert respuesta.status_code == 200
    assert datos["estado"] == "ok"
    assert datos["servicio"] == "backend"
    assert datos["base_datos"]["motor"] == "SQLite"


def test_cronicas_iniciales_cargadas(cliente):
    respuesta = cliente.get("/api/cronicas")
    cronicas = respuesta.get_json()

    assert respuesta.status_code == 200
    assert len(cronicas) == 5
    assert cronicas[0]["titulo"] == "Memoria, territorio y transformación"


def test_usuario_demo_creado_desde_variables_de_entorno(cliente, token_demo):
    respuesta = cliente.get("/api/auth/perfil", headers={"Authorization": f"Bearer {token_demo}"})

    assert respuesta.status_code == 200
    assert respuesta.get_json()["correo"] == "demo@cronica.com"


# ---------------------------------------------------------
# Registro
# ---------------------------------------------------------

def test_registro_crea_usuario_y_devuelve_token(cliente):
    correo = correo_nuevo()
    respuesta = cliente.post(
        "/api/auth/registro",
        json={"nombre": "Ana Pérez", "correo": correo, "password": "secreto123"},
    )
    datos = respuesta.get_json()

    assert respuesta.status_code == 201
    assert datos["usuario"]["correo"] == correo
    assert datos["token"]
    assert "password_hash" not in datos["usuario"]


def test_registro_rechaza_correo_repetido(cliente):
    correo = correo_nuevo()
    cuerpo = {"nombre": "Ana", "correo": correo, "password": "secreto123"}

    assert cliente.post("/api/auth/registro", json=cuerpo).status_code == 201
    respuesta = cliente.post("/api/auth/registro", json=cuerpo)

    assert respuesta.status_code == 409
    assert respuesta.get_json()["error"] == "Ya existe una cuenta con ese correo."


def test_registro_valida_los_datos(cliente):
    respuesta = cliente.post(
        "/api/auth/registro",
        json={"nombre": "A", "correo": "no-es-correo", "password": "123"},
    )

    assert respuesta.status_code == 400


# ---------------------------------------------------------
# Inicio de sesión y token
# ---------------------------------------------------------

def test_login_con_contrasena_incorrecta(cliente):
    respuesta = cliente.post(
        "/api/auth/login",
        json={"correo": "demo@cronica.com", "password": "incorrecta"},
    )

    assert respuesta.status_code == 401


def test_contrasena_no_se_guarda_en_texto_plano(cliente):
    import app as modulo_app

    correo = correo_nuevo()
    cliente.post("/api/auth/registro", json={"nombre": "Ana", "correo": correo, "password": "secreto123"})

    with modulo_app.app.app_context():
        fila = modulo_app.obtener_db().execute(
            "SELECT password_hash FROM usuarios WHERE correo = ?", (correo,)
        ).fetchone()

    assert fila["password_hash"] != "secreto123"


def test_ruta_protegida_sin_token(cliente):
    assert cliente.get("/api/usuarios").status_code == 401


def test_ruta_protegida_con_token_invalido(cliente):
    respuesta = cliente.get("/api/usuarios", headers={"Authorization": "Bearer token-falso"})

    assert respuesta.status_code == 401


def test_ruta_protegida_con_token_valido(cliente, token_demo):
    respuesta = cliente.get("/api/usuarios", headers={"Authorization": f"Bearer {token_demo}"})
    correos = [usuario["correo"] for usuario in respuesta.get_json()]

    assert respuesta.status_code == 200
    assert "demo@cronica.com" in correos


# ---------------------------------------------------------
# Contacto
# ---------------------------------------------------------

def test_contacto_guarda_mensaje(cliente, token_demo):
    respuesta = cliente.post(
        "/api/contacto",
        json={"nombre": "Carlos", "correo": "carlos@correo.com", "mensaje": "Mensaje de prueba unitaria"},
    )
    assert respuesta.status_code == 201

    mensajes = cliente.get("/api/contacto", headers={"Authorization": f"Bearer {token_demo}"}).get_json()
    assert any(m["mensaje"] == "Mensaje de prueba unitaria" for m in mensajes)


def test_contacto_rechaza_mensaje_corto(cliente):
    respuesta = cliente.post(
        "/api/contacto",
        json={"nombre": "Carlos", "correo": "carlos@correo.com", "mensaje": "Hola"},
    )

    assert respuesta.status_code == 400


def test_ruta_inexistente_responde_json(cliente):
    respuesta = cliente.get("/api/no-existe")

    assert respuesta.status_code == 404
    assert respuesta.get_json()["error"] == "Ruta no encontrada."


# ---------------------------------------------------------
# Seguridad: la API no arranca sin clave secreta
# ---------------------------------------------------------

def test_api_no_arranca_sin_secret_key(tmp_path):
    import os
    import subprocess
    import sys

    entorno = {k: v for k, v in os.environ.items() if k != "SECRET_KEY"}
    entorno["DB_PATH"] = str(tmp_path / "x.db")
    carpeta_backend = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    resultado = subprocess.run(
        [sys.executable, "-c", "import app"],
        cwd=str(tmp_path), env={**entorno, "PYTHONPATH": carpeta_backend},
        capture_output=True, text=True,
    )

    assert resultado.returncode != 0
    assert "SECRET_KEY" in resultado.stderr
