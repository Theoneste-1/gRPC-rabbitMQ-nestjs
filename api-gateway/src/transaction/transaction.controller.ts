import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import { UserRole } from '../auth/dto/user-role.enum';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../parking/dto/pagination-query.dto';
import { CarEntryDto } from './dto/car-entry.dto';
import { CarExitDto } from './dto/car-exit.dto';
import { TransactionDateQueryDto } from './dto/transaction-date-query.dto';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtGuard, RolesGuard)
@ApiBearerAuth()
export class TransactionController {
  private transactionClient: any;

  constructor(private readonly configService: ConfigService) {
    this.transactionClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'transaction',
        protoPath: 'proto/transaction.proto',
        url:
          this.configService.get<string>('TRANSACTION_GRPC_URL') ||
          'localhost:5004',
      },
    });
  }

  @Post('entry')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Register car entry and generate ticket' })
  async enterCar(@Body() dto: CarEntryDto, @Req() req: any) {
    return firstValueFrom(
      this.transactionClient.send('EnterCar', {
        ...dto,
        attendantId: req.user.userId,
      }),
    );
  }

  @Post('exit')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Register car exit and generate bill' })
  async exitCar(@Body() dto: CarExitDto, @Req() req: any) {
    return firstValueFrom(
      this.transactionClient.send('ExitCar', {
        ...dto,
        attendantId: req.user.userId,
      }),
    );
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'View currently parked vehicles' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActiveTransactions(@Query() query: PaginationQueryDto) {
    return firstValueFrom(
      this.transactionClient.send('GetActiveTransactions', {
        page: query.page || 1,
        limit: query.limit || 10,
      }),
    );
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'View transaction history between two dates' })
  async getTransactionsByDate(@Query() query: TransactionDateQueryDto) {
    return firstValueFrom(
      this.transactionClient.send('GetTransactionsByDate', {
        startDate: query.startDate,
        endDate: query.endDate,
        parkingCode: query.parkingCode || '',
        page: query.page || 1,
        limit: query.limit || 10,
      }),
    );
  }

  @Get('plate/:plateNumber')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Search latest transaction by plate number' })
  @ApiParam({ name: 'plateNumber', example: 'RAD 123A' })
  async getTransactionByPlate(@Param('plateNumber') plateNumber: string) {
    return firstValueFrom(
      this.transactionClient.send('GetTransactionByPlate', { plateNumber }),
    );
  }
}
