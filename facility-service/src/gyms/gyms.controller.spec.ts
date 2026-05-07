import { Test, TestingModule } from '@nestjs/testing';
import { GymsController } from './gyms.controller';
import { GymsService } from './gyms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('GymsController (Integration)', () => {
  let controller: GymsController;
  let service: GymsService;

  const mockGymsService = {
    findAll: jest.fn().mockResolvedValue([{ id: '1' }]),
    findOpen: jest.fn().mockResolvedValue([{ id: '1' }]),
    findOne: jest.fn().mockResolvedValue({ id: '1' }),
    create: jest.fn().mockResolvedValue({ id: '1' }),
    update: jest.fn().mockResolvedValue({ id: '1' }),
    remove: jest.fn().mockResolvedValue({ id: '1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GymsController],
      providers: [{ provide: GymsService, useValue: mockGymsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GymsController>(GymsController);
    service = module.get<GymsService>(GymsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /gyms - retorna todos los gimnasios', async () => {
    expect(await controller.findAll()).toHaveLength(1);
  });

  it('GET /gyms/open - retorna gimnasios abiertos', async () => {
    expect(await controller.findOpen()).toHaveLength(1);
  });

  it('GET /gyms/:id - retorna un gimnasio', async () => {
    expect(await controller.findOne('1')).toBeDefined();
  });

  it('POST /gyms - crea un gimnasio', async () => {
    expect(await controller.create({ name: 'g1', address: 'a1', capacity: 1 })).toBeDefined();
  });

  it('PATCH /gyms/:id - actualiza gimnasio', async () => {
    expect(await controller.update('1', { name: 'g2' })).toBeDefined();
  });

  it('DELETE /gyms/:id - elimina gimnasio', async () => {
    const result = await controller.remove('1');
    expect(result).toBeDefined();
    expect(result).toEqual({ id: '1' });
  });

  it('GET /gyms/:id - falla si la sede no existe (Prueba con promesa)', async () => {
    mockGymsService.findOne.mockRejectedValueOnce(new Error('Not found'));
    await expect(controller.findOne('999')).rejects.toThrow('Not found');
  });
});
