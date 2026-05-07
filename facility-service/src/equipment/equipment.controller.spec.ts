import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('EquipmentController (Integration)', () => {
  let controller: EquipmentController;
  let service: EquipmentService;

  const mockEquipmentService = {
    findByGym: jest.fn().mockResolvedValue([{ id: '1' }]),
    findAvailableByGym: jest.fn().mockResolvedValue([{ id: '1' }]),
    findOne: jest.fn().mockResolvedValue({ id: '1' }),
    create: jest.fn().mockResolvedValue({ id: '1' }),
    update: jest.fn().mockResolvedValue({ id: '1' }),
    remove: jest.fn().mockResolvedValue({ id: '1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentController],
      providers: [{ provide: EquipmentService, useValue: mockEquipmentService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EquipmentController>(EquipmentController);
    service = module.get<EquipmentService>(EquipmentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /equipment/gym/:gymId - retorna equipamiento', async () => {
    expect(await controller.findByGym('g1')).toHaveLength(1);
  });

  it('GET /equipment/gym/:gymId/available - retorna equipamiento disponible', async () => {
    expect(await controller.findAvailable('g1')).toHaveLength(1);
  });

  it('GET /equipment/:id - retorna un equipamiento', async () => {
    expect(await controller.findOne('1')).toBeDefined();
  });

  it('POST /equipment - crea un equipamiento', async () => {
    expect(await controller.create({ gym_id: 'g1', name: 'Mancuerna' } as any)).toBeDefined();
  });

  it('PATCH /equipment/:id - actualiza equipamiento', async () => {
    expect(await controller.update('1', { name: 'Mancuerna 20kg' })).toBeDefined();
  });

  it('DELETE /equipment/:id - elimina equipamiento', async () => {
    expect(await controller.remove('1')).toBeDefined();
  });
});
