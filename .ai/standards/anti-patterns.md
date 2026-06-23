# Anti-Patterns — O que não fazer

Cada item aqui representa um erro que parece razoável mas viola a arquitetura
ou cria bugs operacionais reais neste projeto. Leia antes de implementar qualquer
feature nova.

---

## 1. Chamar Axios diretamente no TelegramNotificationService

**Antipadrão:**
```typescript
async sendVacancyAlert(subscriber: Subscriber, vacancy: Vacancy) {
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { ... });
}
```

**Por que é errado:** Ignora o rate limiting do Bottleneck. Com múltiplos assinantes,
o Telegram retorna HTTP 429 e mensagens são perdidas silenciosamente.

**Correto:**
```typescript
async sendVacancyAlert(subscriber: Subscriber, vacancy: Vacancy) {
  await this.limiter.schedule(() =>
    axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { ... })
  );
}
```

**Regra:** Toda chamada à API do Telegram passa por `this.limiter.schedule()`.

---

## 2. Colocar lógica de match de vaga no use case

**Antipadrão:**
```typescript
// NotifySubscriberUseCase.ts
async execute(vacancy: Vacancy) {
  const subscribers = await this.subscriberRepo.searchActiveSubscribers();
  for (const subscriber of subscribers) {
    // ❌ lógica de negócio no use case
    const hasMatch = subscriber.preferences.some(p =>
      p.area === vacancy.area && vacancy.salary.value >= p.minimunSalary.value
    );
    if (hasMatch) { ... }
  }
}
```

**Por que é errado:** Vaza regra de negócio para a camada de aplicação. A lógica
de match não pode ser testada sem o use case inteiro. E quando a regra mudar,
há dois lugares para atualizar.

**Correto:**
```typescript
// NotifySubscriberUseCase.ts
if (subscriber.hasInterest(vacancy)) { ... }
```

A lógica de match pertence exclusivamente a `Subscriber.hasInterest()`.

---

## 3. Acessar a coleção de preferências diretamente

**Antipadrão:**
```typescript
// em qualquer lugar fora de Subscriber.ts
subscriber.preferences.push(novaPreferencia);
subscriber.preferences[0].minimunSalary = new Salary(1000);
```

**Por que é errado:** Burla as invariantes da entidade (limite de 5 preferências,
validações). A entidade não tem controle sobre seu estado interno.

**Correto:**
```typescript
subscriber.addPreference(novaPreferencia);      // enforces max 5
subscriber.defineMinimumGlobalSalary(salary);   // applies to all preferences
```

Toda mutação do subscriber usa os métodos públicos da entidade.

---

## 4. Importar infraestrutura dentro do domínio

**Antipadrão:**
```typescript
// Subscriber.ts ou Preference.ts ou Salary.ts
import { Column } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Telegraf } from 'telegraf';
```

**Por que é errado:** Acopla o domínio à infraestrutura. O domínio se torna
impossível de testar sem subir banco, bot ou gateway de pagamento.

**Regra:** Nenhum arquivo em `src/domain/` importa pacotes de infraestrutura.
As únicas exceções permitidas são tipos primitivos do TypeScript.

**Como detectar:**
```bash
grep -r "typeorm\|telegraf\|stripe\|axios\|amqplib" src/domain/
```
Se retornar resultado fora dos arquivos `*OrmEntity.ts`, há uma violação.

---

## 5. Lógica de negócio no controller ou no entry point

**Antipadrão:**
```typescript
// TelegramBotUpdate.ts ou WebhookController.ts
@Command('areas')
async onAreas(@Ctx() ctx: Context) {
  const telegramId = String(ctx.from.id);
  const subscriber = await this.subscriberRepo.searchByTelegramId(telegramId);
  if (subscriber.preferences.length >= 5) {
    await ctx.reply('Limite atingido.');
    return;
  }
  // ... adiciona preferência manualmente
}
```

**Por que é errado:** A regra "máximo 5 preferências" está na entidade.
Duplicá-la no controller cria divergência — quando a regra mudar, o controller
pode não ser atualizado.

**Correto:**
```typescript
@Command('areas')
async onAreas(@Ctx() ctx: Context) {
  try {
    await this.addPreferenceUseCase.execute(String(ctx.from.id), area);
    await ctx.reply('Área adicionada.');
  } catch (err) {
    await ctx.reply(err.message); // a entidade lança o erro com a mensagem correta
  }
}
```

---

## 6. Usar synchronize: true em produção

**Antipadrão:**
```typescript
// app.module.ts em ambiente de produção
TypeOrmModule.forRootAsync({
  useFactory: () => ({
    synchronize: true, // ❌ em produção
  }),
})
```

**Por que é perigoso:** Pode apagar colunas e alterar tipos de dados automaticamente
ao fazer deploy. Uma mudança de entidade mal planejada destrói dados em produção
sem aviso.

**Correto:** `synchronize: false` em produção com migrations explícitas.
Ver `ADR 002` (`.ai/decisions/002-synchronize-true-em-dev.md`) para o processo
de migração.

---

## 7. Não verificar idempotência antes de enviar

**Antipadrão:**
```typescript
// NotifySubscriberUseCase.ts
if (subscriber.hasInterest(vacancy)) {
  await this.notificationService.sendVacancyAlert(subscriber, vacancy);
  // ❌ sem verificar se já foi enviado
}
```

**Por que é errado:** Se o consumidor RabbitMQ processar a mesma mensagem mais
de uma vez (retry ou redelivery), o usuário recebe a mesma vaga repetida.

**Correto:**
```typescript
if (subscriber.hasInterest(vacancy)) {
  const sent = await this.notificationLog.alreadySent(subscriber.telegramId, vacancy.id);
  if (sent) continue;
  await this.notificationService.sendVacancyAlert(subscriber, vacancy);
  await this.notificationLog.registerSent(subscriber.telegramId, vacancy.id);
}
```

---

## 8. Fazer ack antes de processar a mensagem

**Antipadrão:**
```typescript
@EventPattern('concursos.new')
async handle(@Payload() data: any, @Ctx() context: RmqContext) {
  const channel = context.getChannelRef();
  const message = context.getMessage();
  channel.ack(message); // ❌ ack antes de processar
  await this.useCase.execute(data);
}
```

**Por que é errado:** Se o `execute` lançar exceção depois do ack, a mensagem
é confirmada como processada mas o processamento falhou. A vaga é perdida.

**Correto:** `ack()` só depois do `execute()` ser bem-sucedido.
`nack()` em caso de falha para acionar retry ou DLQ.

---

## 9. Registrar log antes do envio ser confirmado

**Antipadrão:**
```typescript
await this.notificationLog.registerSent(telegramId, vacancyId); // ❌ antes
await this.notificationService.sendVacancyAlert(subscriber, vacancy);
```

**Por que é errado:** Se o envio falhar, o log registra que foi enviado mas o
usuário nunca recebeu. Em retries futuros, a vaga é ignorada por parecer duplicata.

**Correto:** Registrar o log **após** confirmação do envio bem-sucedido.

---

## 10. Validar assinatura Stripe com req.body em vez de rawBody

**Antipadrão:**
```typescript
// WebhookController.ts
stripe.webhooks.constructEvent(
  JSON.stringify(req.body), // ❌ body já foi parseado
  sig,
  secret
);
```

**Por que é errado:** O NestJS parseia o body JSON antes de chegar ao controller.
O Stripe verifica a assinatura sobre o body **bruto** (bytes exatos). Qualquer
transformação invalida a assinatura, causando rejeição de todos os webhooks legítimos.

**Correto:**
```typescript
stripe.webhooks.constructEvent(
  req.rawBody, // ✓ requer rawBody: true no bootstrap
  sig,
  secret
);
```

Garantir que `main.ts` tem `NestFactory.create(AppModule, { rawBody: true })`.
