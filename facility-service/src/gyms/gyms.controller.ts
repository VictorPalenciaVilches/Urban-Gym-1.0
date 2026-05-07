import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { GymsService } from './gyms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('gyms')
export class GymsController {
  constructor(private gymsService: GymsService) {}

  // Cualquier usuario autenticado puede ver todas las sedes
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAll() {
    return this.gymsService.findAll();
  }

  // Sedes actualmente abiertas
  @Get('open')
  findOpen() {
    return this.gymsService.findOpen();
  }

  // Detalle de una sede (con equipamiento)
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findOne(@Param('id') id: string) {
    return this.gymsService.findOne(id);
  }

  // Solo admin puede crear, actualizar o eliminar sedes
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body(ValidationPipe) body: any) {
    return this.gymsService.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body(ValidationPipe) body: any) {
    return this.gymsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.gymsService.remove(id);
  }
}
