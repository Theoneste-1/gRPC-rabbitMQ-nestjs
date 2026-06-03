import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TransactionDateQueryDto {
  @ApiProperty({ example: '2026-06-02T00:00:00Z' })
  @IsISO8601()
  startDate: string;

  @ApiProperty({ example: '2026-06-02T23:59:59Z' })
  @IsISO8601()
  endDate: string;

  @ApiPropertyOptional({ example: 'KGL001' })
  @IsOptional()
  @IsString()
  parkingCode?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
