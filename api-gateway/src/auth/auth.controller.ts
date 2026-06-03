import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private authClient: any;

  constructor(private configService: ConfigService) {
    this.authClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: 'proto/auth.proto',
        url: this.configService.get<string>('AUTH_GRPC_URL'),
      },
    });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() dto: RegisterDto) {
    return firstValueFrom(this.authClient.send('Register', dto));
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: LoginDto) {
    return firstValueFrom(this.authClient.send('Login', dto));
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return firstValueFrom(this.authClient.send('RefreshToken', dto));
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return firstValueFrom(this.authClient.send('ForgotPassword', dto));
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return firstValueFrom(this.authClient.send('ResetPassword', dto));
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: any) {
    return req.user;
  }
}
