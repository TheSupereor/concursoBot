import { Controller, Post, Req, Res, Headers, HttpStatus } from "@nestjs/common";
import { ProcessApprovedPaymentUseCase } from "../../application/use-cases/processApprovedPaymentUseCase";
import { Request, Response } from 'express';

@Controller('webhooks')
export class WebhookController {
    // private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  // private endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  constructor(
    private readonly processPaymentUseCase: ProcessApprovedPaymentUseCase,
  ){}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response
  ) {
    try {
        // 1. VALIDAÇÃO DE SEGURANÇA (HMAC)
      // Isso impede que um hacker faça um POST falso dizendo que pagou.
      // const event = this.stripe.webhooks.constructEvent(req.body, signature, this.endpointSecret);
      
      // Simulando o evento validado para fins de aprendizado:
      const event = req.body; 

      // 2. ROTEAMENTO DO EVENTO
      if (event.type === 'checkout.session.completed') {
        // Quando você gera o link de pagamento, você injeta o telegramId no "client_reference_id"
        const telegramId = event.data.object.client_reference_id;
        
        // 3. CHAMA O CASO DE USO
        if (telegramId) {
          await this.processPaymentUseCase.execute(telegramId);
        }
      }

      // Se o usuário cancelar a assinatura:
      if (event.type === 'customer.subscription.deleted') {
         // Aqui você chamaria um CancelarAssinaturaUseCase
      }

      // O Stripe exige que você responda 200 OK rapidamente, senão ele tenta enviar de novo
      return res.status(HttpStatus.OK).send('Webhook recebido com sucesso');
      
    } catch (err) {
      console.error(`Erro no Webhook: ${err}`);
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err}`);
    }
  }
}