# ── Urban GYM – Dockerfile (NestJS Microservice) ──
# Multi-stage build para producción optimizada

# Stage 1: Instalar dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -R node_modules /prod_modules && \
    npm ci

# Stage 2: Compilar TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Imagen de producción (liviana)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

COPY --from=deps /prod_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER nestjs

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

CMD ["node", "dist/main.js"]
