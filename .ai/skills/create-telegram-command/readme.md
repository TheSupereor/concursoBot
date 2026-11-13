# Skill: Criar Comando Telegram

Use este procedimento ao adicionar um novo comando ou botão inline ao bot.

## Passos

### 1. Adicionar o handler em TelegramBotUpdate.ts

`src/infrastructure/telegram/TelegramBotUpdate.ts`

**Para comando de texto:**
```typescript
@Command('nome_comando')
async onNomeComando(@Ctx() ctx: Context) {
  const telegramId = String(ctx.from.id);
  await this.nomeUseCase.execute(telegramId);
  await ctx.reply('Mensagem de resposta.');
}
```

**Para botão inline (callback query):**
```typescript
@Action(/prefixo_.+/)
async onNomeCallback(@Ctx() ctx: Context) {
  const telegramId = String(ctx.from.id);
  const dado = (ctx.callbackQuery as any).data.replace('prefixo_', '');
  await this.nomeUseCase.execute(telegramId, dado);
  await ctx.answerCbQuery('Ação realizada.');
}
```

### 2. Criar o use case correspondente

Local: `src/application/use-cases/NomeUseCase.ts`

```typescript
export class NomeUseCase {
  constructor(
    @Inject('ISubscriberRepository')
    private readonly subscriberRepo: ISubscriberRepository,
  ) {}

  async execute(telegramId: string, dado?: string): Promise<void> {
    const subscriber = await this.subscriberRepo.searchByTelegramId(telegramId);
    if (!subscriber) throw new Error('Subscriber not found');
    // lógica de negócio aqui
    await this.subscriberRepo.save(subscriber);
  }
}
```

### 3. Registrar use case no app.module.ts

```typescript
{
  provide: NomeUseCase,
  useFactory: (repo: ISubscriberRepository) => new NomeUseCase(repo),
  inject: ['ISubscriberRepository'],
}
```

### 4. Injetar use case em TelegramBotUpdate

Adicionar no construtor de `TelegramBotUpdate`:
```typescript
constructor(
  // ...existentes
  private readonly nomeUseCase: NomeUseCase,
) {}
```

### 5. Validar usuário

Sempre verificar se subscriber existe antes de executar a lógica.
Responder com mensagem de erro clara se não existir.

### 6. Criar testes

- Unitário do use case com mocks dos repositórios
- Cobrir caminho de sucesso e casos de erro (subscriber não encontrado, validações de domínio)

## Checklist de aceite

- [ ] Handler registrado em TelegramBotUpdate
- [ ] Use case sem imports de Telegram/TypeORM
- [ ] Use case registrado no app.module.ts
- [ ] Callbacks respondem com `answerCbQuery()`
- [ ] Erros de domínio são tratados e respondidos ao usuário
- [ ] Testes unitários do use case passando
