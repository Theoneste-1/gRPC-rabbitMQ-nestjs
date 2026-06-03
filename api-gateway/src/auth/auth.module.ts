import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [JwtGuard],
  exports: [JwtGuard],
})
export class AuthModule {}