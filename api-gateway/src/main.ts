import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors();

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('XWZ Parking Management API')
    .setDescription('API Gateway for Car Parking System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get<number>('GATEWAY_PORT', 3000));

  console.log(`🚀 API Gateway running on: http://localhost:${configService.get('GATEWAY_PORT', 3000)}`);
  console.log(`📚 Swagger UI: http://localhost:${configService.get('GATEWAY_PORT', 3000)}/api/docs`);
}
bootstrap();