#!/usr/bin/env bash
# =========================================================
# Pruebas unitarias del backend (pytest) dentro de Docker.
# Construye la etapa "test" de backend/Dockerfile, ejecuta las
# pruebas y deja el reporte JUnit en reportes/ para Jenkins.
# Si una prueba falla, el script termina con error y el build falla.
# =========================================================
set -uo pipefail

IMAGEN="cronica-historica-backend:test"
CONTENEDOR="cronica-pruebas-unitarias"

mkdir -p reportes

echo "==> Construyendo la imagen de pruebas del backend"
docker build --target test -t "$IMAGEN" ./backend || exit 1

docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true

echo "==> Ejecutando pytest"
docker run --name "$CONTENEDOR" "$IMAGEN"
resultado=$?

docker cp "$CONTENEDOR:/tmp/reportes/pruebas-unitarias.xml" reportes/ >/dev/null 2>&1 \
  || echo "Aviso: no se encontró el reporte JUnit"
docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true

if [ "$resultado" -ne 0 ]; then
  echo "XX Las pruebas unitarias FALLARON"
else
  echo "OK Pruebas unitarias superadas"
fi
exit "$resultado"
