# Avaliação: Feature de Billing (Stripe)

Use este checklist antes de marcar qualquer mudança no fluxo de pagamento como concluída.

## Critérios de aceite funcionais

- [ ] `/assinar` gera link de checkout com `client_reference_id = telegramId`
- [ ] Após pagamento aprovado: assinante fica com `isActive = true`
- [ ] Após cancelamento: assinante fica com `isActive = false`
- [ ] Usuário recebe mensagem de confirmação após ativação
- [ ] Webhook é rejeitado (HTTP 400) se assinatura HMAC for inválida

## Critérios de segurança

- [ ] `rawBody: true` habilitado no bootstrap (main.ts)
- [ ] Assinatura verificada com `stripe.webhooks.constructEvent(rawBody, sig, secret)`
- [ ] `STRIPE_WEBHOOK_SECRET` lido do `.env`, nunca hardcoded
- [ ] Evento com assinatura inválida não executa nenhum use case

## Critérios de idempotência

- [ ] Reenvio de `checkout.session.completed` não cria assinante duplicado
- [ ] Reenvio de `customer.subscription.deleted` não quebra (assinante já inativo)
- [ ] Webhook pode ser processado mais de uma vez com o mesmo resultado

## Critérios arquiteturais

- [ ] `WebhookController` apenas valida assinatura e delega para use case
- [ ] Use cases não importam Stripe SDK diretamente
- [ ] `telegramId` é extraído corretamente de `client_reference_id` (ativação) e `metadata.telegramId` (cancelamento)

## Testes mínimos exigidos

- [ ] Unitário: `ProcessApprovedPaymentUseCase` ativa subscriber e persiste
- [ ] Unitário: `CancelSubscriptionUseCase` desativa subscriber e persiste
- [ ] Integração: webhook com assinatura válida executa o use case
- [ ] Integração: webhook com assinatura inválida retorna 400

## Verificação manual

- [ ] Usar Stripe CLI (`stripe listen`) para simular webhooks localmente
- [ ] Confirmar `isActive = true` no banco após `checkout.session.completed`
- [ ] Confirmar `isActive = false` no banco após `customer.subscription.deleted`
