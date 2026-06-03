import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
  IsPositive,
} from 'class-validator';

export class CreateParkingDto {
  @ApiProperty({
    description: 'Unique parking code (e.g. KGL-001)',
    example:     'KGL-001',
    maxLength:   50,
  })
  @IsString()
  @IsNotEmpty({ message: 'code must not be empty' })
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Full parking lot name',
    example:     'Kigali City Centre Parking',
    maxLength:   150,
  })
  @IsString()
  @IsNotEmpty({ message: 'name must not be empty' })
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Physical location / address',
    example:     'KN 4 Ave, Kigali',
    maxLength:   255,
  })
  @IsString()
  @IsNotEmpty({ message: 'location must not be empty' })
  @MaxLength(255)
  location: string;

  @ApiProperty({
    description: 'Total number of parking spaces',
    example:     100,
    minimum:     1,
  })
  @IsInt({ message: 'totalSpaces must be an integer' })
  @IsPositive({ message: 'totalSpaces must be positive' })
  @Min(1)
  totalSpaces: number;

  @ApiProperty({
    description: 'Hourly parking fee in RWF',
    example:     500,
    minimum:     0,
  })
  @IsNumber({}, { message: 'feePerHour must be a number' })
  @Min(0, { message: 'feePerHour cannot be negative' })
  feePerHour: number;
}