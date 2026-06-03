export class ExitSummaryDto {
  transactionId: string;
  plateNumber: string;
  parkingCode: string;
  parkingName: string;
  entryTime: string;
  exitTime: string;
  durationHours: number;
  chargedAmount: number;
}

export class PaginatedExitsReportDto {
  data: ExitSummaryDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  totalCollected: number;
}
