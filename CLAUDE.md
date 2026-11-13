### CLAUDE.md — Radar de Concursos

Este arquivo orienta agentes de IA (Claude Code, Codex, Cursor, GPT Agents etc.) sobre como trabalhar neste repositório com segurança, consistência e alinhamento arquitetural.

### Visão Geral do Sistema

| Item            | Descrição                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Nome            | Radar de Concursos                                                                                                                         |
| Objetivo        | Monitorar vagas de concursos públicos, filtrar por preferências do usuário e enviar notificações em tempo real mediante assinatura mensal. |
| Stack principal | NestJS + TypeScript + MySQL + RabbitMQ + Telegram Bot + Stripe                                                                             |
| Arquitetura     | Hexagonal (Ports and Adapters) + DDD                                                                                                       |

### Princípios Arquiteturais

1. Domínio isolado da infraestrutura

   * Entidades e Value Objects não conhecem TypeORM, Telegram, Stripe ou RabbitMQ.

   * O domínio expõe regras de negócio puras.
2. Ports and Adapters

   * Use Cases dependem de interfaces (ports).

   * Implementações concretas ficam na camada de infraestrutura.
3. Mensageria resiliente

   * Toda integração assíncrona deve usar retry exponencial e DLQ.

   * Nunca bloquear processamento por falha temporária externa.
4. Idempotência obrigatória

   * Nenhuma notificação pode ser enviada duas vezes para o mesmo usuário e vaga.

   * Webhooks do Stripe devem ser seguros contra duplicação de eventos.

### Estrutura Esperada

```
src/
├── domain/
│   ├── entities/          # Subscriber.ts, Vacancy.ts + ORM entities
│   ├── ports/             # ISubscriberRepository, INotificationService, INotificationLogRepository
│   └── value-objects/     # Salary.ts, Preference.ts
├── application/
│   └── use-cases/         # Um arquivo por caso de uso
├── infrastructure/
│   ├── database/repositories/   # MysqlSubscriberRepository, MysqlNotificationLogRepository
│   ├── telegram/                # TelegramBotUpdate (entry), TelegramNotificationService (adapter)
│   ├── http/                    # WebhookController (Stripe)
│   ├── messaging/               # VacancyConsumer (RabbitMQ)
│   └── scrapper/                # pciConcursosScrapper (cron)
├── app.module.ts
└── main.ts
```

### Regras de Código

1. TypeScript

   * Usar tipos explícitos sempre que possível.

   * Evitar any.

   * Preferir readonly e imutabilidade.
2. NestJS

   * Controllers apenas orquestram.

   * Lógica de negócio deve ficar em Use Cases ou entidades.

   * Providers devem ser injetados via DI.
3. DDD

   * Regras de negócio pertencem às entidades e Value Objects.

   * Use Cases coordenam operações.

   * Repositories são abstrações do domínio.
4. Banco de dados

   * Usar migrations para mudanças estruturais.

   * Nunca acessar o banco diretamente de Controllers.

### Regras de Mensageria (RabbitMQ)

* Filas principais devem ter DLQ associada.

* Retries: máximo 3 tentativas.

* Backoff exponencial: 2s, 4s, 8s.

* Mensagens falhas devem ser roteadas para *.dlq.

* Consumidores devem ser idempotentes.

Exemplo de filas:

### Regras de Notificação

* Respeitar rate limiting do Telegram: 1 mensagem a cada 35ms.

* Registrar envio em notification_logs.

* Nunca enviar duplicado para o mesmo usuário e vaga.

* Falhas temporárias devem acionar retry automático.

### Regras de Pagamento (Stripe)

* Sempre validar assinatura HMAC usando rawBody.

* Ativar assinatura apenas em checkout.session.completed.

* Desativar assinatura em customer.subscription.deleted.

* Webhooks devem ser idempotentes.

### Fluxos Principais

Novo usuário

1. Usuário executa /start.

2. Sistema cria assinante se não existir.

3. Usuário define áreas e salário mínimo.

Nova vaga processada

1. Mensagem chega na fila.

2. Consumidor carrega assinantes ativos.

3. Domínio avalia temInteresseNaVaga.

4. Sistema verifica idempotência.

5. Mensagem é enviada ao Telegram.

6. Log é persistido.

Pagamento aprovado

1. Stripe envia webhook.

2. Assinatura HMAC é validada.

3. Assinante é ativado.

4. Usuário passa a receber alertas.

### Checklist Antes de Finalizar Qualquer Mudança

1. Compila sem erros.

2. Lint sem warnings relevantes.

3. Testes passando.

4. Respeita arquitetura hexagonal.

5. Não introduz dependência do domínio para infraestrutura.

6. Trata falhas externas com retry quando necessário.

7. Evita duplicação de notificações.

### Como Agentes Devem Trabalhar

1. Ler este arquivo antes de qualquer implementação.

2. Consultar .ai/architecture/ para detalhes arquiteturais e .ai/decisions/ para entender o *porquê* das decisões.

3. Consultar .ai/domain/glossary.md para entender os termos do negócio antes de nomear variáveis ou métodos.

4. Verificar .ai/standards/anti-patterns.md antes de implementar — os erros mais comuns já estão documentados.

5. Seguir skills reutilizáveis em .ai/skills/ (create-use-case, create-consumer, create-telegram-command, create-notification-channel).

6. Atualizar .ai/progress/current.md após mudanças significativas.

7. Executar avaliações em .ai/evaluations/ antes de marcar uma tarefa como concluída.

### Exemplo de Uso Esperado

Solicitação:

"Adicionar notificações por WhatsApp"

O agente deve:

1. Ler este CLAUDE.md.

2. Consultar .ai/features/notifications.md.

3. Executar a skill create-notification-channel.

4. Implementar adapter + rate limiting + retry + logs.

5. Executar checklist de avaliação de notificações.

6. Atualizar progresso do projeto.

### Objetivo Final

Manter o Radar de Concursos consistente, resiliente e seguro, permitindo que múltiplos agentes de IA trabalhem no projeto sem degradar a arquitetura ou as regras de negócio.

### Como esse CLAUDE.md ajuda na prática

Evita que o agente quebre sua arquitetura

As regras “domínio não conhece infraestrutura” e “controllers só orquestram” impedem implementações rápidas, mas erradas.

Torna o comportamento consistente entre sessões

Mesmo que você abra um novo chat amanhã, o agente consegue seguir os mesmos padrões.

Reduz bugs operacionais

As seções de RabbitMQ, Stripe e Notificações registram explicitamente práticas críticas como DLQ, retry e idempotência.

Funciona como onboarding para humanos também

Um novo desenvolvedor entenderia rapidamente o sistema lendo esse arquivo.

Escala bem com skills e avaliações

O CLAUDE.md vira o “contrato principal”, enquanto as skills detalham processos específicos e as avaliações definem critérios de aceite.

### Evolução recomendada

Você não precisa começar perfeito. Uma boa evolução é:

1. V1 — Básico (1 hora)

   * Visão geral

   * Arquitetura

   * Regras de código

   * Checklist final
2. V2 — Operacional

   * Mensageria

   * Stripe

   * Notificações

   * Fluxos principais
3. V3 — Multiagente

   * Adicionar referências explícitas a .ai/skills/

   * Adicionar .ai/evaluations/

   * Adicionar política de atualização de progresso

### Exemplo mínimo de skill que combinaria com esse CLAUDE.md

.ai/skills/create-notification-channel.md

Com isso, quando você pedir “adicionar WhatsApp”, o agente terá um procedimento padrão claro para seguir.
