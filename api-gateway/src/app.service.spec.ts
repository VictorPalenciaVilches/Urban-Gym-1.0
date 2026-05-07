import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('getHello() debería retornar "Hello World!"', () => {
    expect(service.getHello()).toBe('Hello World!');
  });
});
