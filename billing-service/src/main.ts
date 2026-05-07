import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('UrbanGYM — Billing Service')
    .setDescription('API de suscripciones, pagos con MercadoPago y facturación')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  console.log(`Billing Service corriendo en puerto ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
void bootstrap();
