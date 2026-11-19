import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IJobLock, LockResult } from '../../application/ports/job-lock.port';

/** MySQL limits a lock name to 64 characters. */
const MAX_LOCK_NAME = 64;

/**
 * Job lock built on MySQL's GET_LOCK. The lock belongs to a database connection, so it is held
 * on a dedicated connection for the duration of the task. If the process dies, MySQL closes the
 * connection and releases the lock by itself: there is no stale lock to clean up.
 */
@Injectable()
export class MysqlJobLock implements IJobLock {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async runExclusive<T>(
    name: string,
    task: () => Promise<T>,
  ): Promise<LockResult<T>> {
    const lockName = `radar:${name}`.slice(0, MAX_LOCK_NAME);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();

    try {
      const [row] = (await runner.query('SELECT GET_LOCK(?, 0) AS acquired', [
        lockName,
      ])) as { acquired: number | string | null }[];
      if (Number(row?.acquired) !== 1) return { acquired: false };

      try {
        return { acquired: true, value: await task() };
      } finally {
        await runner.query('SELECT RELEASE_LOCK(?)', [lockName]);
      }
    } finally {
      await runner.release();
    }
  }
}
