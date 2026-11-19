import {
  TestDatabase,
  createTestDatabase,
} from '../../../shared/testing/test-database';
import { NotificationLogOrmEntity } from '../entities/notification-log.orm-entity';
import { MysqlNotificationLogRepository } from './mysql-notification-log.repository';

describe('MysqlNotificationLogRepository (integration)', () => {
  let db: TestDatabase;
  let repository: MysqlNotificationLogRepository;

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new MysqlNotificationLogRepository(
      db.dataSource.getRepository(NotificationLogOrmEntity),
    );
  });

  afterAll(async () => {
    await db.drop();
  });

  beforeEach(async () => {
    await db.dataSource.query('DELETE FROM notification_logs');
  });

  it('lets exactly one of many concurrent claims win', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => repository.claim('u1', 'v1')),
    );

    expect(results.filter((r) => r === 'claimed')).toHaveLength(1);
    expect(results.filter((r) => r === 'in_progress')).toHaveLength(19);
  });

  it('reports a delivered notification as already handled', async () => {
    await repository.claim('u1', 'v1');
    await repository.markSent('u1', 'v1');

    expect(await repository.claim('u1', 'v1')).toBe('already_handled');
  });

  it('never deletes a delivered record when releasing', async () => {
    await repository.claim('u1', 'v1');
    await repository.markSent('u1', 'v1');

    await repository.release('u1', 'v1');

    expect(await repository.claim('u1', 'v1')).toBe('already_handled');
  });

  it('lets a released claim be taken again', async () => {
    expect(await repository.claim('u2', 'v1')).toBe('claimed');
    await repository.release('u2', 'v1');

    expect(await repository.claim('u2', 'v1')).toBe('claimed');
  });

  it('treats a permanent failure as terminal', async () => {
    await repository.claim('u3', 'v1');
    await repository.markFailed('u3', 'v1');

    expect(await repository.claim('u3', 'v1')).toBe('already_handled');
  });

  it('hands an abandoned claim (expired lease) to exactly one new worker', async () => {
    await repository.claim('u4', 'v1');
    await db.dataSource.query(
      "UPDATE notification_logs SET claimedAt = DATE_SUB(NOW(), INTERVAL 10 MINUTE) WHERE telegramId = 'u4'",
    );

    const takeovers = await Promise.all(
      Array.from({ length: 10 }, () => repository.claim('u4', 'v1')),
    );

    expect(takeovers.filter((r) => r === 'claimed')).toHaveLength(1);
  });
});
