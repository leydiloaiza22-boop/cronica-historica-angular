# Crónica Histórica

Revista digital de memoria, historia y patrimonio, hecha en **Angular 20**, con una **API REST en Flask** y despliegue en **dos contenedores Docker**, integrada con **Jenkins** y **GitHub Actions**.

**Grupo de trabajo 12 – Énfasis Profesional I (Integración Continua), Politécnico Grancolombiano**

## 1. Configurar las claves (una sola vez)

Las claves no están en el código. Copie la plantilla y edite los valores:

```bash
cp .env.example .env        # en PowerShell: Copy-Item .env.example .env
```

`.env` está en `.gitignore`, así que nunca se sube a GitHub.

## 2. Ejecutar con Docker

```bash
docker compose build
docker compose up -d
docker ps
```

- Sitio: **http://localhost:8080**
- API: **http://localhost:8080/api/status** (a través de Nginx) o http://localhost:3000/api/status (directo)
- Usuario de prueba: `demo@cronica.com` / `Cronica2026`

Guía completa, explicación de cada archivo y pruebas de comunicación entre contenedores:
**[docs/ENTREGA-1-DOCKER.md](docs/ENTREGA-1-DOCKER.md)**

## Ejecutar sin Docker (Visual Studio Code)

```bash
# Terminal 1 – API (lee el archivo .env de la raíz)
cd backend
pip install -r requirements.txt
python app.py

# Terminal 2 – Angular
npm install
npm start
```

Abrir http://localhost:4200 (las peticiones a `/api` se reenvían a `http://localhost:3000`).

## Estructura

| Carpeta / archivo | Contenido |
|---|---|
| `src/` | Aplicación Angular (Inicio, Crónicas, Personajes, Contacto e Ingresar) |
| `backend/` | API REST Flask + SQLite y sus pruebas (`backend/tests/`) |
| `nginx/default.conf` | Servidor del frontend y proxy `/api` → `backend:3000` |
| `Dockerfile` | Frontend: build multi-etapa Node.js → Nginx |
| `docker-compose.yml` | Servicios `frontend` y `backend`, red `red-cronica`, volumen de datos |
| `Jenkinsfile` | Pipeline: Checkout → Test (ruff + pytest en contenedor efímero) → Build → prueba de humo e integración → Trivy → post |
| `jenkins/` | Jenkins en Docker (`jenkins/jenkins:lts-jdk21` + Docker-in-Docker) configurado como código (JCasC) |
| `ci/` | Scripts que usan Jenkins y GitHub Actions |
| `.github/workflows/ci.yml` | Pipeline equivalente en GitHub Actions |
| `docs/` | Guías de cada entrega |
