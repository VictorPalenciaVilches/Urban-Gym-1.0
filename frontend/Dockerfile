# ── Etapa 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias y resolver primero (mejor cache)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copiar código fuente y construir
COPY . .

# Aceptar la URL del API como build arg
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa 2: Serve con nginx ─────────────────────────────────────────────────
FROM nginx:alpine

# Copiar el build a nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de nginx para SPA (react-router funciona con deep links)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
