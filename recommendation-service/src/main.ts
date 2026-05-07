import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('UrbanGYM — Recommendation Service')
    .setDescription('API de recomendaciones de clases, métricas corporales (IMC) y planes de fitness')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3007;
  await app.listen(port);
  console.log(`Recommendation Service corriendo en puerto ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
void bootstrap();
