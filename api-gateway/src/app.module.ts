import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ReportingModule } from './reporting/reporting.module';
import { ParkingModule } from './parking/parking.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ParkingModule,
    TransactionModule,
    ReportingModule,
  ],
})
export class AppModule {}
