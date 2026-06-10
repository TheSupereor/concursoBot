# Skill: Criar Consumer RabbitMQ

Use este procedimento ao adicionar um novo consumidor de fila.

## Passos

### 1. Criar o arquivo do consumer

Local: `src/infrastructure/messaging/{NomeConsumer}.ts`

Estrutura base:
```typescript
import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class NomeConsumer {
  private readonly MAX_RETRIES = 3;

  constructor(private readonly useCase: SeuUseCase) {}

  @EventPattern('nome.da.fila')
  async handleEvent(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const retryCount = message.properties.headers?.['x-retry-count'] ?? 0;

    try {
      await this.useCase.execute(data);
      channel.ack(message);
    } catch (err) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          channel.nack(message, false, true);
        }, delay);
      } else {
        channel.nack(message, false, false); // → DLQ
      }
    }
  }
}
```

### 2. Configurar a DLQ no main.ts

Adicionar novo transporte RabbitMQ junto aos existentes:
```typescript
app.connectMicroservice({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    queue: 'nome.da.fila',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'nome.da.fila.dlq',
      },
    },
    prefetchCount: 10,
    noAck: false,
  },
});
```

### 3. Criar fila de DLQ correspondente

Nomear como `{fila-original}.dlq`. Não precisa de consumer ativo — só deve ser durable.

### 4. Registrar no app.module.ts

Adicionar o consumer aos `providers` do módulo principal.

### 5. Criar testes

- Unitário: mock do use case, verificar que `ack()` é chamado em sucesso
- Unitário: verificar que `nack(false, false)` é chamado após MAX_RETRIES

## Checklist de aceite

- [ ] Consumer registrado no módulo
- [ ] DLQ configurada na declaração da fila
- [ ] Retry exponencial com máximo de 3 tentativas
- [ ] `ack()` explícito após processamento bem-sucedido
- [ ] `nack(false, false)` após esgotar retries (sem requeue)
- [ ] Use case é idempotente (seguro de reprocessar)
- [ ] Testes cobrindo sucesso e falha após retries
