# =========================================================
# SERVICIO 2: BACKEND (API REST en Python / Flask)
# =========================================================
FROM python:3.12-slim

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

# 3. Usuario sin privilegios y carpeta de la base de datos (volumen)
RUN useradd --create-home --uid 1000 api \
    && mkdir -p /app/data \
    && chown -R api:api /app
USER api

EXPOSE 3000

# Docker revisa que la API responda (usado por depends_on en compose)
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3000/api/status', timeout=2)" || exit 1

CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:3000", "--access-logfile", "-", "app:app"]
