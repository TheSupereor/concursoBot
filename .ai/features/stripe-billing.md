# Feature: Stripe Billing

## Objetivo

Gerenciar pagamentos de assinatura mensal. O Stripe é a única forma de ativar
ou desativar uma assinatura programaticamente.

## Fluxo completo

**Ativação:**
1. Usuário executa `/assinar` no Telegram
2. Bot cria Checkout Session com `client_reference_id = telegramId`
3. Usuário paga no link gerado
4. Stripe envia `checkout.session.completed` para `/webhooks/stripe`
5. `ProcessApprovedPaymentUseCase` ativa o assinante e envia confirmação

**Cancelamento:**
1. Usuário cancela no painel do Stripe (ou assinatura expira)
2. Stripe envia `customer.subscription.deleted` para `/webhooks/stripe`
3. `CancelSubscriptionUseCase` desativa o assinante

## Segurança do webhook

```typescript
stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
```

- `rawBody: true` no bootstrap — obrigatório, sem isso a validação quebra
- Nunca usar `req.body` diretamente — usar `req.rawBody`
- Rejeitar eventos com assinatura inválida (HTTP 400)

## Idempotência

Eventos Stripe podem ser reenviados. `activateSubscription()` e `cancelSubscription()`
são idempotentes por natureza (apenas atualizam `isActive`).

Se precisar de garantia mais forte: checar se `isActive` já está no estado desejado
antes de persistir.

## Linkagem Telegram ↔ Stripe

| Evento | Campo com telegramId |
|---|---|
| checkout.session.completed | `session.client_reference_id` |
| customer.subscription.deleted | `subscription.metadata.telegramId` |

Essa linkagem deve ser preservada ao criar novas sessões ou assinaturas.

## Arquivos relevantes

- `src/infrastructure/http/WebhookController.ts` — endpoint `/webhooks/stripe`
- `src/application/use-cases/ProcessApprovedPaymentUseCase.ts`
- `src/application/use-cases/CancelSubscriptionUseCase.ts`
- `src/infrastructure/telegram/TelegramBotUpdate.ts` — handler do `/assinar`
