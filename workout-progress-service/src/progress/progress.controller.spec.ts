import { Test, TestingModule } from '@nestjs/testing';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ProgressController (Integration)', () => {
  let controller: ProgressController;
  let service: ProgressService;

  const mockProgressService = {
    recordWorkout: jest.fn().mockResolvedValue({ message: 'Registrado' }),
    getHistory: jest.fn().mockResolvedValue([{ id: '1' }]),
    getStats: jest.fn().mockResolvedValue({ total_workouts: 1 }),
    getPersonalRecords: jest.fn().mockResolvedValue({ best: 1 }),
    migrateFromIot: jest.fn().mockResolvedValue({ migrated: 1 }),
  };

  beforeEach(async () => {
    process.env.INTERNAL_SECRET = 'test_secret';
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [{ provide: ProgressService, useValue: mockProgressService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProgressController>(ProgressController);
    service = module.get<ProgressService>(ProgressService);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /progress/workout - registra entrenamiento internamente', async () => {
    const result = await controller.recordWorkout({ member_id: 'm1' } as any, 'test_secret');
    expect(result).toBeDefined();
    expect(service.recordWorkout).toHaveBeenCalled();
  });

  it('POST /progress/workout - falla si el secret no coincide', async () => {
    await expect(controller.recordWorkout({} as any, 'bad')).rejects.toThrow(UnauthorizedException);
  });

  it('GET /progress/me/history - retorna historial', async () => {
    expect(await controller.getMyHistory({ user: { id: 'u1' } })).toHaveLength(1);
  });

  it('GET /progress/me/stats - retorna estadisticas', async () => {
    expect(await controller.getMyStats({ user: { id: 'u1' } })).toBeDefined();
  });

  it('GET /progress/me/records - retorna records', async () => {
    expect(await controller.getMyRecords({ user: { id: 'u1' } })).toBeDefined();
  });

  it('POST /progress/internal/migrate-iot - migra datos', async () => {
    expect(await controller.migrateIot('test_secret')).toBeDefined();
  });
});
