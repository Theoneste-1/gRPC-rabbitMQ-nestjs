export class RevenueBySiteDto {
  parkingCode: string;
  parkingName: string;
  revenue: number;
  carCount: number;
}

export class RevenueReportDto {
  totalRevenue: number;
  totalExits: number;
  totalCarsEntered: number;
  averageRevenue: number;
  period: string;
  revenueBySite: RevenueBySiteDto[];
}
