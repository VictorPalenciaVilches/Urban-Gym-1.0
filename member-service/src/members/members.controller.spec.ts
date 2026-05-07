import { Test, TestingModule } from '@nestjs/testing';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('MembersController (Integration)', () => {
  let controller: MembersController;
  let service: MembersService;

  const mockMembersService = {
    findAll: jest.fn().mockResolvedValue([{ id: '1', name: 'Juan' }]),
    findOne: jest.fn().mockResolvedValue({ id: '1', name: 'Juan' }),
    update: jest.fn().mockResolvedValue({ id: '1', name: 'Juan Editado' }),
    remove: jest.fn().mockResolvedValue({ message: 'Eliminado' }),
    updateSubscriptionStatus: jest.fn().mockResolvedValue({ message: 'Status ok' }),
  };

  beforeEach(async () => {
    process.env.INTERNAL_SECRET = 'test_secret';
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        { provide: MembersService, useValue: mockMembersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MembersController>(MembersController);
    service = module.get<MembersService>(MembersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /members - debería retornar todos los miembros', async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('GET /members/:id - debería retornar un miembro específico', async () => {
    const result = await controller.findOne('1');
    expect(result).toEqual({ id: '1', name: 'Juan' });
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('PATCH /members/:id - debería actualizar un miembro', async () => {
    const result = await controller.update('1', { name: 'Juan Editado' });
    expect(result.name).toBe('Juan Editado');
  });

  it('DELETE /members/:id - debería eliminar un miembro', async () => {
    const result = await controller.remove('1');
    expect(result.message).toBe('Eliminado');
  });

  it('PATCH /members/:id/billing-event - maneja eventos internos con éxito', async () => {
    const result = await controller.billingEvent('1', 'payment.succeeded', 'test_secret');
    expect(result.message).toBe('Status ok');
    expect(service.updateSubscriptionStatus).toHaveBeenCalledWith('1', 'payment.succeeded');
  });

  it('PATCH /members/:id/billing-event - lanza UnauthorizedException si secret falla', async () => {
    await expect(
      controller.billingEvent('1', 'payment', 'bad_secret')
    ).rejects.toThrow(UnauthorizedException);
  });
});
