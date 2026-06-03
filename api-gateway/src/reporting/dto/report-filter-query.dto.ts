import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportFilterQueryDto {
  @ApiProperty({
    description: 'Start date in ISO 8601 format',
    example: '2024-01-01T00:00:00Z',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    description: 'End date in ISO 8601 format',
    example: '2024-12-31T23:59:59Z',
  })
  @IsString()
  endDate: string;

  @ApiProperty({
    description: 'Parking code (optional)',
    example: 'PARK001',
    required: false,
  })
  @IsOptional()
  @IsString()
  parkingCode?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Sort field (optional)',
    example: 'date',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order: asc or desc',
    example: 'desc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
