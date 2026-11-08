# Crónica Histórica

Revista digital de memoria, historia y patrimonio, hecha en **Angular 20**, con una **API REST en Flask** y despliegue en **dos contenedores Docker**.

## Ejecutar con Docker (recomendado)

```bash
docker compose build
docker compose up -d
docker ps
```

- Sitio: **http://localhost:8080**
- API: **http://localhost:8080/api/status** (a través de Nginx) o http://localhost:3000/api/status (directo)
- Usuario de prueba: `demo@cronica.com` / `Cronica2026`



## Ejecutar sin Docker (Visual Studio Code)

```bash
# Terminal 1 – API
cd backend
pip install -r requirements.txt
python app.py

# Terminal 2 – Angular
npm install
npm start


## Estructura

| Carpeta / archivo | Contenido |
|---|---|
| `src/` | Aplicación Angular (páginas Inicio, Crónicas, Personajes, Contacto e Ingresar) |
| `backend/` | API REST Flask + SQLite (usuarios, crónicas, mensajes de contacto) |
| `nginx/default.conf` | Servidor del frontend y proxy `/api` → `backend:3000` |
| `Dockerfile` | Frontend: build multi-etapa Node.js → Nginx |
| `docker-compose.yml` | Servicios `frontend` y `backend`, red `red-cronica`, volumen de datos |
