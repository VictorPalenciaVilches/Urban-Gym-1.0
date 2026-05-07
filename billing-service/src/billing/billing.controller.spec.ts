import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('BillingController (Integration)', () => {
  let controller: BillingController;
  let service: BillingService;

  const mockBillingService = {
    onMemberCreated: jest.fn().mockResolvedValue({ message: 'Suscripción creada' }),
    handleWebhook: jest.fn().mockResolvedValue({ received: true }),
    getMyBilling: jest.fn().mockResolvedValue({ subscription: {}, payments: [] }),
    createCheckout: jest.fn().mockResolvedValue({ checkoutUrl: 'https://test' }),
    changePlan: jest.fn().mockResolvedValue({ message: 'Plan actualizado' }),
    getRevenueStats: jest.fn().mockResolvedValue({ total_revenue_cents: 1000 }),
  };

  beforeEach(async () => {
    // Configurar variables de entorno mock
    process.env.INTERNAL_SECRET = 'test_secret';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // Bypasseamos el guard en esta prueba
      .compile();

    controller = module.get<BillingController>(BillingController);
    service = module.get<BillingService>(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // PRUEBA DE INTEGRACIÓN 1: Creación de miembro
  it('1. POST /member-created - debería integrar con el servicio y retornar éxito', async () => {
    const dto = { member_id: '1', name: 'Test', email: 'test@test.com', plan: 'basic' };
    const result = await controller.onMemberCreated(dto, 'test_secret');
    expect(result).toEqual({ message: 'Suscripción creada' });
    expect(service.onMemberCreated).toHaveBeenCalledWith(dto);
  });

  // PRUEBA DE INTEGRACIÓN 2: Falla de autenticación interna (Prueba con promesa)
  it('2. POST /member-created - debería lanzar UnauthorizedException (Promesa rechazada)', async () => {
    const dto = { member_id: '1', name: 'Test', email: 'test@test.com', plan: 'basic' };
    await expect(controller.onMemberCreated(dto, 'bad_secret')).rejects.toThrow(UnauthorizedException);
  });

  // PRUEBA DE INTEGRACIÓN 3: Webhooks
  it('3. POST /webhook - debería pasar datos del body y query params correctamente', async () => {
    const body = { type: 'payment', data: { id: 'pay_123' } };
    const result = await controller.handleWebhook(body, '', '');
    expect(result).toEqual({ received: true });
    expect(service.handleWebhook).toHaveBeenCalledWith('payment', 'pay_123');
  });

  // PRUEBA DE INTEGRACIÓN 4: Obtener facturación propia
  it('4. GET /me - debería mapear el usuario del request al servicio', async () => {
    const req = { user: { id: 'usr_123' } };
    const result = await controller.getMyBilling(req);
    expect(result).toHaveProperty('subscription');
    expect(service.getMyBilling).toHaveBeenCalledWith('usr_123');
  });

  // PRUEBA DE INTEGRACIÓN 5: Checkout
  it('5. POST /me/checkout - debería llamar a la pasarela de MercadoPago mockeada', async () => {
    const req = { user: { id: 'usr_1', email: 'test@test', name: 'Tester' } };
    const result = await controller.createCheckout(req, { plan: 'premium' });
    expect(result.checkoutUrl).toContain('https://test');
    expect(service.createCheckout).toHaveBeenCalledWith('usr_1', 'premium', 'test@test', 'Tester');
  });

  // PRUEBA DE INTEGRACIÓN 6: Ingresos (Admin)
  it('6. GET /admin/revenue - debería obtener métricas del negocio', async () => {
    const result = await controller.getRevenue();
    expect(result.total_revenue_cents).toBeGreaterThan(0);
    expect(service.getRevenueStats).toHaveBeenCalled();
  });
});
