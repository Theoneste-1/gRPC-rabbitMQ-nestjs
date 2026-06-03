import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CarExitDto } from './dto/car-exit.dto';
import { CreateCarEntryDto } from './dto/car-entry.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ReportFilterDto } from './dto/report-filter.dto';
import { TransactionService } from './transaction.service';

@Controller()
export class TransactionGrpcController {
  private readonly logger = new Logger(TransactionGrpcController.name);

  constructor(private readonly transactionService: TransactionService) {}

  @GrpcMethod('TransactionService', 'EnterCar')
  async enterCar(data: CreateCarEntryDto) {
    this.logger.log(`gRPC EnterCar called | plate=${data.plateNumber} parking=${data.parkingCode}`);
    return this.transactionService.enterCar(data);
  }

  @GrpcMethod('TransactionService', 'ExitCar')
  async exitCar(data: CarExitDto) {
    this.logger.log(`gRPC ExitCar called | plate=${data.plateNumber} parking=${data.parkingCode}`);
    return this.transactionService.exitCar(data);
  }

  @GrpcMethod('TransactionService', 'GetTransactionByPlate')
  async getTransactionByPlate(data: { plateNumber: string }) {
    return this.transactionService.getTransactionByPlate(data.plateNumber);
  }

  @GrpcMethod('TransactionService', 'GetActiveTransactions')
  async getActiveTransactions(data: PaginationDto) {
    return this.transactionService.getActiveTransactions(data);
  }

  @GrpcMethod('TransactionService', 'GetTransactionsByDate')
  async getTransactionsByDate(data: ReportFilterDto) {
    return this.transactionService.getTransactionsByDate(data);
  }
}
