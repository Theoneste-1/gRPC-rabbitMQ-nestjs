import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { CarExitDto } from './dto/car-exit.dto';
import { CreateCarEntryDto } from './dto/car-entry.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ReportFilterDto } from './dto/report-filter.dto';
import {
  AuthGrpcClient,
  ParkingGrpcClient,
  ParkingResponse,
  UserResponse,
} from './interfaces';
import {
  TransactionEntity,
  TransactionStatus,
} from './entities/transaction.entity';
import { RabbitMQPublisher } from './publishers/rabbitmq.publisher';

@Injectable()
export class TransactionService implements OnModuleInit {
  private readonly logger = new Logger(TransactionService.name);
  private parkingClient: ParkingGrpcClient;
  private authClient: AuthGrpcClient;

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @Inject('PARKING_PACKAGE') private readonly parkingGrpc: ClientGrpc,
    @Inject('AUTH_PACKAGE') private readonly authGrpc: ClientGrpc,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  onModuleInit(): void {
    this.parkingClient = this.parkingGrpc.getService<ParkingGrpcClient>('ParkingService');
    this.authClient = this.authGrpc.getService<AuthGrpcClient>('AuthService');
  }

  async enterCar(dto: CreateCarEntryDto) {
    try {
      const plateNumber = this.normalizePlate(dto.plateNumber);
      const parkingCode = dto.parkingCode.trim();
      await this.validateAttendant(dto.attendantId);

      const active = await this.transactionRepo.findOne({
        where: { plateNumber, parkingCode, status: TransactionStatus.ACTIVE },
      });

      if (active) {
        throw new ConflictException(`Vehicle ${plateNumber} is already parked at ${parkingCode}`);
      }

      const parking = await this.getParking(parkingCode);
      if (parking.availableSpaces <= 0) {
        throw new BadRequestException(`Parking "${parkingCode}" is full`);
      }

      const entryTime = new Date();
      const transaction = this.transactionRepo.create({
        ticketId: this.generateTicketId(),
        plateNumber,
        parkingCode: parking.code,
        parkingName: parking.name,
        entryTime,
        feePerHour: parking.feePerHour,
        status: TransactionStatus.ACTIVE,
        attendantEntryId: dto.attendantId || null,
      });

      const saved = await this.transactionRepo.save(transaction);
      const updatedParking = await this.updateAvailableSpaces(parking.code, -1);

      await this.publisher.publish('car.entered', {
        transactionId: saved.id,
        ticketId: saved.ticketId,
        plateNumber: saved.plateNumber,
        parkingCode: saved.parkingCode,
        parkingName: saved.parkingName,
        entryTime: saved.entryTime.toISOString(),
        feePerHour: saved.feePerHour,
        driverEmail: dto.driverEmail || '',
      });
      await this.publisher.publish('parking.availability.updated', {
        parkingCode: updatedParking.code,
        availableSpaces: updatedParking.availableSpaces,
        totalSpaces: updatedParking.totalSpaces,
        changeType: 'entry',
      });

      return {
        ticketId: saved.ticketId,
        plateNumber: saved.plateNumber,
        parkingCode: saved.parkingCode,
        parkingName: saved.parkingName,
        entryTime: saved.entryTime.toISOString(),
        feePerHour: saved.feePerHour,
        message: 'Car entry recorded successfully',
      };
    } catch (error) {
      this.rpc(error);
    }
  }

  async exitCar(dto: CarExitDto) {
    try {
      const plateNumber = this.normalizePlate(dto.plateNumber);
      const parkingCode = dto.parkingCode.trim();
      await this.validateAttendant(dto.attendantId);

      const transaction = await this.transactionRepo.findOne({
        where: { plateNumber, parkingCode, status: TransactionStatus.ACTIVE },
        order: { entryTime: 'DESC' },
      });

      if (!transaction) {
        throw new NotFoundException(`No active transaction found for ${plateNumber} at ${parkingCode}`);
      }

      const exitTime = new Date();
      const durationHours = this.calculateDurationHours(transaction.entryTime, exitTime);
      const totalAmount = Math.round(durationHours * transaction.feePerHour * 100) / 100;

      transaction.exitTime = exitTime;
      transaction.durationHours = durationHours;
      transaction.chargedAmount = totalAmount;
      transaction.status = TransactionStatus.COMPLETED;
      transaction.attendantExitId = dto.attendantId || null;

      const saved = await this.transactionRepo.save(transaction);
      const updatedParking = await this.updateAvailableSpaces(parkingCode, 1);

      await this.publisher.publish('car.exited', {
        transactionId: saved.id,
        ticketId: saved.ticketId,
        plateNumber: saved.plateNumber,
        parkingCode: saved.parkingCode,
        parkingName: saved.parkingName,
        entryTime: saved.entryTime.toISOString(),
        exitTime: saved.exitTime!.toISOString(),
        durationHours: saved.durationHours,
        totalAmount,
        chargedAmount: totalAmount,
        driverEmail: dto.driverEmail || '',
      });
      await this.publisher.publish('parking.availability.updated', {
        parkingCode: updatedParking.code,
        availableSpaces: updatedParking.availableSpaces,
        totalSpaces: updatedParking.totalSpaces,
        changeType: 'exit',
      });

      return {
        ticketId: saved.ticketId,
        plateNumber: saved.plateNumber,
        parkingName: saved.parkingName,
        entryTime: saved.entryTime.toISOString(),
        exitTime: saved.exitTime!.toISOString(),
        durationHours,
        feePerHour: saved.feePerHour,
        totalAmount,
        message: 'Car exit processed successfully',
      };
    } catch (error) {
      this.rpc(error);
    }
  }

  async getTransactionByPlate(plateNumber: string) {
    try {
      const transaction = await this.transactionRepo.findOne({
        where: { plateNumber: this.normalizePlate(plateNumber) },
        order: { entryTime: 'DESC' },
      });

      if (!transaction) {
        throw new NotFoundException(`No transaction found for ${plateNumber}`);
      }

      return this.serialize(transaction);
    } catch (error) {
      this.rpc(error);
    }
  }

  async getActiveTransactions(pagination: PaginationDto) {
    return this.getPaginatedTransactions(
      { status: TransactionStatus.ACTIVE },
      pagination.page,
      pagination.limit,
    );
  }

  async getTransactionsByDate(filter: ReportFilterDto) {
    try {
      const start = new Date(filter.startDate);
      const end = new Date(filter.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw new BadRequestException('Invalid date range');
      }

      return this.getPaginatedTransactions(
        {
          entryTime: Between(start, end),
          ...(filter.parkingCode ? { parkingCode: filter.parkingCode } : {}),
        },
        filter.page,
        filter.limit,
      );
    } catch (error) {
      this.rpc(error);
    }
  }

  private async getPaginatedTransactions(where: object, page = 1, limit = 10) {
    try {
      const safePage = Math.max(1, page || 1);
      const safeLimit = Math.min(Math.max(1, limit || 10), 100);
      const [data, total] = await this.transactionRepo.findAndCount({
        where,
        order: { entryTime: 'DESC' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      });

      return {
        data: data.map((transaction) => this.serialize(transaction)),
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error) {
      this.rpc(error);
    }
  }

  private async getParking(code: string): Promise<ParkingResponse> {
    return firstValueFrom(this.parkingClient.GetParkingByCode({ code }));
  }

  private async updateAvailableSpaces(code: string, delta: number): Promise<ParkingResponse> {
    return firstValueFrom(this.parkingClient.UpdateAvailableSpaces({ code, delta }));
  }

  private async validateAttendant(attendantId?: string): Promise<void> {
    if (!attendantId) {
      return;
    }

    const user: UserResponse = await firstValueFrom(
      this.authClient.GetUserById({ userId: attendantId }),
    );

    if (!user.id) {
      throw new NotFoundException(`Attendant "${attendantId}" not found`);
    }

    if (!['ATTENDANT', 'ADMIN'].includes(user.role)) {
      throw new BadRequestException('User is not allowed to process transactions');
    }
  }

  private calculateDurationHours(entryTime: Date, exitTime: Date): number {
    const milliseconds = exitTime.getTime() - entryTime.getTime();
    return Math.max(1, Math.ceil(milliseconds / (1000 * 60 * 60)));
  }

  private generateTicketId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TKT-${timestamp}${random}`;
  }

  private normalizePlate(plateNumber: string): string {
    return plateNumber.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  private serialize(transaction: TransactionEntity) {
    return {
      id: transaction.id,
      ticketId: transaction.ticketId,
      plateNumber: transaction.plateNumber,
      parkingCode: transaction.parkingCode,
      parkingName: transaction.parkingName,
      entryTime: transaction.entryTime.toISOString(),
      exitTime: transaction.exitTime?.toISOString() || '',
      durationHours: transaction.durationHours || 0,
      feePerHour: transaction.feePerHour,
      chargedAmount: transaction.chargedAmount || 0,
      status: transaction.status,
      attendantEntryId: transaction.attendantEntryId || '',
      attendantExitId: transaction.attendantExitId || '',
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }

  private rpc(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      throw new RpcException({
        code: this.httpStatusToGrpcCode(error.getStatus()),
        message: error.message,
      });
    }

    if (error instanceof RpcException) {
      throw error;
    }

    this.logger.error('Unexpected transaction error', error);
    throw new RpcException({ code: 13, message: 'Internal server error' });
  }

  private httpStatusToGrpcCode(status: number): number {
    const map: Record<number, number> = {
      400: 3,
      404: 5,
      409: 6,
    };
    return map[status] ?? 13;
  }
}
