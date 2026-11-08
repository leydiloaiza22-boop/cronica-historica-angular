# Entrega 1 (Semana 3) – Integración Continua
## Crónica Histórica: dos contenedores Docker comunicados entre sí

---

## 1. Objetivo

Empaquetar el proyecto **Crónica Histórica** en **dos contenedores Docker** que se comunican por una red interna:

| Servicio | Tecnología | Puerto interno | Puerto en el equipo |
|---|---|---|---|
| `frontend` | Angular 20 compilado y servido con **Nginx** | 80 | **8080** |
| `backend` | API REST en **Python / Flask** con base de datos **SQLite** | 3000 | 3000 |

Además, se agregó **inicio de sesión y registro de usuarios**: los usuarios, los mensajes del formulario de contacto y las crónicas quedan guardados en la base de datos del backend.

---

## 2. Arquitectura

```
                Navegador (http://localhost:8080)
                              │
                              ▼
 ┌──────────────────────── red-cronica (bridge) ────────────────────────┐
 │                                                                      │
 │  ┌───────────────────────────┐        ┌───────────────────────────┐  │
 │  │  frontend  (Nginx :80)    │        │  backend  (Flask :3000)   │  │
 │  │                           │ /api/* │                           │  │
 │  │  /         -> Angular     │ ─────► │  http://backend:3000      │  │
 │  │  /historia -> index.html  │        │  gunicorn + Flask         │  │
 │  │  /api/...  -> proxy       │        │  SQLite: /app/data        │  │
 │  └───────────────────────────┘        └─────────────┬─────────────┘  │
 │                                                     │                │
 └─────────────────────────────────────────────────────┼────────────────┘
                                                       ▼
                                      volumen cronica-datos-backend
                                          (cronica.db persistente)
```

- El navegador **solo habla con Nginx**. Cuando Angular pide `api/...`, Nginx reenvía la petición a `http://backend:3000`.
- `backend` es el **nombre del servicio** en `docker-compose.yml`. El DNS interno de Docker (`127.0.0.11`) lo traduce a la IP del contenedor: eso es el **Service Discovery**.
- La base de datos se guarda en un **volumen**, así que los usuarios registrados no se pierden al apagar o reconstruir los contenedores.

---

## 3. Archivos nuevos en el repositorio

```
cronica-historica-angular/
├── Dockerfile               ← Servicio 1: build multi-etapa (Node → Nginx)
├── .dockerignore
├── docker-compose.yml       ← Orquestación, red y volumen
├── .env.example             ← Clave secreta de los tokens
├── proxy.conf.json          ← Proxy /api para "npm start" (sin Docker)
├── nginx/
│   └── default.conf         ← Sitio Angular + proxy /api → backend
├── backend/                 ← Servicio 2: API REST
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt     (Flask, gunicorn)
│   ├── app.py               (endpoints + base de datos)
│   └── datos/cronicas.json  (datos iniciales)
├── src/app/servicios/auth.service.ts           ← sesión de usuarios
├── src/app/paginas/ingresar/ingresar.component.*  ← página Ingresar / Crear cuenta
└── docs/ENTREGA-1-DOCKER.md ← este documento
```

---

## 4. Servicio 1 – Frontend (`Dockerfile`)

Se usa una construcción **multi-etapa (multi-stage build)**:

```dockerfile
# ---------- Etapa 1: compilar Angular con Node.js ----------
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
# Resultado: /app/dist/cronica-historica/browser

# ---------- Etapa 2: servir los archivos con Nginx ----------
FROM nginx:1.27-alpine AS production
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/cronica-historica/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/nginx-health || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

| Paso | Por qué |
|---|---|
| `node:22-slim AS build` | Imagen oficial de Node.js; Angular 20 exige Node 20.19+ o 22.12+. |
| Copiar `package*.json` antes que el código | Docker guarda en caché la capa de `npm ci`; si solo cambia el código, no vuelve a descargar las dependencias. |
| `npm ci` | Instala exactamente las versiones de `package-lock.json` (compilaciones repetibles). |
| `npm run build` | Ejecuta `ng build` en modo producción (minificado, con hash en los nombres). |
| `nginx:1.27-alpine` | Servidor web liviano. La imagen final **no contiene Node.js ni `node_modules`**, solo los archivos compilados. |
| `COPY --from=build` | Toma únicamente la carpeta `dist/` de la etapa 1. |
| `HEALTHCHECK` | Docker comprueba periódicamente que Nginx responda. |

`.dockerignore` excluye `node_modules`, `.git`, `backend/` y los archivos compilados que están en la raíz por GitHub Pages, para que el contexto de construcción sea pequeño.

---

## 5. Servicio 2 – Backend (`backend/`)

### 5.1 Endpoints

| Método | Ruta | Descripción | Token |
|---|---|---|---|
| GET | `/api/status` | Estado del servicio y conteo de registros en la base de datos | No |
| GET | `/api/cronicas` | Crónicas guardadas en la base de datos | No |
| POST | `/api/auth/registro` | Crea un usuario `{nombre, correo, password}` y devuelve un token | No |
| POST | `/api/auth/login` | Inicia sesión `{correo, password}` y devuelve un token | No |
| GET | `/api/auth/perfil` | Datos del usuario dueño del token | Sí |
| GET | `/api/usuarios` | Lista de usuarios registrados | Sí |
| POST | `/api/contacto` | Guarda un mensaje del formulario de contacto | No |
| GET | `/api/contacto` | Mensajes recibidos | Sí |

Ejemplo de `GET /api/status`:

```json
{
  "estado": "ok",
  "servicio": "backend",
  "contenedor": "9bd6a95c0853",
  "hora": "2026-11-07T21:15:06+00:00",
  "base_datos": { "motor": "SQLite", "usuarios": 1, "cronicas": 5, "mensajes_contacto": 0 }
}
```

`contenedor` es el *hostname* del contenedor backend; sirve como evidencia de qué contenedor respondió.

### 5.2 Base de datos (SQLite)

Se crea sola al iniciar el contenedor, en `/app/data/cronica.db`:

| Tabla | Contenido |
|---|---|
| `usuarios` | id, nombre, correo (único), password_hash, creado_en |
| `cronicas` | Las 5 crónicas de `datos/cronicas.json` (se cargan una sola vez) |
| `mensajes_contacto` | Mensajes enviados desde la página Contacto |

- Las contraseñas **no se guardan en texto plano**: se guarda un *hash* (`werkzeug.security`).
- Los tokens de sesión van firmados con `SECRET_KEY` y vencen a las 8 horas.
- Se crea un **usuario de demostración**: `demo@cronica.com` / `Cronica2026`.

### 5.3 `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DB_PATH=/app/data/cronica.db
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
COPY datos/ ./datos/
RUN useradd --create-home --uid 1000 api && mkdir -p /app/data && chown -R api:api /app
USER api
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3000/api/status', timeout=2)" || exit 1
CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:3000", "--access-logfile", "-", "app:app"]
```

- **gunicorn** es el servidor de producción para Flask (el servidor de `flask run` es solo para desarrollo).
- La API corre con el usuario **`api`** (sin privilegios de root).
- El `HEALTHCHECK` usa Python porque la imagen `slim` no trae `curl`.

---

## 6. Nginx – `nginx/default.conf`

```nginx
server {
    listen 80;
    server_name _;
    root  /usr/share/nginx/html;
    index index.html;

    # DNS interno de Docker → Service Discovery por nombre
    resolver 127.0.0.11 valid=10s ipv6=off;
    set $api_backend http://backend:3000;

    # Frontend → Backend por la red interna
    location /api/ {
        proxy_pass         $api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout    30s;
    }

    location = /nginx-health { access_log off; default_type text/plain; return 200 "ok\n"; }

    location ~* \.(?:js|css|png|jpe?g|gif|svg|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # Rutas de Angular: /historia, /ingresar, ... → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

| Bloque | Función |
|---|---|
| `resolver 127.0.0.11` + variable | Nginx pregunta al DNS de Docker la IP de `backend` en cada petición. Así **arranca aunque el backend no esté listo** y sigue funcionando si el backend se reinicia y cambia de IP. |
| `location /api/` | **Redirección (proxy inverso)**: `/api/status` del navegador → `http://backend:3000/api/status`. |
| `location /` con `try_files` | Angular maneja sus rutas en el navegador; si alguien abre directamente `/historia`, Nginx entrega `index.html` en lugar de un error 404. |
| `/nginx-health` | Responde `ok`; lo usa el `HEALTHCHECK` del contenedor. |

---

## 7. Orquestación – `docker-compose.yml`

```yaml
name: cronica-historica

services:

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: cronica-historica-backend:1.0
    container_name: cronica-backend
    environment:
      SECRET_KEY: ${SECRET_KEY:-cambia-esta-clave-secreta}
      DB_PATH: /app/data/cronica.db
    volumes:
      - datos-backend:/app/data
    ports:
      - "3000:3000"
    networks:
      - red-cronica
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    image: cronica-historica-frontend:1.0
    container_name: cronica-frontend
    ports:
      - "8080:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - red-cronica
    restart: unless-stopped

networks:
  red-cronica:
    name: red-cronica
    driver: bridge

volumes:
  datos-backend:
    name: cronica-datos-backend
```

| Elemento | Explicación |
|---|---|
| `networks: red-cronica` (`driver: bridge`) | Red privada para los dos contenedores. Dentro de ella, cada servicio es alcanzable **por su nombre** (`frontend`, `backend`). |
| `depends_on … service_healthy` | El frontend arranca **cuando el backend ya responde** a su healthcheck. |
| `volumes: datos-backend` | La base de datos SQLite persiste aunque se borren los contenedores. |
| `ports` | `8080:80` publica el sitio. `3000:3000` es **opcional**: permite probar la API directamente con Postman; la comunicación entre contenedores no lo necesita. |
| `restart: unless-stopped` | Si un contenedor falla, Docker lo vuelve a iniciar. |
| `SECRET_KEY` | Clave para firmar los tokens. Se puede cambiar en un archivo `.env` (ver `.env.example`). |

---

## 8. Inicio de sesión y registro (Angular)

- Nuevo enlace **Ingresar** en el menú de todas las páginas; con sesión iniciada muestra **"Hola, <nombre>"**.
- Nueva página **`/ingresar`** con dos modos: *Iniciar sesión* y *Crear cuenta*. Muestra el **estado del servidor** (conectado / sin conexión) y cuántos usuarios hay registrados: es una prueba visual de la comunicación frontend → backend.
- La **Gestión básica de crónicas** (crear / editar / eliminar) ahora **requiere sesión iniciada**.
- El formulario de **Contacto** guarda el mensaje en la base de datos (`mensajes_contacto`).
- La sesión se guarda en `localStorage` (`sesionCronica`) y se valida contra `/api/auth/perfil` al abrir el sitio; si el token ya no es válido, la sesión se cierra sola.
- Si el backend está apagado, el sitio sigue funcionando y el login muestra: *"No hay conexión con el servidor…"*.

---

## 9. Guía de ejecución paso a paso

### 9.1 Requisitos

- **Docker Desktop** (Windows/Mac) o Docker Engine + Docker Compose v2 (Linux). Comprobar:

```bash
docker --version
docker compose version
```

> En Docker moderno el comando es `docker compose` (con espacio). Si su instalación es antigua, use `docker-compose` (con guion): los subcomandos son los mismos.

### 9.2 Obtener el código

```bash
git clone https://github.com/leydiloaiza22-boop/cronica-historica-angular.git
cd cronica-historica-angular
```

### 9.3 Construir las imágenes

```bash
docker compose build
```

La primera vez tarda unos minutos (descarga Node, Python, Nginx e instala dependencias). Al final debe aparecer:

```
 Image cronica-historica-backend:1.0 Built
 Image cronica-historica-frontend:1.0 Built
```

### 9.4 Desplegar los contenedores

```bash
docker compose up -d
```

```
 Network red-cronica Created
 Volume cronica-datos-backend Created
 Container cronica-backend Started
 Container cronica-backend Healthy
 Container cronica-frontend Started
```

### 9.5 Verificar la ejecución

```bash
docker ps
```

```
NAMES              IMAGE                            STATUS                   PORTS
cronica-frontend   cronica-historica-frontend:1.0   Up 20 seconds (healthy)  0.0.0.0:8080->80/tcp
cronica-backend    cronica-historica-backend:1.0    Up 25 seconds (healthy)  0.0.0.0:3000->3000/tcp
```

Ambos deben decir **`(healthy)`**. Registros (logs):

```bash
docker compose logs -f            # Ctrl + C para salir
```

### 9.6 Comprobar la comunicación entre contenedores

**a) Desde el contenedor frontend hacia el backend, usando el nombre del servicio:**

```bash
docker compose exec frontend wget -qO- http://backend:3000/api/status
```

```json
{"estado":"ok","servicio":"backend","contenedor":"9bd6a95c0853", ... }
```

**b) Desde el contenedor backend hacia el frontend:**

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://frontend/nginx-health').read().decode())"
```

```
ok
```

**c) Resolución de nombres (DNS interno de Docker):**

```bash
docker compose exec backend python -c "import socket; print('frontend =', socket.gethostbyname('frontend'), '| backend =', socket.gethostbyname('backend'))"
```

```
frontend = 172.18.0.3 | backend = 172.18.0.2
```

**d) La red y sus contenedores:**

```bash
docker network inspect red-cronica
```

En la sección `"Containers"` aparecen `cronica-frontend` y `cronica-backend` con sus IP.

**e) Navegador → Nginx → Backend (el proxy de `default.conf`):**

```bash
curl http://localhost:8080/api/status
```

> En **Windows PowerShell** escriba `curl.exe` en lugar de `curl`, o use:
> `Invoke-RestMethod http://localhost:8080/api/status`

Los logs del backend muestran que la petición llegó **desde la IP del contenedor frontend** (172.18.0.x), no desde el equipo:

```
cronica-backend | 172.18.0.3 - - [...] "GET /api/status HTTP/1.1" 200 ...
```

### 9.7 Probar la aplicación en el navegador

1. Abrir **http://localhost:8080**.
2. Clic en **Ingresar** → en "Servidor" debe decir **Conectado (id del contenedor)**.
3. **Crear una cuenta** (o entrar con `demo@cronica.com` / `Cronica2026`). El menú cambia a "Hola, …".
4. Ir a **Crónicas → Gestión básica de crónicas**: ahora se puede crear, editar y eliminar.
5. Enviar un mensaje en **Contacto**.
6. Volver a **Ingresar**: "Usuarios registrados" aumentó.

### 9.8 Probar la API con curl / Postman

Registro (Linux, Mac o Git Bash):

```bash
curl -X POST http://localhost:8080/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Carlos Daza","correo":"carlos@correo.com","password":"secreto123"}'
```

Windows PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/registro `
  -ContentType "application/json" `
  -Body '{"nombre":"Carlos Daza","correo":"carlos@correo.com","password":"secreto123"}'
```

Respuesta (`201 Created`):

```json
{"token":"eyJpZCI6Mn0...","usuario":{"id":2,"nombre":"Carlos Daza","correo":"carlos@correo.com","creado_en":"..."}}
```

En **Postman**: `POST http://localhost:8080/api/auth/login` con *Body → raw → JSON* `{"correo":"demo@cronica.com","password":"Cronica2026"}`. Copiar el `token` y llamar `GET http://localhost:8080/api/usuarios` con *Authorization → Bearer Token*.

### 9.9 Ver los datos guardados en la base de datos

```bash
docker compose exec backend python -c "import sqlite3; c=sqlite3.connect('/app/data/cronica.db'); print(c.execute('SELECT id, nombre, correo, creado_en FROM usuarios').fetchall())"
```

```
[(1, 'Usuario Demo', 'demo@cronica.com', '...'), (2, 'Carlos Daza', 'carlos@correo.com', '...')]
```

### 9.10 Persistencia

```bash
docker compose down        # elimina contenedores y red, CONSERVA el volumen
docker compose up -d       # los usuarios siguen ahí
```

Para borrar también la base de datos: `docker compose down -v`.

### 9.11 Detener y limpiar

| Comando | Efecto |
|---|---|
| `docker compose stop` | Detiene los contenedores sin borrarlos |
| `docker compose down` | Borra contenedores y red (los datos se conservan) |
| `docker compose down -v` | Borra también el volumen de la base de datos |
| `docker compose up -d --build` | Reconstruye después de cambiar código |

---

## 10. Desarrollo sin Docker (opcional)

En dos terminales de Visual Studio Code:

```bash
# Terminal 1 – backend
cd backend
pip install -r requirements.txt     # en Windows también funciona: py -m pip install -r requirements.txt
python app.py                       # http://localhost:3000

# Terminal 2 – frontend
npm install
npm start                           # http://localhost:4200
```

`proxy.conf.json` hace que `npm start` reenvíe `/api` a `http://localhost:3000`, igual que Nginx en Docker.

---

## 11. Problemas comunes

| Síntoma | Solución |
|---|---|
| `port is already allocated` (8080 o 3000) | Otro programa usa el puerto. Cambie el lado izquierdo en `ports`, por ejemplo `"8081:80"`. |
| El frontend no arranca: `dependency failed to start` | Revise `docker compose logs backend`; el backend debe estar `healthy`. |
| En Ingresar dice "Sin conexión" | `docker ps`: ¿está `cronica-backend` en ejecución? Pruebe `curl http://localhost:8080/api/status`. |
| `502 Bad Gateway` en `/api/...` | Nginx no encuentra el backend: verifique que ambos estén en `red-cronica` (`docker network inspect red-cronica`). |
| Cambié el código y no se ve | `docker compose up -d --build` |
| En Windows, `npm ci` falla dentro de Docker | Verifique que `package-lock.json` esté en el repositorio y sincronizado con `package.json` (`npm install` y vuelva a hacer commit). |

