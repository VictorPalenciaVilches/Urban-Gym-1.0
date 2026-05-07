import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MercadoPagoModule } from '../mercado-pago/mercadopago.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [SupabaseModule, MercadoPagoModule],
  controllers: [BillingController],
  providers: [BillingService, RolesGuard],
})
export class BillingModule {}
