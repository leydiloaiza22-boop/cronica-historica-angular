#!/usr/bin/env bash
# =========================================================
# Prueba de integración: levanta los DOS contenedores con
# docker compose y verifica que se comunican por el NOMBRE DEL
# SERVICIO (frontend <-> backend) y a través del proxy de Nginx.
# Cada verificación queda en reportes/prueba-integracion.xml (JUnit).
# Si alguna falla, el script termina con error y el build falla.
# Requisitos: archivo .env (ver ci/crear-env.sh) e imágenes construidas.
# =========================================================
set -uo pipefail

REPORTE="reportes/prueba-integracion.xml"
mkdir -p reportes

total=0
fallas=0
casos=""

escapar() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g'; }

registrar() {   # registrar "nombre" codigo_salida "detalle"
  local nombre="$1" codigo="$2" detalle="$3"
  total=$((total + 1))
  if [ "$codigo" -eq 0 ]; then
    echo "  [OK]    $nombre"
    casos+="    <testcase classname=\"integracion\" name=\"$nombre\"/>"$'\n'
  else
    fallas=$((fallas + 1))
    echo "  [FALLA] $nombre"
    echo "          $detalle"
    local d
    d=$(printf '%s' "$detalle" | escapar)
    casos+="    <testcase classname=\"integracion\" name=\"$nombre\"><failure message=\"$d\"/></testcase>"$'\n'
  fi
}

verificar() {   # verificar "nombre" "texto esperado" comando...
  local nombre="$1" esperado="$2"
  shift 2
  local salida codigo
  salida=$("$@" 2>&1)
  codigo=$?
  if [ "$codigo" -eq 0 ] && printf '%s' "$salida" | grep -q -- "$esperado"; then
    registrar "$nombre" 0 ""
  else
    registrar "$nombre" 1 "esperado: '$esperado' | obtenido: $(printf '%s' "$salida" | tr '\n' ' ' | cut -c1-300)"
  fi
}

echo "==> Levantando los contenedores (docker compose up -d --wait)"
if ! docker compose up -d --wait --wait-timeout 180; then
  echo "XX Los contenedores no quedaron saludables"
  docker compose ps
  docker compose logs --no-color --tail 50
  registrar "contenedores_saludables" 1 "docker compose up --wait falló"
else
  registrar "contenedores_saludables" 0 ""
fi
docker compose ps

echo "==> Verificaciones"

# 1. frontend -> backend por nombre de servicio
verificar "frontend_llega_a_backend_por_nombre" '"estado":"ok"' \
  docker compose exec -T frontend wget -qO- http://backend:3000/api/status

# 2. backend -> frontend por nombre de servicio
verificar "backend_llega_a_frontend_por_nombre" 'ok' \
  docker compose exec -T backend python -c \
  "import urllib.request; print(urllib.request.urlopen('http://frontend/nginx-health', timeout=5).read().decode())"

# 3. DNS interno de Docker (Service Discovery)
verificar "dns_interno_resuelve_los_servicios" 'frontend=' \
  docker compose exec -T backend python -c \
  "import socket; print('frontend=' + socket.gethostbyname('frontend'), 'backend=' + socket.gethostbyname('backend'))"

# 4. Proxy inverso de Nginx: /api/ llega al backend
verificar "nginx_reenvia_api_al_backend" '"servicio":"backend"' \
  docker compose exec -T frontend wget -qO- http://localhost/api/status

# 5. Nginx entrega la aplicación Angular en las rutas internas
verificar "nginx_sirve_angular_en_rutas_internas" '<app-root' \
  docker compose exec -T frontend wget -qO- http://localhost/historia

# 6. Flujo completo por el proxy: login + ruta protegida con token
verificar "login_y_ruta_protegida_por_el_proxy" 'demo@cronica.com' \
  docker compose exec -T backend python -c '
import json, os, urllib.request
base = "http://frontend/api"
cuerpo = json.dumps({"correo": os.environ.get("DEMO_CORREO", "demo@cronica.com"),
                     "password": os.environ["DEMO_PASSWORD"]}).encode()
peticion = urllib.request.Request(base + "/auth/login", data=cuerpo,
                                  headers={"Content-Type": "application/json"})
token = json.load(urllib.request.urlopen(peticion, timeout=5))["token"]
peticion = urllib.request.Request(base + "/usuarios", headers={"Authorization": "Bearer " + token})
print(json.load(urllib.request.urlopen(peticion, timeout=5)))
'

# 7. Sin token la ruta protegida responde 401
verificar "ruta_protegida_sin_token_responde_401" '401' \
  docker compose exec -T backend python -c '
import urllib.request, urllib.error
try:
    urllib.request.urlopen("http://frontend/api/usuarios", timeout=5)
    print("200")
except urllib.error.HTTPError as e:
    print(e.code)
'

cat > "$REPORTE" <<XML
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="prueba-integracion" tests="$total" failures="$fallas">
$casos</testsuite>
XML

echo "==> Resultado: $((total - fallas))/$total verificaciones correctas"
if [ "$fallas" -ne 0 ]; then
  echo "XX La prueba de integración FALLÓ"
  docker compose logs --no-color --tail 30
  exit 1
fi
echo "OK Los dos contenedores se comunican correctamente"
