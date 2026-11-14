import { CheckoutSessionParams } from './stripe-types';

interface CheckoutSessionInput {
  telegramId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Builds the Stripe Checkout session for a monthly subscription.
 *
 * The Telegram id is stored in three places on purpose:
 *  - client_reference_id and session metadata identify the user in checkout.session.*;
 *  - subscription_data.metadata is copied onto the Subscription object. Session metadata is
 *    NOT inherited by the subscription, so without it customer.subscription.* webhooks (for
 *    example cancellation) carry no telegramId and cannot be matched to a user.
 */
export function buildCheckoutSessionParams(
  input: CheckoutSessionInput,
): CheckoutSessionParams {
  return {
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: input.priceId, quantity: 1 }],
    client_reference_id: input.telegramId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { telegramId: input.telegramId },
    subscription_data: { metadata: { telegramId: input.telegramId } },
  };
}
