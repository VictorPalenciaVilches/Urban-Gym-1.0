import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3008);
  console.log(`Admin BFF corriendo en puerto ${process.env.PORT ?? 3008}`);
}
void bootstrap();
