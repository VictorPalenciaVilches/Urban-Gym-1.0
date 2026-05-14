import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { collectDefaultMetrics, register } from 'prom-client';
import { Request, Response } from 'express';

collectDefaultMetrics({ prefix: 'api_gateway_' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Rate limiting global: 100 req/min por IP; rutas de auth más estrictas
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Demasiadas solicitudes, intenta más tarde.' },
    }),
  );

  // Rate limiting más estricto para login/registro (protección fuerza bruta)
  app.use(
    '/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { statusCode: 429, message: 'Demasiados intentos de inicio de sesión. Intenta en 15 minutos.' },
    }),
  );

  app.use(
    '/auth/register',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 5,
      message: { statusCode: 429, message: 'Límite de registros alcanzado. Intenta en 1 hora.' },
    }),
  );

  const memberServiceUrl =
    process.env.MEMBER_SERVICE_URL || 'http://localhost:3001';
  const bookingServiceUrl =
    process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
  const facilityServiceUrl =
    process.env.FACILITY_SERVICE_URL || 'http://localhost:3003';
  const iotServiceUrl = process.env.IOT_SERVICE_URL || 'http://localhost:3004';
  const progressServiceUrl =
    process.env.PROGRESS_SERVICE_URL || 'http://localhost:3005';
  const billingServiceUrl =
    process.env.BILLING_SERVICE_URL || 'http://localhost:3006';

  // Proxy → member-service (conserva el path completo)
  app.use(
    '/auth',
    createProxyMiddleware({
      target: memberServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/auth/' },
    }),
  );
  app.use(
    '/members',
    createProxyMiddleware({
      target: memberServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/members/' },
    }),
  );

  // Proxy → booking-service (conserva el path completo)
  app.use(
    '/waitlist',
    createProxyMiddleware({
      target: bookingServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/waitlist/' },
    }),
  );
  app.use(
    '/classes',
    createProxyMiddleware({
      target: bookingServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/classes/' },
    }),
  );
  app.use(
    '/schedules',
    createProxyMiddleware({
      target: bookingServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/schedules/' },
    }),
  );
  app.use(
    '/bookings',
    createProxyMiddleware({
      target: bookingServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/bookings/' },
    }),
  );

  // Proxy → facility-service
  app.use(
    '/gyms',
    createProxyMiddleware({
      target: facilityServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/gyms/' },
    }),
  );
  app.use(
    '/equipment',
    createProxyMiddleware({
      target: facilityServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/equipment/' },
    }),
  );

  // Proxy → iot-service
  app.use(
    '/machines',
    createProxyMiddleware({
      target: iotServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/machines/' },
    }),
  );
  app.use(
    '/workouts',
    createProxyMiddleware({
      target: iotServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/workouts/' },
    }),
  );

  // Proxy → workout-progress-service
  app.use(
    '/progress',
    createProxyMiddleware({
      target: progressServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/progress/' },
    }),
  );

  // Proxy → billing-service
  app.use(
    '/billing',
    createProxyMiddleware({
      target: billingServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/billing/' },
    }),
  );

  const recommendationServiceUrl = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3007';
  const adminBffUrl = process.env.ADMIN_BFF_URL || 'http://localhost:3008';

  // Proxy → recommendation-service
  app.use(
    '/recommendations',
    createProxyMiddleware({
      target: recommendationServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/recommendations/' },
    }),
  );

  // Proxy → admin-bff
  app.use(
    '/admin',
    createProxyMiddleware({
      target: adminBffUrl,
      changeOrigin: true,
      pathRewrite: { '^/': '/admin/' },
    }),
  );

  // Prometheus metrics endpoint
  const expressApp = app.getHttpAdapter().getInstance() as import('express').Application;
  expressApp.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`API Gateway corriendo en puerto ${process.env.PORT ?? 3000}`);
  console.log(`Métricas Prometheus en http://localhost:${process.env.PORT ?? 3000}/metrics`);
  console.log(`  → Member Service:    ${memberServiceUrl}`);
  console.log(`  → Booking Service:   ${bookingServiceUrl}`);
  console.log(`  → Facility Service:  ${facilityServiceUrl}`);
  console.log(`  → IoT Service:       ${iotServiceUrl}`);
  console.log(`  → Progress Service:  ${progressServiceUrl}`);
  console.log(`  → Billing Service:   ${billingServiceUrl}`);
  console.log(`  → Recommendation Svc:${recommendationServiceUrl}`);
  console.log(`  → Admin BFF:         ${adminBffUrl}`);
}
void bootstrap();
