# Feature: Assinaturas

## Objetivo

Controlar quais usuários têm direito a receber alertas de vagas.
Assinatura é ativada via pagamento Stripe e cancelada via webhook de cancelamento.

## Estados do Subscriber

```
Inativo (isActive: false) → não recebe alertas
Ativo   (isActive: true)  → recebe alertas filtrados pelas preferências
```

Transições:
- `activateSubscription()` — chamado pelo ProcessApprovedPaymentUseCase
- `cancelSubscription()` — chamado pelo CancelSubscriptionUseCase

## Aggregate Root: Subscriber

Regras encapsuladas na entidade:

| Método | Regra de negócio |
|---|---|
| `addPreference(preference)` | Máximo 5 preferências |
| `removePreferenceByArea(area)` | Remove da lista interna |
| `defineMinimumGlobalSalary(salary)` | Exige ao menos 1 preferência |
| `hasInterest(vacancy)` | Verifica match entre vaga e preferências |
| `activateSubscription()` | Seta isActive = true |
| `cancelSubscription()` | Seta isActive = false |

## Lógica de match (hasInterest)

Para cada preferência do assinante, verifica:
- `vacancy.area === preference.area` (case insensitive?)
- `vacancy.salary.isBiggerThanOrEqual(preference.minimunSalary)`
- Região (lógica adicional conforme implementação)

Se qualquer preferência fizer match: retorna `true` (OR entre preferências).

## Persistência

- Tabela `subscribers`: telegramId (PK), isActive
- Tabela `preferences`: área + região + salário mínimo por assinante (1:N)
- Cascade delete de preferências quando subscriber é removido

## Dependências

- ISubscriberRepository — busca e persiste subscribers
- INotificationService — notifica usuário após ativar/cancelar assinatura

## Status atual

- Ativação via Stripe: implementado
- Cancelamento via Stripe: implementado (notificação pendente)
- `save()` e `searchByTelegramId()` do repositório MySQL: TODO (stubs)
