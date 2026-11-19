import { loadConfig, loadDatabaseConfig } from './app.config';

const validEnv = (): NodeJS.ProcessEnv => ({
  DB_USERNAME: 'user',
  DB_PASSWORD: 'secret-db-password',
  DB_DATABASE: 'concursos',
  TELEGRAM_BOT_TOKEN: '123:telegram-token',
  STRIPE_SECRET_KEY: 'sk_test_key',
  STRIPE_PRICE_ID: 'price_1',
  STRIPE_WEBHOOK_SECRET: 'whsec_1',
});

describe('loadConfig', () => {
  it('builds a typed config and applies development defaults', () => {
    const config = loadConfig(validEnv());

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.database).toEqual({
      host: 'localhost',
      port: 3306,
      username: 'user',
      password: 'secret-db-password',
      database: 'concursos',
    });
    expect(config.rabbitmq.queue).toBe('concursos.new');
    expect(config.rabbitmq.url).toBe('amqp://guest:guest@localhost:5672');
    expect(config.telegram.botToken).toBe('123:telegram-token');
    expect(config.stripe.priceId).toBe('price_1');
  });

  it('coerces numeric variables from strings', () => {
    const config = loadConfig({ ...validEnv(), PORT: '8080', DB_PORT: '3307' });

    expect(config.port).toBe(8080);
    expect(config.database.port).toBe(3307);
  });

  it('fails fast listing every missing variable, without echoing values', () => {
    const env = validEnv();
    delete env.TELEGRAM_BOT_TOKEN;
    delete env.STRIPE_SECRET_KEY;

    let message = '';
    try {
      loadConfig(env);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('TELEGRAM_BOT_TOKEN');
    expect(message).toContain('STRIPE_SECRET_KEY');
    expect(message).not.toContain('secret-db-password');
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ ...validEnv(), PORT: 'abc' })).toThrow('PORT');
  });

  describe('production', () => {
    const productionEnv = (): NodeJS.ProcessEnv => ({
      ...validEnv(),
      NODE_ENV: 'production',
      RABBITMQ_URL: 'amqp://app:strong@rabbit.internal:5672',
      STRIPE_SUCCESS_URL: 'https://example.com/ok',
      STRIPE_CANCEL_URL: 'https://example.com/cancel',
    });

    it('accepts a complete production environment', () => {
      expect(loadConfig(productionEnv()).nodeEnv).toBe('production');
    });

    it('requires explicit RabbitMQ and Stripe redirect settings', () => {
      const env = productionEnv();
      delete env.RABBITMQ_URL;
      delete env.STRIPE_SUCCESS_URL;

      expect(() => loadConfig(env)).toThrow(
        /RABBITMQ_URL.*STRIPE_SUCCESS_URL/s,
      );
    });

    it('refuses the default guest RabbitMQ credentials', () => {
      expect(() =>
        loadConfig({
          ...productionEnv(),
          RABBITMQ_URL: 'amqp://guest:guest@rabbit:5672',
        }),
      ).toThrow('guest');
    });
  });
});

describe('loadDatabaseConfig', () => {
  it('needs only the database variables (the migration CLI has no Stripe or Telegram keys)', () => {
    expect(
      loadDatabaseConfig({
        DB_USERNAME: 'user',
        DB_PASSWORD: 'secret-db-password',
        DB_DATABASE: 'concursos',
      }),
    ).toEqual({
      host: 'localhost',
      port: 3306,
      username: 'user',
      password: 'secret-db-password',
      database: 'concursos',
    });
  });

  it('fails fast naming the missing variables, without echoing values', () => {
    let message = '';
    try {
      loadDatabaseConfig({ DB_PASSWORD: 'secret-db-password' });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('DB_USERNAME');
    expect(message).toContain('DB_DATABASE');
    expect(message).not.toContain('secret-db-password');
  });
});
