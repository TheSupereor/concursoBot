# Skill: Criar Use Case

Use este procedimento ao implementar qualquer nova operação de negócio.
Use cases são a camada de orquestração — coordenam ports, nunca contêm regras de negócio.

## Quando criar um use case

- Novo comando do bot (ex: `/historico`)
- Novo evento de webhook (ex: novo evento do Stripe)
- Nova ação do consumidor RabbitMQ
- Qualquer operação que envolva mais de um port

## Passos

### 1. Criar o arquivo do use case

Local: `src/application/use-cases/{NomeUseCase}.ts`

Estrutura base com uma dependência:
```typescript
import { Inject } from '@nestjs/common';
import { ISubscriberRepository } from 'src/domain/ports/ISubscriberRepository';

export class NomeUseCase {
  constructor(
    @Inject('ISubscriberRepository')
    private readonly subscriberRepo: ISubscriberRepository,
  ) {}

  async execute(telegramId: string): Promise<void> {
    const subscriber = await this.subscriberRepo.searchByTelegramId(telegramId);
    if (!subscriber) throw new Error('Subscriber not found');

    // orquestração: chamar métodos do domínio e ports
    subscriber.algumMetodoDeDominio();

    await this.subscriberRepo.save(subscriber);
  }
}
```

Estrutura base com múltiplas dependências:
```typescript
import { Inject } from '@nestjs/common';
import { ISubscriberRepository } from 'src/domain/ports/ISubscriberRepository';
import { INotificationService } from 'src/domain/ports/INotificationService';

export class NomeUseCase {
  constructor(
    @Inject('ISubscriberRepository')
    private readonly subscriberRepo: ISubscriberRepository,
    @Inject('INotificationService')
    private readonly notificationService: INotificationService,
  ) {}

  async execute(telegramId: string): Promise<void> {
    const subscriber = await this.subscriberRepo.searchByTelegramId(telegramId);
    if (!subscriber) throw new Error('Subscriber not found');

    subscriber.algumMetodoDeDominio();

    await this.subscriberRepo.save(subscriber);
    await this.notificationService.sendCustomAlert(subscriber, 'Texto de confirmação.');
  }
}
```

### 2. Registrar no app.module.ts

Com uma dependência:
```typescript
{
  provide: NomeUseCase,
  useFactory: (repo: ISubscriberRepository) => new NomeUseCase(repo),
  inject: ['ISubscriberRepository'],
},
```

Com múltiplas dependências:
```typescript
{
  provide: NomeUseCase,
  useFactory: (repo: ISubscriberRepository, notif: INotificationService) =>
    new NomeUseCase(repo, notif),
  inject: ['ISubscriberRepository', 'INotificationService'],
},
```

### 3. Injetar no entry point

Dependendo de onde o use case será chamado:

**Entry point Telegram (TelegramBotUpdate.ts):**
```typescript
constructor(
  // ...existentes
  private readonly nomeUseCase: NomeUseCase,
) {}

@Command('nome_comando')
async onNomeComando(@Ctx() ctx: Context) {
  const telegramId = String(ctx.from.id);
  await this.nomeUseCase.execute(telegramId);
  await ctx.reply('Resposta ao usuário.');
}
```

**Entry point HTTP (novo controller ou WebhookController.ts):**
```typescript
constructor(private readonly nomeUseCase: NomeUseCase) {}

@Post('rota')
async handle(@Body() body: any) {
  await this.nomeUseCase.execute(body.telegramId);
  return { ok: true };
}
```

**Entry point RabbitMQ (VacancyConsumer.ts ou novo consumer):**
```typescript
constructor(private readonly nomeUseCase: NomeUseCase) {}

@EventPattern('nome.da.fila')
async handle(@Payload() data: any, @Ctx() context: RmqContext) {
  // ver skill create-consumer para retry/ack
  await this.nomeUseCase.execute(data.telegramId);
}
```

### 4. Criar o teste unitário

Local: `src/application/use-cases/{NomeUseCase}.spec.ts`

```typescript
import { NomeUseCase } from './NomeUseCase';
import { ISubscriberRepository } from 'src/domain/ports/ISubscriberRepository';
import { Subscriber } from 'src/domain/entities/Subscriber';

describe('NomeUseCase', () => {
  let useCase: NomeUseCase;
  let subscriberRepo: jest.Mocked<ISubscriberRepository>;

  beforeEach(() => {
    subscriberRepo = {
      searchByTelegramId: jest.fn(),
      searchActiveSubscribers: jest.fn(),
      save: jest.fn(),
    };
    useCase = new NomeUseCase(subscriberRepo);
  });

  it('deve executar o comportamento esperado', async () => {
    const subscriber = new Subscriber('123', true, []);
    subscriberRepo.searchByTelegramId.mockResolvedValue(subscriber);

    await useCase.execute('123');

    expect(subscriberRepo.save).toHaveBeenCalledWith(subscriber);
  });

  it('deve lançar erro se subscriber não existir', async () => {
    subscriberRepo.searchByTelegramId.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow('Subscriber not found');
  });
});
```

## Regras que o use case deve respeitar

- **Nunca** importar TypeORM, Stripe, Telegraf, Axios ou RabbitMQ
- **Nunca** conter lógica de negócio — delegar para métodos da entidade
- **Sempre** verificar se o subscriber existe antes de operar sobre ele
- **Sempre** persistir o subscriber após mutations
- **Sempre** ter teste unitário com mocks das ports

## Checklist de aceite

- [ ] Arquivo em `src/application/use-cases/`
- [ ] Construtor recebe apenas ports (interfaces do domínio)
- [ ] Registrado no `app.module.ts` como factory provider
- [ ] Injetado no entry point correto
- [ ] Sem imports de infraestrutura
- [ ] Teste unitário cobrindo caminho feliz e subscriber não encontrado
- [ ] Testes passando (`npm run test`)
