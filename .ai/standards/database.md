# Padrões de Banco de Dados

## Tecnologia

TypeORM + MySQL 2. Configuração em `app.module.ts` via `TypeOrmModule.forRootAsync`.

## ORM Entities vs Domain Entities

São arquivos distintos com responsabilidades distintas:

| Arquivo | Propósito | Importa TypeORM? |
|---|---|---|
| `SubscriberOrmEntity.ts` | Mapeamento de tabela | Sim |
| `Subscriber.ts` | Regras de negócio | Não |
| `PreferenceOrmEntity.ts` | Mapeamento de tabela | Sim |
| `Preference.ts` | Value Object | Não |

ORM entities ficam em `src/domain/entities/` por conveniência de localização,
mas não são usadas fora dos adapters de repositório.

## Tabelas

**subscribers**
- `telegramId` (string, PK) — identificador externo, não auto-increment
- `isActive` (TINYINT/boolean)
- Relacionamento 1:N com `preferences` (cascade: true)

**preferences**
- `id` (int, auto-increment, PK)
- `area` (string)
- `region` (string)
- `minimunSalary` (decimal 10,2) — typo preservado do código original
- FK para `subscribers`

**notification_logs**
- `id` (int, auto-increment, PK)
- `telegramId` (string)
- `vacancyId` (string)
- `sentDate` (date, auto-created)
- Unique constraint: (`telegramId`, `vacancyId`) — garante idempotência

## Mapeamento nos repositórios

Os adapters (MysqlSubscriberRepository) são responsáveis por converter:
- ORM Entity → Domain Entity (ao buscar)
- Domain Entity → ORM Entity (ao persistir)

Nunca expor ORM entities fora da camada de infraestrutura.

## Convenções

- Salário como `decimal(10,2)` — nunca `float` (evita erros de arredondamento)
- `synchronize: true` apenas em desenvolvimento — desabilitar em produção e usar migrations
- Buscar relacionamentos com `relations: ['preferences']` quando necessário
