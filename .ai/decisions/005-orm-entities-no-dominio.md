# ADR 005 — ORM entities dentro de src/domain/entities/

**Status:** Aceito — exceção documentada  
**Data:** inicial do projeto

## Contexto

Na arquitetura hexagonal estrita, nada da infraestrutura (TypeORM incluído) deveria
estar dentro de `src/domain/`. As ORM entities (`SubscriberOrmEntity`,
`PreferenceOrmEntity`, `NotificationLogOrmEntity`) usam decorators do TypeORM e
portanto são acopladas à infraestrutura.

O local "correto" na hexagonal seria `src/infrastructure/database/entities/`.

## Decisão

Manter as ORM entities em `src/domain/entities/` por colocalização com as
entidades de domínio correspondentes — facilitando a comparação e manutenção.

## Condições para que essa exceção seja aceitável

A exceção só é segura se **duas regras forem respeitadas simultaneamente:**

1. **As entidades de domínio NÃO importam as ORM entities.**
   - `Subscriber.ts` não conhece `SubscriberOrmEntity.ts`
   - `Preference.ts` não conhece `PreferenceOrmEntity.ts`

2. **As ORM entities NÃO contêm lógica de negócio.**
   - São apenas mapeamentos de colunas e relacionamentos
   - Nenhuma regra de domínio vive nelas

Se qualquer uma dessas condições for violada, as ORM entities devem ser movidas
para `src/infrastructure/database/entities/`.

## Consequências

**Positivas:**
- `Subscriber.ts` e `SubscriberOrmEntity.ts` ficam no mesmo diretório,
  facilitando ver a correspondência entre os dois modelos
- Menos diretórios para navegar ao trabalhar com a mesma entidade

**Negativas / Atenções:**
- Cria aparência de violação da arquitetura para quem lê o código pela primeira vez
- Exige disciplina para não deixar lógica vazar para as ORM entities
- Ferramentas de lint arquitetural podem sinalizar isso como violação (falso positivo)

## Como identificar se a exceção foi violada

```bash
# Verificar se Subscriber.ts importa OrmEntity
grep -r "OrmEntity" src/domain/entities/Subscriber.ts

# Verificar se alguma ORM entity tem métodos além de getters simples
grep -r "method\|function\|hasInterest\|activate\|cancel" src/domain/entities/SubscriberOrmEntity.ts
```

Se algum desses retornar resultado, a exceção foi violada e deve ser corrigida.
