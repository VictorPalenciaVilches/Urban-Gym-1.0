import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { SupabaseService } from '../supabase/supabase.service';

// Build chainable mocks that support .select().eq().order() AND .select().order()
const mockSingle = jest.fn();
const mockOrder = jest.fn(() => ({ data: [], error: null }));
const mockEq = jest.fn(() => ({
  single: mockSingle,
  order: mockOrder,
  data: [],
  error: null,
}));
const mockSelect = jest.fn(() => ({
  eq: mockEq,
  order: mockOrder,
}));
const mockNeq = jest.fn(() => ({ data: null, error: null }));
const mockInsert = jest.fn(() => ({
  select: jest.fn(() => ({ single: mockSingle })),
  data: null,
  error: null,
}));
const mockUpsert = jest.fn(() => ({ data: null, error: null }));
const mockDelete = jest.fn(() => ({ neq: mockNeq }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  upsert: mockUpsert,
  delete: mockDelete,
}));
const mockSchema = jest.fn(() => ({ from: mockFrom }));
const mockSupabaseClient = { schema: mockSchema };
const mockSupabaseService = { getClient: jest.fn(() => mockSupabaseClient) };

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Restore default mock behavior
    mockEq.mockReturnValue({
      single: mockSingle,
      order: mockOrder,
      data: [],
      error: null,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    });
    mockOrder.mockReturnValue({ data: [], error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();
    service = module.get<ProgressService>(ProgressService);
  });

  it('debería estar definido', () => { expect(service).toBeDefined(); });

  describe('recordWorkout', () => {
    it('debería registrar un entrenamiento y recalcular métricas', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'wr-1', member_id: 'm-1', duration_minutes: 30 },
        error: null,
      });
      // recalculateMetrics → select all workouts
      mockEq.mockReturnValueOnce({
        data: [{ duration_minutes: 30, calories: 200, workout_date: new Date().toISOString() }],
        error: null,
        single: mockSingle,
        order: mockOrder,
      });

      const result = await service.recordWorkout({
        member_id: 'm-1',
        duration_minutes: 30,
        calories: 200,
        source: 'iot',
      });

      expect(result.message).toBe('Entrenamiento registrado en progreso');
      expect(result.record).toBeDefined();
      expect(mockSchema).toHaveBeenCalledWith('progress');
    });

    it('debería lanzar error si falla la inserción', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert error' } });
      await expect(
        service.recordWorkout({ member_id: 'm-1', duration_minutes: 10 }),
      ).rejects.toThrow('Insert error');
    });
  });

  describe('getHistory', () => {
    it('debería retornar el historial de entrenamientos del miembro', async () => {
      const workouts = [
        { id: 'wr-1', duration_minutes: 30, calories: 200 },
        { id: 'wr-2', duration_minutes: 45, calories: 350 },
      ];
      mockOrder.mockReturnValueOnce({ data: workouts, error: null });

      const result = await service.getHistory('m-1');
      expect(result).toEqual(workouts);
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockOrder.mockReturnValueOnce({ data: null, error: { message: 'Query error' } });
      await expect(service.getHistory('m-1')).rejects.toThrow('Query error');
    });
  });

  describe('getStats', () => {
    it('debería retornar métricas vacías si no existen aún', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      const result = await service.getStats('m-new');
      expect(result.total_workouts).toBe(0);
      expect(result.total_minutes).toBe(0);
      expect(result.total_calories).toBe(0);
    });

    it('debería retornar métricas existentes', async () => {
      const metrics = {
        member_id: 'm-1',
        total_workouts: 10,
        total_minutes: 500,
        total_calories: 4000,
        weekly_workouts: 3,
      };
      mockSingle.mockResolvedValueOnce({ data: metrics, error: null });
      const result = await service.getStats('m-1');
      expect(result.total_workouts).toBe(10);
      expect(result.total_calories).toBe(4000);
    });
  });

  describe('getPersonalRecords', () => {
    it('debería retornar récords personales por tipo de máquina', async () => {
      const workouts = [
        { duration_minutes: 60, calories: 500, machine_type: 'cardio', workout_date: '2026-01-01' },
        { duration_minutes: 30, calories: 300, machine_type: 'fuerza', workout_date: '2026-01-02' },
        { duration_minutes: 45, calories: 450, machine_type: 'cardio', workout_date: '2026-01-03' },
      ];
      mockOrder.mockReturnValueOnce({ data: workouts, error: null });

      const result = await service.getPersonalRecords('m-1');
      expect(result.best_calories_session).toEqual(workouts[0]);
      expect(result.best_duration_session).toEqual(workouts[0]);
      expect(result.best_by_machine_type).toHaveProperty('cardio');
      expect(result.best_by_machine_type).toHaveProperty('fuerza');
    });

    it('debería manejar historial vacío', async () => {
      mockOrder.mockReturnValueOnce({ data: [], error: null });
      const result = await service.getPersonalRecords('m-new');
      expect(result.best_calories_session).toBeNull();
      expect(result.best_duration_session).toBeNull();
    });
  });

  describe('migrateFromIot', () => {
    it('debería retornar mensaje si no hay workouts en IoT', async () => {
      // migrateFromIot calls .schema('iot').from('workouts').select('*').order(...)
      mockOrder.mockReturnValueOnce({ data: [], error: null });

      const result = await service.migrateFromIot();
      expect(result.migrated).toBe(0);
      expect(result.message).toContain('No hay workouts');
    });
  });
});
