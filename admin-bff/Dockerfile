FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --frozen-lockfile
COPY --from=builder /app/dist ./dist
ARG PORT=3008
ENV PORT=$PORT
EXPOSE $PORT
CMD ["node", "dist/main"]
