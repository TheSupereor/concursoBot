# Padrões TypeScript

## Tipos

- Tipos explícitos em parâmetros e retornos de funções públicas
- `any` proibido — usar `unknown` quando o tipo for genuinamente desconhecido
- Preferir `readonly` em propriedades de entidades e value objects

## Value Objects

Seguir o padrão de `Salary.ts` e `Preference.ts`:
- Propriedades `readonly`
- Validação no construtor (lançar `Error` se inválido)
- Sem setters — imutabilidade garantida pelo tipo

```typescript
export class Salary {
  constructor(readonly value: number) {
    if (value < 0) throw new Error('Salary cannot be negative');
  }

  isBiggerThanOrEqual(other: Salary): boolean {
    return this.value >= other.value;
  }
}
```

## Entidades de domínio

- Propriedades privadas com getters quando necessário
- Métodos expressam intenção de negócio (não CRUD)
- Nunca expor a coleção interna diretamente — retornar cópia com spread

```typescript
getPreferences(): Preference[] {
  return [...this.preferences]; // cópia, não referência
}
```

## Ports (interfaces)

- Nomeadas com prefixo `I`: `ISubscriberRepository`, `INotificationService`
- Retornos assíncronos: `Promise<T>`
- Sem detalhes de implementação (sem tipos do TypeORM, Stripe, etc.)

## Injeção de dependência

- Use cases recebem ports pelo construtor com `@Inject('IPortName')`
- Token string deve ser idêntico ao usado no módulo NestJS

## Imports

- Imports do domínio usam paths relativos (`../entities/Subscriber`)
- Nunca importar `typeorm`, `stripe`, `telegraf` dentro de `src/domain/`
- Nunca importar `src/infrastructure/` dentro de `src/domain/` ou `src/application/`
