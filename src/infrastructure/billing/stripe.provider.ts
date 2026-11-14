import { Provider } from '@nestjs/common';
import Stripe from 'stripe';
import { AppConfig } from '../../shared/config/app.config';
import { APP_CONFIG, STRIPE_CLIENT } from '../../shared/tokens';

/** One Stripe client for the whole app, built from validated configuration. */
export const stripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) =>
    new Stripe(config.stripe.secretKey, { apiVersion: '2026-04-22.dahlia' }),
};
