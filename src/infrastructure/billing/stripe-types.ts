import Stripe from 'stripe';

// Stripe v22 ships its types behind the instance type, so derive them from the SDK itself.
export type StripeEvent = ReturnType<
  Stripe.Stripe['webhooks']['constructEvent']
>;

export type CheckoutSessionParams = NonNullable<
  Parameters<Stripe.Stripe['checkout']['sessions']['create']>[0]
>;
