import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CarEntryDto {
  @ApiProperty({ example: 'RAD 123A' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  plateNumber: string;

  @ApiProperty({ example: 'KGL001' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  parkingCode: string;

  @ApiPropertyOptional({ example: 'driver@example.com' })
  @IsOptional()
  @IsEmail()
  driverEmail?: string;
}
