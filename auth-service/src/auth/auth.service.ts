import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UserResponseDto } from './dto/user.response.dto';
import { ConfigService } from '@nestjs/config';
import { AuthResponseDto } from './dto/auth.response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ToggleActivationDto } from './dto/toggle-activation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { randomBytes } from 'crypto';
import { ValidateTokenResponseDto } from './dto/validate-token-response.dto';
import { RabbitMQPublisher } from '../common/events/rabbitmq.publisher';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private publisher: RabbitMQPublisher,
  ) {}

 
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
      role: dto.role || UserRole.ATTENDANT,
    });

    const saved = await this.userRepo.save(user);

    await this.publisher.publish('user.registered', {
      userId: saved.id,
      email: saved.email,
      firstName: saved.firstName,
      lastName: saved.lastName,
      role: saved.role,
      activationUrl: `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/activate-account?userId=${saved.id}`,
    });

    await this.publisher.publish('email.verification.requested', {
      userId: saved.id,
      email: saved.email,
      firstName: saved.firstName,
      verificationUrl: `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?userId=${saved.id}`,
    });

    return this.generateAuthResponse(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAuthResponse(user);
  }


  async forgotPassword(dto: ForgotPasswordDto) {
  const user = await this.userRepo.findOne({ where: { email: dto.email } });
  if (!user) {
    return { message: 'If an account with this email exists, a reset link has been sent.' };
  }

  // Generate secure reset token
  const resetToken = randomBytes(32).toString('hex');
  const hashedResetToken = await bcrypt.hash(resetToken, 10);

  // Set expiry to 1 hour from now
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);

  user.resetToken = hashedResetToken;
  user.resetTokenExpiry = expiryDate;

  await this.userRepo.save(user);

  await this.publisher.publish('password.reset.requested', {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    resetUrl: `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`,
    expiresAt: expiryDate.toISOString(),
  });

  return { 
    message: 'Password reset link has been sent to your email',
    // resetToken  // ← Remove this in production for security
  };
}

async resetPassword(dto: ResetPasswordDto) {
  const users = await this.userRepo.find();
  const user = (
    await Promise.all(
      users
        .filter((candidate) => candidate.resetToken)
        .map(async (candidate) => ({
          candidate,
          matches: await bcrypt.compare(dto.token, candidate.resetToken!),
        })),
    )
  ).find((result) => result.matches)?.candidate;

  if (!user) throw new BadRequestException('Invalid or expired reset token');

  if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new BadRequestException('Reset token has expired');
  }

  // Verify hashed token
  const isTokenValid = await bcrypt.compare(dto.token, user.resetToken!);
  if (!isTokenValid) {
    throw new BadRequestException('Invalid reset token');
  }

  // Update password
  const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
  user.password = hashedPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;

  await this.userRepo.save(user);

  await this.publisher.publish('password.reset.successful', {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
  });

  return { message: 'Password has been reset successfully' };
}
  

  async toggleActivation(userId: string, dto: ToggleActivationDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = dto.isActive;
    await this.userRepo.save(user);

    await this.publisher.publish(
      dto.isActive ? 'account.activated' : 'account.deactivated',
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        status: dto.isActive ? 'activated' : 'deactivated',
      },
    );

    return { message: `User ${dto.isActive ? 'activated' : 'deactivated'} successfully` };
  }

  async softDelete(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepo.softRemove(user);
    await this.publisher.publish('account.deleted', {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    });
    return { message: 'User moved to trash' };
  }

  async restore(userId: string) {
    const existing = await this.userRepo.findOne({
      where: { id: userId },
      withDeleted: true,
    });
    if (!existing) throw new NotFoundException('User not found');

    await this.userRepo.restore(userId);
    await this.publisher.publish('account.restored', {
      userId: existing.id,
      email: existing.email,
      firstName: existing.firstName,
    });

    return { message: 'User restored successfully' };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();

      return this.generateAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  
  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  // For gRPC use by other services

  async validateToken(token: string): Promise<ValidateTokenResponseDto> {
  try {
    const payload = this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    return {
      isValid: true,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    return {
      isValid: false,
      userId: undefined,
      email: undefined,
      role: undefined,
    };
  }
}



  private generateAuthResponse(user: User): AuthResponseDto {
  const accessToken = this.jwtService.sign(
    { sub: user.id, email: user.email, role: user.role },
    { 
      secret: this.configService.get<string>('JWT_SECRET'), 
      expiresIn: '15m' 
    }
  );

  const refreshToken = this.jwtService.sign(
    { sub: user.id },
    { 
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'), 
      expiresIn: '7d' 
    }
  );

  return {
    accessToken,
    refreshToken,
    user: this.mapToResponse(user),
  };
}

private mapToResponse(user: User): UserResponseDto {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userResponse } = user;
  return userResponse as UserResponseDto;
}
}
