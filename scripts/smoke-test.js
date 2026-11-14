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
const APP_PORT = 3100;
const WEBHOOK_SECRET = 'whsec_smoke';
const USER = 111;

const sent = []; // messages the bot sent through the fake Telegram API
const calls = [];
let pending = [];
let updateId = 1;
const chat = { id: USER, type: 'private' };
const from = { id: USER, is_bot: false, first_name: 'Tester' };

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
const sql = (q) =>
  execSync(
    `docker exec concursos-mysql mysql -uroot -proot_password concursos_db -N -e "${q}"`,
    { encoding: 'utf8' },
  ).trim();

(async () => {
  await new Promise((r) => fake.listen(BOT_PORT, r));
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(APP_PORT),
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USERNAME: 'user_concursos',
    DB_PASSWORD: 'user_password',
    DB_DATABASE: 'concursos_db',
    RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
    RABBITMQ_QUEUE: 'concursos.new',
    TELEGRAM_BOT_TOKEN: '123:smoke',
    TELEGRAM_API_ROOT: `http://localhost:${BOT_PORT}`,
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
    const vacancy = {
      id: 'vaga-smoke-1',
      job: 'Analista <de> Sistemas_Sr *TI*',
      area: 'TI',
      region: 'SP',
      salary: 8000,
    };
    ch.sendToQueue(
      'concursos.new',
      Buffer.from(JSON.stringify({ pattern: 'concursos.new', data: vacancy })),
      { persistent: true },
    );
    await waitFor(
      'vacancy alert',
      () => sent.some((m) => /Novo Edital/.test(m.text)),
      20000,
    );
    const alert = sent.find((m) => /Novo Edital/.test(m.text));
    assert.strictEqual(alert.chat_id, String(USER));
    assert.strictEqual(alert.parse_mode, 'HTML');
    assert.ok(alert.text.includes('Analista &lt;de&gt; Sistemas_Sr *TI*'));
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
      'concursos.new',
      Buffer.from(JSON.stringify({ pattern: 'concursos.new', data: vacancy })),
      { persistent: true },
    );
    await new Promise((r) => setTimeout(r, 2500));
    assert.strictEqual(
      sent.filter((m) => /Novo Edital/.test(m.text)).length,
      1,
    );
    console.log(
      '6. the same vacancy published again was NOT delivered twice (idempotent)',
    );

    ch.sendToQueue(
      'concursos.new',
      Buffer.from(
        JSON.stringify({
          pattern: 'concursos.new',
          data: { id: 'bad', job: 'x', area: 'TI', region: 'SP', salary: -5 },
        }),
      ),
      { persistent: true },
    );
    // Three attempts with exponential backoff (2s + 4s) before the message is dead-lettered.
    await new Promise((r) => setTimeout(r, 12000));
    const dlq = await ch.checkQueue('concursos.dlq');
    console.log(
      `7. invalid message after retries -> DLQ ready=${dlq.messageCount} consumers=${dlq.consumerCount}`,
    );
    assert.strictEqual(dlq.messageCount, 1);
    assert.strictEqual(dlq.consumerCount, 0);
    await ch.purgeQueue('concursos.dlq');
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
  }
})();
