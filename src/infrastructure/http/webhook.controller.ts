import {
  Controller,
  Headers,
  HttpStatus,
  Inject,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProcessApprovedPaymentUseCase } from '../../application/use-cases/process-approved-payment.use-case';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case';
import { IProcessedEventRepository } from '../../domain/ports/processed-event-repository.port';
import { StripeClient, StripeEvent } from '../billing/stripe-types';
import { AppConfig } from '../../shared/config/app.config';
import {
  APP_CONFIG,
  PROCESSED_EVENT_REPOSITORY,
  STRIPE_CLIENT,
} from '../../shared/tokens';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly processPaymentUseCase: ProcessApprovedPaymentUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    @Inject(PROCESSED_EVENT_REPOSITORY)
    private readonly processedEvents: IProcessedEventRepository,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    if (!req.rawBody) {
      // Without the raw body the signature cannot be verified (misconfigured body parser).
      this.logger.error('Webhook received without a raw body');
      return res.status(HttpStatus.BAD_REQUEST).send('Webhook Error');
    }

    let event: StripeEvent;

    try {
      // Verifies the signature against the raw request body.
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.config.stripe.webhookSecret,
      );
    } catch (error) {
      this.logger.warn(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return res.status(HttpStatus.BAD_REQUEST).send('Webhook Error');
    }

    // Stripe delivers events at least once: acknowledge duplicates without re-applying them.
    const decision = await this.processedEvents.beginProcessing(
      event.id,
      event.type,
    );
    if (decision === 'already_processed') {
      return res.status(HttpStatus.OK).send();
    }

    try {
      await this.dispatch(event);
      await this.processedEvents.markProcessed(event.id);
    } catch (error) {
      // 5xx makes Stripe retry later. The event stays unfinished, so the retry is handled.
      this.logger.error(`Failed to process ${event.type} (${event.id})`, error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }

    return res.status(HttpStatus.OK).send();
  }

  private async dispatch(event: StripeEvent): Promise<void> {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const telegramId = session.client_reference_id;
      if (telegramId) {
        await this.processPaymentUseCase.execute(telegramId);
      }
      return;
    }

    if (event.type === 'customer.subscription.deleted') {
      // The id comes from subscription_data.metadata set at checkout.
      const telegramId = event.data.object.metadata.telegramId;
      if (telegramId) {
        await this.cancelSubscriptionUseCase.execute(telegramId);
      }
    }
  }
}
