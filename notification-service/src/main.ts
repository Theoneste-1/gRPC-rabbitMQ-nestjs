import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Notification Service is listening for RabbitMQ email events');
  return app;
}

bootstrap();
