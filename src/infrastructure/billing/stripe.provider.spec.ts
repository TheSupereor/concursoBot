import { FactoryProvider } from '@nestjs/common';
import { AppConfig } from '../../shared/config/app.config';
import { STRIPE_CLIENT } from '../../shared/tokens';
import { stripeProvider } from './stripe.provider';

describe('stripeProvider', () => {
  const provider = stripeProvider as FactoryProvider;

  it('provides the shared Stripe client token', () => {
    expect(provider.provide).toBe(STRIPE_CLIENT);
  });

  it('builds a Stripe client from the configured secret key', () => {
    const client = provider.useFactory({
      stripe: { secretKey: 'sk_test_unit' },
    } as AppConfig) as { checkout: unknown; webhooks: unknown };

    expect(client.checkout).toBeDefined();
    expect(client.webhooks).toBeDefined();
  });
});
