import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { SupabaseService } from '../supabase/supabase.service';

const mockSingle = jest.fn();
const mockQueryChain: any = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: mockSingle,
};

const mockSupabaseService = {
  getClient: jest.fn(() => ({
    from: jest.fn(() => mockQueryChain),
  })),
};

global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as jest.Mock;

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset defaults to return 'this' for chaining
    Object.keys(mockQueryChain).forEach(key => {
      if (typeof mockQueryChain[key].mockReturnThis === 'function') {
        mockQueryChain[key].mockReturnThis();
      }
    });
    mockSingle.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();
    service = module.get<BookingsService>(BookingsService);
  });

  describe('getClasses', () => {
    it('éxito', async () => {
      mockQueryChain.select.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });
      const res = await service.getClasses();
      expect(res).toHaveLength(1);
    });
    it('error', async () => {
      mockQueryChain.select.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      await expect(service.getClasses()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSchedules', () => {
    it('éxito', async () => {
      mockQueryChain.order.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });
      const res = await service.getSchedules();
      expect(res).toHaveLength(1);
    });
  });

  describe('createSchedule', () => {
    it('éxito', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 's1' }, error: null });
      const res = await service.createSchedule({} as any);
      expect(res.id).toBe('s1');
    });
  });

  describe('deleteSchedule', () => {
    it('éxito', async () => {
      mockQueryChain.eq.mockResolvedValueOnce({ error: null });
      const res = await service.deleteSchedule('s1');
      expect(res.message).toContain('eliminado');
    });
  });

  describe('getAllSchedules', () => {
    it('éxito', async () => {
      mockQueryChain.order.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });
      const res = await service.getAllSchedules();
      expect(res).toHaveLength(1);
    });
    it('error', async () => {
      mockQueryChain.order.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      await expect(service.getAllSchedules()).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBooking', () => {
    it('éxito', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { id: 's1', available_spots: 5 }, error: null }) // schedule
        .mockResolvedValueOnce({ data: null, error: null }) // existing
        .mockResolvedValueOnce({ data: { id: 'b1' }, error: null }); // insert
      const res = await service.createBooking({ schedule_id: 's1' }, 'm1');
      expect(res.id).toBe('b1');
    });
    it('no cupos', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 's1', available_spots: 0 }, error: null });
      await expect(service.createBooking({ schedule_id: 's1' }, 'm1')).rejects.toThrow(BadRequestException);
    });
    it('ya reservado', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { id: 's1', available_spots: 5 }, error: null })
        .mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
      await expect(service.createBooking({ schedule_id: 's1' }, 'm1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyBookings', () => {
    it('éxito', async () => {
      mockQueryChain.order.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });
      const res = await service.getMyBookings('m1');
      expect(res).toHaveLength(1);
    });
    it('error', async () => {
      mockQueryChain.order.mockResolvedValueOnce({ data: null, error: { message: 'err' } });
      await expect(service.getMyBookings('m1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelBooking', () => {
    it('éxito con promoción', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { id: 'b1', schedules: { available_spots: 5 } }, error: null }) // find
        .mockResolvedValueOnce({ data: { id: 'w1', member_id: 'm2' }, error: null }); // promotion
      const res = await service.cancelBooking('b1', 'm1');
      expect(res.message).toContain('correctamente');
    });
    it('ya cancelada', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'b1', status: 'cancelled' }, error: null });
      await expect(service.cancelBooking('b1', 'm1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('joinWaitlist', () => {
    it('éxito', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { id: 's1', available_spots: 0 }, error: null }) // schedule
        .mockResolvedValueOnce({ data: null, error: null }) // existing
        .mockResolvedValueOnce({ data: { id: 'w1' }, error: null }); // insert
      const res = await service.joinWaitlist('s1', 'm1');
      expect(res.message).toContain('unido');
    });
    it('hay cupos disponibles', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 's1', available_spots: 5 }, error: null });
      await expect(service.joinWaitlist('s1', 'm1')).rejects.toThrow(BadRequestException);
    });
    it('ya en lista de espera', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { id: 's1', available_spots: 0 }, error: null })
        .mockResolvedValueOnce({ data: { id: 'w1' }, error: null });
      await expect(service.joinWaitlist('s1', 'm1')).rejects.toThrow(ConflictException);
    });
  });

  describe('leaveWaitlist', () => {
    it('éxito', async () => {
      mockQueryChain.eq.mockReturnValueOnce(mockQueryChain); // 1st eq in find
      mockQueryChain.eq.mockReturnValueOnce(mockQueryChain); // 2nd eq in find
      mockSingle.mockResolvedValueOnce({ data: { id: 'w1' }, error: null }); // single in find
      mockQueryChain.eq.mockResolvedValueOnce({ error: null }); // eq in delete
      
      const res = await service.leaveWaitlist('w1', 'm1');
      expect(res.message).toContain('Saliste');
    });
    it('no encontrada', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.leaveWaitlist('w1', 'm1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('attendBooking', () => {
    it('éxito', async () => {
      mockSingle.mockResolvedValueOnce({ 
        data: { id: 'b1', member_id: 'm1', schedules: { classes: { name: 'Yoga' } } }, 
        error: null 
      });
      const res = await service.attendBooking('b1');
      expect(res.message).toContain('registrada');
    });
    it('ya asistida', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'b1', status: 'attended' }, error: null });
      await expect(service.attendBooking('b1')).rejects.toThrow(BadRequestException);
    });
    it('cancelada', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'b1', status: 'cancelled' }, error: null });
      await expect(service.attendBooking('b1')).rejects.toThrow(BadRequestException);
    });
    it('error de notificación', async () => {
      mockSingle.mockResolvedValueOnce({ 
        data: { id: 'b1', member_id: 'm1', schedules: { classes: { name: 'Yoga' } } }, 
        error: null 
      });
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch error'));
      const res = await service.attendBooking('b1');
      expect(res.message).toContain('registrada');
    });
  });

  describe('getBookingsBySchedule', () => {
    it('éxito', async () => {
      mockQueryChain.order.mockResolvedValueOnce({ data: [{ id: 'b1' }], error: null });
      const res = await service.getBookingsBySchedule('s1');
      expect(res).toHaveLength(1);
    });
  });
});
