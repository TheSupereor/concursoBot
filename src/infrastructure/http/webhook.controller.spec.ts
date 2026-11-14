import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import Stripe from 'stripe';
import { WebhookController } from './webhook.controller';
import { ProcessApprovedPaymentUseCase } from '../../application/use-cases/process-approved-payment.use-case';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case';
import { IProcessedEventRepository } from '../../domain/ports/processed-event-repository.port';

const WEBHOOK_SECRET = 'whsec_test_secret';

/** Same semantics as the MySQL implementation: unfinished events are re-processed on retry. */
class InMemoryProcessedEvents implements IProcessedEventRepository {
  readonly processed = new Set<string>();

  async beginProcessing(eventId: string) {
    return this.processed.has(eventId)
      ? ('already_processed' as const)
      : ('process' as const);
  }

  async markProcessed(eventId: string) {
    this.processed.add(eventId);
  }
}

describe('WebhookController (Stripe)', () => {
  let app: INestApplication;
  let processPayment: { execute: jest.Mock };
  let cancelSubscription: { execute: jest.Mock };
  const stripe = new Stripe('sk_test_dummy');

  const send = (event: object, secret = WEBHOOK_SECRET) => {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    return request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(payload);
  };

  const checkoutCompleted = (id = 'evt_1', telegramId = '42') => ({
    id,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { client_reference_id: telegramId } },
  });

  const subscriptionDeleted = (id = 'evt_2', telegramId = '42') => ({
    id,
    object: 'event',
    type: 'customer.subscription.deleted',
    data: { object: { metadata: { telegramId } } },
  });

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  beforeEach(async () => {
    processPayment = { execute: jest.fn().mockResolvedValue(undefined) };
    cancelSubscription = { execute: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: ProcessApprovedPaymentUseCase, useValue: processPayment },
        { provide: CancelSubscriptionUseCase, useValue: cancelSubscription },
        {
          provide: 'IProcessedEventRepository',
          useValue: new InMemoryProcessedEvents(),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a request with an invalid signature and does nothing', async () => {
    await send(checkoutCompleted(), 'whsec_wrong_secret').expect(400);

    expect(processPayment.execute).not.toHaveBeenCalled();
  });

  it('activates the subscriber on checkout.session.completed', async () => {
    await send(checkoutCompleted()).expect(200);

    expect(processPayment.execute).toHaveBeenCalledWith('42');
  });

  it('cancels the subscriber on customer.subscription.deleted', async () => {
    await send(subscriptionDeleted()).expect(200);

    expect(cancelSubscription.execute).toHaveBeenCalledWith('42');
  });

  it('processes a redelivered event only once', async () => {
    await send(checkoutCompleted('evt_dup')).expect(200);
    await send(checkoutCompleted('evt_dup')).expect(200);

    expect(processPayment.execute).toHaveBeenCalledTimes(1);
  });

  it('answers 500 when processing fails and processes the retry', async () => {
    processPayment.execute.mockRejectedValueOnce(new Error('db down'));

    await send(checkoutCompleted('evt_retry')).expect(500);
    await send(checkoutCompleted('evt_retry')).expect(200);

    expect(processPayment.execute).toHaveBeenCalledTimes(2);
  });

  it('acknowledges event types it does not handle', async () => {
    await send({
      id: 'evt_other',
      object: 'event',
      type: 'invoice.created',
      data: { object: {} },
    }).expect(200);

    expect(processPayment.execute).not.toHaveBeenCalled();
    expect(cancelSubscription.execute).not.toHaveBeenCalled();
  });
});
