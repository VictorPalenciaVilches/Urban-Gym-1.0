import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPago, { Preference, Payment } from 'mercadopago';

// Precios en COP (pesos colombianos, valor entero)
export const PLAN_PRICES: Record<string, number> = {
  basic: 80000,    // $80.000 COP
  premium: 150000, // $150.000 COP
  vip: 250000,     // $250.000 COP
};

// Para guardar en DB en "centavos" compatibles con el histórico
export const PLAN_PRICES_CENTS: Record<string, number> = {
  basic: 8000000,
  premium: 15000000,
  vip: 25000000,
};

@Injectable()
export class MercadoPagoService {
  private mp: MercadoPago;
  private preference: Preference;
  private payment: Payment;

  constructor(private configService: ConfigService) {
    this.mp = new MercadoPago({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN')!,
      options: { timeout: 5000 },
    });
    this.preference = new Preference(this.mp);
    this.payment = new Payment(this.mp);
  }

  async createPreference(
    memberId: string,
    plan: string,
    memberEmail: string,
    memberName: string,
  ): Promise<{ checkoutUrl: string; preferenceId: string }> {
    const amount = PLAN_PRICES[plan] ?? PLAN_PRICES.basic;
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    try {
      const result = await this.preference.create({
        body: {
          items: [
            {
              id: `urbangym-${plan}`,
              title: `UrbanGYM — Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
              description: `Suscripción mensual al plan ${plan} de UrbanGYM`,
              quantity: 1,
              unit_price: amount,
              currency_id: 'COP',
            },
          ],
          payer: {
            name: memberName,
            email: memberEmail,
          },
          back_urls: {
            success: `${frontendUrl}/payment/success`,
            failure: `${frontendUrl}/payment/failure`,
            pending: `${frontendUrl}/payment/pending`,
          },
          // auto_return: 'approved', // Desactivado para compatibilidad con http://localhost en desarrollo
          external_reference: `${memberId}|${plan}`,
          notification_url: `${this.configService.get<string>('NGROK_URL') ?? 'http://localhost:3006'}/billing/webhook`,
          statement_descriptor: 'URBANGYM',
          metadata: {
            member_id: memberId,
            plan,
          },
        },
      });

      return {
        checkoutUrl: result.sandbox_init_point!,
        preferenceId: result.id!,
      };
    } catch (error) {
      console.error('Error al crear preferencia de MercadoPago:', error);
      if (error.response) {
        console.error('Detalles del error (MP):', error.response);
      }
      throw error;
    }
  }

  async getPayment(paymentId: string) {
    return this.payment.get({ id: paymentId });
  }

  getPlanAmountCents(plan: string): number {
    return PLAN_PRICES_CENTS[plan] ?? PLAN_PRICES_CENTS.basic;
  }
}
