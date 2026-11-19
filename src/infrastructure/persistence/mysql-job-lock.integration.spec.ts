import {
  TestDatabase,
  createTestDatabase,
} from '../../shared/testing/test-database';
import { MysqlJobLock } from './mysql-job-lock';

/** A promise that is resolved from the outside, to hold a task open on purpose. */
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe('MysqlJobLock (integration)', () => {
  let db: TestDatabase;
  let lock: MysqlJobLock;

  beforeAll(async () => {
    db = await createTestDatabase();
    lock = new MysqlJobLock(db.dataSource);
  });

  afterAll(async () => {
    await db.drop();
  });

  it('runs the task and returns its value', async () => {
    const result = await lock.runExclusive('job-a', () => Promise.resolve(42));

    expect(result).toEqual({ acquired: true, value: 42 });
  });

  it('does not run a second copy of the same job while the first is running', async () => {
    const gate = deferred();
    const second = jest.fn().mockResolvedValue('second');

    const first = lock.runExclusive('job-b', async () => {
      await gate.promise;
      return 'first';
    });
    // Give the first call time to take the lock before the second tries.
    await new Promise((r) => setTimeout(r, 100));

    const refused = await lock.runExclusive('job-b', second);
    gate.resolve();

    expect(refused).toEqual({ acquired: false });
    expect(second).not.toHaveBeenCalled();
    expect(await first).toEqual({ acquired: true, value: 'first' });
  });

  it('releases the lock when the task finishes, so the job can run again', async () => {
    await lock.runExclusive('job-c', () => Promise.resolve());

    const again = await lock.runExclusive('job-c', () => Promise.resolve('ok'));

    expect(again).toEqual({ acquired: true, value: 'ok' });
  });

  it('releases the lock when the task throws, and lets the error through', async () => {
    await expect(
      lock.runExclusive('job-d', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');

    const again = await lock.runExclusive('job-d', () => Promise.resolve('ok'));

    expect(again).toEqual({ acquired: true, value: 'ok' });
  });

  it('lets different jobs run at the same time', async () => {
    const gate = deferred();
    const first = lock.runExclusive('job-e', () => gate.promise);
    await new Promise((r) => setTimeout(r, 100));

    const other = await lock.runExclusive('job-f', () =>
      Promise.resolve('other'),
    );
    gate.resolve();
    await first;

    expect(other).toEqual({ acquired: true, value: 'other' });
  });

  it('keeps working after many runs (connections are returned to the pool)', async () => {
    for (let i = 0; i < 30; i++) {
      const result = await lock.runExclusive('job-g', () => Promise.resolve(i));
      expect(result).toEqual({ acquired: true, value: i });
    }
  });
});
