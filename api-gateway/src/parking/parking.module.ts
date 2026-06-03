import { Module } from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParkingController } from './parking.controller';

@Module({
  controllers: [ParkingController],
  providers: [JwtGuard, RolesGuard],
})
export class ParkingModule {}
