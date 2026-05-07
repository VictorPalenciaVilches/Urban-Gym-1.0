import MercadoPago, { Preference } from 'mercadopago';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const mp = new MercadoPago({
    accessToken: process.env.MP_ACCESS_TOKEN || '',
  });
  const preference = new Preference(mp);

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'test-1',
            title: 'Test Product',
            quantity: 1,
            unit_price: 1000,
            currency_id: 'COP',
          },
        ],
        back_urls: {
          success: 'http://localhost:5173/payment/success',
          failure: 'http://localhost:5173/payment/failure',
          pending: 'http://localhost:5173/payment/pending',
        },
        // auto_return: 'approved',
      },
    });
    console.log('SUCCESS:', result.sandbox_init_point);
  } catch (err: any) {
    console.error('FAILED:', err.message);
    if (err.response) {
      console.error('RESPONSE:', JSON.stringify(err.response, null, 2));
    }
  }
}

test();
