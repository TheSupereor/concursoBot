# Skill: Criar Canal de Notificação

Use este procedimento ao adicionar um novo canal de envio de alertas (ex: WhatsApp, Email, SMS).

O canal atual é Telegram (`TelegramNotificationService`). Novos canais seguem o mesmo contrato.

## Passos

### 1. Criar o adapter

Local: `src/infrastructure/{canal}/{Canal}NotificationService.ts`

O adapter deve implementar `INotificationService` do domínio:

```typescript
import { INotificationService } from 'src/domain/ports/INotificationService';
import { Subscriber } from 'src/domain/entities/Subscriber';
import { Vacancy } from 'src/domain/entities/Vacancy';

export class WhatsappNotificationService implements INotificationService {
  async sendVacancyAlert(subscriber: Subscriber, vacancy: Vacancy): Promise<void> {
    // formatar mensagem
    // aplicar rate limiting
    // enviar via SDK/API do canal
    // registrar log em caso de erro
  }

  async sendCustomAlert(subscriber: Subscriber, text: string): Promise<void> {
    // enviar mensagem personalizada
  }
}
```

### 2. Implementar rate limiting

Todo canal deve respeitar os limites da API externa. Usar Bottleneck:

```typescript
import Bottleneck from 'bottleneck';

private readonly limiter = new Bottleneck({
  minTime: X,       // intervalo mínimo entre chamadas em ms
  maxConcurrent: 1, // sem concorrência
});

// usar em todo envio:
await this.limiter.schedule(() => this.apiClient.send(...));
```

### 3. Implementar retry interno (opcional)

Para erros transitórios de rede, adicionar retry antes de lançar a exceção.
O retry do VacancyConsumer cobre falhas do use case como um todo — este retry
cobre falhas específicas da chamada à API do canal.

### 4. Registrar no app.module.ts

Substituir ou adicionar ao token existente:
```typescript
{ provide: 'INotificationService', useClass: WhatsappNotificationService }
```

Se suportar múltiplos canais simultaneamente, criar um `CompositeNotificationService`
que implementa `INotificationService` e delega para uma lista de adapters.

### 5. Criar testes

- Unitário: mock da API externa, verificar que `sendVacancyAlert` formata e envia corretamente
- Unitário: verificar comportamento com falha na API (retry, erro propagado)
- Verificar que `INotificationService` é satisfeita sem modificação nos use cases

## Checklist de aceite

- [ ] Implementa `INotificationService` completamente
- [ ] Rate limiting ativo (respeita limites da API)
- [ ] Falhas temporárias não quebram o processamento dos demais assinantes
- [ ] Não gera duplicações em caso de retry
- [ ] Registra logs de erro com informação suficiente para diagnóstico
- [ ] Use cases (`NotifySubscriberUseCase`, `ProcessApprovedPaymentUseCase`) não foram modificados
- [ ] Testes unitários passando
