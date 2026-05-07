import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Request,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private membersService: MembersService) {}

  // Cualquier socio puede ver su propio perfil
  @Get('me')
  getMe(@Request() req: any) {
    return this.membersService.findOne(req.user.id);
  }

  // Admin y trainer pueden ver todos los socios
  @Get()
  @Roles('admin', 'trainer')
  findAll() {
    return this.membersService.findAll();
  }

  // Admin y trainer pueden ver un socio
  @Get(':id')
  @Roles('admin', 'trainer')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  // Cualquier usuario autenticado puede actualizar su propio perfil
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMemberDto: UpdateMemberDto,
  ) {
    return this.membersService.update(id, updateMemberDto);
  }

  // Solo admin puede eliminar
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }

  // Interno: actualiza estado de suscripción según evento de pago
  @Patch(':id/billing-event')
  async billingEvent(
    @Param('id') id: string,
    @Body('event') event: string,
    @Headers('x-internal-key') key: string,
  ) {
    if (key !== process.env.INTERNAL_SECRET)
      throw new UnauthorizedException('Clave interna inválida');
    return this.membersService.updateSubscriptionStatus(id, event);
  }
}
