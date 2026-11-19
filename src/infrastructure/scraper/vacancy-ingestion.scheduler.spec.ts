import { Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { IJobLock } from '../../application/ports/job-lock.port';
import { IngestVacanciesUseCase } from '../../application/use-cases/ingest-vacancies.use-case';
import { AppConfig } from '../../shared/config/app.config';
import { VacancyIngestionScheduler } from './vacancy-ingestion.scheduler';

const INTERVAL_MINUTES = 30;

describe('VacancyIngestionScheduler', () => {
  let execute: jest.Mock;
  let runExclusive: jest.Mock;
  let addInterval: jest.Mock;
  let deleteInterval: jest.Mock;
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;

  const scheduler = (
    scraper: Partial<AppConfig['scraper']> = {},
  ): VacancyIngestionScheduler =>
    new VacancyIngestionScheduler(
      { execute } as unknown as IngestVacanciesUseCase,
      { runExclusive } as unknown as IJobLock,
      {
        scraper: {
          enabledSources: ['pci-concursos'],
          intervalMinutes: INTERVAL_MINUTES,
          runOnStart: false,
          ...scraper,
        },
      } as AppConfig,
      { addInterval, deleteInterval } as unknown as SchedulerRegistry,
    );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    execute = jest.fn().mockResolvedValue({ published: 0 });
    // By default the lock is free and simply runs the task.
    runExclusive = jest.fn(
      async (_name: string, task: () => Promise<unknown>) => ({
        acquired: true,
        value: await task(),
      }),
    );
    addInterval = jest.fn();
    deleteInterval = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('run', () => {
    it('runs one ingestion under the shared lock', async () => {
      await scheduler().run();

      expect(runExclusive).toHaveBeenCalledWith(
        'vacancy-ingestion',
        expect.any(Function),
      );
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('skips the run when another instance holds the lock', async () => {
      runExclusive.mockResolvedValue({ acquired: false });

      await scheduler().run();

      expect(execute).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it('never lets a failure escape: the next run must still happen', async () => {
      execute.mockRejectedValue(new Error('database is down'));

      await expect(scheduler().run()).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('database is down'),
      );
    });

    it('survives a failure of the lock itself', async () => {
      runExclusive.mockRejectedValue(new Error('cannot reach the database'));

      await expect(scheduler().run()).resolves.toBeUndefined();
      expect(execute).not.toHaveBeenCalled();
    });
  });

  describe('scheduling', () => {
    it('runs every configured interval', async () => {
      scheduler().onApplicationBootstrap();

      expect(addInterval).toHaveBeenCalledWith(
        'vacancy-ingestion',
        expect.anything(),
      );
      await jest.advanceTimersByTimeAsync(INTERVAL_MINUTES * 60_000);
      expect(execute).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(INTERVAL_MINUTES * 60_000);
      expect(execute).toHaveBeenCalledTimes(2);
    });

    it('does not run before the first interval unless asked to', async () => {
      scheduler().onApplicationBootstrap();
      await jest.advanceTimersByTimeAsync(1000);

      expect(execute).not.toHaveBeenCalled();
    });

    it('runs once right after start-up when configured to', async () => {
      scheduler({ runOnStart: true }).onApplicationBootstrap();
      await jest.advanceTimersByTimeAsync(0);

      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('does not block start-up while the first run is in progress', () => {
      execute.mockReturnValue(new Promise(() => undefined));

      expect(() =>
        scheduler({ runOnStart: true }).onApplicationBootstrap(),
      ).not.toThrow();
    });

    it('stays off when no source is enabled', async () => {
      scheduler({
        enabledSources: [],
        runOnStart: true,
      }).onApplicationBootstrap();
      await jest.advanceTimersByTimeAsync(INTERVAL_MINUTES * 60_000);

      expect(addInterval).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    });

    it('stops its interval on shutdown', () => {
      const s = scheduler();
      s.onApplicationBootstrap();

      s.onModuleDestroy();

      expect(deleteInterval).toHaveBeenCalledWith('vacancy-ingestion');
    });

    it('has nothing to stop when it never started', () => {
      scheduler({ enabledSources: [] }).onModuleDestroy();

      expect(deleteInterval).not.toHaveBeenCalled();
    });
  });
});
