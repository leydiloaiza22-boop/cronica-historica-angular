# =========================================================
# SERVICIO 2: BACKEND (API REST en Python / Flask)
# Tres etapas: base (dependencias + código), test (pruebas
# unitarias que usa el pipeline) y production (la imagen final)
# =========================================================


# ---------- Etapa base ----------
FROM python:3.12-slim AS base

# Sin archivos .pyc y con logs inmediatos en "docker compose logs"
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/app/data/cronica.db

WORKDIR /app

# 1. Dependencias primero (se aprovecha la caché de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Código de la API y datos iniciales
COPY app.py .
COPY datos/ ./datos/


# ---------- Etapa test: pruebas unitarias (pytest) ----------
# docker build --target test -t cronica-historica-backend:test ./backend
FROM base AS test

COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY tests/ ./tests/

CMD ["python", "-m", "pytest", "-v", "-p", "no:cacheprovider", "--junitxml=/tmp/reportes/pruebas-unitarias.xml"]


# ---------- Etapa production: imagen que usa docker compose ----------
FROM base AS production

# Usuario sin privilegios y carpeta de la base de datos (volumen)
RUN useradd --create-home --uid 1000 api \
    && mkdir -p /app/data \
    && chown -R api:api /app
USER api

EXPOSE 3000

# Docker revisa que la API responda (usado por depends_on en compose)
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3000/api/status', timeout=2)" || exit 1

CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:3000", "--access-logfile", "-", "app:app"]
