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
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  // Ver todo el equipamiento de una sede
  @Get('gym/:gymId')
  findByGym(@Param('gymId') gymId: string) {
    return this.equipmentService.findByGym(gymId);
  }

  // Ver solo equipamiento disponible de una sede
  @Get('gym/:gymId/available')
  findAvailable(@Param('gymId') gymId: string) {
    return this.equipmentService.findAvailableByGym(gymId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body(ValidationPipe) body: any) {
    return this.equipmentService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body(ValidationPipe) body: any) {
    return this.equipmentService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }
}
