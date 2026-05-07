import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController (Integration)', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({ accessToken: 'token123' }),
    login: jest.fn().mockResolvedValue({ accessToken: 'token123' }),
    refreshTokens: jest.fn().mockResolvedValue({ accessToken: 'new_token' }),
    generateQRCode: jest.fn().mockResolvedValue({ qrCode: 'data:image/png' }),
    validateQRCode: jest.fn().mockResolvedValue({ valid: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /auth/register - debería registrar un usuario', async () => {
    const dto = { name: 'Juan', email: 'j@test.com', password: '123' };
    const result = await controller.register(dto);
    expect(result.accessToken).toBe('token123');
  });

  it('POST /auth/login - debería iniciar sesión', async () => {
    const result = await controller.login({ email: 'j@test.com', password: '123' });
    expect(result.accessToken).toBe('token123');
  });

  it('POST /auth/refresh - debería renovar token', async () => {
    const result = await controller.refresh('old_token');
    expect(result.accessToken).toBe('new_token');
  });

  it('GET /auth/qr-code - debería generar QR con usuario del request', async () => {
    const req = { user: { id: '1', email: 'j@test.com', name: 'Juan' } };
    const result = await controller.generateQR(req);
    expect(result.qrCode).toContain('data:image');
    expect(service.generateQRCode).toHaveBeenCalledWith('1', 'j@test.com', 'Juan');
  });

  it('POST /auth/validate-qr - debería validar el QR', async () => {
    const result = await controller.validateQR('qr_token');
    expect(result.valid).toBe(true);
  });
});
