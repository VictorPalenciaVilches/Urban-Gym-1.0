import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_123'),
  compare: jest.fn(),
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,MOCK_QR'),
}));

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ checkoutUrl: 'https://mp.test/checkout' }),
  }),
) as jest.Mock;

// ─── Supabase Mock ────────────────────────────────────────────────────────────
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
}));
const mockSchema = jest.fn(() => ({ from: mockFrom }));
const mockSupabaseClient = { schema: mockSchema };

const mockSupabaseService = {
  getClient: jest.fn(() => mockSupabaseClient),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock_jwt_token_123'),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      BILLING_SERVICE_URL: 'http://localhost:3006',
      INTERNAL_SECRET: 'test_internal_secret',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: { sendPasswordResetEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─── register ─────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('debería registrar un nuevo miembro con tokens JWT y URL de checkout', async () => {
      // Email no existe → null
      mockSingle
        .mockResolvedValueOnce({ data: null, error: null }) // email no existe
        .mockResolvedValueOnce({ data: { id: 'role-uuid' }, error: null }) // role lookup
        .mockResolvedValueOnce({
          data: {
            id: 'new-member-uuid',
            name: 'Test User',
            email: 'test@test.com',
            phone: null,
            subscription_plan: 'basic',
            subscription_status: 'pending',
            created_at: '2026-01-01',
          },
          error: null,
        }); // insert member

      const result = await service.register({
        name: 'Test User',
        email: 'test@test.com',
        password: 'Password123',
      });

      expect(result.member).toBeDefined();
      expect(result.member.email).toBe('test@test.com');
      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.refreshToken).toBe('mock_jwt_token_123');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
    });

    it('debería lanzar ConflictException si el email ya existe', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'existing-uuid' },
        error: null,
      });

      await expect(
        service.register({
          name: 'Test',
          email: 'existente@test.com',
          password: 'Pass123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('debería autenticar y retornar tokens para credenciales válidas', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'member-uuid',
          name: 'Juan',
          email: 'juan@test.com',
          password: 'hashed_password',
          subscription_status: 'active',
          roles: { name: 'member' },
        },
        error: null,
      });

      const result = await service.login({
        email: 'juan@test.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.member).toBeDefined();
      expect(result.member).not.toHaveProperty('password');
    });

    it('debería lanzar UnauthorizedException si el email no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.login({ email: 'noexiste@test.com', password: '123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'member-uuid',
          name: 'Juan',
          email: 'juan@test.com',
          password: 'hashed_password',
          roles: { name: 'member' },
        },
        error: null,
      });

      await expect(
        service.login({ email: 'juan@test.com', password: 'mal' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refreshTokens ───────────────────────────────────────────────────────────
  describe('refreshTokens', () => {
    it('debería generar nuevos tokens con un refresh token válido', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'member-uuid',
        email: 'test@test.com',
        role: 'member',
      });

      const result = await service.refreshTokens('valid_refresh_token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('debería lanzar UnauthorizedException con un refresh token inválido', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid'));

      await expect(service.refreshTokens('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── generateQRCode ──────────────────────────────────────────────────────────
  describe('generateQRCode', () => {
    it('debería generar un QR con token efímero de 5 minutos', async () => {
      const result = await service.generateQRCode('member-uuid', 'test@test.com', 'Test User');

      expect(result.qrCode).toBe('data:image/png;base64,MOCK_QR');
      expect(result.qrToken).toBe('mock_jwt_token_123');
      expect(result.memberId).toBe('member-uuid');
      expect(result.expiresAt).toBeDefined();
    });
  });

  // ─── validateQRCode ──────────────────────────────────────────────────────────
  describe('validateQRCode', () => {
    it('debería validar un QR y retornar datos del miembro activo', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'member-uuid',
        type: 'qr-access',
      });

      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'member-uuid',
          name: 'Juan',
          email: 'juan@test.com',
          subscription_status: 'active',
          subscription_plan: 'premium',
          roles: { name: 'member' },
        },
        error: null,
      });

      const result = await service.validateQRCode('valid_qr_token');

      expect(result.valid).toBe(true);
      expect(result.member).toBeDefined();
      expect(result.member!.subscription_plan).toBe('premium');
    });

    it('debería rechazar un QR con suscripción inactiva', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'member-uuid',
        type: 'qr-access',
      });

      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'member-uuid',
          name: 'Juan',
          email: 'juan@test.com',
          subscription_status: 'suspended',
          subscription_plan: 'basic',
          roles: { name: 'member' },
        },
        error: null,
      });

      const result = await service.validateQRCode('valid_qr_token');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('inactiva');
    });

    it('debería rechazar un QR con token expirado', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt expired'));

      const result = await service.validateQRCode('expired_qr_token');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expirado');
    });
  });
});
