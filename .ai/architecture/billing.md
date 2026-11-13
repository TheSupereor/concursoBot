# Arquitetura de Billing — Stripe

## Fluxo de pagamento

```
Usuário: /assinar (Telegram)
  ↓
TelegramBotUpdate.onAssinar()
  ↓ cria Stripe Checkout Session com:
    client_reference_id = telegramId
    price: STRIPE_PRICE_ID
  ↓
Usuário completa pagamento no Stripe
  ↓
Stripe → POST /webhooks/stripe (checkout.session.completed)
  ↓
WebhookController.handleStripeWebhook()
  ↓ extrai telegramId de session.client_reference_id
  ↓
ProcessApprovedPaymentUseCase.execute(telegramId)
  ↓
subscriber.activateSubscription() + save + sendCustomAlert
```

## Fluxo de cancelamento

```
Stripe → POST /webhooks/stripe (customer.subscription.deleted)
  ↓
WebhookController
  ↓ extrai telegramId de subscription.metadata.telegramId
  ↓
CancelSubscriptionUseCase.execute(telegramId)
  ↓
subscriber.cancelSubscription() + save
```

## Regras de segurança

- Sempre validar assinatura HMAC do webhook: `stripe.webhooks.constructEvent(rawBody, sig, secret)`
- `rawBody: true` obrigatório no bootstrap (main.ts) — sem isso, a verificação quebra
- STRIPE_WEBHOOK_SECRET deve estar no .env, nunca hardcoded

## Idempotência

- O evento `checkout.session.completed` pode ser reenviado pelo Stripe
- `activateSubscription()` é idempotente (ativa mesmo se já ativo)
- Mesma lógica para cancelamento

## Linkagem Telegram ↔ Stripe

O `telegramId` é embarcado na sessão de checkout em `client_reference_id`.
No cancelamento, deve estar em `subscription.metadata.telegramId`.
Sem esse vínculo, não é possível identificar qual assinante ativar/cancelar.

## Variáveis de ambiente necessárias

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```
