import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors();

  // Hybrid Application: HTTP + gRPC
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: 'proto/auth.proto',
      url: `127.0.0.1:${configService.get('GRPC_AUTH_PORT', 50051)}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(configService.get('HTTP_PORT', 3001));

  console.log(
    `Auth Service (HTTP) running on: http://localhost:${configService.get('HTTP_PORT', 3001)}`,
  );
  console.log(
    `Auth Service (gRPC) running on: ${configService.get('GRPC_AUTH_PORT', 50051)}`,
  );
}
bootstrap();
