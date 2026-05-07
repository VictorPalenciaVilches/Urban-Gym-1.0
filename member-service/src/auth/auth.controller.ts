import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  // GET /auth/qr-code — genera QR efímero de acceso
  @Get('qr-code')
  @UseGuards(JwtAuthGuard)
  generateQR(@Request() req: any) {
    return this.authService.generateQRCode(
      req.user.id,
      req.user.email,
      req.user.name || '',
    );
  }

  // POST /auth/validate-qr — valida el QR escaneado en la puerta (público)
  @Post('validate-qr')
  validateQR(@Body('token') token: string) {
    return this.authService.validateQRCode(token);
  }
}
