import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get('classes')
  getClasses() {
    return this.bookingsService.getClasses();
  }

  @Get('schedules')
  @UseGuards(JwtAuthGuard)
  getSchedules() {
    return this.bookingsService.getSchedules();
  }

  @Post('schedules')
  @UseGuards(JwtAuthGuard)
  createSchedule(@Body(ValidationPipe) createScheduleDto: CreateScheduleDto) {
    return this.bookingsService.createSchedule(createScheduleDto);
  }

  @Delete('schedules/:id')
  @UseGuards(JwtAuthGuard)
  deleteSchedule(@Param('id') id: string) {
    return this.bookingsService.deleteSchedule(id);
  }

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  createBooking(
    @Body(ValidationPipe) createBookingDto: CreateBookingDto,
    @Request() req,
  ) {
    return this.bookingsService.createBooking(createBookingDto, req.user.id);
  }

  @Get('bookings/my')
  @UseGuards(JwtAuthGuard)
  getMyBookings(@Request() req) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.bookingsService.getMyBookings(req.user.id);
  }

  @Delete('bookings/:id')
  @UseGuards(JwtAuthGuard)
  cancelBooking(@Param('id') id: string, @Request() req) {
    return this.bookingsService.cancelBooking(id, req.user.id);
  }

  @Patch('bookings/:id/attend')
  @UseGuards(JwtAuthGuard)
  attendBooking(@Param('id') id: string) {
    return this.bookingsService.attendBooking(id);
  }

  @Get('schedules/:id/bookings')
  @UseGuards(JwtAuthGuard)
  getBookingsBySchedule(@Param('id') id: string) {
    return this.bookingsService.getBookingsBySchedule(id);
  }

  // Lista de espera
  @Post('waitlist')
  @UseGuards(JwtAuthGuard)
  joinWaitlist(@Body('schedule_id') scheduleId: string, @Request() req) {
    return this.bookingsService.joinWaitlist(scheduleId, req.user.id);
  }

  @Get('waitlist/my')
  @UseGuards(JwtAuthGuard)
  getMyWaitlist(@Request() req) {
    return this.bookingsService.getMyWaitlist(req.user.id);
  }

  @Delete('waitlist/:id')
  @UseGuards(JwtAuthGuard)
  leaveWaitlist(@Param('id') id: string, @Request() req) {
    return this.bookingsService.leaveWaitlist(id, req.user.id);
  }
}
