import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ParkingTransactionEntity } from './entities/parking-transaction.entity';
import { RabbitMQConsumer } from './consumers/rabbitmq.consumer';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ParkingTransactionEntity])],
  controllers: [ReportingController],
  providers: [ReportingService, RabbitMQConsumer],
  exports: [ReportingService],
})
export class ReportingModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly rabbitMQConsumer: RabbitMQConsumer) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQConsumer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.rabbitMQConsumer.disconnect();
  }
}
