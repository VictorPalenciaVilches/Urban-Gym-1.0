import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { SubscribeDto, MemberCreatedDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── INTERNO: llamado cuando se registra un nuevo miembro ───────────────────
  @Post('member-created')
  async onMemberCreated(
    @Body() dto: MemberCreatedDto,
    @Headers('x-internal-key') key: string,
  ) {
    if (key !== process.env.INTERNAL_SECRET)
      throw new UnauthorizedException('Clave interna inválida');
    return this.billingService.onMemberCreated(dto);
  }

  // ─── WEBHOOK de MercadoPago (sin autenticación) ──────────────────────────────
  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Query('type') type: string,
    @Query('data.id') dataId: string,
  ) {
    // MP envía tipo en body.type o en query param ?type=payment
    const eventType = body?.type ?? type ?? '';
    const paymentId = body?.data?.id ?? dataId ?? '';
    return this.billingService.handleWebhook(eventType, String(paymentId));
  }

  // ─── SOCIO: ver mi suscripción y pagos ──────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyBilling(@Request() req: any) {
    return this.billingService.getMyBilling(req.user.id);
  }

  // ─── SOCIO: ver mis facturas ─────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me/invoices')
  getMyInvoices(@Request() req: any) {
    return this.billingService.getMyInvoices(req.user.id);
  }

  // ─── SOCIO: crear checkout de MercadoPago (plan actual o nuevo) ──────────────
  @UseGuards(JwtAuthGuard)
  @Post('me/checkout')
  async createCheckout(@Request() req: any, @Body() dto: SubscribeDto) {
    return this.billingService.createCheckout(
      req.user.id,
      dto.plan,
      req.user.email,
      req.user.name ?? req.user.email,
    );
  }

  // ─── SOCIO: cambiar plan (actualiza BD y genera nuevo checkout MP) ────────────
  @UseGuards(JwtAuthGuard)
  @Patch('me/plan')
  changePlan(@Request() req: any, @Body() dto: SubscribeDto) {
    return this.billingService.changePlan(
      req.user.id,
      dto.plan,
      req.user.email,
      req.user.name ?? req.user.email,
    );
  }

  // ─── INTERNO: sincronizar plan desde admin (sin cobrar) ──────────────────────
  @Patch('admin/:memberId/plan')
  async syncPlan(
    @Param('memberId') memberId: string,
    @Body() dto: SubscribeDto,
    @Headers('x-internal-key') key: string,
  ) {
    if (key !== process.env.INTERNAL_SECRET)
      throw new UnauthorizedException('Clave interna inválida');
    return this.billingService.syncPlan(memberId, dto.plan);
  }

  // ─── ADMIN: todos los pagos ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/payments')
  getAllPayments() {
    return this.billingService.getAllPayments();
  }

  // ─── ADMIN: estadísticas de ingresos ─────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/revenue')
  getRevenue() {
    return this.billingService.getRevenueStats();
  }
}
