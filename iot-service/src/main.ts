import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('UrbanGYM — IoT Service')
    .setDescription('API de máquinas inteligentes y registro de workouts IoT')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'machine-api-key')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  console.log(`IoT Integration Service corriendo en puerto ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
void bootstrap();
