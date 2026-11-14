import { buildCheckoutSessionParams } from './checkout-session';

describe('buildCheckoutSessionParams', () => {
  const params = buildCheckoutSessionParams({
    telegramId: '42',
    priceId: 'price_123',
    successUrl: 'https://example.com/ok',
    cancelUrl: 'https://example.com/cancel',
  });

  it('links the checkout session to the Telegram user', () => {
    expect(params.client_reference_id).toBe('42');
    expect(params.metadata).toEqual({ telegramId: '42' });
  });

  it('copies the Telegram id onto the subscription itself', () => {
    // Without subscription_data.metadata, customer.subscription.* webhooks carry no
    // telegramId (metadata on the session is not copied to the subscription), so a
    // cancellation could never be matched to a user.
    expect(params.subscription_data?.metadata).toEqual({ telegramId: '42' });
  });

  it('creates a card subscription for the configured price', () => {
    expect(params.mode).toBe('subscription');
    expect(params.line_items).toEqual([{ price: 'price_123', quantity: 1 }]);
  });
});
