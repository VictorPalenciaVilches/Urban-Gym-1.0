# UrbanGYM — Sistema de Gestión de Gimnasios

Sistema completo de gestión de gimnasios construido con arquitectura de microservicios. Desarrollado con NestJS, React, Supabase y MercadoPago.

---

## Arquitectura

```
Cliente → API Gateway (3000)
            ├── /auth, /members       → member-service       (3001)
            ├── /classes, /bookings   → booking-service       (3002)
            ├── /gyms, /equipment     → facility-service      (3003)
            ├── /machines, /workouts  → iot-service           (3004)
            ├── /progress             → workout-progress-svc  (3005)
            ├── /billing              → billing-service        (3006)
            ├── /recommendations      → recommendation-service (3007)
            └── /admin                → admin-bff              (3008)

Infraestructura:
  Redis         → Pub/Sub de eventos (workout.completed, payment.failed, booking.created)
  Prometheus    → Métricas en /metrics de cada servicio (puerto 9090)
  Grafana       → Dashboards visuales (puerto 3010)
```

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS 11 + TypeScript |
| Base de datos | Supabase (PostgreSQL) — proyecto separado por servicio |
| Autenticación | JWT + Passport |
| Pagos | MercadoPago (sandbox y producción) |
| Mensajería | Redis 7 (Pub/Sub) |
| Frontend | React 19 + Vite + Tailwind CSS |
| Contenedores | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Observabilidad | Prometheus + Grafana |

---

## Instalación rápida (Docker — recomendado)

### Prerrequisitos
- Docker Desktop instalado y corriendo
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Urban-GYM--main

# 2. Crear los archivos .env de cada servicio
#    Copia cada .env.example como .env y rellena los valores reales
cp member-service/.env.example member-service/.env
cp booking-service/.env.example booking-service/.env
cp facility-service/.env.example facility-service/.env
cp iot-service/.env.example iot-service/.env
cp workout-progress-service/.env.example workout-progress-service/.env
cp billing-service/.env.example billing-service/.env
cp recommendation-service/.env.example recommendation-service/.env
cp admin-bff/.env.example admin-bff/.env

# 3. Levantar todos los servicios
docker compose up -d

# 4. (Primera vez) Ejecutar el seed de datos de demostración
node seed.js

# 5. Acceder al sistema
#    Frontend:   http://localhost:5173
#    API Gateway: http://localhost:3000/health
#    Grafana:    http://localhost:3010  (admin / urbangym2024)
#    Prometheus: http://localhost:9090
```

---

## Instalación manual (sin Docker)

### Prerrequisitos
- Node.js 20+
- Redis corriendo en localhost:6379

### Pasos

```bash
# Instalar dependencias de todos los servicios
for dir in api-gateway member-service booking-service facility-service iot-service workout-progress-service billing-service recommendation-service admin-bff frontend; do
  cd $dir && npm install && cd ..
done

# Crear los archivos .env (ver sección Variables de Entorno)

# Levantar cada servicio en una terminal separada (en este orden):
cd member-service && npm run start:dev          # Puerto 3001
cd booking-service && npm run start:dev         # Puerto 3002
cd facility-service && npm run start:dev        # Puerto 3003
cd iot-service && npm run start:dev             # Puerto 3004
cd workout-progress-service && npm run start:dev # Puerto 3005
cd billing-service && npm run start:dev         # Puerto 3006
cd recommendation-service && npm run start:dev  # Puerto 3007
cd admin-bff && npm run start:dev               # Puerto 3008
cd api-gateway && npm run start:dev             # Puerto 3000
cd frontend && npm run dev                       # Puerto 5173
```

---

## Variables de Entorno

### Secretos compartidos (usar los mismos en TODOS los servicios)

```env
JWT_SECRET=tu-secreto-jwt-muy-seguro
JWT_REFRESH_SECRET=tu-secreto-refresh-muy-seguro
INTERNAL_SECRET=tu-secreto-interno-muy-seguro
```

### Por servicio

| Servicio | Variables adicionales |
|---|---|
| `member-service` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BILLING_SERVICE_URL` |
| `booking-service` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PROGRESS_SERVICE_URL` |
| `facility-service` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `iot-service` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PROGRESS_SERVICE_URL`, `REDIS_URL` |
| `workout-progress-service` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `billing-service` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `NGROK_URL`, `FRONTEND_URL`, `REDIS_URL` |
| `recommendation-service` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOOKING_SERVICE_URL`, `PROGRESS_SERVICE_URL` |
| `admin-bff` | `MEMBER_SERVICE_URL`, `BOOKING_SERVICE_URL`, `FACILITY_SERVICE_URL`, `BILLING_SERVICE_URL` |
| `frontend` | `VITE_API_URL=http://localhost:3000` |

---

## Credenciales de demo (después del seed)

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@urbangym.com` | `admin123` |
| Trainer | `trainer1@urbangym.com` | `Trainer123!` |
| Trainer | `trainer2@urbangym.com` | `Trainer123!` |
| Socio | `juan@demo.com` | `Member123!` |
| Socio | `maria@demo.com` | `Member123!` |

---

## Pasos post-instalación en Supabase

### 1. Ejecutar el SQL de tablas IoT/Progress
En el SQL Editor del proyecto `hhbdwrwviswnrbzmcpke` (iot/progress):
```
workout-progress-service/iot-progress-db.sql
```

### 2. Crear la función RPC para reservas atómicas
En el SQL Editor del proyecto `cxhjmilbamlhujirjpec` (booking):
```
booking-service/supabase-rpc.sql
```

### 3. Ejecutar el esquema del recommendation-service
En el SQL Editor del proyecto `epohecgmfbqdakmkbpgn` (recommendations):
```
recommendation-service/db-schema.sql
```

---

## Flujos principales

### Registro y pago
1. Usuario se registra → `member-service` crea la cuenta
2. `billing-service` crea una preference de MercadoPago
3. Usuario completa el pago en sandbox de MercadoPago
4. Webhook actualiza la suscripción a `active`
5. Usuario puede acceder a todas las funcionalidades

### Reserva de clase
1. Usuario ve horarios disponibles → `booking-service`
2. Reserva un cupo (transacción atómica para evitar sobreventa)
3. Evento `booking.created` publicado en Redis
4. Trainer marca asistencia → `workout.completed` publicado en Redis
5. `workout-progress-service` actualiza el historial del socio

### IoT / Máquinas
1. Máquina se registra con API key → `iot-service`
2. Máquina envía datos al terminar entrenamiento
3. Evento `workout.completed` publicado en Redis
4. `workout-progress-service` actualiza métricas del socio

---

## Comandos útiles

```bash
# Ver logs de un servicio específico
docker compose logs -f billing-service

# Reiniciar un servicio
docker compose restart recommendation-service

# Ver el estado de todos los servicios
docker compose ps

# Detener todo
docker compose down

# Ejecutar tests de un servicio
cd member-service && npm test
```

---

## Estructura del proyecto

```
Urban-GYM--main/
├── api-gateway/              # Punto de entrada, reverse proxy
├── member-service/           # Autenticación, socios, QR
├── booking-service/          # Clases, horarios, reservas
├── facility-service/         # Sedes, equipamiento
├── iot-service/              # Máquinas, workouts IoT
├── workout-progress-service/ # Historial, métricas, récords
├── billing-service/          # Suscripciones, MercadoPago
├── recommendation-service/   # Motor de recomendaciones, IMC
├── admin-bff/                # Agregador de datos para panel admin
├── frontend/                 # SPA React
├── docker-compose.yml        # Orquestación completa
├── prometheus.yml            # Configuración de métricas
└── seed.js                   # Datos de demostración
```
