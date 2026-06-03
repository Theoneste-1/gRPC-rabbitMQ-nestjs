import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../auth/dto/user-role.enum';
import { CreateParkingDto } from './dto/create-parking.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('Parking')
@Controller('parkings')
@UseGuards(JwtGuard, RolesGuard)
@ApiBearerAuth()
export class ParkingController {
  private parkingClient: any;

  constructor(private readonly configService: ConfigService) {
    this.parkingClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'parking',
        protoPath: 'proto/parking.proto',
        url: this.configService.get<string>('PARKING_GRPC_URL') || 'localhost:5002',
      },
    });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new parking location' })
  async registerParking(@Body() dto: CreateParkingDto) {
    return firstValueFrom(this.parkingClient.send('RegisterParking', dto));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'View available parking locations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllParkings(@Query() query: PaginationQueryDto) {
    return firstValueFrom(
      this.parkingClient.send('GetAllParkings', {
        page: query.page || 1,
        limit: query.limit || 10,
      }),
    );
  }

  @Get(':code')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Get parking by code' })
  @ApiParam({ name: 'code', example: 'KGL001' })
  async getParkingByCode(@Param('code') code: string) {
    return firstValueFrom(this.parkingClient.send('GetParkingByCode', { code }));
  }
}
