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

describe('scraper configuration', () => {
  const base = (): NodeJS.ProcessEnv => ({
    DB_USERNAME: 'user',
    DB_PASSWORD: 'secret-db-password',
    DB_DATABASE: 'concursos',
    TELEGRAM_BOT_TOKEN: '123:telegram-token',
    STRIPE_SECRET_KEY: 'sk_test_key',
    STRIPE_PRICE_ID: 'price_1',
    STRIPE_WEBHOOK_SECRET: 'whsec_1',
  });
  const production = (): NodeJS.ProcessEnv => ({
    ...base(),
    NODE_ENV: 'production',
    RABBITMQ_URL: 'amqp://app:strong@rabbit.internal:5672',
    STRIPE_SUCCESS_URL: 'https://example.com/ok',
    STRIPE_CANCEL_URL: 'https://example.com/cancel',
  });

  it('enables every source and polite defaults in development', () => {
    expect(loadConfig(base()).scraper).toEqual({
      enabledSources: ['pci-concursos', 'cebraspe'],
      intervalMinutes: 60,
      runOnStart: false,
      userAgent:
        'RadarConcursosBot/1.0 (+https://github.com/TheSupereor/concursoBot)',
      pci: { baseUrl: 'https://www.pciconcursos.com.br', pageDelayMs: 2000 },
      cebraspe: {
        apiUrl: 'https://apis.cebraspe.org.br/cebraspe',
        siteUrl: 'https://www.cebraspe.org.br',
        requestDelayMs: 1000,
      },
    });
  });

  it('enables no source in production unless one is chosen on purpose', () => {
    expect(loadConfig(production()).scraper.enabledSources).toEqual([]);
  });

  it('accepts an explicit list of sources, in production too', () => {
    const config = loadConfig({
      ...production(),
      SCRAPER_ENABLED_SOURCES: 'pci-concursos',
    });

    expect(config.scraper.enabledSources).toEqual(['pci-concursos']);
  });

  it('treats an empty list as "scrape nothing"', () => {
    expect(
      loadConfig({ ...base(), SCRAPER_ENABLED_SOURCES: '' }).scraper
        .enabledSources,
    ).toEqual([]);
  });

  it('ignores spaces and empty entries in the list', () => {
    expect(
      loadConfig({ ...base(), SCRAPER_ENABLED_SOURCES: ' pci-concursos , ' })
        .scraper.enabledSources,
    ).toEqual(['pci-concursos']);
  });

  it('rejects a source that does not exist, naming the variable', () => {
    expect(() =>
      loadConfig({ ...base(), SCRAPER_ENABLED_SOURCES: 'pci-concursos,nope' }),
    ).toThrow(/SCRAPER_ENABLED_SOURCES.*nope/s);
  });

  it('reads the interval, the start-up run and the PCI settings', () => {
    const config = loadConfig({
      ...base(),
      SCRAPER_INTERVAL_MINUTES: '15',
      SCRAPER_RUN_ON_START: 'true',
      PCI_BASE_URL: 'http://localhost:9998',
      PCI_PAGE_DELAY_MS: '0',
      SCRAPER_USER_AGENT: 'MyBot/2.0',
    });

    expect(config.scraper).toMatchObject({
      intervalMinutes: 15,
      runOnStart: true,
      userAgent: 'MyBot/2.0',
      pci: { baseUrl: 'http://localhost:9998', pageDelayMs: 0 },
    });
  });

  it('reads the Cebraspe settings', () => {
    const config = loadConfig({
      ...base(),
      CEBRASPE_API_URL: 'http://localhost:9997/cebraspe',
      CEBRASPE_SITE_URL: 'http://localhost:9997',
      CEBRASPE_REQUEST_DELAY_MS: '0',
    });

    expect(config.scraper.cebraspe).toEqual({
      apiUrl: 'http://localhost:9997/cebraspe',
      siteUrl: 'http://localhost:9997',
      requestDelayMs: 0,
    });
  });

  it('accepts a fractional interval outside production (used to test quickly)', () => {
    expect(
      loadConfig({ ...base(), SCRAPER_INTERVAL_MINUTES: '0.1' }).scraper
        .intervalMinutes,
    ).toBe(0.1);
  });

  it('requires at least 15 minutes between runs in production, to stay gentle with the sites', () => {
    expect(() =>
      loadConfig({ ...production(), SCRAPER_INTERVAL_MINUTES: '5' }),
    ).toThrow(/SCRAPER_INTERVAL_MINUTES.*15/s);
    expect(
      loadConfig({ ...production(), SCRAPER_INTERVAL_MINUTES: '15' }).scraper
        .intervalMinutes,
    ).toBe(15);
  });

  it.each(['0', '-5', 'often'])('rejects the interval %p', (value) => {
    expect(() =>
      loadConfig({ ...base(), SCRAPER_INTERVAL_MINUTES: value }),
    ).toThrow('SCRAPER_INTERVAL_MINUTES');
  });

  it('rejects a start-up flag that is not true or false', () => {
    expect(() =>
      loadConfig({ ...base(), SCRAPER_RUN_ON_START: 'yes' }),
    ).toThrow('SCRAPER_RUN_ON_START');
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
