# Entrega 2 (Semana 5) – Integración continua con Jenkins

Guía paso a paso para instalar Jenkins **configurado como código (JCasC)**, conectarlo con GitHub y ejecutar el pipeline que prueba, construye y verifica los dos contenedores de la Entrega 1. Sigue el mismo enfoque del ejercicio práctico del Escenario 4 (*Un pipeline, dos motores: Jenkins + Docker y GitHub Actions*). Cada paso indica **qué captura tomar** (📸) y con qué nombre guardarla para el documento.

---

## 0. Resumen

| Criterio de la rúbrica | Dónde está |
|---|---|
| Correcciones de la Entrega 1: claves fuera de `docker-compose.yml` | `.env.example`, `docker-compose.yml` (`env_file: .env`), `backend/app.py` |
| Correcciones de la Entrega 1: workflow de CI que construye las imágenes | `.github/workflows/ci.yml` (jobs `pruebas` → `imagen`) |
| Jenkins LTS en contenedor con volumen, configurado como código | `jenkins/Dockerfile`, `jenkins/docker-compose.yml`, `jenkins/jenkins.yaml`, `jenkins/plugins.txt` |
| Credenciales guardadas en Jenkins (nunca en el código) | `jenkins/jenkins.yaml` las crea con los valores de `jenkins/.env` (no se sube) |
| Pipeline como código: Checkout, Build, Test y `post` | `Jenkinsfile` |
| Disparo automático con cada push | `triggers { pollSCM('H/2 * * * *') }` |
| Pruebas dentro de un contenedor Docker efímero | Etapa **Test**: `agent { docker { image 'python:3.12-slim' } }` (ruff + 15 pruebas pytest) |
| Construcción de los contenedores de la Entrega 1 | Etapa **Build** (`docker compose build`) |
| Prueba de humo e integración (comunicación por nombre de servicio) | `ci/prueba-integracion.sh` (8 verificaciones) |
| Seguridad (reto DevSecOps) | Etapa **Escaneo de seguridad** con Trivy (`ci/escaneo-seguridad.sh`) |

Flujo: **commit → GitHub → Jenkins (Poll SCM) → Checkout → Test (contenedor efímero) → Build → Prueba de humo e integración → Escaneo → post**. Si una prueba falla, el pipeline se detiene antes de construir: **el código defectuoso nunca se convierte en imagen**.

---

## 1. Requisitos

| Recurso | Mínimo | Recomendado |
|---|---|---|
| Memoria RAM libre | 4 GB | 8 GB |
| Disco libre | 10 GB | 20 GB |
| CPU | 2 núcleos | 4 núcleos |
| Software | Docker Desktop (WSL 2 en Windows), Git, cuenta de GitHub, navegador | + VS Code con Git Bash |
| Puertos libres | 8090 (Jenkins), 50000 (agentes) | |

Descargue las imágenes con anticipación:

```bash
docker pull jenkins/jenkins:lts-jdk21
docker pull docker:27-dind
docker pull python:3.12-slim
```

---

## 2. Subir los cambios de esta entrega a GitHub

```bash
git pull
# descomprima aquí el paquete de la Entrega 2 (reemplazando archivos)
git status
git add -A
git commit -m "Entrega 2: Jenkins con JCasC, Jenkinsfile, pruebas y claves en .env"
git push origin main
```

📸 **e2-01-compose-env.png**: en GitHub, `docker-compose.yml` mostrando `env_file: .env` en el servicio `backend` (ya no hay claves escritas).

---

## 3. Archivo `.env` del proyecto y comprobación local

```bash
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
```

Edite `SECRET_KEY` y `DEMO_PASSWORD`. Después:

```bash
git check-ignore -v .env        # responde: .gitignore:...:.env   .env
git status                      # .env NO aparece
```

📸 **e2-02-env-ignorado.png**: salida de los dos comandos.

```bash
docker compose down -v          # borra la base anterior (tenía la clave vieja)
docker compose up -d --build
docker ps
```

En una terminal **Git Bash** también puede ejecutar las pruebas:

```bash
bash ci/pruebas-unitarias.sh
bash ci/prueba-integracion.sh
docker compose down
```

---

## 4. GitHub Actions (corrección de la Entrega 1)

1. GitHub → **Settings → Secrets and variables → Actions → New repository secret**: cree `SECRET_KEY` y `DEMO_PASSWORD`.
2. Pestaña **Actions**: el workflow **CI** corre con cada push. Tiene dos jobs: **pruebas** (ruff + pytest) y **imagen** (build, prueba de humo e integración, Trivy), que solo corre si el primero pasa.

📸 **e2-03-github-actions.png**: ejecución en verde con los jobs `pruebas` → `imagen` y los artefactos `reporte-pruebas` y `reportes-integracion`.

---

## 5. Levantar Jenkins (Configuration as Code)

Jenkins corre en la imagen oficial **`jenkins/jenkins:lts-jdk21`** con un **volumen** (`jenkins-data`). La configuración (usuario, mensaje, ejecutores y **credenciales**) está en `jenkins/jenkins.yaml` (**JCasC**), por eso no aparece el asistente de instalación. Los valores secretos vienen de `jenkins/.env`, que no se sube a GitHub.

### 5.1 Variables de Jenkins

```bash
cp jenkins/.env.example jenkins/.env       # PowerShell: Copy-Item jenkins\.env.example jenkins\.env
```

Edite `jenkins/.env`:

| Variable | Valor |
|---|---|
| `JENKINS_ADMIN_ID` / `JENKINS_ADMIN_PASSWORD` | Usuario y clave para entrar a Jenkins |
| `CRONICA_SECRET_KEY` | Clave de la API (mínimo 16 caracteres) → credencial `cronica-secret-key` |
| `CRONICA_DEMO_PASSWORD` | Contraseña del usuario demo → credencial `cronica-demo-password` |
| `GITHUB_USUARIO` / `GITHUB_TOKEN` | Opcional: usuario y token de GitHub de solo lectura → credencial `github-cronica` |

Clave aleatoria en PowerShell: `-join ((48..57) + (97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})`

### 5.2 Iniciar

```bash
docker compose -f jenkins/docker-compose.yml up -d --build
docker compose -f jenkins/docker-compose.yml ps
docker logs -f jenkins        # espere "Jenkins is fully up and running" (Ctrl+C para salir)
```

📸 **e2-04-jenkins-docker.png**: `ps` con `jenkins` y `jenkins-docker` en ejecución.

Compruebe que Jenkins usa Docker: `docker compose -f jenkins/docker-compose.yml exec jenkins docker version` (muestra *Client* y *Server*).

### 5.3 Ingresar

Abra **http://localhost:8090** e ingrese con `JENKINS_ADMIN_ID` / `JENKINS_ADMIN_PASSWORD`. Se ve el mensaje *"Jenkins de Crónica Histórica - Grupo de trabajo 12"*, sin asistente: eso lo hizo JCasC.

📸 **e2-05-jenkins-jcasc.png**: panel de Jenkins con el mensaje del sistema.
📸 **e2-06-plugins.png**: **Manage Jenkins → Plugins → Installed plugins** filtrando *Git*, *GitHub*, *Pipeline*, *Docker Pipeline* y *Configuration as Code*.
📸 **e2-07-credenciales.png**: **Manage Jenkins → Credentials** con `cronica-secret-key`, `cronica-demo-password` y `github-cronica` (los valores no se ven).

> Si cambia `jenkins/.env` después del primer arranque: `docker compose -f jenkins/docker-compose.yml up -d --build` (JCasC vuelve a aplicar la configuración).

---

## 6. Crear el job del pipeline

1. **+ Nueva tarea (New Item)** → nombre `cronica-historica` → **Pipeline** → OK.
2. Sección **Pipeline**:
   - *Definition*: **Pipeline script from SCM**
   - *SCM*: **Git**
   - *Repository URL*: `https://github.com/leydiloaiza22-boop/cronica-historica-angular.git`
   - *Credentials*: `github-cronica` si definió el token; si no, *- none -* (el repositorio es público)
   - *Branch Specifier*: `*/main`
   - *Script Path*: `Jenkinsfile`
3. **Save**.

📸 **e2-08-job-scm.png**: sección *Pipeline* configurada.

---

## 7. Ejecutar el pipeline

### 7.1 Primer build

**Construir ahora (Build Now)**. Tarda 5–10 minutos la primera vez (descarga `python:3.12-slim`, imágenes base y paquetes de npm).

Etapas: **Checkout → Test (Análisis estático, Pruebas unitarias) → Preparar entorno → Build → Prueba de humo e integración → Escaneo de seguridad → post**.

📸 **e2-10-stage-view.png**: vista de etapas en verde (*Stage View* o *Pipeline Overview* del plugin Pipeline Graph View).
📸 **e2-19-contenedor-efimero.png**: en *Console Output*, la etapa **Test** con la línea `docker run ... python:3.12-slim` (Jenkins crea el contenedor solo para las pruebas) y luego `docker stop` / `docker rm` al terminar.
📸 **e2-11-consola-build.png**: consola de la etapa **Build** (`docker compose build` y lista de imágenes).
📸 **e2-12-consola-integracion.png**: consola con las 8 líneas `[OK]`.
📸 **e2-13-test-result.png**: **Test Result** con 23 pruebas (15 unitarias + 8 de integración).
📸 **e2-20-trivy.png** (opcional): consola o artefacto `reportes/trivy-*.txt` del escaneo.

### 7.2 Disparo automático (Poll SCM)

Después del primer build, **Configure** del job muestra **Poll SCM** con `H/2 * * * *`.

📸 **e2-09-poll-scm.png**.

Haga un cambio pequeño (por ejemplo una línea en `README.md`), `git commit -am "Prueba del disparo automático"` y `git push`. En menos de 2 minutos empieza un build solo, con **"Started by an SCM change"**.

📸 **e2-17-polling-log.png**: **Git Polling Log** (*Changes found*) o la página del build.

### 7.3 Romper el build a propósito y arreglarlo

1. En `backend/app.py`, función `estado()`, cambie `"estado": "ok",` por `"estado": "activo",`.
2. `git commit -am "Bug: estado de la API cambiado"` y `git push`.
3. Resultado: la etapa **Test** queda en rojo, `test_status_responde_ok` aparece como fallida y **Build, Prueba de humo e integración y Escaneo no se ejecutan**: el código defectuoso nunca llega a convertirse en imagen.

📸 **e2-15-build-fallido.png**: vista de etapas con *Test* en rojo y las siguientes sin ejecutar, más la consola con `FAILED`.

4. Corrija (`"ok"`), `git commit -am "Corrige el estado de la API"` y `git push`: vuelve a verde.

📸 **e2-16-build-corregido.png**: el build rojo seguido del verde.
📸 **e2-14-historial.png**: *Build History* (verdes y el rojo).
📸 **e2-18-commits-github.png**: lista de *commits* en GitHub.
📸 **e2-21-actions-rojo-verde.png**: pestaña **Actions**: la ejecución del bug en rojo y la corrección en verde (los mismos pushes).

---

## 8. Preguntas del ejercicio (para el documento)

- **¿Para qué se monta `/var/run/docker.sock` en el ejercicio y qué riesgo tiene?** Permite que Jenkins use el Docker del equipo (*Docker outside of Docker*). El riesgo: quien controla Jenkins controla el Docker del anfitrión, lo que equivale a acceso de administrador del equipo. En el proyecto se usa un motor Docker separado (**Docker-in-Docker**, contenedor `jenkins-docker`): Jenkins no toca el Docker del equipo, a cambio de que ese contenedor corra en modo privilegiado. Ambas opciones son aceptables solo en un laboratorio.
- **¿Qué métrica DORA mejora al detectar el error en el pipeline y no en producción?** Principalmente la **tasa de fallos de cambios** (*change failure rate*): el cambio defectuoso no llega a desplegarse. También mejora el **tiempo de restauración**, porque el error se ubica en minutos y en el commit exacto.

**Tabla de comparación (paso 4 del ejercicio, aplicada al proyecto):**

| Concepto | Jenkins | GitHub Actions |
|---|---|---|
| Archivo del pipeline | `Jenkinsfile` | `.github/workflows/ci.yml` |
| ¿Quién opera el servidor? | El grupo (contenedor en el equipo, con JCasC) | GitHub (ejecutores alojados) |
| ¿Dónde corren las pruebas? | Contenedor efímero `python:3.12-slim` creado por el plugin Docker Pipeline | Máquina virtual `ubuntu-latest` con `setup-python` |
| ¿Cómo se dispara? | Poll SCM cada 2 minutos (y manual con *Construir ahora*) | Automático con cada *push* / *pull request* (y manual con *Run workflow*) |
| ¿Cómo se ven los reportes? | *Test Result* (JUnit), vista de etapas y artefactos del build | Registro de cada paso y artefactos descargables |

---

## 9. Webhook (opcional)

Poll SCM y webhook valen lo mismo. Con Jenkins en `localhost`, GitHub necesita un túnel (`ngrok http 8090`); luego **Settings → Webhooks → Add webhook** con `https://<url-ngrok>/github-webhook/` y `githubPush()` en `triggers`.

---

## 10. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `required variable JENKINS_ADMIN_PASSWORD is missing` | Falta `jenkins/.env`: `cp jenkins/.env.example jenkins/.env` |
| Jenkins pide usuario y la clave no funciona | Use la clave de `jenkins/.env`; si la cambió, `up -d --build` para reaplicar JCasC |
| `Env file .../.env not found` | Falta el `.env` del proyecto (en Jenkins lo crea *Preparar entorno*) |
| `Falta la variable SECRET_KEY` | `.env` sin clave o con menos de 16 caracteres |
| `CredentialNotFoundException` | Revise que `jenkins.yaml` haya creado las credenciales (`docker logs jenkins`) |
| `Cannot connect to the Docker daemon at tcp://docker:2376` | `jenkins-docker` detenido: `docker compose -f jenkins/docker-compose.yml up -d` |
| `docker: not found` en el build | Imagen vieja de Jenkins: `docker compose -f jenkins/docker-compose.yml up -d --build` |
| La etapa Test falla con `ruff` | Error de estilo: ejecute `ruff check backend` localmente |
| No se disparan builds solos | Ejecute el job una vez a mano; revise *Poll SCM* y el *Git Polling Log* |
| Login demo falla tras cambiar `DEMO_PASSWORD` | `docker compose down -v` y volver a subir |
| Puerto 8090 ocupado | Cambie `"8090:8080"` en `jenkins/docker-compose.yml` |

---

## 11. Detener Jenkins

```bash
docker compose -f jenkins/docker-compose.yml stop     # conserva jobs e historial
docker compose -f jenkins/docker-compose.yml start
docker compose -f jenkins/docker-compose.yml down -v  # borra también el volumen jenkins-data
```
