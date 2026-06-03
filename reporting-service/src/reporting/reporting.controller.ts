import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { ReportingService } from './reporting.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { RevenueReportDto } from './dto/revenue-report.dto';
import { PaginatedEntriesReportDto } from './dto/entries-report.dto';
import { PaginatedExitsReportDto } from './dto/exits-report.dto';
import { OccupancyReportDto } from './dto/occupancy-report.dto';

@Controller()
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(private readonly reportingService: ReportingService) {}

  @GrpcMethod('ReportingService', 'GetRevenueReport')
  async getRevenueReport(request: any): Promise<RevenueReportDto> {
    this.logger.log('GetRevenueReport called');
    try {
      const filter: ReportFilterDto = {
        startDate: request.startDate,
        endDate: request.endDate,
        parkingCode: request.parkingCode,
        page: request.page || 1,
        limit: request.limit || 10,
        sortBy: request.sortBy,
        sortOrder: request.sortOrder,
      };
      return await this.reportingService.getRevenueReport(filter);
    } catch (error) {
      this.logger.error('Error in getRevenueReport', error);
      throw error;
    }
  }

  @GrpcMethod('ReportingService', 'GetEntriesReport')
  async getEntriesReport(request: any): Promise<PaginatedEntriesReportDto> {
    this.logger.log('GetEntriesReport called');
    try {
      const filter: ReportFilterDto = {
        startDate: request.startDate,
        endDate: request.endDate,
        parkingCode: request.parkingCode,
        page: request.page || 1,
        limit: request.limit || 10,
      };
      return await this.reportingService.getEntriesReport(filter);
    } catch (error) {
      this.logger.error('Error in getEntriesReport', error);
      throw error;
    }
  }

  @GrpcMethod('ReportingService', 'GetExitsReport')
  async getExitsReport(request: any): Promise<PaginatedExitsReportDto> {
    this.logger.log('GetExitsReport called');
    try {
      const filter: ReportFilterDto = {
        startDate: request.startDate,
        endDate: request.endDate,
        parkingCode: request.parkingCode,
        page: request.page || 1,
        limit: request.limit || 10,
      };
      return await this.reportingService.getExitsReport(filter);
    } catch (error) {
      this.logger.error('Error in getExitsReport', error);
      throw error;
    }
  }

  @GrpcMethod('ReportingService', 'GetOccupancyReport')
  async getOccupancyReport(request: any): Promise<OccupancyReportDto> {
    this.logger.log('GetOccupancyReport called');
    try {
      const filter: ReportFilterDto = {
        startDate: request.startDate,
        endDate: request.endDate,
        parkingCode: request.parkingCode,
        page: request.page || 1,
        limit: request.limit || 10,
      };
      return await this.reportingService.getOccupancyReport(filter);
    } catch (error) {
      this.logger.error('Error in getOccupancyReport', error);
      throw error;
    }
  }
}
