# Spec-Driven Development (SDD) para Projetos com IA

Este documento explica o processo de preparar um projeto para ser trabalhado por
agentes de IA (Claude Code, Cursor, Codex, GPT Agents etc.) de forma consistente,
segura e alinhada com a arquitetura. Use como guia ao iniciar esse processo em um
novo projeto.

---

## O que é SDD nesse contexto

Spec-Driven Development aqui não é sobre escrever specs antes do código — é sobre
criar uma camada de documentação estruturada que serve como **memória persistente
e contrato de comportamento** para agentes de IA.

O problema que SDD resolve: sem essa camada, cada sessão com um agente começa do
zero. O agente não sabe que você usa arquitetura hexagonal, que o domínio não pode
importar TypeORM, ou que o Telegram tem rate limit de 35ms. Ele infere o que pode
pelo código e comete os mesmos erros repetidamente.

Com SDD, o agente entra em qualquer sessão com contexto suficiente para trabalhar
de forma consistente — mesmo que o desenvolvedor humano não esteja presente para
corrigir cada detalhe.

---

## A estrutura base

```
projeto/
├── CLAUDE.md              ← ponto de entrada obrigatório
└── .ai/
    ├── architecture/      ← decisões estruturais do sistema
    ├── standards/         ← regras de código que o agente deve seguir
    ├── features/          ← specs de comportamento por domínio
    ├── skills/            ← playbooks procedurais para tarefas recorrentes
    ├── evaluations/       ← critérios de aceite por feature
    └── progress/          ← estado atual do projeto
```

Cada pasta tem uma responsabilidade distinta. A confusão entre elas é o erro mais
comum.

---

## CLAUDE.md — o contrato principal

### O que é

O CLAUDE.md é o único arquivo garantido de ser lido em toda sessão. É o ponto de
entrada. Se o agente lê apenas um arquivo, é esse.

### O que deve conter

1. **Visão geral do sistema** — o que o projeto faz, em 3-5 linhas
2. **Stack e arquitetura** — tecnologias principais e padrão arquitetural
3. **Princípios inegociáveis** — as 3-5 regras que nunca podem ser violadas
4. **Fluxos principais** — os caminhos felizes mais importantes do sistema
5. **Checklist pré-entrega** — o que verificar antes de considerar uma tarefa concluída
6. **Como navegar o .ai/** — instrução explícita de qual pasta consultar em qual situação

### O que NÃO deve conter

- Detalhes de implementação (ficam em `.ai/architecture/`)
- Tutoriais ou onboarding de tecnologias
- Histórico de decisões ou changelog
- Conteúdo que muda frequentemente (ficam em `.ai/progress/`)

### Erro mais comum

Criar o CLAUDE.md mas deixá-lo vazio ou com apenas 1-2 linhas. Um CLAUDE.md vazio
é pior do que não ter nenhum — cria a falsa impressão de que o contexto está
documentado.

### Regra de ouro

Se um novo desenvolvedor humano conseguir entender o sistema lendo só o CLAUDE.md
em 5 minutos, ele está bom. Se não conseguir, está incompleto.

---

## .ai/architecture/ — decisões estruturais

### O que é

Documentação de *como* o sistema foi construído e *por que* foi construído assim.
Cada arquivo responde à pergunta: "como essa parte do sistema funciona?"

### Arquivos típicos

| Arquivo | Conteúdo |
|---|---|
| `overview.md` | Visão macro das camadas e dependências |
| `hexagonal.md` | Mapa de ports, adapters, use cases e suas localizações |
| `messaging.md` | Filas, retry, DLQ, padrões de consumidor |
| `billing.md` | Fluxo de pagamento end-to-end |
| `{integracao}.md` | Qualquer integração externa com fluxo não-trivial |

### O que cada arquivo deve conter

- **Fluxo em texto ou diagrama** — não só conceitos, mas o caminho real dos dados
- **Nomes de arquivos reais** — `src/infrastructure/telegram/TelegramBotUpdate.ts`,
  não "o controller do Telegram"
- **Decisões críticas** — o que é proibido e por quê
- **Variáveis de ambiente** — quais são necessárias para essa parte funcionar

### Erro mais comum

Documentar o que *deveria* ser, não o que *é*. Se o código tem stubs não
implementados, documente isso. Agentes que encontram discrepância entre docs e código
perdem o contexto e tomam decisões erradas.

---

## .ai/standards/ — regras de código

### O que é

As convenções que devem ser seguidas em *todo* o código novo. Diferente de
`architecture/`, que descreve o sistema, `standards/` prescreve comportamento
do agente ao escrever código.

### Arquivos típicos

| Arquivo | Conteúdo |
|---|---|
| `typescript.md` | Tipos, imutabilidade, padrões de VO e entidade |
| `nestjs.md` | DI, módulos, providers, entry points |
| `database.md` | ORM vs domain entities, naming, migrations |
| `testing.md` | O que testar, cobertura mínima, tipo de teste por camada |
| `domain.md` | Regras DDD — o que pode e o que não pode estar no domínio |

### O que cada arquivo deve conter

- **Regra** — afirmação clara do que fazer ou não fazer
- **Exemplo de código** — mostrando o padrão correto com código real do projeto
- **Contraexemplo** (opcional) — o antipadrão que deve ser evitado

### Erro mais comum

Escrever regras abstratas sem exemplos. "Use tipos explícitos sempre que possível"
é ignorado. "Nunca use `any` — use `unknown` quando o tipo for genuinamente
desconhecido, e o exemplo abaixo mostra como" é seguido.

### Regra de ouro

Se a regra não tem exemplo de código do próprio projeto, ela provavelmente não
vai ser seguida consistentemente.

---

## .ai/features/ — specs de comportamento

### O que é

Documentação do *que* o sistema faz do ponto de vista do usuário ou do domínio.
Diferente de `architecture/` (que fala do como), `features/` fala do quê.

### Arquivos típicos

Um arquivo por feature ou domínio funcional do sistema.

### O que cada arquivo deve conter

- **Objetivo** — o problema que a feature resolve
- **Fluxo principal** — passo a passo do caminho feliz
- **Restrições e regras de negócio** — o que não pode acontecer e por quê
- **Status atual** — o que está implementado e o que ainda é TODO
- **Arquivos relevantes** — onde encontrar a implementação

### Por que o status atual importa

Specs sem status descrevem um sistema ideal. O agente pode implementar algo que
"falta" sem saber que é intencional, ou evitar tocar em algo que precisa ser
completado. Documente stubs, funções não implementadas e comportamentos incompletos.

### Erro mais comum

Criar o arquivo da feature mas deixá-lo vazio ou com apenas o objetivo.
Um arquivo vazio com um título convincente é enganoso — o agente assume que
foi documentado e não consulta o código.

---

## .ai/skills/ — playbooks procedurais

### O que é

Receitas passo a passo para tarefas recorrentes. São diferentes de features
(que descrevem comportamento) — skills descrevem *como implementar algo novo*
seguindo os padrões do projeto.

### Quando criar uma skill

Crie uma skill quando a tarefa:
1. Se repete (adicionar novo comando Telegram, novo consumer, nova integração)
2. Envolve múltiplos arquivos em sequência específica
3. Tem decisões não-óbvias que o agente provavelmente erraria

### Estrutura de uma skill

```
.ai/skills/{nome-da-skill}/
└── readme.md
```

O readme deve conter:
1. **Objetivo** — o que a skill produz
2. **Passos numerados** — cada passo com o arquivo a criar/editar
3. **Código de exemplo** — baseado no padrão real do projeto (não genérico)
4. **Checklist de aceite** — o que verificar antes de considerar concluído

### Erro mais comum

Skills sem código de exemplo. Uma skill com apenas texto instrucional é 50% menos
útil — o agente vai inferir o padrão pelo código existente e pode errar. Mostrar
o padrão explicitamente elimina essa incerteza.

### Diferença entre skill e feature

- **Feature**: descreve *o que* o sistema deve fazer
- **Skill**: descreve *como você* deve implementar algo novo no sistema

---

## .ai/evaluations/ — critérios de aceite

### O que é

Checklists que definem "pronto" para cada feature. São executados pelo agente
(ou pelo desenvolvedor) antes de declarar uma tarefa concluída.

### Estrutura de uma avaliação

Organize em categorias:
- **Funcional** — o comportamento esperado acontece?
- **Resiliência** — e quando as coisas falham?
- **Arquitetural** — o código segue os padrões do projeto?
- **Testes** — os testes mínimos estão presentes e passando?
- **Verificação manual** — o que testar manualmente para confirmar

### Por que separar por categoria

Agentes (e humanos) tendem a focar no funcional e ignorar resiliência e arquitetura.
Separar em categorias força a verificação explícita de cada dimensão.

### Erro mais comum

Avaliações genéricas ("testes passando", "sem erros de lint"). Essas são condições
necessárias mas insuficientes. A avaliação deve cobrir as falhas específicas que
*essa feature* pode ter — duplicação de notificações, assinatura HMAC inválida,
limite de preferências não respeitado.

---

## .ai/progress/ — estado atual

### O que é

Um snapshot do estado real do projeto — o que está feito, o que está incompleto,
e o que vem a seguir. Deve ser atualizado após mudanças significativas.

### O que incluir

- Data da última atualização
- Lista do que está implementado e funcional
- Lista do que está como stub/TODO no código
- O que está em andamento
- Próximos passos priorizados

### Por que stubs importam

Stubs são o dado mais valioso do progress. Se `MysqlSubscriberRepository.save()`
existe mas retorna `void` sem implementar nada, o agente que não sabe disso vai
tentar usá-lo e não vai entender por que os dados não persistem.

### Quem atualiza

O CLAUDE.md deve instruir o agente a atualizar o `progress/current.md` após
mudanças significativas. Sem essa instrução explícita, o agente não vai fazer isso.

---

## Ordem de criação recomendada

Não tente criar tudo de uma vez. Uma boa progressão:

**Fase 1 — Fundação (1-2 horas)**
1. CLAUDE.md com visão geral, arquitetura, regras críticas e checklist
2. `architecture/overview.md` ou `architecture/hexagonal.md` com o mapa real
3. `progress/current.md` com estado atual

**Fase 2 — Padrões (1 hora)**
4. `standards/` para as 2-3 regras mais frequentemente violadas no projeto
5. `features/` para a feature principal ou a mais complexa

**Fase 3 — Playbooks (conforme necessário)**
6. `skills/` para a primeira tarefa recorrente que aparecer
7. `evaluations/` para as features com maior risco de regressão

---

## Sinais de que o SDD está funcionando

- O agente propõe implementações no lugar certo sem precisar ser corrigido
- O agente menciona a avaliação antes de declarar uma tarefa concluída
- Você não precisa repetir "domínio não importa TypeORM" a cada sessão
- Um agente diferente (nova sessão, nova ferramenta) produz código consistente
  com o estilo do projeto

## Sinais de que o SDD precisa de ajuste

- O agente ignora as regras documentadas
  → provavelmente as regras estão sem exemplos ou enterradas em texto longo
- O agente não sabe qual arquivo consultar
  → o CLAUDE.md não está linkando bem para o `.ai/`
- As avaliações passam mas bugs aparecem
  → as avaliações estão cobrindo o superficial, não os casos de falha reais
- O agente atualiza o código mas não o progress
  → falta instrução explícita no CLAUDE.md sobre quando atualizar

---

## Coisas para ter em mente ao replicar em outro projeto

1. **Comece pelo CLAUDE.md, não pela estrutura de pastas.** A tentação é criar
   todas as pastas primeiro. Mas pastas vazias são inúteis e enganosas. O CLAUDE.md
   com conteúdo real vale mais do que 20 arquivos vazios.

2. **Escreva o conteúdo a partir do código, não da intenção.** Documente o que
   existe, não o que você planeja construir. Specs aspiracionais confundem o agente.

3. **Arquivos vazios são piores do que arquivos ausentes.** Um arquivo vazio com
   um título convincente faz o agente acreditar que leu a documentação quando não
   leu nada. Ou preenche, ou não cria o arquivo.

4. **Todo arquivo de arquitetura deve ter pelo menos um nome de arquivo real.**
   "O repositório acessa o banco" é inútil. "MysqlSubscriberRepository.ts em
   src/infrastructure/database/repositories/" é acionável.

5. **Skills sem código de exemplo têm eficácia reduzida.** O agente vai interpretar
   o texto e provavelmente produzir um padrão levemente diferente do que você usa.
   Mostre o padrão com código real.

6. **Documente os stubs e TODOs explicitamente.** Código incompleto que parece
   completo é a principal causa de bugs silenciosos em sessões com agentes.

7. **O checklist do CLAUDE.md é a última linha de defesa.** Mesmo que o agente
   ignore tudo mais, se o checklist for bom, ele vai verificar os itens críticos
   antes de entregar.

8. **Atualize o progress após cada sessão significativa.** O estado do projeto
   muda. Documentação que não é atualizada se torna desinformação.

9. **Não documente o óbvio.** "Usar TypeScript" ou "instalar dependências com npm"
   não precisam estar no CLAUDE.md. Reserve espaço para o que é específico e
   não-óbvio do seu projeto.

10. **O SDD não substitui bons nomes e código limpo.** É uma camada de contexto,
    não uma compensação por código confuso. Quanto mais expressivo o código, menos
    documentação de implementação você precisa — e mais espaço para documentar
    intenção e restrições.
