import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtGuard } from '../common/guards/jwt.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportFilterQueryDto } from './dto/report-filter-query.dto';
import {
  RevenueReportResponseDto,
  PaginatedEntriesReportResponseDto,
  PaginatedExitsReportResponseDto,
  OccupancyReportResponseDto,
} from './dto/report-responses.dto';

@ApiTags('Reporting')
@Controller('reports')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);
  private reportingClient: any;

  constructor(private configService: ConfigService) {
    this.reportingClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'reporting',
        protoPath: 'proto/reporting.proto',
        url:
          this.configService.get<string>('REPORTING_GRPC_URL') ||
          '127.0.0.1:5003',
      },
    });
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'ISO 8601 format',
  })
  @ApiQuery({ name: 'endDate', required: true, description: 'ISO 8601 format' })
  @ApiQuery({ name: 'parkingCode', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    type: RevenueReportResponseDto,
    description: 'Revenue report generated successfully',
  })
  async getRevenueReport(@Query() query: ReportFilterQueryDto) {
    this.logger.log(
      `Revenue report requested: ${query.startDate} to ${query.endDate}`,
    );
    try {
      return await firstValueFrom(
        this.reportingClient.send('GetRevenueReport', {
          startDate: query.startDate,
          endDate: query.endDate,
          parkingCode: query.parkingCode || '',
          page: query.page || 1,
          limit: query.limit || 10,
          sortBy: query.sortBy || 'date',
          sortOrder: query.sortOrder || 'desc',
        }),
      );
    } catch (error) {
      this.logger.error('Error fetching revenue report', error);
      throw error;
    }
  }

  @Get('entries')
  @ApiOperation({ summary: 'Get entries report' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'ISO 8601 format',
  })
  @ApiQuery({ name: 'endDate', required: true, description: 'ISO 8601 format' })
  @ApiQuery({ name: 'parkingCode', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    type: PaginatedEntriesReportResponseDto,
    description: 'Entries report generated successfully',
  })
  async getEntriesReport(@Query() query: ReportFilterQueryDto) {
    this.logger.log(
      `Entries report requested: ${query.startDate} to ${query.endDate}`,
    );
    try {
      return await firstValueFrom(
        this.reportingClient.send('GetEntriesReport', {
          startDate: query.startDate,
          endDate: query.endDate,
          parkingCode: query.parkingCode || '',
          page: query.page || 1,
          limit: query.limit || 10,
        }),
      );
    } catch (error) {
      this.logger.error('Error fetching entries report', error);
      throw error;
    }
  }

  @Get('exits')
  @ApiOperation({ summary: 'Get exits report' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'ISO 8601 format',
  })
  @ApiQuery({ name: 'endDate', required: true, description: 'ISO 8601 format' })
  @ApiQuery({ name: 'parkingCode', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    type: PaginatedExitsReportResponseDto,
    description: 'Exits report generated successfully',
  })
  async getExitsReport(@Query() query: ReportFilterQueryDto) {
    this.logger.log(
      `Exits report requested: ${query.startDate} to ${query.endDate}`,
    );
    try {
      return await firstValueFrom(
        this.reportingClient.send('GetExitsReport', {
          startDate: query.startDate,
          endDate: query.endDate,
          parkingCode: query.parkingCode || '',
          page: query.page || 1,
          limit: query.limit || 10,
        }),
      );
    } catch (error) {
      this.logger.error('Error fetching exits report', error);
      throw error;
    }
  }

  @Get('occupancy')
  @ApiOperation({ summary: 'Get occupancy report' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'ISO 8601 format',
  })
  @ApiQuery({ name: 'endDate', required: true, description: 'ISO 8601 format' })
  @ApiQuery({ name: 'parkingCode', required: false })
  @ApiResponse({
    status: 200,
    type: OccupancyReportResponseDto,
    description: 'Occupancy report generated successfully',
  })
  async getOccupancyReport(@Query() query: ReportFilterQueryDto) {
    this.logger.log(
      `Occupancy report requested: ${query.startDate} to ${query.endDate}`,
    );
    try {
      return await firstValueFrom(
        this.reportingClient.send('GetOccupancyReport', {
          startDate: query.startDate,
          endDate: query.endDate,
          parkingCode: query.parkingCode || '',
          page: query.page || 1,
          limit: query.limit || 10,
        }),
      );
    } catch (error) {
      this.logger.error('Error fetching occupancy report', error);
      throw error;
    }
  }
}
