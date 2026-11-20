import { z } from 'zod';

export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly port: number;
  readonly database: {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: string;
    readonly database: string;
  };
  readonly rabbitmq: {
    readonly url: string;
    readonly queue: string;
    readonly managementUrl: string;
    readonly user: string;
    readonly password: string;
  };
  readonly telegram: {
    readonly botToken: string;
    /** Override of the Bot API base URL; used to point tests at a fake Telegram server. */
    readonly apiRoot?: string;
    /** Chat that receives operational alerts such as dead-letter queue growth. */
    readonly adminId?: string;
  };
  readonly scraper: {
    /** Vacancy sources to read. None are enabled by default in production. */
    readonly enabledSources: readonly string[];
    readonly intervalMinutes: number;
    /** Run one ingestion right after start-up instead of waiting for the first interval. */
    readonly runOnStart: boolean;
    /** Sent on every request so the sites can see who is reading them and why. */
    readonly userAgent: string;
    readonly pci: {
      readonly baseUrl: string;
      /** Pause between two pages of the same site. */
      readonly pageDelayMs: number;
    };
  };
  readonly stripe: {
    readonly secretKey: string;
    readonly priceId: string;
    readonly webhookSecret: string;
    readonly successUrl: string;
    readonly cancelUrl: string;
  };
}

const DEV_RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';

/** Vacancy sources the application knows how to read. */
export const KNOWN_VACANCY_SOURCES = ['pci-concursos'] as const;

/** Shortest interval between two scraping runs in production. */
const MIN_PRODUCTION_INTERVAL_MINUTES = 15;

const DEFAULT_USER_AGENT =
  'RadarConcursosBot/1.0 (+https://github.com/TheSupereor/concursoBot)';

const parseSourceList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const required = (name: string) =>
  z.string({ error: `${name} is required` }).min(1, `${name} is required`);

/** Database variables, also used on their own by the migration CLI. */
const databaseEnvSchema = z.object({
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USERNAME: required('DB_USERNAME'),
  DB_PASSWORD: required('DB_PASSWORD'),
  DB_DATABASE: required('DB_DATABASE'),
});

const envSchema = databaseEnvSchema
  .extend({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    RABBITMQ_URL: z.string().min(1).optional(),
    RABBITMQ_QUEUE: z.string().min(1).default('concursos.new'),
    RABBITMQ_MANAGEMENT_URL: z
      .string()
      .min(1)
      .default('http://localhost:15672'),
    RABBITMQ_USER: z.string().min(1).default('guest'),
    RABBITMQ_PASSWORD: z.string().min(1).default('guest'),

    TELEGRAM_BOT_TOKEN: required('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_API_ROOT: z.string().min(1).optional(),
    ADMIN_TELEGRAM_ID: z.string().min(1).optional(),

    STRIPE_SECRET_KEY: required('STRIPE_SECRET_KEY'),
    STRIPE_PRICE_ID: required('STRIPE_PRICE_ID'),
    STRIPE_WEBHOOK_SECRET: required('STRIPE_WEBHOOK_SECRET'),
    STRIPE_SUCCESS_URL: z.string().min(1).optional(),
    STRIPE_CANCEL_URL: z.string().min(1).optional(),

    SCRAPER_ENABLED_SOURCES: z.string().optional(),
    SCRAPER_INTERVAL_MINUTES: z.coerce.number().positive().default(60),
    SCRAPER_RUN_ON_START: z.enum(['true', 'false']).default('false'),
    SCRAPER_USER_AGENT: z.string().min(1).default(DEFAULT_USER_AGENT),
    PCI_BASE_URL: z.string().min(1).default('https://www.pciconcursos.com.br'),
    PCI_PAGE_DELAY_MS: z.coerce.number().int().min(0).default(2000),
  })
  .superRefine((env, ctx) => {
    const unknown = parseSourceList(env.SCRAPER_ENABLED_SOURCES ?? '').filter(
      (source) =>
        !(KNOWN_VACANCY_SOURCES as readonly string[]).includes(source),
    );
    if (unknown.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['SCRAPER_ENABLED_SOURCES'],
        message: `unknown source(s): ${unknown.join(', ')} (known: ${KNOWN_VACANCY_SOURCES.join(', ')})`,
      });
    }

    if (env.NODE_ENV !== 'production') return;

    if (env.SCRAPER_INTERVAL_MINUTES < MIN_PRODUCTION_INTERVAL_MINUTES) {
      ctx.addIssue({
        code: 'custom',
        path: ['SCRAPER_INTERVAL_MINUTES'],
        message: `must be at least ${MIN_PRODUCTION_INTERVAL_MINUTES} minutes in production, to stay gentle with the sites`,
      });
    }

    // Production must be explicit: no development defaults for anything security-relevant.
    const mustBeSet = [
      'RABBITMQ_URL',
      'STRIPE_SUCCESS_URL',
      'STRIPE_CANCEL_URL',
    ] as const;
    for (const name of mustBeSet) {
      if (!env[name]) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} is required in production`,
        });
      }
    }

    if (env.RABBITMQ_URL?.includes('guest:guest@')) {
      ctx.addIssue({
        code: 'custom',
        path: ['RABBITMQ_URL'],
        message:
          'RABBITMQ_URL must not use the default guest credentials in production',
      });
    }
  });

function formatProblems(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
}

export type DatabaseConfig = AppConfig['database'];

/**
 * Validates only the database variables. Used by the TypeORM CLI (migrations), which runs
 * without the Telegram and Stripe settings.
 */
export function loadDatabaseConfig(env: NodeJS.ProcessEnv): DatabaseConfig {
  const parsed = databaseEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid database configuration:\n${formatProblems(parsed.error)}`,
    );
  }
  const e = parsed.data;
  return {
    host: e.DB_HOST,
    port: e.DB_PORT,
    username: e.DB_USERNAME,
    password: e.DB_PASSWORD,
    database: e.DB_DATABASE,
  };
}

/**
 * Validates the environment once, at startup, and returns a typed config. It fails fast with
 * every problem listed, naming variables but never printing their values (they may be secrets).
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatProblems(parsed.error)}`,
    );
  }

  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    database: {
      host: e.DB_HOST,
      port: e.DB_PORT,
      username: e.DB_USERNAME,
      password: e.DB_PASSWORD,
      database: e.DB_DATABASE,
    },
    rabbitmq: {
      url: e.RABBITMQ_URL ?? DEV_RABBITMQ_URL,
      queue: e.RABBITMQ_QUEUE,
      managementUrl: e.RABBITMQ_MANAGEMENT_URL,
      user: e.RABBITMQ_USER,
      password: e.RABBITMQ_PASSWORD,
    },
    telegram: {
      botToken: e.TELEGRAM_BOT_TOKEN,
      apiRoot: e.TELEGRAM_API_ROOT,
      adminId: e.ADMIN_TELEGRAM_ID,
    },
    scraper: {
      // Reading a third-party site is a choice, not a default: in production nothing is
      // enabled until an operator lists the sources on purpose.
      enabledSources:
        e.SCRAPER_ENABLED_SOURCES === undefined
          ? e.NODE_ENV === 'production'
            ? []
            : [...KNOWN_VACANCY_SOURCES]
          : parseSourceList(e.SCRAPER_ENABLED_SOURCES),
      intervalMinutes: e.SCRAPER_INTERVAL_MINUTES,
      runOnStart: e.SCRAPER_RUN_ON_START === 'true',
      userAgent: e.SCRAPER_USER_AGENT,
      pci: { baseUrl: e.PCI_BASE_URL, pageDelayMs: e.PCI_PAGE_DELAY_MS },
    },
    stripe: {
      secretKey: e.STRIPE_SECRET_KEY,
      priceId: e.STRIPE_PRICE_ID,
      webhookSecret: e.STRIPE_WEBHOOK_SECRET,
      successUrl: e.STRIPE_SUCCESS_URL ?? 'https://seusite.com/sucesso',
      cancelUrl: e.STRIPE_CANCEL_URL ?? 'https://seusite.com/cancelado',
    },
  };
}
