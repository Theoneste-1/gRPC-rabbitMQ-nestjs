import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParkingDto {
  @ApiProperty({ example: 'KGL001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Downtown Parking' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'Kigali City Center' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  totalSpaces: number;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  feePerHour: number;
}
