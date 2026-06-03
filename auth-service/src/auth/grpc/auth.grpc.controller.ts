import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from '../auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ValidateTokenResponseDto } from '../dto/validate-token-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Controller()
export class AuthGrpcController {
  constructor(private authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterDto) {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginDto) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(data: RefreshTokenDto) {
    return this.authService.refreshToken(data);
  }

  @GrpcMethod('AuthService', 'ForgotPassword')
  async forgotPassword(data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  async resetPassword(data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }

@GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(data: { token: string }): Promise<ValidateTokenResponseDto> {
    return this.authService.validateToken(data.token);
  }

  @GrpcMethod('AuthService', 'GetUserById')
  async getUserById(data: { userId: string }) {
    const user = await this.authService['userRepo'].findOne({ where: { id: data.userId } });
    if (!user) return { id: '', firstName: '', lastName: '', email: '', role: '' };
    const { password, ...result } = user;
    return result;
  }
}
