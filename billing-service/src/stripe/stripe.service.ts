import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const PLAN_PRICES: Record<string, number> = {
  basic: 8000000,    // $80.000 COP
  premium: 15000000, // $150.000 COP
  vip: 25000000,     // $250.000 COP
};

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
    );
  }

  async createCustomer(name: string, email: string): Promise<string> {
    const customer = await this.stripe.customers.create({ name, email });
    return customer.id;
  }

  async chargeSubscription(
    customerId: string,
    plan: string,
  ): Promise<{ status: string; paymentIntentId: string }> {
    const amount = PLAN_PRICES[plan] ?? PLAN_PRICES.basic;

    const paymentIntent = await this.stripe.paymentIntents.create({
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
    return this.stripe.customers.retrieve(customerId);
  }

  getPlanAmount(plan: string): number {
    return PLAN_PRICES[plan] ?? PLAN_PRICES.basic;
  }
}
