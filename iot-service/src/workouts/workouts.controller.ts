import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { RawWorkoutData } from './workouts.service';
import { WorkoutsService } from './workouts.service';
import { MachinesService } from '../machines/machines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('workouts')
export class WorkoutsController {
  constructor(
    private workoutsService: WorkoutsService,
    private machinesService: MachinesService,
  ) {}

  // Máquina envía datos de entrenamiento con API Key
  @Post('machine/:machineId')
  async recordWorkout(
    @Param('machineId') machineId: string,
    @Headers('x-api-key') apiKey: string,
    @Body() body: RawWorkoutData,
  ) {
    const machine = await this.machinesService.findOne(machineId);
    if (!machine || machine.api_key !== apiKey) {
      throw new UnauthorizedException('API Key inválida o máquina inactiva');
    }
    return this.workoutsService.recordWorkout(machine, body);
  }

  // Admin y trainer ven todos los entrenamientos
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'trainer')
  findAll() {
    return this.workoutsService.findAll();
  }

  // Estadísticas de un socio (cualquier usuario autenticado)
  @Get('stats/:memberId')
  @UseGuards(JwtAuthGuard)
  getStats(@Param('memberId') memberId: string) {
    return this.workoutsService.getStats(memberId);
  }

  // Entrenamientos de un socio
  @Get('member/:memberId')
  @UseGuards(JwtAuthGuard)
  findByMember(@Param('memberId') memberId: string) {
    return this.workoutsService.findByMember(memberId);
  }
}
