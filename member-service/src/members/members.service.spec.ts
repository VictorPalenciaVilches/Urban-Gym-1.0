import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { SupabaseService } from '../supabase/supabase.service';

// ─── Mock helpers ─────────────────────────────────────────────────────────────
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSingle })) }));
const mockDelete = jest.fn(() => ({ eq: jest.fn() }));
const mockUpdate = jest.fn(() => ({
  eq: jest.fn(() => ({
    select: jest.fn(() => ({ single: mockSingle })),
  })),
}));

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  delete: mockDelete,
}));

const mockSchema = jest.fn(() => ({ from: mockFrom }));

const mockSupabaseClient = { schema: mockSchema };

const mockSupabaseService = {
  getClient: jest.fn(() => mockSupabaseClient),
};

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
) as jest.Mock;

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('debería retornar la lista de miembros', async () => {
      const members = [
        { id: '1', name: 'Juan', email: 'juan@test.com' },
        { id: '2', name: 'Maria', email: 'maria@test.com' },
      ];

      mockSelect.mockReturnValueOnce({ data: members, error: null } as any);

      const result = await service.findAll();
      expect(result).toEqual(members);
      expect(mockSchema).toHaveBeenCalledWith('members');
      expect(mockFrom).toHaveBeenCalledWith('members');
    });

    it('debería lanzar NotFoundException si hay error en la consulta', async () => {
      mockSelect.mockReturnValueOnce({
        data: null,
        error: { message: 'Error de conexión' },
      } as any);

      await expect(service.findAll()).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('debería retornar un miembro por ID', async () => {
      const member = { id: 'uuid-1', name: 'Juan', email: 'juan@test.com' };
      mockSingle.mockResolvedValueOnce({ data: member, error: null });

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(member);
    });

    it('debería lanzar NotFoundException si el miembro no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('debería actualizar un miembro correctamente', async () => {
      const updatedMember = { id: 'uuid-1', name: 'Juan Editado', email: 'juan@test.com' };
      mockSingle.mockResolvedValueOnce({ data: updatedMember, error: null });

      const result = await service.update('uuid-1', { name: 'Juan Editado' });
      expect(result).toEqual(updatedMember);
    });

    it('debería lanzar NotFoundException si el miembro a actualizar no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(service.update('uuid-inexistente', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería notificar al billing-service si se cambia el plan', async () => {
      const updatedMember = {
        id: 'uuid-1',
        name: 'Juan',
        email: 'juan@test.com',
        subscription_plan: 'premium',
      };
      mockSingle.mockResolvedValueOnce({ data: updatedMember, error: null });

      await service.update('uuid-1', { subscription_plan: 'premium' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing/admin/uuid-1/plan'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ plan: 'premium' }),
        }),
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debería eliminar un miembro y retornar mensaje de éxito', async () => {
      mockDelete.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ error: null }) });

      const result = await service.remove('uuid-1');
      expect(result).toEqual({ message: 'Socio eliminado correctamente' });
    });
  });

  // ─── updateSubscriptionStatus ─────────────────────────────────────────────────
  describe('updateSubscriptionStatus', () => {
    it('debería actualizar el estado a "active" con payment.succeeded', async () => {
      mockUpdate.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await service.updateSubscriptionStatus('uuid-1', 'payment.succeeded');
      expect(result).toEqual({ message: 'Estado actualizado a active', event: 'payment.succeeded' });
    });

    it('debería actualizar el estado a "suspended" con payment.failed', async () => {
      mockUpdate.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await service.updateSubscriptionStatus('uuid-1', 'payment.failed');
      expect(result).toEqual({ message: 'Estado actualizado a suspended', event: 'payment.failed' });
    });
  });
});
