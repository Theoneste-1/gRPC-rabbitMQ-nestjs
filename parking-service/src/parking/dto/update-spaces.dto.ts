import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class UpdateSpacesDto {
  @ApiProperty({
    description: 'Parking code whose available spaces will be updated',
    example:     'KGL-001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '-1 when a car enters (occupies a space), +1 when a car exits (frees a space)',
    example:     -1,
    enum:        [-1, 1],
  })
  @IsInt()
  @Min(-1)
  @Max(1)
  delta: number;
}