import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user.response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT token' })
  accessToken!: string;

  @ApiProperty({ description: 'Long-lived token for refreshing' })
  refreshToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}