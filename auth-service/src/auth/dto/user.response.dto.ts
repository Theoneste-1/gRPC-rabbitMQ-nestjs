import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: 'ATTENDANT' })
  role!: UserRole;

  @ApiProperty({ example: '2025-06-02T10:30:00Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2025-06-02T10:30:00Z' })
  updatedAt?: Date;
}