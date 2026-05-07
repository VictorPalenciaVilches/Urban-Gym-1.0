import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('BookingsController (Integration)', () => {
  let controller: BookingsController;
  let service: BookingsService;

  const mockBookingsService = {
    getClasses: jest.fn().mockResolvedValue([{ id: '1', name: 'Yoga' }]),
    getMyBookings: jest.fn().mockResolvedValue([{ id: '1' }]),
    createBooking: jest.fn().mockResolvedValue({ id: '1' }),
    cancelBooking: jest.fn().mockResolvedValue({ id: '1' }),
    joinWaitlist: jest.fn().mockResolvedValue({ id: '1' }),
    leaveWaitlist: jest.fn().mockResolvedValue({ id: '1' }),
    attendBooking: jest.fn().mockResolvedValue({ id: '1' }),
  };

  beforeEach(async () => {
    process.env.INTERNAL_SECRET = 'test_secret';
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /bookings/classes - retorna clases', async () => {
    const result = await controller.getClasses();
    expect(result).toHaveLength(1);
  });

  it('GET /bookings/me - retorna reservas del usuario', async () => {
    const result = await controller.getMyBookings({ user: { id: 'u1' } });
    expect(result).toHaveLength(1);
    expect(service.getMyBookings).toHaveBeenCalledWith('u1');
  });

  it('POST /bookings - crea una reserva', async () => {
    const result = await controller.createBooking({ schedule_id: 's1' } as any, { user: { id: 'u1' } });
    expect(result).toBeDefined();
  });

  it('PATCH /bookings/:id/cancel - cancela una reserva', async () => {
    const result = await controller.cancelBooking('b1', { user: { id: 'u1' } });
    expect(result).toBeDefined();
  });

  it('POST /bookings/waitlist/:scheduleId - se une a lista de espera', async () => {
    const result = await controller.joinWaitlist('s1', { user: { id: 'u1' } });
    expect(result).toBeDefined();
  });

  it('PATCH /bookings/:id/attend - registra asistencia', async () => {
    const result = await controller.attendBooking('b1');
    expect(result).toBeDefined();
    expect(result).toEqual({ id: '1' });
    expect(service.attendBooking).toHaveBeenCalledWith('b1');
  });

  it('GET /schedules - retorna horarios', async () => {
    mockBookingsService.getSchedules = jest.fn().mockResolvedValue([]);
    const result = await controller.getSchedules();
    expect(result).toBeDefined();
  });

  it('POST /schedules - crea un horario', async () => {
    mockBookingsService.createSchedule = jest.fn().mockResolvedValue({ id: '1' });
    const result = await controller.createSchedule({} as any);
    expect(result).toBeDefined();
  });

  it('DELETE /schedules/:id - elimina un horario', async () => {
    mockBookingsService.deleteSchedule = jest.fn().mockResolvedValue({ message: 'ok' });
    const result = await controller.deleteSchedule('1');
    expect(result).toBeDefined();
  });

  it('GET /bookings/my - lanza UnauthorizedException si no hay usuario', () => {
    expect(() => controller.getMyBookings({})).toThrow(UnauthorizedException);
  });

  it('GET /schedules/:id/bookings - retorna reservas por horario', async () => {
    mockBookingsService.getBookingsBySchedule = jest.fn().mockResolvedValue([]);
    const result = await controller.getBookingsBySchedule('1');
    expect(result).toBeDefined();
  });

  it('GET /waitlist/my - retorna lista de espera del usuario', async () => {
    mockBookingsService.getMyWaitlist = jest.fn().mockResolvedValue([]);
    const result = await controller.getMyWaitlist({ user: { id: 'u1' } });
    expect(result).toBeDefined();
  });

  it('DELETE /waitlist/:id - sale de la lista de espera', async () => {
    mockBookingsService.leaveWaitlist = jest.fn().mockResolvedValue({ message: 'ok' });
    const result = await controller.leaveWaitlist('1', { user: { id: 'u1' } });
    expect(result).toBeDefined();
  });

  it('GET /bookings/me - falla si el usuario no está en el request (Prueba con promesa)', async () => {
    // Simulamos una falla de base de datos o servicio usando promesas
    mockBookingsService.getMyBookings.mockRejectedValueOnce(new Error('Database Error'));
    
    await expect(controller.getMyBookings({ user: { id: 'u1' } }))
      .rejects.toThrow('Database Error');
  });
});
