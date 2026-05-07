import { Test, TestingModule } from '@nestjs/testing';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

describe('MachinesController (Integration)', () => {
  let controller: MachinesController;
  let service: MachinesService;

  const mockMachinesService = {
    findAll: jest.fn().mockResolvedValue([{ id: '1' }]),
    findOne: jest.fn().mockResolvedValue({ id: '1' }),
    register: jest.fn().mockResolvedValue({ id: '1' }),
    updateStatus: jest.fn().mockResolvedValue({ id: '1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachinesController],
      providers: [{ provide: MachinesService, useValue: mockMachinesService }],
    }).compile();

    controller = module.get<MachinesController>(MachinesController);
    service = module.get<MachinesService>(MachinesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /machines - retorna máquinas', async () => {
    expect(await controller.findAll()).toHaveLength(1);
  });

  it('GET /machines/:id - retorna una máquina', async () => {
    expect(await controller.findOne('1')).toBeDefined();
  });

  it('POST /machines/register - registra máquina', async () => {
    expect(await controller.register({} as any)).toBeDefined();
  });

  it('PATCH /machines/:id/status - actualiza estado', async () => {
    expect(await controller.updateStatus('1', { status: 'active' })).toBeDefined();
  });

  it('GET /machines/:id - lanza error si la máquina no existe (Prueba con promesa)', async () => {
    mockMachinesService.findOne.mockRejectedValueOnce(new Error('Not found'));
    await expect(controller.findOne('999')).rejects.toThrow('Not found');
  });

  it('POST /machines/register - verifica que retorne el objeto con ID', async () => {
    const result = await controller.register({ name: 'M1' } as any);
    expect(result).toHaveProperty('id');
  });
});
