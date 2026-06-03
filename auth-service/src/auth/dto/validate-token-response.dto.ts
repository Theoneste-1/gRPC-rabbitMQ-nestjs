import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class ValidateTokenResponseDto {
  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId?: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email?: string;

  @ApiProperty({ enum: UserRole })
  role?: UserRole;
}