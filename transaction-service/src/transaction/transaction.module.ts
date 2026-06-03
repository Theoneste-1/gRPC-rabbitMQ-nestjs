import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { TransactionEntity } from './entities/transaction.entity';
import { RabbitMQPublisher } from './publishers/rabbitmq.publisher';
import { TransactionGrpcController } from './transaction.grpc.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    ClientsModule.register([
      {
        name: 'PARKING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'parking',
          protoPath: join(__dirname, '..', '..', 'proto', 'parking.proto'),
          url: process.env.PARKING_GRPC_URL ?? 'localhost:5002',
        },
      },
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(__dirname, '..', '..', 'proto', 'auth.proto'),
          url: process.env.AUTH_GRPC_URL ?? 'localhost:50051',
        },
      },
    ]),
  ],
  controllers: [TransactionGrpcController],
  providers: [TransactionService, RabbitMQPublisher],
})
export class TransactionModule {}
