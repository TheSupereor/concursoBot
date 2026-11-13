# Glossário de Domínio — Radar de Concursos

Termos e conceitos específicos do negócio. Use este glossário ao implementar
qualquer feature para garantir que nomes de variáveis, métodos e mensagens
reflitam a linguagem do domínio.

---

## Subscriber (Assinante)

**O que é:** Um usuário do Telegram que se cadastrou no bot e pode (ou não) ter
uma assinatura ativa.

**Representação no código:** `src/domain/entities/Subscriber.ts`

**Estados:**
- `isActive: true` — assinatura paga e vigente; recebe alertas de vagas
- `isActive: false` — assinatura cancelada, expirada ou nunca ativada; não recebe alertas

**Identificação:** Pelo `telegramId` (string), que é o ID numérico do usuário no
Telegram, representado como string. É a chave primária no banco.

**Atenção:** Um subscriber pode existir com `isActive: false` — isso acontece
quando o usuário executou `/start` mas nunca pagou, ou quando cancelou a assinatura.
Não confundir "subscriber existe" com "subscriber ativo".

---

## Vacancy (Vaga)

**O que é:** Uma vaga de concurso público identificada pelo scraper.

**Representação no código:** `src/domain/entities/Vacancy.ts`

**Propriedades:**
- `id: string` — identificador único da vaga (gerado pelo scraper, ex: hash do título)
- `job: string` — nome do cargo (ex: "Analista de TI", "Professor")
- `area: string` — categoria da vaga (ver lista de Áreas abaixo)
- `region: string` — região geográfica (ver lista de Regiões abaixo)
- `salary: Salary` — remuneração como Value Object

**Origem:** Criada pelo scraper (`pciConcursosScrapper.ts`) e publicada na fila
RabbitMQ `concursos.new`. Nunca persiste no banco — é um objeto de transferência.

---

## Preference (Preferência)

**O que é:** Um critério de filtragem de vagas definido pelo assinante. Combina
área de interesse, região e salário mínimo.

**Representação no código:** `src/domain/value-objects/Preference.ts`

**Propriedades:**
- `area: string` — área de interesse (deve corresponder às áreas disponíveis)
- `region: string` — região de interesse (padrão: `'BR'` para nacional)
- `minimunSalary: Salary` — salário mínimo aceitável (padrão: `Salary(0)`)

**Regras:**
- Um subscriber pode ter no máximo **5 preferências**
- `area` e `region` não podem ser vazios
- O salário mínimo é aplicado por `DefineSalaryUseCase` a **todas** as preferências
  simultaneamente — não é possível ter salários mínimos diferentes por preferência

**Atenção ao typo:** A propriedade e coluna são `minimunSalary` (sem o segundo 'm'),
não `minimumSalary`. Isso é um typo do código original — não corrigir sem migration.

---

## Salary (Salário)

**O que é:** Value Object que representa um valor monetário de remuneração.

**Representação no código:** `src/domain/value-objects/Salary.ts`

**Regras:**
- Valor não pode ser negativo (lança `Error` no construtor)
- `Salary(0)` representa "sem filtro de salário"
- Comparação via `isBiggerThanOrEqual(other: Salary): boolean`

**Unidade:** Reais (BRL). O scraper converte centavos para reais ao criar a `Vacancy`.

---

## Áreas disponíveis

As áreas são strings que identificam categorias de vagas. O scraper detecta a área
pelo conteúdo do título da vaga. As que aparecem no código atual:

| Valor | Descrição |
|---|---|
| `'TI'` | Tecnologia da Informação |
| (outras áreas) | A serem expandidas conforme o scraper evoluir |

Ao adicionar novos botões de área no bot (`/areas`), os valores devem coincidir
com os que o scraper atribui a `vacancy.area`.

---

## Regiões disponíveis

Regiões são strings que identificam abrangência geográfica das vagas.

| Valor | Descrição |
|---|---|
| `'BR'` | Nacional (qualquer estado) |
| `'SP'` | São Paulo |
| `'RJ'` | Rio de Janeiro |
| `'MG'` | Minas Gerais |
| `'RS'` | Rio Grande do Sul |
| `'AC'` | Acre |
| (demais UFs) | Siglas padrão IBGE |

**Padrão ao cadastrar preferência:** região `'BR'` (nacional). O usuário não
escolhe região ainda — todos os `add_area_*` callbacks criam preferência com `region: 'BR'`.

---

## Notification Log (Log de Notificação)

**O que é:** Registro de que uma vaga específica foi enviada a um assinante
específico. Garante idempotência — a mesma vaga nunca é enviada duas vezes
para o mesmo usuário.

**Representação no código:** `src/domain/entities/NotificationLogOrmEntity.ts`

**Chave de idempotência:** Par `(telegramId, vacancyId)` — unique constraint no banco.

**Quando é criado:** Após envio bem-sucedido pelo `TelegramNotificationService`.

**Quando é consultado:** Antes de cada envio em `NotifySubscriberUseCase`.

---

## hasInterest (Tem Interesse)

**O que é:** A regra de negócio central do sistema. Determina se um assinante
deve receber uma vaga específica.

**Localização:** Método `subscriber.hasInterest(vacancy: Vacancy): boolean`
em `src/domain/entities/Subscriber.ts`.

**Lógica:** Para cada preferência do assinante:
- A área da vaga deve corresponder à área da preferência (AND)
- O salário da vaga deve ser >= salário mínimo da preferência (AND)
- A região é considerada (AND)

Se **qualquer** preferência satisfizer todos os critérios → retorna `true` (OR entre preferências).

**Regra arquitetural:** Esta lógica **pertence à entidade**, não ao use case.
Se `NotifySubscriberUseCase` contiver qualquer lógica de filtragem de vaga, é uma violação.

---

## Active Subscriber (Assinante Ativo)

**Definição técnica:** `subscriber.isActive === true`

**Quando fica ativo:** Após pagamento aprovado (`checkout.session.completed`)
processado por `ProcessApprovedPaymentUseCase`.

**Quando fica inativo:** Após cancelamento (`customer.subscription.deleted`)
processado por `CancelSubscriptionUseCase`.

**Impacto:** Somente assinantes ativos são retornados por
`searchActiveSubscribers()` e recebem notificações.
