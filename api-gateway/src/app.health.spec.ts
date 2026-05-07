import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController - health endpoint', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('health() debería retornar status ok con los servicios configurados', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
    expect(result.gateway).toContain('UrbanGym');
    expect(result).toHaveProperty('services');
    expect(result).toHaveProperty('routes');
  });

  it('health() debería incluir todos los microservicios', () => {
    const result = controller.health();
    expect(result.services).toHaveProperty('memberService');
    expect(result.services).toHaveProperty('bookingService');
    expect(result.services).toHaveProperty('facilityService');
    expect(result.services).toHaveProperty('iotService');
    expect(result.services).toHaveProperty('progressService');
  });
});
