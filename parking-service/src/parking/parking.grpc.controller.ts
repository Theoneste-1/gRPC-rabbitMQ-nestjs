import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod }         from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ParkingService }     from './parking.service';
import { CreateParkingDto }   from './dto/create-parking.dto';
import { UpdateSpacesDto }    from './dto/update-spaces.dto';

/**
 * ParkingGrpcController
 *
 * Exposes all parking operations over gRPC.
 * Each method maps 1-to-1 with a procedure defined in parking.proto.
 *
 * Note: @ApiTags / @ApiOperation are included so that when you proxy
 * these calls through the API Gateway HTTP controller (which you will
 * build next), the Swagger docs on the gateway are generated correctly.
 */
@ApiTags('Parking')
@Controller()
export class ParkingGrpcController {
  private readonly logger = new Logger(ParkingGrpcController.name);

  constructor(private readonly parkingService: ParkingService) {}

  /**
   * RegisterParking
   * Called by: api-gateway → transaction-service
   * Proto: rpc RegisterParking(RegisterParkingRequest) returns (ParkingResponse)
   */
  @ApiOperation({ summary: 'Register a new parking lot' })
  @ApiResponse({ status: 201, description: 'Parking registered successfully' })
  @ApiResponse({ status: 409, description: 'Parking code already exists' })
  @GrpcMethod('ParkingService', 'RegisterParking')
  async registerParking(data: CreateParkingDto) {
    this.logger.log(`gRPC RegisterParking called | code=${data.code}`);
    return this.parkingService.registerParking(data);
  }

  /**
   * GetAllParkings
   * Called by: api-gateway (public — attendants & admins view all parkings)
   * Proto: rpc GetAllParkings(GetAllParkingsRequest) returns (ParkingListResponse)
   */
  @ApiOperation({ summary: 'Get paginated list of all parking lots' })
  @ApiResponse({ status: 200, description: 'List of parkings returned' })
  @GrpcMethod('ParkingService', 'GetAllParkings')
  async getAllParkings(data: { page: number; limit: number }) {
    this.logger.log(
      `gRPC GetAllParkings called | page=${data.page} limit=${data.limit}`,
    );
    return this.parkingService.getAllParkings(data.page, data.limit);
  }

  /**
   * GetParkingByCode
   * Called by: api-gateway, transaction-service (to validate code on car entry)
   * Proto: rpc GetParkingByCode(GetParkingByCodeRequest) returns (ParkingResponse)
   */
  @ApiOperation({ summary: 'Get a parking lot by its unique code' })
  @ApiResponse({ status: 200, description: 'Parking found' })
  @ApiResponse({ status: 404, description: 'Parking not found' })
  @GrpcMethod('ParkingService', 'GetParkingByCode')
  async getParkingByCode(data: { code: string }) {
    this.logger.log(`gRPC GetParkingByCode called | code=${data.code}`);
    return this.parkingService.getParkingByCode(data.code);
  }

  /**
   * UpdateAvailableSpaces
   * Called by: transaction-service on every car entry (delta=-1) and exit (delta=+1)
   * Proto: rpc UpdateAvailableSpaces(UpdateSpacesRequest) returns (ParkingResponse)
   */
  @ApiOperation({ summary: 'Update available spaces (delta: -1 entry, +1 exit)' })
  @ApiResponse({ status: 200, description: 'Spaces updated successfully' })
  @ApiResponse({ status: 400, description: 'Parking is full or delta invalid' })
  @ApiResponse({ status: 404, description: 'Parking not found' })
  @GrpcMethod('ParkingService', 'UpdateAvailableSpaces')
  async updateAvailableSpaces(data: UpdateSpacesDto) {
    this.logger.log(
      `gRPC UpdateAvailableSpaces called | code=${data.code} delta=${data.delta}`,
    );
    return this.parkingService.updateAvailableSpaces(data);
  }
}