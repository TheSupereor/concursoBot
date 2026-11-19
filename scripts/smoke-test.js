// End-to-end smoke test: the real app process against real MySQL and RabbitMQ, with a fake
// Telegram Bot API server. It walks the whole product flow: /start, paid webhook, preferences
// through button callbacks, vacancy delivery, idempotency and dead-lettering.
//
// Prerequisites (run from the repository root):
//   docker compose up -d mysql rabbitmq && npm run build
//   npm run smoke
const http = require('http');
const path = require('path');
const { spawn, execSync } = require('child_process');
const root = process.cwd();
const amqp = require(path.join(root, 'node_modules', 'amqplib'));
const Stripe = require(path.join(root, 'node_modules', 'stripe'));
const assert = require('assert');

const BOT_PORT = 9999;
const PCI_PORT = 9998;
const APP_PORT = 3100;
const WEBHOOK_SECRET = 'whsec_smoke';
// Isolated resources, so the smoke test never touches data from a manual run.
const SMOKE_DB = 'concursos_smoke';
const SMOKE_QUEUE = 'concursos.smoke.new';
const USER = 111;

const sent = []; // messages the bot sent through the fake Telegram API
let failSends = 0; // fail the next N sendMessage calls with HTTP 500
const calls = [];
let pending = [];
let updateId = 1;
const chat = { id: USER, type: 'private' };
const from = { id: USER, is_bot: false, first_name: 'Tester' };

// ---- fake PCI Concursos: robots.txt and regional listings (same markup as the real site)
const pciRequests = []; // { path, userAgent }
let pciShowsTiVacancy = false; // flipped by the script once the subscriber is ready

const brDate = (daysFromNow) => {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return (
    p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear()
  );
};

const listingItem = ({
  slug,
  org,
  title,
  uf,
  summary,
  roles,
  education,
  deadline,
}) =>
  '<div class="ca"><a href="http://localhost:' +
  PCI_PORT +
  '/noticias/' +
  slug +
  '" title="' +
  title +
  '">' +
  org +
  '</a>' +
  '<div class="cc">' +
  uf +
  '</div>' +
  '<div class="cd">' +
  summary +
  '<br><span>' +
  roles +
  '<br><span>' +
  education +
  '</span></span></div>' +
  '<div class="ce"><span>' +
  deadline +
  '</span></div></div>';

const listingFor = (region) => {
  const items = [
    // generic "Varios Cargos" listing: classified OUTROS, only reaches QUALQUER subscribers
    listingItem({
      slug: 'generic-' + region,
      org: 'Prefeitura Generica ' + region,
      title: 'Prefeitura Generica abre concurso',
      uf: 'SP',
      summary: '10 vagas até R$ 2.000,00',
      roles: 'Vários Cargos',
      education: 'Médio',
      deadline: brDate(30),
    }),
    listingItem({
      slug: 'cancelled-' + region,
      org: 'Prefeitura Cancelada ' + region,
      title: 'Concurso cancelado',
      uf: 'SP',
      summary: '5 vagas até R$ 9.000,00',
      roles: 'Analista de Sistemas',
      education: 'Superior',
      deadline: 'Cancelado',
    }),
    listingItem({
      slug: 'expired-' + region,
      org: 'Prefeitura Encerrada ' + region,
      title: 'Inscricoes encerradas',
      uf: 'SP',
      summary: '5 vagas até R$ 9.000,00',
      roles: 'Analista de Sistemas',
      education: 'Superior',
      deadline: brDate(-1),
    }),
  ];
  if (pciShowsTiVacancy && region === 'sudeste') {
    items.push(
      listingItem({
        slug: 'camara-smoke',
        org: 'Câmara de Exemplo Smoke',
        title: 'Câmara de Exemplo abre vaga para Analista de Sistemas',
        uf: 'MG',
        summary: '2 vagas até R$ 6.500,00',
        roles: 'Analista de Sistemas',
        education: 'Superior',
        deadline: brDate(20),
      }),
    );
  }
  return (
    '<html><body><div class="da">' + items.join('') + '</div></body></html>'
  );
};

const pciSite = http.createServer((req, res) => {
  pciRequests.push({ path: req.url, userAgent: req.headers['user-agent'] });
  if (req.url === '/robots.txt') {
    res.setHeader('content-type', 'text/plain');
    // This bot is not welcome in the centro-oeste listing.
    return res.end(
      'User-agent: *\nAllow: /\n\nUser-agent: RadarConcursosBot\nDisallow: /concursos/centro-oeste/\n',
    );
  }
  const match = /^\/concursos\/([a-z-]+)\/$/.exec(req.url);
  if (!match) {
    res.statusCode = 404;
    return res.end();
  }
  res.setHeader('content-type', 'text/html');
  res.end(listingFor(match[1]));
});

const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    const method = req.url.split('/').pop();
    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      /* multipart ignored */
    }
    calls.push(method);
    const ok = (result) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, result }));
    };
    if (method === 'getMe')
      return ok({
        id: 1,
        is_bot: true,
        first_name: 'Bot',
        username: 'smoke_bot',
      });
    if (method === 'getUpdates') {
      const deadline = Date.now() + 1000;
      while (!pending.length && Date.now() < deadline)
        await new Promise((r) => setTimeout(r, 50));
      const out = pending;
      pending = [];
      return ok(out);
    }
    if (method === 'sendMessage' && failSends > 0) {
      failSends--;
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      return res.end(
        JSON.stringify({
          ok: false,
          error_code: 500,
          description: 'Internal Server Error',
        }),
      );
    }
    if (method === 'sendMessage') {
      sent.push({
        chat_id: String(payload.chat_id),
        text: payload.text,
        parse_mode: payload.parse_mode,
      });
      return ok({ message_id: sent.length, chat, date: 0, text: payload.text });
    }
    if (method === 'editMessageText')
      return ok({ message_id: 1, chat, date: 0, text: payload.text });
    return ok(true);
  });
});

const message = (text, entities) => ({
  update_id: updateId++,
  message: { message_id: updateId, date: 0, chat, from, text, entities },
});
const callback = (data) => ({
  update_id: updateId++,
  callback_query: {
    id: String(updateId),
    from,
    chat_instance: 'x',
    data,
    message: { message_id: 1, date: 0, chat },
  },
});
const waitFor = async (label, cond, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cond()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timeout waiting for: ' + label);
};
const mysql = (db, q) =>
  execSync(
    `docker exec concursos-mysql mysql -uroot -proot_password ${db} -N -e "${q}"`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();
const sql = (q) => mysql(SMOKE_DB, q);

(async () => {
  mysql(
    'mysql',
    `drop database if exists ${SMOKE_DB}; create database ${SMOKE_DB}`,
  );
  {
    const cleanup = await amqp.connect('amqp://guest:guest@localhost:5672');
    const cleanupChannel = await cleanup.createChannel();
    await cleanupChannel.deleteQueue(SMOKE_QUEUE);
    await cleanup.close();
  }
  await new Promise((r) => fake.listen(BOT_PORT, r));
  await new Promise((r) => pciSite.listen(PCI_PORT, r));
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(APP_PORT),
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USERNAME: 'root',
    DB_PASSWORD: 'root_password',
    DB_DATABASE: SMOKE_DB,
    RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
    RABBITMQ_QUEUE: SMOKE_QUEUE,
    TELEGRAM_BOT_TOKEN: '123:smoke',
    TELEGRAM_API_ROOT: `http://localhost:${BOT_PORT}`,
    // The scraper reads the fake site every 6 seconds so the scenario does not have to wait.
    SCRAPER_ENABLED_SOURCES: 'pci-concursos',
    SCRAPER_INTERVAL_MINUTES: '0.1',
    PCI_BASE_URL: `http://localhost:${PCI_PORT}`,
    PCI_PAGE_DELAY_MS: '0',
    STRIPE_SECRET_KEY: 'sk_test_smoke',
    STRIPE_PRICE_ID: 'price_smoke',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  };
  const app = spawn('node', ['dist/main'], { cwd: root, env });
  let log = '';
  app.stdout.on('data', (d) => (log += d));
  app.stderr.on('data', (d) => (log += d));
  const stop = () => {
    try {
      app.kill();
    } catch {}
    fake.close();
    pciSite.close();
  };
  try {
    await waitFor(
      'app listening',
      () => /HTTP server listening/.test(log),
      40000,
    );
    console.log('1. app booted (HTTP + RabbitMQ consumer + Telegram polling)');

    pending.push(
      message('/start', [{ type: 'bot_command', offset: 0, length: 6 }]),
    );
    await waitFor('welcome message', () =>
      sent.some((m) => /Bem-vindo/.test(m.text)),
    );
    assert.strictEqual(
      sql('select isActive from subscribers where telegramId=111'),
      '0',
    );
    console.log('2. /start answered; subscriber stored INACTIVE');

    const stripe = new Stripe('sk_test_smoke');
    const post = async (event, secret = WEBHOOK_SECRET) => {
      const payload = JSON.stringify(event);
      const sig = stripe.webhooks.generateTestHeaderString({ payload, secret });
      const r = await fetch(`http://localhost:${APP_PORT}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': sig,
        },
        body: payload,
      });
      return r.status;
    };
    const paid = {
      id: 'evt_smoke_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { client_reference_id: String(USER) } },
    };
    assert.strictEqual(await post(paid, 'whsec_wrong'), 400);
    assert.strictEqual(await post(paid), 200);
    await waitFor('activation message', () =>
      sent.some((m) => /Assinatura ativada/.test(m.text)),
    );
    assert.strictEqual(
      sql('select isActive from subscribers where telegramId=111'),
      '1',
    );
    assert.strictEqual(await post(paid), 200); // redelivery
    await new Promise((r) => setTimeout(r, 500));
    assert.strictEqual(
      sent.filter((m) => /Assinatura ativada/.test(m.text)).length,
      1,
    );
    assert.strictEqual(
      sql("select status from stripe_events where id='evt_smoke_1'"),
      'PROCESSED',
    );
    console.log(
      '3. signed webhook activated the user; bad signature -> 400; redelivery did not re-notify',
    );

    pending.push(callback('add_area_TI'));
    await waitFor('region keyboard', () =>
      sent.some((m) => /selecionada/.test(m.text)),
    );
    pending.push(callback('pick_region:TI:BR'));
    await waitFor(
      'preference saved',
      () => sql('select count(*) from preferences') === '1',
    );
    pending.push(callback('add_area_ASTRONAUTA')); // must be ignored (allow-list)
    await new Promise((r) => setTimeout(r, 1500));
    assert.strictEqual(sql('select count(*) from preferences'), '1');
    console.log(
      '4. preference TI/BR saved via button callbacks; unknown area callback ignored',
    );

    const conn = await amqp.connect('amqp://guest:guest@localhost:5672');
    const ch = await conn.createChannel();
    await ch.assertQueue('concursos.dlq', { durable: true });
    const dlqBefore = (await ch.checkQueue('concursos.dlq')).messageCount;
    const vacancy = {
      id: 'vaga-smoke-1',
      job: 'Analista <de> Sistemas_Sr *TI*',
      areas: ['EDUCACAO', 'TI'],
      region: 'SP',
      salary: 8000,
      url: 'https://example.test/noticias/edital?id=1&ref=smoke',
      organization: 'Prefeitura de Exemplo',
      deadline: '2026-12-14',
    };
    ch.sendToQueue(
      SMOKE_QUEUE,
      Buffer.from(JSON.stringify({ pattern: 'concursos.new', data: vacancy })),
      { persistent: true },
    );
    await waitFor(
      'vacancy alert',
      () => sent.some((m) => /Novo concurso/.test(m.text)),
      20000,
    );
    const alert = sent.find((m) => /Novo concurso/.test(m.text));
    assert.strictEqual(alert.chat_id, String(USER));
    assert.strictEqual(alert.parse_mode, 'HTML');
    assert.ok(alert.text.includes('Analista &lt;de&gt; Sistemas_Sr *TI*'));
    assert.ok(alert.text.includes('Prefeitura de Exemplo'));
    assert.ok(alert.text.includes('14/12/2026'));
    assert.ok(
      alert.text.includes(
        '<a href="https://example.test/noticias/edital?id=1&amp;ref=smoke">Ver edital</a>',
      ),
    );
    assert.strictEqual(
      sql(
        "select status from notification_logs where vacancyId='vaga-smoke-1'",
      ),
      'SENT',
    );
    console.log(
      '5. vacancy from RabbitMQ delivered as escaped HTML; notification log = SENT',
    );

    ch.sendToQueue(
      SMOKE_QUEUE,
      Buffer.from(JSON.stringify({ pattern: 'concursos.new', data: vacancy })),
      { persistent: true },
    );
    await new Promise((r) => setTimeout(r, 2500));
    assert.strictEqual(
      sent.filter((m) => /Novo concurso/.test(m.text)).length,
      1,
    );
    console.log(
      '6. the same vacancy published again was NOT delivered twice (idempotent)',
    );

    // Transient failures: Telegram answers 500 twice. The message must go through the 2s and
    // 4s retry queues and be delivered on the third attempt, without touching the DLQ.
    failSends = 2;
    const retried = Date.now();
    ch.sendToQueue(
      SMOKE_QUEUE,
      Buffer.from(
        JSON.stringify({
          pattern: 'concursos.new',
          data: {
            id: 'vaga-retry-1',
            job: 'Retry test',
            areas: ['TI'],
            region: 'SP',
            salary: 9000,
          },
        }),
      ),
      { persistent: true },
    );
    await waitFor(
      'alert after retries',
      () => sent.some((m) => /Retry test/.test(m.text)),
      30000,
    );
    const elapsed = Date.now() - retried;
    assert.ok(
      elapsed >= 5500,
      `delivered too early (${elapsed}ms): retry queues were skipped`,
    );
    assert.strictEqual(
      sql(
        "select status from notification_logs where vacancyId='vaga-retry-1'",
      ),
      'SENT',
    );
    assert.strictEqual(sent.filter((m) => /Retry test/.test(m.text)).length, 1);
    assert.strictEqual(
      (await ch.checkQueue('concursos.dlq')).messageCount,
      dlqBefore,
    );
    console.log(
      `7. Telegram failed twice -> retried through the 2s and 4s TTL queues and delivered after ${elapsed}ms; DLQ untouched`,
    );

    ch.sendToQueue(
      SMOKE_QUEUE,
      Buffer.from(
        JSON.stringify({
          pattern: 'concursos.new',
          data: {
            id: 'bad',
            job: 'x',
            areas: ['TI'],
            region: 'SP',
            salary: -5,
          },
        }),
      ),
      { persistent: true },
    );
    await new Promise((r) => setTimeout(r, 2000));
    const dlq = await ch.checkQueue('concursos.dlq');
    const deadLettered = dlq.messageCount - dlqBefore;
    console.log(
      `8. malformed message -> DLQ (+${deadLettered}), consumers=${dlq.consumerCount}`,
    );
    assert.strictEqual(deadLettered, 1);
    assert.strictEqual(dlq.consumerCount, 0);
    // The scraper has been reading the fake site all along. Until now it offered no IT job for
    // this subscriber; now one appears and must be announced exactly once.
    const alertsBefore = sent.filter((m) =>
      /Câmara de Exemplo Smoke/.test(m.text),
    ).length;
    assert.strictEqual(alertsBefore, 0);
    pciShowsTiVacancy = true;
    await waitFor(
      'scraped vacancy alert',
      () => sent.some((m) => /Câmara de Exemplo Smoke/.test(m.text)),
      30000,
    );
    const scraped = sent.find((m) => /Câmara de Exemplo Smoke/.test(m.text));
    assert.strictEqual(scraped.parse_mode, 'HTML');
    assert.ok(scraped.text.includes('Analista de Sistemas'));
    assert.ok(scraped.text.includes('até R$ 6.500,00'));
    assert.ok(scraped.text.includes('MG'));
    assert.ok(
      scraped.text.includes(
        '<a href="http://localhost:' +
          PCI_PORT +
          '/noticias/camara-smoke">Ver edital</a>',
      ),
    );
    assert.strictEqual(
      sql("select areas from vacancies where url like '%camara-smoke'"),
      'TI',
    );
    assert.strictEqual(
      sql("select source from vacancies where url like '%camara-smoke'"),
      'pci-concursos',
    );

    // Cancelled, expired and generic listings are read but never announced to this subscriber.
    assert.ok(
      !sent.some((m) => /Prefeitura (Cancelada|Encerrada)/.test(m.text)),
    );
    assert.strictEqual(
      sql(
        "select count(*) from vacancies where url like '%cancelled-%' or url like '%expired-%'",
      ),
      '0',
    );
    assert.ok(!sent.some((m) => /Prefeitura Generica/.test(m.text)));

    // Several more runs must not announce it again (persistent dedupe), and robots.txt is obeyed.
    await new Promise((r) => setTimeout(r, 14000));
    assert.strictEqual(
      sent.filter((m) => /Câmara de Exemplo Smoke/.test(m.text)).length,
      1,
    );
    assert.ok(pciRequests.some((r) => r.path === '/robots.txt'));
    assert.ok(
      !pciRequests.some((r) => r.path === '/concursos/centro-oeste/'),
      'robots.txt was ignored',
    );
    assert.ok(pciRequests.some((r) => r.path === '/concursos/sul/'));
    assert.ok(
      pciRequests.every((r) => /RadarConcursosBot/.test(r.userAgent || '')),
      'missing or wrong User-Agent',
    );
    const runs = pciRequests.filter(
      (r) => r.path === '/concursos/sudeste/',
    ).length;
    assert.ok(runs >= 2, 'expected several scraping runs, got ' + runs);
    console.log(
      '9. scraper read the site ' +
        runs +
        ' times: IT vacancy announced once with its link, cancelled/expired/generic ones not, robots.txt and User-Agent respected',
    );

    await conn.close();
    console.log('\nSMOKE TEST PASSED');
  } catch (e) {
    console.error('\nSMOKE TEST FAILED:', e.message);
    console.error(
      '--- last app logs ---\n' + log.split('\n').slice(-25).join('\n'),
    );
    process.exitCode = 1;
  } finally {
    stop();
    try {
      mysql('mysql', `drop database if exists ${SMOKE_DB}`);
    } catch {
      /* best effort */
    }
  }
})();
