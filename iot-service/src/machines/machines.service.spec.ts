import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { SupabaseService } from '../supabase/supabase.service';

jest.mock('uuid', () => ({ v4: () => '1234-5678-9abc-def0' }));

const mockSingle = jest.fn();
const mockOrder = jest.fn(() => ({ data: [], error: null }));
const mockEq = jest.fn(() => ({ single: mockSingle, select: jest.fn(() => ({ single: mockSingle })) }));
const mockSelect = jest.fn(() => ({ eq: mockEq, order: mockOrder }));
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect, insert: mockInsert, update: mockUpdate }));
const mockSchema = jest.fn(() => ({ from: mockFrom }));
const mockSupabaseClient = { schema: mockSchema };
const mockSupabaseService = { getClient: jest.fn(() => mockSupabaseClient) };

describe('MachinesService', () => {
  let service: MachinesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MachinesService, { provide: SupabaseService, useValue: mockSupabaseService }],
    }).compile();
    service = module.get<MachinesService>(MachinesService);
  });

  it('debería estar definido', () => { expect(service).toBeDefined(); });

  describe('findAll', () => {
    it('debería retornar todas las máquinas', async () => {
      const machines = [{ id: '1', name: 'Cinta', type: 'cardio', status: 'active' }];
      mockOrder.mockReturnValueOnce({ data: machines, error: null });
      const result = await service.findAll();
      expect(result).toEqual(machines);
      expect(mockSchema).toHaveBeenCalledWith('iot');
      expect(mockFrom).toHaveBeenCalledWith('machines');
    });

    it('debería lanzar error si falla la consulta', async () => {
      mockOrder.mockReturnValueOnce({ data: null, error: { message: 'DB error' } });
      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });

  describe('findOne', () => {
    it('debería retornar una máquina por ID', async () => {
      const machine = { id: 'uuid-1', name: 'Bicicleta', type: 'cardio', status: 'active' };
      mockSingle.mockResolvedValueOnce({ data: machine, error: null });
      const result = await service.findOne('uuid-1');
      expect(result).toEqual(machine);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      await expect(service.findOne('uuid-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('register', () => {
    it('debería registrar una máquina con API key generada', async () => {
      const newMachine = { id: 'new-uuid', name: 'Prensa', type: 'fuerza', api_key: 'iot_12345678' };
      mockSingle.mockResolvedValueOnce({ data: newMachine, error: null });

      const result = await service.register({ name: 'Prensa', type: 'fuerza', gym_id: 'gym-1' });
      expect(result).toEqual(newMachine);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Prensa', type: 'fuerza', status: 'active' }),
      );
    });

    it('debería lanzar error si falla el registro', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Duplicate' } });
      await expect(service.register({ name: 'X', type: 'Y', gym_id: 'Z' })).rejects.toThrow('Duplicate');
    });
  });

  describe('updateStatus', () => {
    it('debería actualizar el estado de la máquina', async () => {
      const updated = { id: 'uuid-1', name: 'Cinta', type: 'cardio', status: 'inactive' };
      mockSingle.mockResolvedValueOnce({ data: updated, error: null });

      const result = await service.updateStatus('uuid-1', 'inactive');
      expect(result.status).toBe('inactive');
    });

    it('debería lanzar NotFoundException si la máquina no existe', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      await expect(service.updateStatus('uuid-x', 'active')).rejects.toThrow(NotFoundException);
    });
  });
});
