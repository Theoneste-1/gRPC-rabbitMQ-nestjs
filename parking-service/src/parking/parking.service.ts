import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RpcException }   from '@nestjs/microservices';
import { ParkingEntity }  from './entities/parking.entity';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateSpacesDto }  from './dto/update-spaces.dto';
import { RabbitMQPublisher } from '../common/events/rabbitmq.publisher';

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);

  constructor(
    @InjectRepository(ParkingEntity)
    private readonly parkingRepo: Repository<ParkingEntity>,
    private readonly dataSource: DataSource,
    private readonly publisher: RabbitMQPublisher,
  ) {}

  // ─── helpers ────────────────────────────────────────────

  /** Serialize entity to plain gRPC-safe object */
  private serialize(p: ParkingEntity) {
    return {
      id:              p.id,
      code:            p.code,
      name:            p.name,
      location:        p.location,
      totalSpaces:     p.totalSpaces,
      availableSpaces: p.availableSpaces,
      feePerHour:      p.feePerHour,
      createdAt:       p.createdAt.toISOString(),
      updatedAt:       p.updatedAt.toISOString(),
    };
  }

  /** Wrap any NestJS HttpException in an RpcException so gRPC returns proper error codes */
  private rpc(error: unknown): never {
    if (
      error instanceof NotFoundException    ||
      error instanceof ConflictException    ||
      error instanceof BadRequestException
    ) {
      throw new RpcException({
        code:    this.httpStatusToGrpcCode((error as any).getStatus()),
        message: (error as any).message,
      });
    }
    this.logger.error('Unexpected error', error);
    throw new RpcException({ code: 13, message: 'Internal server error' });
  }

  /** Map HTTP status codes to gRPC status codes */
  private httpStatusToGrpcCode(status: number): number {
    const map: Record<number, number> = {
      400: 3,   // INVALID_ARGUMENT
      401: 16,  // UNAUTHENTICATED
      403: 7,   // PERMISSION_DENIED
      404: 5,   // NOT_FOUND
      409: 6,   // ALREADY_EXISTS
    };
    return map[status] ?? 13; // INTERNAL
  }

  // ─── service methods ────────────────────────────────────

  /**
   * Register a new parking lot.
   * Throws ALREADY_EXISTS if the code is taken.
   */
  async registerParking(dto: CreateParkingDto) {
    try {
      const existing = await this.parkingRepo.findOne({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Parking with code "${dto.code}" already exists`,
        );
      }

      const parking = this.parkingRepo.create({
        code:            dto.code,
        name:            dto.name,
        location:        dto.location,
        totalSpaces:     dto.totalSpaces,
        availableSpaces: dto.totalSpaces,   // all spaces free on creation
        feePerHour:      dto.feePerHour,
      });

      const saved = await this.parkingRepo.save(parking);
      await this.publisher.publish('parking.created', {
        parkingId: saved.id,
        parkingCode: saved.code,
        parkingName: saved.name,
        location: saved.location,
        totalSpaces: saved.totalSpaces,
        availableSpaces: saved.availableSpaces,
        feePerHour: saved.feePerHour,
      });
      this.logger.log(`Parking registered: ${saved.code}`);
      return this.serialize(saved);
    } catch (err) {
      this.rpc(err);
    }
  }

  /**
   * Return a paginated list of all parking lots.
   */
  async getAllParkings(page: number = 1, limit: number = 10) {
    try {
      const safePage  = Math.max(1, page);
      const safeLimit = Math.min(Math.max(1, limit), 100);
      const skip      = (safePage - 1) * safeLimit;

      const [rows, total] = await this.parkingRepo.findAndCount({
        order: { createdAt: 'DESC' },
        skip,
        take: safeLimit,
      });

      return {
        data:       rows.map(this.serialize.bind(this)),
        total,
        page:       safePage,
        limit:      safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (err) {
      this.rpc(err);
    }
  }

  /**
   * Find a single parking lot by its unique code.
   * Throws NOT_FOUND when no match.
   */
  async getParkingByCode(code: string) {
    try {
      const parking = await this.parkingRepo.findOne({ where: { code } });

      if (!parking) {
        throw new NotFoundException(
          `Parking with code "${code}" not found`,
        );
      }

      return this.serialize(parking);
    } catch (err) {
      this.rpc(err);
    }
  }

  /**
   * Atomically adjust availableSpaces by delta (-1 entry, +1 exit).
   * Uses a DB transaction + pessimistic write lock to prevent race conditions.
   */
  async updateAvailableSpaces(dto: UpdateSpacesDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Pessimistic lock — prevents concurrent updates from racing
      const parking = await queryRunner.manager.findOne(ParkingEntity, {
        where: { code: dto.code },
        lock:  { mode: 'pessimistic_write' },
      });

      if (!parking) {
        throw new NotFoundException(
          `Parking with code "${dto.code}" not found`,
        );
      }

      const next = parking.availableSpaces + dto.delta;

      if (next < 0) {
        throw new BadRequestException(
          `Parking "${dto.code}" is full — no available spaces`,
        );
      }

      if (next > parking.totalSpaces) {
        throw new BadRequestException(
          `Available spaces cannot exceed total spaces (${parking.totalSpaces})`,
        );
      }

      parking.availableSpaces = next;
      const updated = await queryRunner.manager.save(parking);
      await queryRunner.commitTransaction();

      const serialized = this.serialize(updated);
      const availabilityPercent =
        updated.totalSpaces > 0
          ? (updated.availableSpaces / updated.totalSpaces) * 100
          : 0;

      if (availabilityPercent < 10) {
        await this.publisher.publish('parking.almost.full', {
          parkingCode: updated.code,
          parkingName: updated.name,
          availableSpaces: updated.availableSpaces,
          totalSpaces: updated.totalSpaces,
          availabilityPercent: Math.round(availabilityPercent * 100) / 100,
        });
      }

      this.logger.log(
        `Spaces updated for ${dto.code}: delta=${dto.delta}, available=${updated.availableSpaces}`,
      );

      return serialized;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.rpc(err);
    } finally {
      await queryRunner.release();
    }
  }
}
