import {
  TestDatabase,
  createTestDatabase,
} from '../../../shared/testing/test-database';
import { StripeEventOrmEntity } from '../entities/stripe-event.orm-entity';
import { MysqlProcessedEventRepository } from './mysql-processed-event.repository';

describe('MysqlProcessedEventRepository (integration)', () => {
  let db: TestDatabase;
  let repository: MysqlProcessedEventRepository;

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new MysqlProcessedEventRepository(
      db.dataSource.getRepository(StripeEventOrmEntity),
    );
  });

  afterAll(async () => {
    await db.drop();
  });

  beforeEach(async () => {
    await db.dataSource.query('DELETE FROM stripe_events');
  });

  it('processes a new event', async () => {
    expect(await repository.beginProcessing('evt_1', 'x')).toBe('process');
  });

  it('lets an unfinished event be processed again (the retry after a failure)', async () => {
    await repository.beginProcessing('evt_1', 'x');

    expect(await repository.beginProcessing('evt_1', 'x')).toBe('process');
  });

  it('skips an event that was fully processed', async () => {
    await repository.beginProcessing('evt_1', 'x');
    await repository.markProcessed('evt_1');

    expect(await repository.beginProcessing('evt_1', 'x')).toBe(
      'already_processed',
    );
  });

  it('records when the event was processed', async () => {
    await repository.beginProcessing('evt_1', 'checkout.session.completed');
    await repository.markProcessed('evt_1');

    const row = await db.dataSource
      .getRepository(StripeEventOrmEntity)
      .findOneByOrFail({ id: 'evt_1' });

    expect(row.status).toBe('PROCESSED');
    expect(row.processedAt).toBeInstanceOf(Date);
  });

  it('keeps a single row when the same event arrives concurrently', async () => {
    const decisions = await Promise.all(
      Array.from({ length: 15 }, () =>
        repository.beginProcessing('evt_2', 'x'),
      ),
    );

    expect(decisions.every((d) => d === 'process')).toBe(true);
    expect(
      await db.dataSource
        .getRepository(StripeEventOrmEntity)
        .countBy({ id: 'evt_2' }),
    ).toBe(1);
  });
});
