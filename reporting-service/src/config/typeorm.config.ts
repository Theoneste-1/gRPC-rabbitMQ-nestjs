import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ParkingTransactionEntity } from '../reporting/entities/parking-transaction.entity';

export const typeormConfig = (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'reporting_db',
    entities: [ParkingTransactionEntity],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
  };
};
