import { Body, Controller, Get, Param, Post, Query, UseGuards, OnModuleInit } from '@nestjs/common';
import { ClientProxyFactory, Transport, ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
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

// 1. Define the gRPC service interface matching your parking.proto file
interface ParkingServiceClient {
  registerParking(data: CreateParkingDto): Observable<any>;
  getAllParkings(data: { page: number; limit: number }): Observable<any>;
  getParkingByCode(data: { code: string }): Observable<any>;
}

@ApiTags('Parking')
@Controller('parkings')
@UseGuards(JwtGuard, RolesGuard)
@ApiBearerAuth()
export class ParkingController implements OnModuleInit {
  private parkingClient: ClientGrpc;
  private parkingService!: ParkingServiceClient; // Holds the executable gRPC methods

  constructor(private readonly configService: ConfigService) {
    // Cast the returned factory client as unknown then ClientGrpc
    this.parkingClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'parking',
        protoPath: 'proto/parking.proto',
        url: this.configService.get<string>('PARKING_GRPC_URL') || 'localhost:5002',
      },
    }) as unknown as ClientGrpc;
  }

  // 2. Extract the service once the module initializes
  onModuleInit() {
    // NOTE: 'ParkingService' must EXACTLY match the 'service ParkingService { ... }' block in your proto/parking.proto
    this.parkingService = this.parkingClient.getService<ParkingServiceClient>('ParkingService');
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new parking location' })
  async registerParking(@Body() dto: CreateParkingDto) {
    // Direct call instead of .send()
    return firstValueFrom(this.parkingService.registerParking(dto));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'View available parking locations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllParkings(@Query() query: PaginationQueryDto) {
    // Direct call instead of .send()
    return firstValueFrom(
      this.parkingService.getAllParkings({
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
      }),
    );
  }

  @Get(':code')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Get parking by code' })
  @ApiParam({ name: 'code', example: 'KGL001' })
  async getParkingByCode(@Param('code') code: string) {
    // Direct call instead of .send()
    return firstValueFrom(this.parkingService.getParkingByCode({ code }));
  }
}