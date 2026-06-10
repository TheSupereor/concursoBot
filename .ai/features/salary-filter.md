# Feature: Filtro de Salário

## Objetivo

Permitir que o usuário defina um salário mínimo global. Vagas com salário abaixo
desse valor não são enviadas, mesmo que área e região façam match.

## Comportamento

- O filtro se aplica a **todas** as preferências do usuário simultaneamente
- Salário mínimo é 0 por padrão (sem filtro)
- Valor é um `Salary` Value Object — validado no momento da criação
- Não é possível definir salário negativo (lança exceção no VO)
- Não é possível definir salário sem ter ao menos 1 preferência cadastrada

## Fluxo

1. Usuário executa `/salario` no Telegram
2. Bot exibe teclado inline com opções de valores
3. Usuário clica em um valor → callback `set_salario_{valor}`
4. `DefineSalaryUseCase` carrega o subscriber, cria `Salary(valor)`, chama `defineMinimumGlobalSalary`
5. Persiste o subscriber com as preferências atualizadas

## Implementação no domínio

```typescript
// Subscriber.ts
defineMinimumGlobalSalary(newSalary: Salary): void {
  if (this.preferences.length === 0) throw new Error('No preferences defined');
  this.preferences.forEach(p => p.minimunSalary = newSalary);
}
```

## Impacto na lógica de match

Em `hasInterest(vacancy: Vacancy)`:
- Para cada preferência, a vaga precisa ter `salary >= preference.minimunSalary`
- Match falha se salário da vaga for menor que o mínimo definido

## Persistência

- `minimunSalary` é salvo como `decimal(10,2)` em `preferences.minimunSalary`
- Nota: há typo "minimun" (vs "minimum") preservado no código — não corrigir sem migration

## Arquivos relevantes

- `src/domain/value-objects/Salary.ts`
- `src/domain/entities/Subscriber.ts` → `defineMinimumGlobalSalary`
- `src/application/use-cases/DefineSalaryUseCase.ts`
- `src/infrastructure/telegram/TelegramBotUpdate.ts` → handler `set_salario_*`
