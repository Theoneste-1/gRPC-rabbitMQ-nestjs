import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { ParkingServiceModule } from './parking-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ParkingServiceModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'parking',
        protoPath: join(__dirname, '..', '..', 'proto', 'parking.proto'),
        url: process.env.PARKING_GRPC_URL ?? '127.0.0.1:5002',
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen();
  console.log('Parking Service is listening on gRPC port 5002');
}

bootstrap();
