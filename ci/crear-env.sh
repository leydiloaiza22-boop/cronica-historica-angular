#!/usr/bin/env bash
# =========================================================
# Crea el archivo .env que usa docker-compose.yml a partir de
# variables de entorno. En el pipeline esas variables vienen de
# las CREDENCIALES de Jenkins (o de los secretos de GitHub
# Actions / Travis CI), así ninguna clave queda escrita en el código.
# =========================================================
set -euo pipefail

: "${SECRET_KEY:?Falta SECRET_KEY (credencial cronica-secret-key en Jenkins)}"
: "${DEMO_PASSWORD:?Falta DEMO_PASSWORD (credencial cronica-demo-password en Jenkins)}"

umask 077
{
  printf 'SECRET_KEY=%s\n' "$SECRET_KEY"
  printf 'DEMO_PASSWORD=%s\n' "$DEMO_PASSWORD"
} > .env

echo "Archivo .env creado (los valores no se muestran)."
