import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';
import { MachinesService } from '../machines/machines.service';
import { UnauthorizedException } from '@nestjs/common';

describe('WorkoutsController (Integration)', () => {
  let controller: WorkoutsController;
  let service: WorkoutsService;

  const mockWorkoutsService = {
    normalize: jest.fn().mockReturnValue({}),
    recordWorkout: jest.fn().mockResolvedValue({ message: 'ok' }),
    findAll: jest.fn().mockResolvedValue([{ id: '1' }]),
    findByMember: jest.fn().mockResolvedValue([{ id: '1' }]),
    getStats: jest.fn().mockResolvedValue({ total: 1 }),
  };

  const mockMachinesService = {
    findOne: jest.fn().mockResolvedValue({ api_key: 'test_key' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkoutsController],
      providers: [
        { provide: WorkoutsService, useValue: mockWorkoutsService },
        { provide: MachinesService, useValue: mockMachinesService },
      ],
    }).compile();

    controller = module.get<WorkoutsController>(WorkoutsController);
    service = module.get<WorkoutsService>(WorkoutsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /workouts/machine/:machineId - registra entrenamiento si la api_key es correcta', async () => {
    const result = await controller.recordWorkout('m1', 'test_key', {} as any);
    expect(result.message).toBe('ok');
    expect(service.recordWorkout).toHaveBeenCalled();
  });

  it('POST /workouts/machine/:machineId - lanza UnauthorizedException si api_key es incorrecta', async () => {
    await expect(controller.recordWorkout('m1', 'wrong_key', {} as any)).rejects.toThrow(UnauthorizedException);
  });

  it('GET /workouts - retorna todos los entrenamientos', async () => {
    expect(await controller.findAll()).toHaveLength(1);
  });

  it('GET /workouts/member/:memberId - retorna entrenamientos del miembro', async () => {
    expect(await controller.findByMember('u1')).toHaveLength(1);
  });

  it('GET /workouts/member/:memberId/stats - retorna stats del miembro', async () => {
    expect(await controller.getStats('u1')).toBeDefined();
  });

  it('GET /workouts/member/:memberId - maneja error de promesa rechazada (Prueba con promesa)', async () => {
    mockWorkoutsService.findByMember.mockRejectedValueOnce(new Error('DB Error'));
    await expect(controller.findByMember('u1')).rejects.toThrow('DB Error');
  });
});
