import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';
import { MercadoPagoService, PLAN_PRICES_CENTS } from '../mercado-pago/mercadopago.service';

// Deep chainable mock builder
function createChainMock() {
  const mockSingle = jest.fn();
  const mockLimit = jest.fn(() => ({ data: [] as any[], error: null }));
  const mockOrder = jest.fn(() => ({ limit: mockLimit, data: [] as any[], error: null }));
  const mockEq = jest.fn(() => ({
    single: mockSingle,
    order: mockOrder,
    eq: jest.fn(() => ({ single: mockSingle })),
  }));
  const mockSelect = jest.fn(() => ({
    eq: mockEq,
    order: mockOrder,
    data: [] as any[],
    error: null,
  }));
  const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
  const mockUpdate = jest.fn(() => ({ eq: mockEq }));
  const mockFrom = jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }));
  const mockSchema = jest.fn(() => ({ from: mockFrom }));

  return { mockSingle, mockLimit, mockOrder, mockEq, mockSelect, mockInsert, mockUpdate, mockFrom, mockSchema };
}

const mocks = createChainMock();
const mockSupabaseClient = { schema: mocks.mockSchema };
const mockSupabaseService = { getClient: jest.fn(() => mockSupabaseClient) };

const mockMercadoPagoService = {
  createPreference: jest.fn().mockResolvedValue({
    checkoutUrl: 'https://mp.test/checkout',
    preferenceId: 'pref-123',
  }),
  getPayment: jest.fn(),
  getPlanAmountCents: jest.fn((plan: string) => PLAN_PRICES_CENTS[plan] ?? PLAN_PRICES_CENTS.basic),
};

const mockRedisService = {
  publish: jest.fn().mockResolvedValue(undefined),
};

global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
) as jest.Mock;

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Restore chain mock defaults
    mocks.mockEq.mockReturnValue({
      single: mocks.mockSingle,
      order: mocks.mockOrder,
      eq: jest.fn(() => ({ single: mocks.mockSingle })),
    });
    mocks.mockSelect.mockReturnValue({
      eq: mocks.mockEq,
      order: mocks.mockOrder,
      data: [],
      error: null,
    });
    mocks.mockOrder.mockReturnValue({ limit: mocks.mockLimit, data: [], error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: MercadoPagoService, useValue: mockMercadoPagoService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();
    service = module.get<BillingService>(BillingService);
  });

  it('debería estar definido', () => { expect(service).toBeDefined(); });

  describe('onMemberCreated', () => {
    it('debería retornar mensaje si ya tiene suscripción', async () => {
      mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'sub-existing' }, error: null });
      const result = await service.onMemberCreated({
        member_id: 'm-1', name: 'Juan', email: 'juan@test.com',
      });
      expect(result).toEqual({ message: 'Suscripción ya existe' });
    });

    it('debería crear suscripción pending sin URL de checkout (pago desde perfil)', async () => {
      mocks.mockSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: 'sub-1', member_id: 'm-1', plan: 'basic', status: 'pending' },
          error: null,
        });

      const result = await service.onMemberCreated({
        member_id: 'm-1', name: 'Juan', email: 'juan@test.com', plan: 'basic',
      });
      expect(result).not.toHaveProperty('checkoutUrl');
      expect(result.subscription).toBeDefined();
      expect(result.message).toContain('perfil');
      expect(mockMercadoPagoService.createPreference).not.toHaveBeenCalled();
    });
  });

  describe('changePlan', () => {
    it('debería lanzar NotFoundException si no tiene suscripción', async () => {
      mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      await expect(
        service.changePlan('m-1', 'premium', 'juan@test.com', 'Juan'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería cambiar el plan y retornar URL de checkout', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-1', plan: 'basic', member_id: 'm-1' }, error: null,
      });
      const result = await service.changePlan('m-1', 'premium', 'juan@test.com', 'Juan');
      expect(result.checkoutUrl).toBe('https://mp.test/checkout');
      expect(result.message).toContain('premium');
    });
  });

  describe('createCheckout', () => {
    it('debería crear un checkout de MercadoPago', async () => {
      const result = await service.createCheckout('m-1', 'vip', 'test@test.com', 'Test');
      expect(result.checkoutUrl).toBe('https://mp.test/checkout');
    });
  });

  describe('syncPlan', () => {
    it('debería retornar mensaje si no tiene suscripción', async () => {
      mocks.mockSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await service.syncPlan('m-1', 'premium');
      expect(result.message).toContain('nada que sincronizar');
    });

    it('debería sincronizar el plan correctamente', async () => {
      mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'sub-1' }, error: null });
      const result = await service.syncPlan('m-1', 'premium');
      expect(result.message).toContain('premium');
    });
  });

  describe('handleWebhook', () => {
    it('debería ignorar eventos que no son payment', async () => {
      const result = await service.handleWebhook('merchant_order', '123');
      expect(result).toEqual({ received: true });
    });

    it('debería procesar un pago aprobado correctamente', async () => {
      mockMercadoPagoService.getPayment.mockResolvedValueOnce({
        external_reference: 'm-1|premium',
        status: 'approved',
      });
      mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'sub-1' }, error: null });
      const result = await service.handleWebhook('payment', 'pay-123');
      expect(result).toEqual({ received: true });
    });
  });

  describe('getMyBilling', () => {
    it('debería retornar suscripción y pagos del miembro', async () => {
      // The method uses Promise.all with two queries
      // sub query → single
      mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'sub-1', plan: 'basic' }, error: null });
      // payments query → order().limit()
      mocks.mockLimit.mockReturnValueOnce({ data: [{ id: 'pay-1' }], error: null });

      const result = await service.getMyBilling('m-1');
      expect(result).toHaveProperty('subscription');
      expect(result).toHaveProperty('payments');
    });
  });

  describe('getRevenueStats', () => {
    it('debería calcular estadísticas de ingresos', async () => {
      // First call: payments with eq('status', 'succeeded')
      mocks.mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          data: [
            { amount: 8000000, status: 'succeeded', payment_date: '2026-01-01' },
            { amount: 15000000, status: 'succeeded', payment_date: '2026-01-15' },
          ],
          error: null,
        }),
      } as any);

      // Second call: subscriptions select
      mocks.mockSelect.mockReturnValueOnce({
        data: [
          { plan: 'basic', status: 'active' },
          { plan: 'premium', status: 'active' },
          { plan: 'basic', status: 'cancelled' },
        ],
        error: null,
      } as any);

      const result = await service.getRevenueStats();
      expect(result.total_revenue_cents).toBe(23000000);
      expect(result.active_subscriptions).toBe(2);
      expect(result.by_plan).toHaveProperty('basic');
    });
  });
});
