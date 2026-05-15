import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const PLAN_PRICES: Record<string, number> = {
  basic: 8000000,    // $80.000 COP
  premium: 15000000, // $150.000 COP
  vip: 25000000,     // $250.000 COP
};

@Injectable()
export class StripeService {
  private stripe: InstanceType<typeof Stripe> | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY no configurada — funcionalidad Stripe deshabilitada');
    }
  }

  private getStripe(): InstanceType<typeof Stripe> {
    if (!this.stripe) {
      throw new Error('Stripe no está configurado. Agrega STRIPE_SECRET_KEY al .env');
    }
    return this.stripe;
  }

  async createCustomer(name: string, email: string): Promise<string> {
    const customer = await this.getStripe().customers.create({ name, email });
    return customer.id;
  }

  async chargeSubscription(
    customerId: string,
    plan: string,
  ): Promise<{ status: string; paymentIntentId: string }> {
    const amount = PLAN_PRICES[plan] ?? PLAN_PRICES.basic;

    const paymentIntent = await this.getStripe().paymentIntents.create({
      amount,
      currency: 'cop',
      customer: customerId,
      payment_method: 'pm_card_visa', // tarjeta de prueba de Stripe
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `Suscripción UrbanGym — plan ${plan}`,
      metadata: { plan },
    });

    return {
      status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed',
      paymentIntentId: paymentIntent.id,
    };
  }

  async getCustomer(customerId: string) {
    return this.getStripe().customers.retrieve(customerId);
  }

  getPlanAmount(plan: string): number {
    return PLAN_PRICES[plan] ?? PLAN_PRICES.basic;
  }
}
