import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

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

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  console.log(`Workout & Progress Service corriendo en puerto ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
void bootstrap();
