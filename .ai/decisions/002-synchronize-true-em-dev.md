# ADR 002 — synchronize: true apenas em desenvolvimento

**Status:** Aceito — revisão pendente para produção  
**Data:** inicial do projeto

## Contexto

TypeORM oferece a opção `synchronize: true` que compara as entidades definidas
em código com o schema do banco e aplica as diferenças automaticamente ao iniciar
a aplicação.

Isso elimina a necessidade de criar migrations durante o desenvolvimento,
acelerando iterações na modelagem de dados.

## Decisão

Manter `synchronize: true` durante o desenvolvimento. **Desabilitar antes de ir
para produção** e migrar para migrations TypeORM explícitas.

## Por que é perigoso em produção

`synchronize: true` em produção pode:
- **Apagar colunas** que existem no banco mas foram removidas da entidade em código
- **Modificar tipos de coluna** causando perda de dados ou erros de conversão
- **Aplicar mudanças não revisadas** imediatamente ao subir a aplicação
- Não há rollback automático — uma migração errada aplicada assim é irreversível

## Quando fazer a mudança

Antes do primeiro deploy em produção ou ao conectar a um banco com dados reais.

## Como fazer a mudança

1. Desabilitar no `app.module.ts`:
```typescript
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    // ...
    synchronize: false, // ← alterar aqui
    migrations: ['dist/migrations/*.js'],
    migrationsRun: true,
  }),
})
```

2. Gerar migration do estado atual:
```bash
npx typeorm migration:generate src/migrations/InitialSchema -d src/data-source.ts
```

3. Criar `src/data-source.ts` para o CLI do TypeORM:
```typescript
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  // ... mesma config do app.module.ts
  entities: ['src/**/*.orm-entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
```

4. Executar migrations no deploy:
```bash
npx typeorm migration:run -d dist/data-source.js
```

## Impacto no código atual

O arquivo `app.module.ts` tem `synchronize: true` — esta é a única mudança
necessária para desabilitar. O schema atual é gerado automaticamente pelas
entidades `SubscriberOrmEntity`, `PreferenceOrmEntity` e `NotificationLogOrmEntity`.

## Atenção ao typo preservado

A coluna `minimunSalary` em `PreferenceOrmEntity` tem um typo intencional
(deveria ser `minimumSalary`). **Não corrigir sem criar uma migration explícita**
que renomeie a coluna — `synchronize: true` não renomeia colunas, apenas adiciona
novas, então ao desabilitar o synchronize essa coluna ficará com o nome original.
