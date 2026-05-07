import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { SupabaseService } from '../supabase/supabase.service';

const mockSingle = jest.fn();
const mockOrder = jest.fn(() => ({ data: [], error: null }));
const mockEq2 = jest.fn(() => ({ order: mockOrder }));
const mockEq = jest.fn(() => ({
  single: mockSingle,
  eq: mockEq2,
  order: mockOrder,
  select: jest.fn(() => ({ single: mockSingle })),
}));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockDelete = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }));
const mockFrom = jest.fn(() => ({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete }));
const mockSchema = jest.fn(() => ({ from: mockFrom }));
const mockSupabaseClient = { schema: mockSchema };
const mockSupabaseService = { getClient: jest.fn(() => mockSupabaseClient) };

describe('EquipmentService', () => {
  let service: EquipmentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [EquipmentService, { provide: SupabaseService, useValue: mockSupabaseService }],
    }).compile();
    service = module.get<EquipmentService>(EquipmentService);
  });

  it('debería estar definido', () => { expect(service).toBeDefined(); });

  describe('findByGym', () => {
    it('debería retornar equipamiento de una sede', async () => {
      const equipment = [{ id: 'e-1', name: 'Mancuerna 10kg', gym_id: 'g-1' }];
      mockOrder.mockReturnValueOnce({ data: equipment, error: null });
      const result = await service.findByGym('g-1');
      expect(result).toEqual(equipment);
      expect(mockSchema).toHaveBeenCalledWith('facilities');
    });

    it('debería lanzar error si falla', async () => {
      mockOrder.mockReturnValueOnce({ data: null, error: { message: 'Error' } });
      await expect(service.findByGym('g-1')).rejects.toThrow('Error');
    });
  });

  describe('findAvailableByGym', () => {
    it('debería retornar solo equipamiento disponible', async () => {
      const available = [{ id: 'e-1', name: 'Barra', status: 'available' }];
      mockOrder.mockReturnValueOnce({ data: available, error: null });
      const result = await service.findAvailableByGym('g-1');
      expect(result).toEqual(available);
    });
  });

  describe('findOne', () => {
    it('debería retornar un equipamiento por ID', async () => {
      const eq = { id: 'e-1', name: 'Banca plana', category: 'fuerza' };
      mockSingle.mockResolvedValueOnce({ data: eq, error: null });
      const result = await service.findOne('e-1');
      expect(result).toEqual(eq);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      await expect(service.findOne('e-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('debería crear nuevo equipamiento', async () => {
      const newEq = { id: 'e-new', name: 'Bicicleta', category: 'cardio', quantity: 3 };
      mockSingle.mockResolvedValueOnce({ data: newEq, error: null });
      const result = await service.create({
        gym_id: 'g-1', name: 'Bicicleta', category: 'cardio', quantity: 3,
      });
      expect(result).toEqual(newEq);
    });
  });

  describe('update', () => {
    it('debería actualizar equipamiento', async () => {
      const updated = { id: 'e-1', name: 'Banca inclinada', status: 'maintenance' };
      mockSingle.mockResolvedValueOnce({ data: updated, error: null });
      const result = await service.update('e-1', { name: 'Banca inclinada', status: 'maintenance' });
      expect(result.status).toBe('maintenance');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      await expect(service.update('e-x', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debería eliminar equipamiento', async () => {
      const result = await service.remove('e-1');
      expect(result).toEqual({ message: 'Equipamiento eliminado' });
    });
  });
});
