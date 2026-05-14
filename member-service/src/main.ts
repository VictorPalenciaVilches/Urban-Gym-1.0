import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { collectDefaultMetrics, register } from 'prom-client';
import { Request, Response } from 'express';

collectDefaultMetrics({ prefix: 'member_service_' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('UrbanGYM — Member Service')
    .setDescription('API de autenticación, gestión de socios y QR')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Prometheus metrics endpoint
  const expressApp = app.getHttpAdapter().getInstance() as import('express').Application;
  expressApp.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Member Service corriendo en puerto ${port}`);
  logger.log(`Swagger UI disponible en http://localhost:${port}/api/docs`);
  logger.log(`Métricas Prometheus en http://localhost:${port}/metrics`);
}
void bootstrap();
