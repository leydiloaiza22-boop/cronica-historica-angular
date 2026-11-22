#!/usr/bin/env bash
# =========================================================
# Escaneo de seguridad (DevSecOps) de las dos imágenes con Trivy.
# Busca vulnerabilidades conocidas de severidad HIGH y CRITICAL.
# Por defecto es INFORMATIVO: deja el reporte en reportes/ y no
# detiene el pipeline. Con ESCANEO_ESTRICTO=1 el build falla si
# encuentra vulnerabilidades.
# =========================================================
set -uo pipefail

TRIVY="aquasec/trivy:0.57.1"
CODIGO_SALIDA=0
[ "${ESCANEO_ESTRICTO:-0}" = "1" ] && CODIGO_SALIDA=1

mkdir -p reportes
resultado=0

for imagen in cronica-historica-frontend:1.0 cronica-historica-backend:1.0; do
  nombre="${imagen%%:*}"
  echo "==> Escaneando $imagen (HIGH, CRITICAL)"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v cronica-trivy-cache:/root/.cache/ \
    "$TRIVY" image --severity HIGH,CRITICAL --exit-code "$CODIGO_SALIDA" \
    --no-progress --format table "$imagen" > "reportes/trivy-$nombre.txt" 2>&1
  codigo=$?
  tail -n 20 "reportes/trivy-$nombre.txt"
  if [ "$codigo" -ne 0 ]; then
    resultado=$codigo
    echo "Aviso: Trivy terminó con código $codigo para $imagen (ver reportes/trivy-$nombre.txt)"
  fi
done

if [ "${ESCANEO_ESTRICTO:-0}" = "1" ]; then
  exit "$resultado"
fi
echo "Escaneo terminado (informativo: no detiene el pipeline)."
exit 0
