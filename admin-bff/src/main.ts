import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { collectDefaultMetrics, register } from 'prom-client';
import { Request, Response } from 'express';

collectDefaultMetrics({ prefix: 'admin_bff_' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Prometheus metrics endpoint
  const expressApp = app.getHttpAdapter().getInstance() as import('express').Application;
  expressApp.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  await app.listen(process.env.PORT ?? 3008);
  console.log(`Admin BFF corriendo en puerto ${process.env.PORT ?? 3008}`);
  console.log(`Métricas Prometheus en http://localhost:${process.env.PORT ?? 3008}/metrics`);
}
void bootstrap();
