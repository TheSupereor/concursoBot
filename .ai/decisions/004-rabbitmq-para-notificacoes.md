# ADR 004 — RabbitMQ em vez de HTTP direto para notificações

**Status:** Aceito  
**Data:** inicial do projeto

## Contexto

Quando uma nova vaga é identificada (pelo scraper), o sistema precisa processar
e notificar os assinantes relevantes. Havia duas abordagens principais:

**Opção A — HTTP direto:**
O scraper chama uma API REST do próprio sistema, que processa e notifica na mesma
requisição (ou dispara tasks internas).

**Opção B — Mensageria assíncrona (RabbitMQ):**
O scraper publica uma mensagem na fila. Um consumidor separado lê e processa
de forma assíncrona e desacoplada.

## Decisão

Usar RabbitMQ com:
- Fila principal: `concursos.new`
- Dead Letter Queue: `concursos.dlq`
- Consumidor: `VacancyConsumer` com retry exponencial

## Por que mensageria em vez de HTTP

**Resiliência:** Se o serviço de notificação estiver indisponível, mensagens ficam
na fila e são processadas quando ele volta. Com HTTP direto, a vaga seria perdida.

**Desacoplamento:** O scraper não precisa saber nada sobre quem processa as vagas.
Novos consumidores (ex: salvar em banco, gerar relatório) podem ser adicionados
sem alterar o scraper.

**Retry nativo:** A combinação fila + DLQ permite tentar múltiplas vezes antes de
desistir, com backoff exponencial. Isso é difícil de implementar corretamente com
HTTP síncrono.

**Volume:** O Telegram tem rate limit. Com mensageria, o consumidor controla o
ritmo de processamento independentemente de quantas vagas chegam ao mesmo tempo.

**Observabilidade:** Mensagens na DLQ são evidência visível de falhas — é possível
inspecionar, reprocessar ou alertar. Com HTTP, falhas silenciosas são mais comuns.

## Consequências

**Positivas:**
- Vagas não são perdidas em caso de falha temporária
- Sistema tolera indisponibilidade parcial
- Scraper e notificador evoluem independentemente

**Negativas / Atenções:**
- Adiciona complexidade operacional: RabbitMQ precisa estar rodando localmente
- Debugging é mais difícil: o fluxo não é linear e visível como uma chamada HTTP
- Mensagens na DLQ precisam de atenção manual ou automação de alertas
- O scraper atualmente **não publica na fila** (stub) — ver `progress/current.md`

## Configuração atual (main.ts)

```typescript
// Fila principal
{ queue: 'concursos.new', queueOptions: { durable: true, arguments: {
  'x-dead-letter-exchange': '',
  'x-dead-letter-routing-key': 'concursos.dlq',
}}}

// DLQ
{ queue: 'concursos.dlq', queueOptions: { durable: true }}
```
