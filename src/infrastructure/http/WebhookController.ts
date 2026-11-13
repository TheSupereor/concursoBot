import Stripe from 'stripe';
import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { ProcessApprovedPaymentUseCase } from '../../application/use-cases/processApprovedPaymentUseCase';
import { Request, Response } from 'express';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancelSubscription';

@Controller('webhooks')
export class WebhookController {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  });
  // private endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  constructor(
    private readonly processPaymentUseCase: ProcessApprovedPaymentUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>, // Importante: tipar como RawBodyRequest
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    let event: any; //Stripe.Event;

    try {
      // A validação criptográfica real acontecendo:
      event = this.stripe.webhooks.constructEvent(
        req.rawBody, // Usando o buffer bruto
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed: ${err}`);
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error`);
    }

    // Se passou, temos certeza que foi o Stripe quem mandou!
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any; //Stripe.Checkout.Session;
      const telegramId = session.client_reference_id; // Recuperamos aquele ID embutido!

      if (telegramId) {
        await this.processPaymentUseCase.execute(telegramId);
        console.log(`✅ Pagamento processado para: ${telegramId}`);
      }
    }

    // CENÁRIO 2: O CAMINHO TRISTE (ASSINATURA CANCELADA / VENCIDA)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      // Resgatamos aquele ID que plantamos no metadata!
      const telegramId = subscription.metadata.telegramId;

      if (telegramId) {
        await this.cancelSubscriptionUseCase.execute(telegramId);
      }
    }

    return res.status(HttpStatus.OK).send();
  }
}
