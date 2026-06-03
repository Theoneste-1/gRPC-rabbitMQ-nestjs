import { Controller, Post, Body, Get, UseGuards, Req, OnModuleInit } from '@nestjs/common';
import { ClientProxyFactory, Transport, ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// 1. Updated interface to match all your gRPC endpoints
interface AuthServiceClient {
  register(data: RegisterDto): Observable<any>;
  login(data: LoginDto): Observable<any>;
  refreshToken(data: RefreshTokenDto): Observable<any>;
  forgotPassword(data: ForgotPasswordDto): Observable<any>;
  resetPassword(data: ResetPasswordDto): Observable<any>;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController implements OnModuleInit {
  private authClient: ClientGrpc;
  private authService!: AuthServiceClient; // This will hold your typed gRPC service methods

  constructor(private configService: ConfigService) {
    // Cast the returned client as unknown then ClientGrpc to satisfy TypeScript
    this.authClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: 'proto/auth.proto',
        url: this.configService.get<string>('AUTH_GRPC_URL'),
      },
    }) as unknown as ClientGrpc;
  }

  // 2. This hook runs when the module starts up, converting the proto definitions into callable methods
  onModuleInit() {
    // NOTE: 'AuthService' must EXACTLY match the name of the 'service' defined inside your proto/auth.proto file
    this.authService = this.authClient.getService<AuthServiceClient>('AuthService');
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() dto: RegisterDto) {
    return firstValueFrom(this.authService.register(dto));
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: LoginDto) {
    return firstValueFrom(this.authService.login(dto));
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    // Assuming your proto file named this method 'refreshToken' (camelCase is typical for JS generation)
    return firstValueFrom(this.authService.refreshToken(dto));
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return firstValueFrom(this.authService.forgotPassword(dto));
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return firstValueFrom(this.authService.resetPassword(dto));
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: any) {
    return req.user;
  }
}
