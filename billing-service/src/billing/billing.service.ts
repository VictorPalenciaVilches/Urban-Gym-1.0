import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MercadoPagoService, PLAN_PRICES_CENTS } from '../mercado-pago/mercadopago.service';
import { MemberCreatedDto } from './dto/subscribe.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class BillingService {
  constructor(
    private supabaseService: SupabaseService,
    private mercadoPagoService: MercadoPagoService,
    private redisService: RedisService,
  ) {}

  // Llamado internamente cuando se registra un nuevo miembro
  async onMemberCreated(dto: MemberCreatedDto) {
    const client = this.supabaseService.getClient();
    const plan = dto.plan ?? 'basic';

    // Verificar si ya tiene suscripción
    const { data: existing } = await client
      .schema('billing')
      .from('subscriptions')
      .select('id')
      .eq('member_id', dto.member_id)
      .single();

    if (existing) return { message: 'Suscripción ya existe' };

    // Guardar suscripción en BD con estado 'pending' hasta que MP confirme
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const { data, error } = await client
      .schema('billing')
      .from('subscriptions')
      .insert({
        member_id: dto.member_id,
        stripe_customer_id: dto.email, // reutilizamos la columna para guardar email
        plan,
        status: 'pending',
        amount: PLAN_PRICES_CENTS[plan] ?? PLAN_PRICES_CENTS.basic,
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Crear preference en MercadoPago
    const { checkoutUrl, preferenceId } =
      await this.mercadoPagoService.createPreference(
        dto.member_id,
        plan,
        dto.email,
        dto.name,
      );

    // Guardar preferenceId en BD
    await client
      .schema('billing')
      .from('subscriptions')
      .update({ stripe_customer_id: preferenceId })
      .eq('id', data.id);

    return {
      message: 'Suscripción creada. Redirigiendo a pago...',
      checkoutUrl,
      subscription: data,
    };
  }

  // Cambiar plan de suscripción → devuelve URL de checkout MP
  async changePlan(memberId: string, newPlan: string, memberEmail: string, memberName: string) {
    const client = this.supabaseService.getClient();

    const { data: sub, error } = await client
      .schema('billing')
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (error || !sub) throw new NotFoundException('Suscripción no encontrada');

    // Actualizar plan en BD (quedará 'pending' hasta que MP confirme)
    await client
      .schema('billing')
      .from('subscriptions')
      .update({
        plan: newPlan,
        amount: PLAN_PRICES_CENTS[newPlan] ?? PLAN_PRICES_CENTS.basic,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId);

    // Crear nueva preference en MP
    const { checkoutUrl } = await this.mercadoPagoService.createPreference(
      memberId,
      newPlan,
      memberEmail,
      memberName,
    );

    return {
      message: `Cambiando al plan ${newPlan}. Redirigiendo a pago...`,
      checkoutUrl,
    };
  }

  // Crear checkout para plan existente (sin cambiar plan en BD todavía)
  async createCheckout(memberId: string, plan: string, memberEmail: string, memberName: string) {
    const { checkoutUrl } = await this.mercadoPagoService.createPreference(
      memberId,
      plan,
      memberEmail,
      memberName,
    );
    return { checkoutUrl };
  }

  // Sincronizar plan desde admin sin cobrar
  async syncPlan(memberId: string, newPlan: string) {
    const client = this.supabaseService.getClient();

    const { data: sub } = await client
      .schema('billing')
      .from('subscriptions')
      .select('id')
      .eq('member_id', memberId)
      .single();

    if (!sub) return { message: 'Sin suscripción activa, nada que sincronizar' };

    await client
      .schema('billing')
      .from('subscriptions')
      .update({
        plan: newPlan,
        amount: PLAN_PRICES_CENTS[newPlan] ?? PLAN_PRICES_CENTS.basic,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId);

    return { message: `Plan sincronizado a ${newPlan}` };
  }

  // Procesar webhook de MercadoPago
  async handleWebhook(type: string, dataId: string) {
    if (type !== 'payment') return { received: true };

    const client = this.supabaseService.getClient();

    try {
      const paymentData = await this.mercadoPagoService.getPayment(dataId);

      const externalRef = paymentData.external_reference; // "memberId|plan"
      if (!externalRef) return { received: true };

      const [memberId, plan] = externalRef.split('|');
      const mpStatus = paymentData.status; // 'approved', 'rejected', 'pending', 'in_process'

      const status = mpStatus === 'approved' ? 'succeeded' : 'failed';
      const invoiceNumber = `INV-MP-${Date.now()}`;
      const amount = PLAN_PRICES_CENTS[plan] ?? PLAN_PRICES_CENTS.basic;

      // Obtener suscripción del miembro
      const { data: sub } = await client
        .schema('billing')
        .from('subscriptions')
        .select('id')
        .eq('member_id', memberId)
        .single();

      if (!sub) return { received: true };

      // Registrar pago
      await client
        .schema('billing')
        .from('payments')
        .insert({
          member_id: memberId,
          subscription_id: sub.id,
          stripe_payment_intent_id: dataId, // reutilizamos columna para MP payment_id
          amount,
          currency: 'cop',
          status,
          invoice_number: invoiceNumber,
          payment_date: new Date().toISOString(),
        });

      if (status === 'succeeded') {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await client
          .schema('billing')
          .from('subscriptions')
          .update({
            status: 'active',
            plan,
            amount,
            current_period_start: new Date().toISOString(),
            current_period_end: nextMonth.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id);

        await this.notifyMemberService(memberId, 'payment.succeeded');
        // Publicar evento en Redis
        this.redisService.publish('payment.succeeded', { member_id: memberId, plan, amount }).catch(() => {});
      } else if (mpStatus === 'rejected') {
        await client
          .schema('billing')
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('id', sub.id);

        await this.notifyMemberService(memberId, 'payment.failed');
        // Publicar evento en Redis
        this.redisService.publish('payment.failed', { member_id: memberId, plan }).catch(() => {});
      }

      console.log(`Webhook MP procesado: payment ${dataId} → ${status} para miembro ${memberId}`);
    } catch (err) {
      console.error('Error procesando webhook MP:', err);
    }

    return { received: true };
  }

  // Obtener suscripción e historial del miembro
  async getMyBilling(memberId: string) {
    const client = this.supabaseService.getClient();

    const [subRes, paymentsRes] = await Promise.all([
      client
        .schema('billing')
        .from('subscriptions')
        .select('*')
        .eq('member_id', memberId)
        .single(),
      client
        .schema('billing')
        .from('payments')
        .select('*')
        .eq('member_id', memberId)
        .order('payment_date', { ascending: false })
        .limit(10),
    ]);

    return {
      subscription: subRes.data ?? null,
      payments: paymentsRes.data ?? [],
    };
  }

  // Historial de pagos del miembro
  async getMyInvoices(memberId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('billing')
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  // Admin: todos los pagos
  async getAllPayments() {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('billing')
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  // Admin: estadísticas de ingresos
  async getRevenueStats() {
    const client = this.supabaseService.getClient();

    const { data: payments } = await client
      .schema('billing')
      .from('payments')
      .select('amount, status, payment_date')
      .eq('status', 'succeeded');

    const { data: subscriptions } = await client
      .schema('billing')
      .from('subscriptions')
      .select('plan, status');

    const total_revenue = (payments ?? []).reduce((s, p) => s + p.amount, 0);
    const active_subscriptions = (subscriptions ?? []).filter(
      (s) => s.status === 'active',
    ).length;

    const by_plan = (subscriptions ?? []).reduce(
      (acc: Record<string, number>, s) => {
        acc[s.plan] = (acc[s.plan] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return {
      total_revenue_cents: total_revenue,
      total_revenue_cop: (total_revenue / 100).toFixed(2),
      active_subscriptions,
      by_plan,
      total_payments: (payments ?? []).length,
    };
  }

  // Job programado: renovar suscripciones activas cada mes
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async processMonthlyBilling() {
    const client = this.supabaseService.getClient();
    const today = new Date().toISOString().split('T')[0];

    console.log(`[Billing Cron] Iniciando renovaciones mensuales — ${today}`);

    // Obtener suscripciones activas cuyo periodo ya venció
    const { data: dueSubscriptions, error } = await client
      .schema('billing')
      .from('subscriptions')
      .select('id, member_id, plan, stripe_customer_id, current_period_end')
      .eq('status', 'active')
      .lte('current_period_end', today);

    if (error) {
      console.error('[Billing Cron] Error al obtener suscripciones vencidas:', error.message);
      return;
    }

    if (!dueSubscriptions || dueSubscriptions.length === 0) {
      console.log('[Billing Cron] No hay suscripciones vencidas hoy.');
      return;
    }

    console.log(`[Billing Cron] Procesando ${dueSubscriptions.length} renovaciones...`);

    for (const sub of dueSubscriptions) {
      try {
        // stripe_customer_id guarda el email del miembro (reutilización de columna)
        const memberEmail = sub.stripe_customer_id;
        const memberName = memberEmail?.split('@')[0] ?? 'Socio';

        // Crear nueva preference de MercadoPago para la renovación
        const { checkoutUrl, preferenceId } =
          await this.mercadoPagoService.createPreference(
            sub.member_id,
            sub.plan,
            memberEmail,
            memberName,
          );

        // Actualizar el periodo al próximo mes y marcar como pending hasta confirmación
        const newPeriodStart = new Date();
        const newPeriodEnd = new Date();
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await client
          .schema('billing')
          .from('subscriptions')
          .update({
            status: 'pending',
            mp_preference_id: preferenceId,
            current_period_start: newPeriodStart.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
          })
          .eq('id', sub.id);

        // Registrar factura pendiente de cobro
        await client
          .schema('billing')
          .from('payments')
          .insert({
            member_id: sub.member_id,
            subscription_id: sub.id,
            amount: this.mercadoPagoService.getPlanAmountCents(sub.plan),
            status: 'pending',
            mp_preference_id: preferenceId,
            payment_date: newPeriodStart.toISOString(),
          });

        console.log(`[Billing Cron] Renovación creada para ${memberEmail} — plan ${sub.plan} — checkout: ${checkoutUrl}`);
      } catch (err) {
        console.error(`[Billing Cron] Error procesando suscripción ${sub.id}:`, err.message);
      }
    }

    console.log('[Billing Cron] Renovaciones mensuales completadas.');
  }

  private async notifyMemberService(memberId: string, event: string) {
    const memberUrl =
      process.env.MEMBER_SERVICE_URL ?? 'http://localhost:3001';
    const internalSecret =
      process.env.INTERNAL_SECRET ?? 'urbangym_internal_secret_2024';

    await fetch(`${memberUrl}/members/${memberId}/billing-event`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalSecret,
      },
      body: JSON.stringify({ event }),
    }).catch(() => {
      console.warn('No se pudo notificar al member service');
    });
  }
}
