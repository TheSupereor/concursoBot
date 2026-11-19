export type LockResult<T> = { acquired: true; value: T } | { acquired: false };

/**
 * Lets only one instance run a job at a time. A scheduled job runs on every instance of the
 * application, so without this the same listings would be fetched, and the site hit, several
 * times per run.
 */
export interface IJobLock {
  /**
   * Runs the task if the named lock is free and releases it afterwards, even when the task
   * throws. Returns `{ acquired: false }` immediately, without running the task, when another
   * holder has it.
   */
  runExclusive<T>(name: string, task: () => Promise<T>): Promise<LockResult<T>>;
}
