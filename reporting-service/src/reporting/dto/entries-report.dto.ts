export class EntrySummaryDto {
  plateNumber: string;
  parkingCode: string;
  parkingName: string;
  entryTime: string;
  createdAt: string;
}

export class PaginatedEntriesReportDto {
  data: EntrySummaryDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
