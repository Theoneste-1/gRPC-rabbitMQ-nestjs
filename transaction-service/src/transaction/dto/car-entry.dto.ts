import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCarEntryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  plateNumber: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  parkingCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  attendantId?: string;

  @IsOptional()
  @IsEmail()
  driverEmail?: string;
}
