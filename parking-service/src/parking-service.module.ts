import { Module }           from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { ParkingEntity }    from './parking/entities/parking.entity';
import { ParkingService }   from './parking/parking.service';
import { ParkingGrpcController } from './parking/parking.grpc.controller';
import { RabbitMQPublisher } from './common/events/rabbitmq.publisher';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        host:        config.get<string>('DB_HOST',     'localhost'),
        port:        config.get<number>('DB_PORT',     5432),
        username:    config.get<string>('DB_USERNAME', 'postgres'),
        password:    config.get<string>('DB_PASSWORD', 'postgres'),
        database:    config.get<string>('DB_NAME',     'parking_service_db'),
        entities:    [ParkingEntity],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging:     config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    TypeOrmModule.forFeature([ParkingEntity]),
  ],
  controllers: [ParkingGrpcController],
  providers:   [ParkingService, RabbitMQPublisher],
})
export class ParkingServiceModule {}
