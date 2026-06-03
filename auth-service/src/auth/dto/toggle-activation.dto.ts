import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleActivationDto {
  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}