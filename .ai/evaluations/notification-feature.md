# Avaliação: Feature de Notificações

Use este checklist antes de marcar qualquer mudança na feature de notificações como concluída.

## Critérios de aceite funcionais

- [ ] Apenas assinantes com `isActive = true` recebem alertas
- [ ] Apenas vagas com match em área, região e salário são enviadas
- [ ] Uma vaga nunca é enviada duas vezes para o mesmo assinante (`notification_logs`)
- [ ] Falha ao notificar um assinante não impede notificação dos demais
- [ ] Mensagens chegam no Telegram com área, região, cargo e salário legíveis

## Critérios de resiliência

- [ ] VacancyConsumer tenta 3 vezes com backoff exponencial (2s, 4s, 8s) em caso de falha
- [ ] Após 3 falhas: mensagem vai para `concursos.dlq` (nack sem requeue)
- [ ] Processamento bem-sucedido faz `ack()` explícito
- [ ] Rate limit de 35ms entre mensagens está ativo no TelegramNotificationService

## Critérios arquiteturais

- [ ] `NotifySubscriberUseCase` não importa TypeORM, Telegram ou RabbitMQ
- [ ] Lógica de match está no domínio (`Subscriber.hasInterest`), não no use case
- [ ] `TelegramNotificationService` implementa `INotificationService`
- [ ] Novos canais podem ser adicionados sem alterar o use case

## Testes mínimos exigidos

- [ ] Unitário: `Subscriber.hasInterest` retorna `true` quando todos os critérios batem
- [ ] Unitário: `Subscriber.hasInterest` retorna `false` para área/salário incompatíveis
- [ ] Unitário: `NotifySubscriberUseCase` não envia se `alreadySent` retornar `true`
- [ ] Unitário: `NotifySubscriberUseCase` não envia para subscriber inativo
- [ ] Unitário: `Salary` lança erro para valor negativo

## Verificação manual

- [ ] Publicar mensagem manual na fila `concursos.new` e confirmar recebimento no Telegram
- [ ] Publicar a mesma mensagem duas vezes — segunda deve ser ignorada
- [ ] Confirmar registro em `notification_logs` após envio
