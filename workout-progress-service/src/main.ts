import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { collectDefaultMetrics, register } from 'prom-client';
import { Request, Response } from 'express';

collectDefaultMetrics({ prefix: 'workout_progress_service_' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('UrbanGYM — Workout Progress Service')
    .setDescription('API de historial de entrenamientos, métricas y récords personales')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  // Prometheus metrics endpoint
  const expressApp = app.getHttpAdapter().getInstance() as import('express').Application;
  expressApp.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  console.log(`Workout & Progress Service corriendo en puerto ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
  console.log(`Métricas Prometheus en http://localhost:${port}/metrics`);
}
void bootstrap();
