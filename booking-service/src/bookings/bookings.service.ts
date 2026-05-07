import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class BookingsService {
  constructor(
    private supabaseService: SupabaseService,
    private redisService: RedisService,
  ) {}

  async getClasses() {
    const { data, error } = await this.supabaseService
      .getClient()
.from('classes')
      .select('*');
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async getAllSchedules() {
    const { data, error } = await this.supabaseService
      .getClient()
.from('schedules')
      .select('*, classes(name, instructor, duration_minutes, capacity)')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async getSchedules() {
    const { data, error } = await this.supabaseService
      .getClient()
.from('schedules')
      .select('*, classes(name, instructor, duration_minutes, capacity)')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async createSchedule(createScheduleDto: CreateScheduleDto) {
    const { data, error } = await this.supabaseService
      .getClient()
.from('schedules')
      .insert(createScheduleDto)
      .select('*, classes(name, instructor)')
      .single();
    if (error) throw new ConflictException(error.message);
    return data;
  }

  async deleteSchedule(scheduleId: string) {
    const { error } = await this.supabaseService
      .getClient()
.from('schedules')
      .delete()
      .eq('id', scheduleId);
    if (error) throw new NotFoundException(error.message);
    return { message: 'Horario eliminado correctamente' };
  }

  async createBooking(createBookingDto: CreateBookingDto, memberId: string) {
    const supabase = this.supabaseService.getClient();

    // Verificar duplicado antes de llamar al RPC
    const { data: existing } = await supabase
.from('bookings')
      .select('id')
      .eq('schedule_id', createBookingDto.schedule_id)
      .eq('member_id', memberId)
      .eq('status', 'confirmed')
      .single();

    if (existing)
      throw new ConflictException('Ya tienes una reserva en este horario');

    // RPC atómica: verifica cupos y crea la reserva en una sola transacción
    // Evita la condición de carrera (race condition) donde dos usuarios
    // reservan el último cupo simultáneamente.
    const { data, error } = await supabase.rpc('reserve_spot', {
      p_schedule_id: createBookingDto.schedule_id,
      p_member_id: memberId,
    });

    if (error) {
      if (error.message.includes('no_spots')) {
        throw new BadRequestException(
          'No hay cupos disponibles. Puedes unirte a la lista de espera.',
        );
      }
      throw new ConflictException(error.message);
    }

    // Publicar evento en Redis
    this.redisService.publish('booking.created', {
      booking_id: data?.id,
      member_id: memberId,
      schedule_id: createBookingDto.schedule_id,
    }).catch(() => {});

    return data;
  }

  async getMyBookings(memberId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
.from('bookings')
      .select(
        '*, schedules(date, start_time, classes(name, instructor, duration_minutes))',
      )
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async cancelBooking(bookingId: string, memberId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: booking } = await supabase
.from('bookings')
      .select('*, schedules(available_spots)')
      .eq('id', bookingId)
      .eq('member_id', memberId)
      .single();

    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.status === 'cancelled')
      throw new BadRequestException('La reserva ya está cancelada');

    await supabase
.from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    const newSpots = booking.schedules.available_spots + 1;

    await supabase
.from('schedules')
      .update({ available_spots: newSpots })
      .eq('id', booking.schedule_id);

    // Promover automáticamente al primero de la lista de espera
    const { data: nextInWaitlist } = await supabase
.from('waitlist')
      .select('*')
      .eq('schedule_id', booking.schedule_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (nextInWaitlist) {
      await supabase.from('bookings').insert({
        schedule_id: booking.schedule_id,
        member_id: nextInWaitlist.member_id,
      });

      await supabase
    .from('schedules')
        .update({ available_spots: newSpots - 1 })
        .eq('id', booking.schedule_id);

      await supabase
    .from('waitlist')
        .delete()
        .eq('id', nextInWaitlist.id);
    }

    return { message: 'Reserva cancelada correctamente' };
  }

  // Lista de espera
  async joinWaitlist(scheduleId: string, memberId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: schedule } = await supabase
.from('schedules')
      .select('id, available_spots, classes(name)')
      .eq('id', scheduleId)
      .single();

    if (!schedule) throw new NotFoundException('Horario no encontrado');
    if (schedule.available_spots > 0)
      throw new BadRequestException(
        'Aún hay cupos disponibles, puedes reservar directamente',
      );

    const { data: existing } = await supabase
.from('waitlist')
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('member_id', memberId)
      .single();

    if (existing)
      throw new ConflictException(
        'Ya estás en la lista de espera para este horario',
      );

    const { data, error } = await supabase
.from('waitlist')
      .insert({ schedule_id: scheduleId, member_id: memberId })
      .select()
      .single();

    if (error) throw new ConflictException(error.message);
    return { message: 'Te has unido a la lista de espera', waitlist: data };
  }

  async getMyWaitlist(memberId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
.from('waitlist')
      .select('*, schedules(date, start_time, classes(name, instructor))')
      .eq('member_id', memberId)
      .order('created_at', { ascending: true });
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async leaveWaitlist(waitlistId: string, memberId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: entry } = await supabase
.from('waitlist')
      .select('id')
      .eq('id', waitlistId)
      .eq('member_id', memberId)
      .single();

    if (!entry)
      throw new NotFoundException('Entrada en lista de espera no encontrada');

    await supabase
.from('waitlist')
      .delete()
      .eq('id', waitlistId);
    return { message: 'Saliste de la lista de espera' };
  }

  async getBookingsBySchedule(scheduleId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('bookings')
      .select('id, member_id, status, created_at')
      .eq('schedule_id', scheduleId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async attendBooking(bookingId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, schedules(date, start_time, classes(name, instructor, duration_minutes))')
      .eq('id', bookingId)
      .single();

    if (error || !booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.status === 'attended')
      throw new BadRequestException('Esta reserva ya fue marcada como asistida');
    if (booking.status === 'cancelled')
      throw new BadRequestException('No se puede marcar como asistida una reserva cancelada');

    await supabase
      .from('bookings')
      .update({ status: 'attended' })
      .eq('id', bookingId);

    const className = booking.schedules?.classes?.name ?? 'Clase';
    const duration = booking.schedules?.classes?.duration_minutes ?? 60;
    const estimatedCalories = Math.round(duration * 6.5);

    this.notifyProgressService({
      member_id: booking.member_id,
      source: 'class',
      machine_name: className,
      machine_type: 'clase',
      duration_minutes: duration,
      calories: estimatedCalories,
      metrics: {
        instructor: booking.schedules?.classes?.instructor ?? null,
        class_date: booking.schedules?.date ?? null,
        start_time: booking.schedules?.start_time ?? null,
      },
    }).catch(() => {
      console.warn('No se pudo notificar al progress service');
    });

    return { message: 'Asistencia registrada', booking_id: bookingId };
  }

  private async notifyProgressService(data: object) {
    const progressUrl = process.env.PROGRESS_SERVICE_URL ?? 'http://localhost:3005';
    const internalSecret = process.env.INTERNAL_SECRET ?? 'urbangym_internal_secret_2024';

    await fetch(`${progressUrl}/progress/workout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalSecret,
      },
      body: JSON.stringify(data),
    });
  }
}
