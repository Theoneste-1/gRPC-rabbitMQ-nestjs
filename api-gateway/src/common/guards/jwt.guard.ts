import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ValidateTokenResponseDto } from 'src/auth/dto/validate-token-response.dto';

@Injectable()
export class JwtGuard implements CanActivate {
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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
     const result: ValidateTokenResponseDto = await firstValueFrom(
        this.authClient.send('ValidateToken', { token })
      );
      
      if (!result.isValid) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      request.user = {
        userId: result.userId,
        email: result.email,
        role: result.role,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
