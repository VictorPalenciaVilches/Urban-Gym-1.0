import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .schema('members')
      .from('members')
      .select('id')
      .eq('email', registerDto.email)
      .single();

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const { data: role } = await supabase
      .schema('members')
      .from('roles')
      .select('id')
      .eq('name', 'member')
      .single();

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const { data: member, error } = await supabase
      .schema('members')
      .from('members')
      .insert({
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
        phone: registerDto.phone ?? null,
        role_id: role?.id ?? null,
        subscription_plan: 'basic',
        subscription_status: 'pending', // Nuevo: inicia en pendiente hasta que pague
      })
      .select(
        'id, name, email, phone, subscription_plan, subscription_status, created_at',
      )
      .single();

    if (error) {
      throw new ConflictException('Error al crear el socio: ' + error.message);
    }

    // Notificar al billing-service para crear suscripción y obtener link de MP
    let checkoutUrl = null;
    try {
      const billingRes = await this.notifyBillingService({
        member_id: member.id,
        name: member.name,
        email: member.email,
        plan: 'basic',
      });
      checkoutUrl = billingRes?.checkoutUrl;
    } catch (e) {
      console.warn('Error obteniendo link de pago inicial:', e);
    }

    const tokens = await this.generateTokens(member.id, member.email, 'member');
    return { member, ...tokens, checkoutUrl };
  }

  async login(loginDto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data: member } = await supabase
      .schema('members')
      .from('members')
      .select('id, name, email, password, subscription_status, roles(name)')
      .eq('email', loginDto.email)
      .single();

    if (!member) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      member.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roleName = (member.roles as any)?.name ?? 'member';
    const tokens = await this.generateTokens(member.id, member.email, roleName);
    const { password: _password, ...memberWithoutPassword } = member;

    return { member: memberWithoutPassword, ...tokens };
  }

  async validateQRCode(token: string) {
    try {
      // Verificar que el token sea válido y no haya expirado
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET')!,
      });

      if (payload.type !== 'qr-access') {
        return { valid: false, reason: 'Token inválido' };
      }

      // Verificar que el socio sigue activo en la base de datos
      const { data: member } = await this.supabaseService
        .getClient()
        .schema('members')
        .from('members')
        .select(
          'id, name, email, subscription_status, subscription_plan, roles(name)',
        )
        .eq('id', payload.sub)
        .single();

      if (!member) {
        return { valid: false, reason: 'Socio no encontrado' };
      }

      if (member.subscription_status !== 'active') {
        return {
          valid: false,
          reason: 'Suscripción inactiva. Pago pendiente.',
        };
      }

      return {
        valid: true,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          subscription_plan: member.subscription_plan || 'Básico',
          subscription_status: member.subscription_status,
          role: (member.roles as any)?.name || 'member',
        },
      };
    } catch {
      return { valid: false, reason: 'Token expirado o inválido' };
    }
  }

  async generateQRCode(memberId: string, email: string, name: string) {
    // Token efímero de 5 minutos para el QR
    const qrToken = await this.jwtService.signAsync(
      { sub: memberId, email, name, type: 'qr-access' },
      {
        secret: this.configService.get<string>('JWT_SECRET')!,
        expiresIn: '5m',
      },
    );

    const dataUrl = await QRCode.toDataURL(qrToken, {
      width: 250,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return { qrCode: dataUrl, qrToken, expiresAt, memberId };
  }

  private async generateTokens(memberId: string, email: string, role: string) {
    const payload = { sub: memberId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: '8h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private async notifyBillingService(data: {
    member_id: string;
    name: string;
    email: string;
    plan: string;
  }) {
    const billingUrl =
      this.configService.get<string>('BILLING_SERVICE_URL') ??
      'http://localhost:3006';
    const internalSecret =
      this.configService.get<string>('INTERNAL_SECRET') ??
      'urbangym_internal_secret_2024';

    const res = await fetch(`${billingUrl}/billing/member-created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalSecret,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) return null;
    return res.json();
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      return await this.generateTokens(
        payload.sub,
        payload.email,
        payload.role,
      );
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }
}
