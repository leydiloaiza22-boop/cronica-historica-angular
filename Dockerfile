# =========================================================
# SERVICIO 1: FRONTEND (Angular + Nginx)
# Construcción en dos etapas (multi-stage build)
# =========================================================


# ---------- Etapa 1: compilar Angular con Node.js ----------
FROM node:22-slim AS build

WORKDIR /app

# Dependencias primero: si package*.json no cambia,
# Docker reutiliza esta capa y no vuelve a descargar todo
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Código fuente y compilación de producción
COPY . .
RUN npm run build
# Resultado: /app/dist/cronica-historica/browser


# ---------- Etapa 2: servir los archivos con Nginx ----------
FROM nginx:1.27-alpine AS production

# Configuración del sitio (incluye el proxy /api -> backend)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Solo los archivos compilados; Node.js no llega a la imagen final
COPY --from=build /app/dist/cronica-historica/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
