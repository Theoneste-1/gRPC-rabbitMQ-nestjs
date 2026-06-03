import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthResponseDto } from './dto/auth.response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

@Post('register')
@ApiOperation({ summary: 'Register new user' })
@ApiResponse({ status: 201, type: AuthResponseDto })
async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
  return this.authService.register(dto);
}

@Post('login')
@ApiOperation({ summary: 'Login user' })
@ApiResponse({ status: 200, type: AuthResponseDto })
async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
  return this.authService.login(dto);
}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }
}