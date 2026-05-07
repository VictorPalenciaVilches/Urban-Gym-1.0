import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsController (Integration)', () => {
  let controller: RecommendationsController;
  let service: RecommendationsService;

  const mockRecommendationsService = {
    getRecommendedClasses: jest.fn().mockResolvedValue([{ id: '1' }]),
    saveMetrics: jest.fn().mockResolvedValue({ id: '1' }),
    getFitnessPlan: jest.fn().mockResolvedValue({ id: '1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        { provide: RecommendationsService, useValue: mockRecommendationsService },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('1. GET /recommendations/:memberId/classes - retorna recomendaciones', async () => {
    const result = await controller.getRecommendedClasses('m1', 'Bearer token');
    expect(result).toHaveLength(1);
    expect(service.getRecommendedClasses).toHaveBeenCalled();
  });

  it('2. POST /recommendations/:memberId/metrics - guarda métricas (Prueba con promesa)', async () => {
    const result = await controller.saveMetrics('m1', { weight_kg: 70 } as any);
    expect(result).toBeDefined();
    expect(result.id).toBe('1');
  });

  it('3. GET /recommendations/:memberId/plan - retorna plan de fitness', async () => {
    const result = await controller.getFitnessPlan('m1');
    expect(result).toEqual({ id: '1' });
  });

  it('4. GET /recommendations/:memberId/classes - maneja error de promesa rechazada', async () => {
    mockRecommendationsService.getRecommendedClasses.mockRejectedValueOnce(new Error('Fail'));
    await expect(controller.getRecommendedClasses('m1', 'token')).rejects.toThrow('Fail');
  });

  it('5. POST /recommendations/:memberId/metrics - verifica que el objeto retornado tenga propiedades', async () => {
    const result = await controller.saveMetrics('m1', {} as any);
    expect(result).toHaveProperty('id');
  });

  it('6. GET /recommendations/:memberId/plan - comprueba el tipo de retorno', async () => {
    const result = await controller.getFitnessPlan('m1');
    expect(typeof result).toBe('object');
  });
});
