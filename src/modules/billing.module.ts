import { Module } from '@nestjs/common';
import { stripeProvider } from '../infrastructure/billing/stripe.provider';
import { WebhookController } from '../infrastructure/http/webhook.controller';
import { STRIPE_CLIENT } from '../shared/tokens';
import { PersistenceModule } from './persistence.module';
import { SubscribersModule } from './subscribers.module';

/** Stripe client and the webhook that activates and cancels subscriptions. */
@Module({
  imports: [PersistenceModule, SubscribersModule],
  providers: [stripeProvider],
  controllers: [WebhookController],
  exports: [STRIPE_CLIENT],
})
export class BillingModule {}
