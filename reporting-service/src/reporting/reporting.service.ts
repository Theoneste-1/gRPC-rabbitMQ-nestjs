import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ParkingTransactionEntity } from './entities/parking-transaction.entity';
import { ReportFilterDto } from './dto/report-filter.dto';
import { RevenueReportDto, RevenueBySiteDto } from './dto/revenue-report.dto';
import {
  PaginatedEntriesReportDto,
  EntrySummaryDto,
} from './dto/entries-report.dto';
import {
  PaginatedExitsReportDto,
  ExitSummaryDto,
} from './dto/exits-report.dto';
import {
  OccupancyReportDto,
  OccupancyRecordDto,
} from './dto/occupancy-report.dto';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(ParkingTransactionEntity)
    private readonly transactionRepo: Repository<ParkingTransactionEntity>,
  ) {}

  // ─── Helpers ─────────────────────────────────────────

  private validateDateRange(
    startDate: string,
    endDate: string,
  ): { start: Date; end: Date } {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }

      if (start > end) {
        throw new Error('startDate must be before endDate');
      }

      return { start, end };
    } catch (error) {
      this.logger.error('Date validation error', error);
      throw new RpcException({
        code: 3,
        message: 'Invalid date range',
      });
    }
  }

  private buildWhereClause(
    filter: ReportFilterDto,
    dateRange: { start: Date; end: Date },
  ) {
    const where: any = {
      entryTime: Between(dateRange.start, dateRange.end),
    };

    if (filter.parkingCode) {
      where.parkingCode = filter.parkingCode;
    }

    return where;
  }

  private serializeDate(date: Date): string {
    return date.toISOString();
  }

  // ─── Revenue Report ─────────────────────────────────

  async getRevenueReport(filter: ReportFilterDto): Promise<RevenueReportDto> {
    try {
      const { start, end } = this.validateDateRange(
        filter.startDate,
        filter.endDate,
      );
      const where = this.buildWhereClause(filter, { start, end });

      // Get all completed transactions (exited cars)
      const transactions = await this.transactionRepo.find({
        where: {
          ...where,
          status: 'completed',
          exitTime: MoreThanOrEqual(start),
        },
      });

      const totalRevenue = transactions.reduce(
        (sum, t) => sum + (t.chargedAmount || 0),
        0,
      );
      const totalExits = transactions.length;

      // Get total entries
      const entryWhere = filter.parkingCode
        ? { parkingCode: filter.parkingCode }
        : {};
      const totalEntries = await this.transactionRepo.count({
        where: {
          entryTime: Between(start, end),
          ...entryWhere,
        },
      });

      const averageRevenue = totalExits > 0 ? totalRevenue / totalExits : 0;

      // Group by parking location
      const groupedByParking = new Map<
        string,
        { code: string; name: string; revenue: number; count: number }
      >();

      for (const transaction of transactions) {
        const key = transaction.parkingCode;
        if (!groupedByParking.has(key)) {
          groupedByParking.set(key, {
            code: transaction.parkingCode,
            name: transaction.parkingName,
            revenue: 0,
            count: 0,
          });
        }

        const site = groupedByParking.get(key)!;
        site.revenue += transaction.chargedAmount || 0;
        site.count += 1;
      }

      const revenueBySite: RevenueBySiteDto[] = Array.from(
        groupedByParking.values(),
      ).map((site) => ({
        parkingCode: site.code,
        parkingName: site.name,
        revenue: Math.round(site.revenue * 100) / 100,
        carCount: site.count,
      }));

      const period = `${filter.startDate} to ${filter.endDate}`;

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExits,
        totalCarsEntered: totalEntries,
        averageRevenue: Math.round(averageRevenue * 100) / 100,
        period,
        revenueBySite,
      };
    } catch (error) {
      this.logger.error('Error generating revenue report', error);
      throw new RpcException({
        code: 13,
        message: 'Failed to generate revenue report',
      });
    }
  }

  // ─── Entries Report ─────────────────────────────────

  async getEntriesReport(
    filter: ReportFilterDto,
  ): Promise<PaginatedEntriesReportDto> {
    try {
      const { start, end } = this.validateDateRange(
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page || 1;
      const limit = filter.limit || 10;
      const skip = (page - 1) * limit;

      const where = this.buildWhereClause(filter, { start, end });

      const [entries, total] = await this.transactionRepo.findAndCount({
        where,
        order: { entryTime: 'DESC' },
        skip,
        take: limit,
      });

      const data: EntrySummaryDto[] = entries.map((entry) => ({
        plateNumber: entry.plateNumber,
        parkingCode: entry.parkingCode,
        parkingName: entry.parkingName,
        entryTime: this.serializeDate(entry.entryTime),
        createdAt: this.serializeDate(entry.createdAt),
      }));

      const pages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        pages,
      };
    } catch (error) {
      this.logger.error('Error generating entries report', error);
      throw new RpcException({
        code: 13,
        message: 'Failed to generate entries report',
      });
    }
  }

  // ─── Exits Report ───────────────────────────────────

  async getExitsReport(
    filter: ReportFilterDto,
  ): Promise<PaginatedExitsReportDto> {
    try {
      const { start, end } = this.validateDateRange(
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page || 1;
      const limit = filter.limit || 10;
      const skip = (page - 1) * limit;

      const where = {
        ...this.buildWhereClause(filter, { start, end }),
        status: 'completed',
        exitTime: MoreThanOrEqual(start),
      };

      const [exits, total] = await this.transactionRepo.findAndCount({
        where,
        order: { exitTime: 'DESC' },
        skip,
        take: limit,
      });

      const data: ExitSummaryDto[] = exits.map((exit) => ({
        transactionId: exit.transactionId,
        plateNumber: exit.plateNumber,
        parkingCode: exit.parkingCode,
        parkingName: exit.parkingName,
        entryTime: this.serializeDate(exit.entryTime),
        exitTime: this.serializeDate(exit.exitTime!),
        durationHours: exit.durationHours || 0,
        chargedAmount: exit.chargedAmount || 0,
      }));

      const totalCollected = exits.reduce(
        (sum, exit) => sum + (exit.chargedAmount || 0),
        0,
      );
      const pages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        pages,
        totalCollected: Math.round(totalCollected * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Error generating exits report', error);
      throw new RpcException({
        code: 13,
        message: 'Failed to generate exits report',
      });
    }
  }

  // ─── Occupancy Report ───────────────────────────────

  async getOccupancyReport(
    filter: ReportFilterDto,
  ): Promise<OccupancyReportDto> {
    try {
      const { start, end } = this.validateDateRange(
        filter.startDate,
        filter.endDate,
      );

      // Get all transactions within range
      const where = filter.parkingCode
        ? { parkingCode: filter.parkingCode }
        : {};
      const transactions = await this.transactionRepo.find({
        where: {
          entryTime: Between(start, end),
          ...where,
        },
      });

      // Calculate occupancy per parking
      const occupancyMap = new Map<
        string,
        { name: string; entries: any[]; exits: any[] }
      >();

      for (const transaction of transactions) {
        const key = transaction.parkingCode;
        if (!occupancyMap.has(key)) {
          occupancyMap.set(key, {
            name: transaction.parkingName,
            entries: [],
            exits: [],
          });
        }

        const occupancy = occupancyMap.get(key)!;
        occupancy.entries.push(transaction.entryTime);
        if (transaction.exitTime) {
          occupancy.exits.push(transaction.exitTime);
        }
      }

      const data: OccupancyRecordDto[] = [];

      occupancyMap.forEach((occupancy, code) => {
        // Calculate peak hour (hour with most active cars)
        const hourlyCount = new Map<number, number>();
        const allHours = new Set<number>();

        occupancy.entries.forEach((entry: Date) => {
          const hour = entry.getHours();
          allHours.add(hour);
          hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
        });

        let peakHour = '00:00';
        let maxCount = 0;
        hourlyCount.forEach((count, hour) => {
          if (count > maxCount) {
            maxCount = count;
            peakHour = `${String(hour).padStart(2, '0')}:00`;
          }
        });

        // Average occupancy
        const averageOccupancy =
          occupancy.entries.length > 0
            ? (occupancy.entries.length + (occupancy.exits.length || 0)) / 2
            : 0;

        data.push({
          parkingCode: code,
          parkingName: occupancy.name,
          averageOccupancy: Math.round(averageOccupancy * 100) / 100,
          peakHour,
        });
      });

      const period = `${filter.startDate} to ${filter.endDate}`;

      return {
        data,
        period,
      };
    } catch (error) {
      this.logger.error('Error generating occupancy report', error);
      throw new RpcException({
        code: 13,
        message: 'Failed to generate occupancy report',
      });
    }
  }
}
