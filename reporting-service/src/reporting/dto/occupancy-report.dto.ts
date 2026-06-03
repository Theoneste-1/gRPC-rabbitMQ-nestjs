export class OccupancyRecordDto {
  parkingCode: string;
  parkingName: string;
  averageOccupancy: number;
  peakHour: string;
}

export class OccupancyReportDto {
  data: OccupancyRecordDto[];
  period: string;
}
