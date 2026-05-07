import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { SupabaseService } from '../supabase/supabase.service';

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockUpsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockFrom = jest.fn(() => ({ select: mockSelect, upsert: mockUpsert }));
const mockSchema = jest.fn(() => ({ from: mockFrom }));
const mockSupabaseClient = { schema: mockSchema };
const mockSupabaseService = { getClient: jest.fn(() => mockSupabaseClient) };

// Mock global fetch for HTTP calls to other services
global.fetch = jest.fn() as jest.Mock;

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('debería estar definido', () => { expect(service).toBeDefined(); });

  // ─── getRecommendedClasses ────────────────────────────────────────────────────
  describe('getRecommendedClasses', () => {
    it('debería retornar clases populares cuando no hay historial', async () => {
      // Mock bookings → empty
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        // Mock progress → empty
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        // Mock schedules → available classes
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { id: 's-1', available_spots: 5, classes: { name: 'Yoga' } },
            { id: 's-2', available_spots: 2, classes: { name: 'Spinning' } },
            { id: 's-3', available_spots: 10, classes: { name: 'Pilates' } },
          ]),
        });

      const result = await service.getRecommendedClasses('m-1', 'Bearer token');

      expect(result.length).toBeGreaterThan(0);
      // Should be sorted by less available spots (more popular)
      expect(result[0].recommendation_reason).toBe('Clase popular');
    });

    it('debería recomendar clases basadas en historial del usuario', async () => {
      // Mock bookings → has attended Yoga
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { schedules: { classes: { name: 'Yoga', category: 'flexibility' } } },
          ]),
        })
        // Mock progress → has used cardio machines
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { machine_type: 'cardio', machine_name: 'Cinta' },
          ]),
        })
        // Mock schedules → available classes
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { id: 's-1', available_spots: 5, classes: { name: 'Yoga', category: 'flexibility' } },
            { id: 's-2', available_spots: 3, classes: { name: 'Spinning', category: 'cardio' } },
            { id: 's-3', available_spots: 8, classes: { name: 'Crossfit', category: 'fuerza' } },
          ]),
        });

      const result = await service.getRecommendedClasses('m-1', 'Bearer token');

      expect(result.length).toBeGreaterThan(0);
      // Yoga should score high because user attended it before
      const yogaRec = result.find((r: any) => r.classes?.name === 'Yoga');
      if (yogaRec) {
        expect(yogaRec.recommendation_reason).not.toBe('Clase popular');
      }
    });

    it('debería manejar errores de servicios externos graciosamente', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error')) // bookings fail
        .mockRejectedValueOnce(new Error('Network error')) // progress fail
        .mockRejectedValueOnce(new Error('Network error')); // schedules fail

      const result = await service.getRecommendedClasses('m-1', 'Bearer token');
      expect(result).toEqual([]); // empty result, no crash
    });
  });

  // ─── saveMetrics ──────────────────────────────────────────────────────────────
  describe('saveMetrics', () => {
    it('debería calcular BMI y guardar métricas', async () => {
      const savedMetrics = {
        member_id: 'm-1',
        weight_kg: 75,
        height_cm: 175,
        bmi: 24.49,
        goal: 'lose_weight',
      };
      mockSingle.mockResolvedValueOnce({ data: savedMetrics, error: null });

      const result = await service.saveMetrics('m-1', {
        weight_kg: 75,
        height_cm: 175,
        goal: 'lose_weight',
      });

      expect(result.bmi).toBe(24.49);
      expect(result.goal).toBe('lose_weight');
      expect(mockSchema).toHaveBeenCalledWith('recommendations');
    });

    it('debería lanzar error si falla el upsert', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Upsert error' } });

      await expect(
        service.saveMetrics('m-1', { weight_kg: 75, height_cm: 175, goal: 'x' }),
      ).rejects.toThrow('Upsert error');
    });
  });

  // ─── getFitnessPlan ───────────────────────────────────────────────────────────
  describe('getFitnessPlan', () => {
    it('debería retornar mensaje si no tiene métricas registradas', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const result = await service.getFitnessPlan('m-new');
      expect(result.status).toBe('no_metrics_found');
    });

    it('debería retornar plan de fitness basado en el objetivo', async () => {
      // metrics
      mockSingle.mockResolvedValueOnce({
        data: { member_id: 'm-1', bmi: 24.49, goal: 'lose_weight' },
        error: null,
      });
      // fitness plan
      mockSingle.mockResolvedValueOnce({
        data: { id: 'plan-1', goal: 'lose_weight', description: 'Plan para perder peso' },
        error: null,
      });

      const result = await service.getFitnessPlan('m-1');
      expect(result.metrics).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.goal).toBe('lose_weight');
    });

    it('debería lanzar NotFoundException si no existe plan para el objetivo', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { member_id: 'm-1', bmi: 24.49, goal: 'unknown_goal' },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      await expect(service.getFitnessPlan('m-1')).rejects.toThrow(NotFoundException);
    });
  });
});
