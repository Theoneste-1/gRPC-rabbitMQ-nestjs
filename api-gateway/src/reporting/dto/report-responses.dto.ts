import { ApiProperty } from '@nestjs/swagger';

export class RevenueBySiteResponseDto {
  @ApiProperty()
  parkingCode: string;

  @ApiProperty()
  parkingName: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  carCount: number;
}

export class RevenueReportResponseDto {
  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalExits: number;

  @ApiProperty()
  totalCarsEntered: number;

  @ApiProperty()
  averageRevenue: number;

  @ApiProperty()
  period: string;

  @ApiProperty({ type: [RevenueBySiteResponseDto] })
  revenueBySite: RevenueBySiteResponseDto[];
}

export class EntrySummaryResponseDto {
  @ApiProperty()
  plateNumber: string;

  @ApiProperty()
  parkingCode: string;

  @ApiProperty()
  parkingName: string;

  @ApiProperty()
  entryTime: string;

  @ApiProperty()
  createdAt: string;
}

export class PaginatedEntriesReportResponseDto {
  @ApiProperty({ type: [EntrySummaryResponseDto] })
  data: EntrySummaryResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pages: number;
}

export class ExitSummaryResponseDto {
  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  plateNumber: string;

  @ApiProperty()
  parkingCode: string;

  @ApiProperty()
  parkingName: string;

  @ApiProperty()
  entryTime: string;

  @ApiProperty()
  exitTime: string;

  @ApiProperty()
  durationHours: number;

  @ApiProperty()
  chargedAmount: number;
}

export class PaginatedExitsReportResponseDto {
  @ApiProperty({ type: [ExitSummaryResponseDto] })
  data: ExitSummaryResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pages: number;

  @ApiProperty()
  totalCollected: number;
}

export class OccupancyRecordResponseDto {
  @ApiProperty()
  parkingCode: string;

  @ApiProperty()
  parkingName: string;

  @ApiProperty()
  averageOccupancy: number;

  @ApiProperty()
  peakHour: string;
}

export class OccupancyReportResponseDto {
  @ApiProperty({ type: [OccupancyRecordResponseDto] })
  data: OccupancyRecordResponseDto[];

  @ApiProperty()
  period: string;
}
