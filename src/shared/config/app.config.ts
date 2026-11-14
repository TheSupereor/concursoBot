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
  readonly stripe: {
    readonly secretKey: string;
    readonly priceId: string;
    readonly webhookSecret: string;
    readonly successUrl: string;
    readonly cancelUrl: string;
  };
}

const DEV_RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';

const required = (name: string) =>
  z.string({ error: `${name} is required` }).min(1, `${name} is required`);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_USERNAME: required('DB_USERNAME'),
    DB_PASSWORD: required('DB_PASSWORD'),
    DB_DATABASE: required('DB_DATABASE'),

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
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

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

/**
 * Validates the environment once, at startup, and returns a typed config. It fails fast with
 * every problem listed, naming variables but never printing their values (they may be secrets).
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
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
    stripe: {
      secretKey: e.STRIPE_SECRET_KEY,
      priceId: e.STRIPE_PRICE_ID,
      webhookSecret: e.STRIPE_WEBHOOK_SECRET,
      successUrl: e.STRIPE_SUCCESS_URL ?? 'https://seusite.com/sucesso',
      cancelUrl: e.STRIPE_CANCEL_URL ?? 'https://seusite.com/cancelado',
    },
  };
}
