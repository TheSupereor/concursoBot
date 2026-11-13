# ADR 001 — telegramId como chave primária de subscribers

**Status:** Aceito  
**Data:** inicial do projeto

## Contexto

Ao modelar a entidade `Subscriber`, era necessário escolher uma chave primária.
As opções eram:

1. **ID auto-increment** (padrão relacional tradicional)
2. **UUID** gerado pelo sistema
3. **telegramId** (identificador externo fornecido pelo Telegram)

O sistema identifica usuários exclusivamente pelo `telegramId` em todos os fluxos:
- Comandos do bot: `ctx.from.id`
- Linkagem com Stripe: `client_reference_id` e `metadata.telegramId`
- Consulta de subscribers: `searchByTelegramId(telegramId)`
- Registro de logs de notificação: coluna `telegramId`

## Decisão

Usar `telegramId` (string) como `@PrimaryColumn` em `SubscriberOrmEntity`.

## Consequências

**Positivas:**
- Elimina a necessidade de uma coluna `telegramId` extra com unique constraint
- Lookups por telegramId são diretos (PK lookup = mais eficiente)
- Simplifica a linkagem Stripe ↔ Subscriber: não é necessário mapear IDs internos
- O modelo de domínio `Subscriber` é construído diretamente com o identificador real

**Negativas / Atenções:**
- telegramId é um identificador externo — se o Telegram mudar a geração de IDs
  (improvável mas possível), pode quebrar a chave primária
- String como PK é levemente menos eficiente que integer em índices MySQL —
  aceitável dado o volume esperado
- Ao criar um `Subscriber`, o telegramId já deve ser conhecido (não pode ser gerado
  internamente) — isso é adequado pois o usuário sempre inicia a interação

## Impacto no código

- `SubscriberOrmEntity`: `@PrimaryColumn() telegramId: string`
- `Subscriber` (domínio): construtor recebe `telegramId` como primeiro argumento
- `notification_logs`: coluna `telegramId` (string, não FK com cascata)
- Stripe: `client_reference_id = telegramId` no checkout; `metadata.telegramId` na assinatura

## Revisão

Não é necessária revisão a menos que o volume de subscribers exija otimização de
índices em tabelas relacionadas. Nesse caso, avaliar migração para UUID com índice
único em telegramId.
