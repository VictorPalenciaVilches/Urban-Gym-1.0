import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // KPIs consolidados del sistema completo
  @Get('dashboard')
  getDashboard(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.dashboardService.getDashboard(token);
  }

  // Lista completa de miembros
  @Get('members')
  getMembers(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.dashboardService.getMembers(token);
  }

  // Ingresos y pagos consolidados
  @Get('revenue')
  getRevenue(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.dashboardService.getRevenue(token);
  }

  // Horarios y reservas
  @Get('bookings')
  getBookings(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.dashboardService.getBookings(token);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'admin-bff', timestamp: new Date().toISOString() };
  }
}
