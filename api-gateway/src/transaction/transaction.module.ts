import { Module } from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TransactionController } from './transaction.controller';

@Module({
  controllers: [TransactionController],
  providers: [JwtGuard, RolesGuard],
})
export class TransactionModule {}
