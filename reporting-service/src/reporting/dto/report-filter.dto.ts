export class ReportFilterDto {
  startDate: string;
  endDate: string;
  parkingCode?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: string;
}
