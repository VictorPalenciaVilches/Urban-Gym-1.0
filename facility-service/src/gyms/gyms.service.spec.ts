import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { SupabaseService } from '../supabase/supabase.service';

const mockSingle = jest.fn();
const mockOrder = jest.fn(() => ({ data: [], error: null }));
const mockEq = jest.fn(() => ({ single: mockSingle, order: mockOrder, select: jest.fn(() => ({ single: mockSingle })) }));
const mockSelect = jest.fn(() => ({ eq: mockEq, order: mockOrder }));
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockDelete = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }));
const mockFrom = jest.fn(() => ({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete }));
const mockSchema = jest.fn(() => ({ from: mockFrom }));
const mockSupabaseClient = { schema: mockSchema };
const mockSupabaseService = { getClient: jest.fn(() => mockSupabaseClient) };

describe('GymsService', () => {
  let service: GymsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [GymsService, { provide: SupabaseService, useValue: mockSupabaseService }],
    }).compile();
    service = module.get<GymsService>(GymsService);
  });

  it('debería estar definido', () => { expect(service).toBeDefined(); });

  describe('findAll', () => {
    it('debería retornar todas las sedes', async () => {
      const gyms = [{ id: '1', name: 'Sede Norte' }, { id: '2', name: 'Sede Sur' }];
      mockOrder.mockReturnValueOnce({ data: gyms, error: null });
      const result = await service.findAll();
      expect(result).toEqual(gyms);
      expect(mockSchema).toHaveBeenCalledWith('facilities');
      expect(mockFrom).toHaveBeenCalledWith('gyms');
    });

    it('debería lanzar error si falla', async () => {
      mockOrder.mockReturnValueOnce({ data: null, error: { message: 'Error' } });
      await expect(service.findAll()).rejects.toThrow('Error');
    });
  });

  describe('findOpen', () => {
    it('debería retornar solo las sedes abiertas', async () => {
      const openGyms = [{ id: '1', name: 'Sede Norte', is_open: true }];
      mockOrder.mockReturnValueOnce({ data: openGyms, error: null });
      const result = await service.findOpen();
      expect(result).toEqual(openGyms);
    });
  });

  describe('findOne', () => {
    it('debería retornar una sede con su equipamiento', async () => {
      const gym = { id: 'g-1', name: 'Sede Norte', equipment: [{ id: 'e-1' }] };
      mockSingle.mockResolvedValueOnce({ data: gym, error: null });
      const result = await service.findOne('g-1');
      expect(result).toEqual(gym);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      await expect(service.findOne('g-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('debería crear una nueva sede', async () => {
      const newGym = { id: 'g-new', name: 'Sede Test', address: 'Calle 1', capacity: 50 };
      mockSingle.mockResolvedValueOnce({ data: newGym, error: null });

      const result = await service.create({
        name: 'Sede Test', address: 'Calle 1', capacity: 50,
        open_time: '06:00', close_time: '22:00',
      });
      expect(result).toEqual(newGym);
    });
  });

  describe('update', () => {
    it('debería actualizar una sede', async () => {
      const updated = { id: 'g-1', name: 'Sede Actualizada' };
      mockSingle.mockResolvedValueOnce({ data: updated, error: null });
      const result = await service.update('g-1', { name: 'Sede Actualizada' });
      expect(result.name).toBe('Sede Actualizada');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      await expect(service.update('g-x', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debería eliminar una sede', async () => {
      const result = await service.remove('g-1');
      expect(result).toEqual({ message: 'Sede eliminada' });
    });
  });
});
