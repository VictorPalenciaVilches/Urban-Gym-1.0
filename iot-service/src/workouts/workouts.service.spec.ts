import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkoutsService, RawWorkoutData } from './workouts.service';
import { SupabaseService } from '../supabase/supabase.service';

const mockSingle = jest.fn();
const mockOrder = jest.fn(() => ({ data: [], error: null }));
const mockEq = jest.fn(() => ({ order: mockOrder, data: [], error: null }));
const mockSelect = jest.fn(() => ({ eq: mockEq, order: mockOrder }));
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockFrom = jest.fn(() => ({ select: mockSelect, insert: mockInsert }));
const mockSchema = jest.fn(() => ({ from: mockFrom }));
const mockSupabaseClient = { schema: mockSchema };
const mockSupabaseService = { getClient: jest.fn(() => mockSupabaseClient) };
const mockEventEmitter = { emit: jest.fn() };

global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
) as jest.Mock;

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();
    service = module.get<WorkoutsService>(WorkoutsService);
  });

  it('debería estar definido', () => { expect(service).toBeDefined(); });

  // ─── normalize ────────────────────────────────────────────────────────────────
  describe('normalize', () => {
    it('debería normalizar datos crudos de la máquina', () => {
      const machine = { id: 'machine-1', name: 'Cinta Pro', type: 'cardio' };
      const raw: RawWorkoutData = {
        member_id: 'm-1',
        duration_minutes: 30,
        calories: 250,
        distance_km: 3.5,
        avg_heart_rate: 140,
      };

      const result = service.normalize(machine, raw);

      expect(result.event_type).toBe('workout.completed');
      expect(result.machine_id).toBe('machine-1');
      expect(result.machine_name).toBe('Cinta Pro');
      expect(result.machine_type).toBe('cardio');
      expect(result.member_id).toBe('m-1');
      expect(result.duration_minutes).toBe(30);
      expect(result.calories).toBe(250);
      expect(result.metrics.distance_km).toBe(3.5);
      expect(result.metrics.avg_heart_rate).toBe(140);
      expect(result.metrics.reps).toBeNull();
      expect(result.published_at).toBeDefined();
    });

    it('debería usar valores por defecto para campos opcionales', () => {
      const machine = { id: 'm-1', name: 'Prensa', type: 'fuerza' };
      const raw: RawWorkoutData = { member_id: 'm-1', duration_minutes: 20 };

      const result = service.normalize(machine, raw);

      expect(result.calories).toBe(0);
      expect(result.metrics.distance_km).toBeNull();
      expect(result.metrics.max_speed_kmh).toBeNull();
    });
  });

  // ─── recordWorkout ────────────────────────────────────────────────────────────
  describe('recordWorkout', () => {
    it('debería registrar un workout, emitir evento y notificar al progress service', async () => {
      const machine = { id: 'machine-1', name: 'Cinta', type: 'cardio' };
      const raw: RawWorkoutData = { member_id: 'm-1', duration_minutes: 30, calories: 250 };

      mockSingle.mockResolvedValueOnce({
        data: { id: 'workout-1', machine_id: 'machine-1', member_id: 'm-1' },
        error: null,
      });

      const result = await service.recordWorkout(machine, raw);

      expect(result.message).toBe('Entrenamiento registrado');
      expect(result.workout).toBeDefined();
      expect(result.event).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('workout.completed', expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/progress/workout'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('debería lanzar error si falla la inserción en DB', async () => {
      const machine = { id: 'm-1', name: 'X', type: 'Y' };
      const raw: RawWorkoutData = { member_id: 'm-1', duration_minutes: 10 };
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB insert error' } });

      await expect(service.recordWorkout(machine, raw)).rejects.toThrow('DB insert error');
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('debería retornar todos los workouts', async () => {
      const workouts = [{ id: 'w-1' }, { id: 'w-2' }];
      mockOrder.mockReturnValueOnce({ data: workouts, error: null });
      const result = await service.findAll();
      expect(result).toEqual(workouts);
    });
  });

  // ─── findByMember ─────────────────────────────────────────────────────────────
  describe('findByMember', () => {
    it('debería retornar workouts de un miembro', async () => {
      const workouts = [{ id: 'w-1', member_id: 'm-1' }];
      mockOrder.mockReturnValueOnce({ data: workouts, error: null });
      const result = await service.findByMember('m-1');
      expect(result).toEqual(workouts);
    });
  });

  // ─── getStats ─────────────────────────────────────────────────────────────────
  describe('getStats', () => {
    it('debería calcular estadísticas de un miembro', async () => {
      const workouts = [
        { duration_minutes: 30, calories: 200, created_at: '2026-01-01' },
        { duration_minutes: 45, calories: 350, created_at: '2026-01-02' },
      ];
      mockEq.mockReturnValueOnce({ data: workouts, error: null });

      const result = await service.getStats('m-1');
      expect(result.total_workouts).toBe(2);
      expect(result.total_minutes).toBe(75);
      expect(result.total_calories).toBe(550);
    });

    it('debería retornar ceros si no hay workouts', async () => {
      mockEq.mockReturnValueOnce({ data: [], error: null });
      const result = await service.getStats('m-new');
      expect(result.total_workouts).toBe(0);
      expect(result.total_minutes).toBe(0);
      expect(result.total_calories).toBe(0);
    });
  });
});
