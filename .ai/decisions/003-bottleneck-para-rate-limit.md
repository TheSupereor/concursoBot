# ADR 003 — Bottleneck para rate limiting do Telegram

**Status:** Aceito  
**Data:** inicial do projeto

## Contexto

A API do Telegram impõe limites de envio:
- Máximo de ~30 mensagens por segundo para o mesmo bot
- Limites mais restritivos para o mesmo chat (~1 msg/segundo)

O sistema pode precisar notificar dezenas ou centenas de assinantes quando uma
nova vaga chega. Sem controle de taxa, o Telegram retorna `HTTP 429 Too Many Requests`
e mensagens são perdidas.

As alternativas consideradas foram:
1. **Sleep manual** entre chamadas (`setTimeout`)
2. **Fila interna** com setInterval
3. **Bottleneck** — biblioteca especializada em rate limiting e concorrência

## Decisão

Usar a biblioteca `bottleneck` com configuração:
```typescript
new Bottleneck({ minTime: 35, maxConcurrent: 1 })
```

Toda chamada à API do Telegram passa por `limiter.schedule()`.

## Por que Bottleneck em vez de sleep manual

Sleep manual (`await new Promise(r => setTimeout(r, 35))`) funciona para casos
simples mas tem problemas sérios em produção:

- **Não é thread-safe**: duas execuções paralelas do use case podem fazer chamadas
  simultâneas sem que o sleep do primeiro afete o segundo
- **Bloqueia o event loop**: sleep atrasa todo o processamento, não só o Telegram
- **Sem controle de concorrência**: não impede múltiplas chamadas simultâneas
- **Sem enfileiramento**: se chamadas chegam mais rápido que o sleep, elas se acumulam
  sem ordem

Bottleneck enfileira automaticamente, garante o intervalo mínimo entre chamadas
e limita a concorrência — mesmo com múltiplos contextos executando em paralelo.

## Configuração atual

```typescript
// TelegramNotificationService.ts
private readonly limiter = new Bottleneck({
  minTime: 35,        // 35ms entre chamadas ≈ 28 msgs/seg (abaixo do limite de 30)
  maxConcurrent: 1,   // uma chamada por vez — sem rajadas
});
```

## Consequências

**Positivas:**
- Respeita automaticamente os limites do Telegram mesmo com alto volume
- Enfileira requests sem perda — todos são enviados, só no ritmo certo
- Código de envio não precisa se preocupar com timing

**Negativas / Atenções:**
- Com muitos assinantes, o envio pode demorar: 1000 assinantes × 35ms = ~35 segundos
  por vaga. Isso é aceitável dado o modelo de negócio atual.
- Se o volume crescer muito, considerar sharding por chat ou múltiplos bots.

## Regra derivada

Nunca chamar `axios.post` (ou qualquer cliente HTTP do Telegram) diretamente em
`TelegramNotificationService`. **Sempre** usar `this.limiter.schedule(() => ...)`.
Ver `.ai/standards/anti-patterns.md` para o antipadrão correspondente.
