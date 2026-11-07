"""
=========================================================
CRÓNICA HISTÓRICA - API REST (Servicio 2 / backend)
=========================================================
Flask + SQLite. Escucha en el puerto 3000 dentro de la red
interna de Docker; Nginx (servicio frontend) le reenvía todo
lo que llega a /api/.

Endpoints:
  GET  /api/status          Estado del servicio y de la base de datos
  GET  /api/cronicas        Crónicas guardadas en la base de datos
  POST /api/auth/registro   Crear usuario  -> token
  POST /api/auth/login      Iniciar sesión -> token
  GET  /api/auth/perfil     Datos del usuario del token
  GET  /api/usuarios        Usuarios registrados (requiere token)
  POST /api/contacto        Guarda un mensaje del formulario de contacto
  GET  /api/contacto        Mensajes recibidos (requiere token)
"""

import json
import os
import re
import socket
import sqlite3
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash


# =========================================================
# CONFIGURACIÓN (variables de entorno en docker-compose.yml)
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "data", "cronica.db"))
SECRET_KEY = os.environ.get("SECRET_KEY", "cambia-esta-clave-en-produccion")
TOKEN_HORAS = int(os.environ.get("TOKEN_HORAS", "8"))
SEMILLA_CRONICAS = os.path.join(BASE_DIR, "datos", "cronicas.json")

USUARIO_DEMO = {
    "nombre": os.environ.get("DEMO_NOMBRE", "Usuario Demo"),
    "correo": os.environ.get("DEMO_CORREO", "demo@cronica.com"),
    "password": os.environ.get("DEMO_PASSWORD", "Cronica2026"),
}

PATRON_CORREO = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

app = Flask(__name__)
app.json.ensure_ascii = False  # tildes y emojis legibles en las respuestas
app.json.sort_keys = False     # respeta el orden de los campos

serializador = URLSafeTimedSerializer(SECRET_KEY, salt="sesion-cronica")


# =========================================================
# BASE DE DATOS
# =========================================================

ESQUEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT    NOT NULL,
    correo        TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    creado_en     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS cronicas (
    id        INTEGER PRIMARY KEY,
    titulo    TEXT NOT NULL,
    categoria TEXT NOT NULL,
    icono     TEXT,
    fecha     TEXT,
    autor     TEXT,
    imagen    TEXT,
    resumen   TEXT,
    contenido TEXT
);

CREATE TABLE IF NOT EXISTS mensajes_contacto (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    correo    TEXT NOT NULL,
    mensaje   TEXT NOT NULL,
    creado_en TEXT NOT NULL
);
"""


def ahora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def conectar():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conexion = sqlite3.connect(DB_PATH, timeout=10)
    conexion.row_factory = sqlite3.Row
    return conexion


def obtener_db():
    if "db" not in g:
        g.db = conectar()
    return g.db


@app.teardown_appcontext
def cerrar_db(_error):
    conexion = g.pop("db", None)
    if conexion is not None:
        conexion.close()


def inicializar_db():
    """Crea las tablas y carga los datos iniciales una sola vez."""
    conexion = conectar()
    try:
        conexion.executescript(ESQUEMA)
        conexion.execute("BEGIN IMMEDIATE")

        # Crónicas iniciales (las mismas de public/datos/cronicas.json)
        if conexion.execute("SELECT COUNT(*) FROM cronicas").fetchone()[0] == 0:
            with open(SEMILLA_CRONICAS, encoding="utf-8") as archivo:
                for c in json.load(archivo):
                    conexion.execute(
                        """INSERT OR IGNORE INTO cronicas
                           (id, titulo, categoria, icono, fecha, autor, imagen, resumen, contenido)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (c["id"], c["titulo"], c["categoria"], c["icono"], c["fecha"],
                         c["autor"], c["imagen"], c["resumen"], c["contenido"]),
                    )

        # Usuario de demostración para probar el inicio de sesión
        existe = conexion.execute(
            "SELECT 1 FROM usuarios WHERE correo = ?", (USUARIO_DEMO["correo"].lower(),)
        ).fetchone()
        if existe is None:
            conexion.execute(
                """INSERT INTO usuarios (nombre, correo, password_hash, creado_en)
                   VALUES (?, ?, ?, ?)""",
                (USUARIO_DEMO["nombre"], USUARIO_DEMO["correo"].lower(),
                 generate_password_hash(USUARIO_DEMO["password"]), ahora()),
            )

        conexion.commit()
    finally:
        conexion.close()


# =========================================================
# UTILIDADES
# =========================================================

def error(mensaje, codigo):
    return jsonify({"error": mensaje}), codigo


def usuario_publico(fila):
    return {
        "id": fila["id"],
        "nombre": fila["nombre"],
        "correo": fila["correo"],
        "creado_en": fila["creado_en"],
    }


def crear_token(usuario_id):
    return serializador.dumps({"id": usuario_id})


def requiere_token(funcion):
    """Exige el encabezado  Authorization: Bearer <token>."""

    @wraps(funcion)
    def envoltura(*args, **kwargs):
        encabezado = request.headers.get("Authorization", "")
        if not encabezado.startswith("Bearer "):
            return error("Debes iniciar sesión.", 401)

        try:
            datos = serializador.loads(encabezado[7:], max_age=TOKEN_HORAS * 3600)
        except SignatureExpired:
            return error("La sesión expiró. Inicia sesión de nuevo.", 401)
        except BadSignature:
            return error("Token inválido.", 401)

        fila = obtener_db().execute(
            "SELECT * FROM usuarios WHERE id = ?", (datos.get("id"),)
        ).fetchone()
        if fila is None:
            return error("El usuario ya no existe.", 401)

        g.usuario = fila
        return funcion(*args, **kwargs)

    return envoltura


def leer_json():
    datos = request.get_json(silent=True)
    return datos if isinstance(datos, dict) else {}


# =========================================================
# ENDPOINTS
# =========================================================

@app.get("/api/status")
def estado():
    db = obtener_db()
    return jsonify({
        "estado": "ok",
        "servicio": "backend",
        "contenedor": socket.gethostname(),
        "hora": ahora(),
        "base_datos": {
            "motor": "SQLite",
            "usuarios": db.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0],
            "cronicas": db.execute("SELECT COUNT(*) FROM cronicas").fetchone()[0],
            "mensajes_contacto": db.execute("SELECT COUNT(*) FROM mensajes_contacto").fetchone()[0],
        },
    })


@app.get("/api/cronicas")
def listar_cronicas():
    filas = obtener_db().execute("SELECT * FROM cronicas ORDER BY id").fetchall()
    return jsonify([dict(fila) for fila in filas])


@app.post("/api/auth/registro")
def registro():
    datos = leer_json()
    nombre = str(datos.get("nombre", "")).strip()
    correo = str(datos.get("correo", "")).strip().lower()
    password = str(datos.get("password", ""))

    if len(nombre) < 2:
        return error("Escribe tu nombre.", 400)
    if not PATRON_CORREO.match(correo):
        return error("Ingresa un correo electrónico válido.", 400)
    if len(password) < 6:
        return error("La contraseña debe tener al menos 6 caracteres.", 400)

    db = obtener_db()
    try:
        cursor = db.execute(
            "INSERT INTO usuarios (nombre, correo, password_hash, creado_en) VALUES (?, ?, ?, ?)",
            (nombre, correo, generate_password_hash(password), ahora()),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return error("Ya existe una cuenta con ese correo.", 409)

    fila = db.execute("SELECT * FROM usuarios WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify({"token": crear_token(fila["id"]), "usuario": usuario_publico(fila)}), 201


@app.post("/api/auth/login")
def login():
    datos = leer_json()
    correo = str(datos.get("correo", "")).strip().lower()
    password = str(datos.get("password", ""))

    fila = obtener_db().execute(
        "SELECT * FROM usuarios WHERE correo = ?", (correo,)
    ).fetchone()

    if fila is None or not check_password_hash(fila["password_hash"], password):
        return error("Correo o contraseña incorrectos.", 401)

    return jsonify({"token": crear_token(fila["id"]), "usuario": usuario_publico(fila)})


@app.get("/api/auth/perfil")
@requiere_token
def perfil():
    return jsonify(usuario_publico(g.usuario))


@app.get("/api/usuarios")
@requiere_token
def listar_usuarios():
    filas = obtener_db().execute("SELECT * FROM usuarios ORDER BY id").fetchall()
    return jsonify([usuario_publico(fila) for fila in filas])


@app.post("/api/contacto")
def guardar_contacto():
    datos = leer_json()
    nombre = str(datos.get("nombre", "")).strip()
    correo = str(datos.get("correo", "")).strip()
    mensaje = str(datos.get("mensaje", "")).strip()

    if len(nombre) < 2 or not PATRON_CORREO.match(correo) or len(mensaje) < 10:
        return error("Datos de contacto incompletos o inválidos.", 400)

    db = obtener_db()
    cursor = db.execute(
        "INSERT INTO mensajes_contacto (nombre, correo, mensaje, creado_en) VALUES (?, ?, ?, ?)",
        (nombre, correo, mensaje, ahora()),
    )
    db.commit()
    return jsonify({"id": cursor.lastrowid, "mensaje": "Mensaje guardado."}), 201


@app.get("/api/contacto")
@requiere_token
def listar_contacto():
    filas = obtener_db().execute(
        "SELECT * FROM mensajes_contacto ORDER BY id DESC"
    ).fetchall()
    return jsonify([dict(fila) for fila in filas])


# Respuestas JSON también para rutas o métodos que no existen
@app.errorhandler(404)
def no_encontrado(_e):
    return error("Ruta no encontrada.", 404)


@app.errorhandler(405)
def metodo_no_permitido(_e):
    return error("Método no permitido.", 405)


inicializar_db()


if __name__ == "__main__":
    # Solo para desarrollo local (python app.py). En Docker se usa gunicorn.
    app.run(host="0.0.0.0", port=3000, debug=os.environ.get("FLASK_DEBUG") == "1")
