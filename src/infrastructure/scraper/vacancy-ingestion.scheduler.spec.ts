import { Logger } from '@nestjs/common';
import { IngestVacanciesUseCase } from '../../application/use-cases/ingest-vacancies.use-case';
import { VacancyIngestionScheduler } from './vacancy-ingestion.scheduler';

describe('VacancyIngestionScheduler', () => {
  let execute: jest.Mock;
  let error: jest.SpyInstance;

  const scheduler = () =>
    new VacancyIngestionScheduler({
      execute,
    } as unknown as IngestVacanciesUseCase);

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    execute = jest.fn().mockResolvedValue({ published: 0 });
  });

  afterEach(() => jest.restoreAllMocks());

  it('runs one ingestion each time it is triggered', async () => {
    await scheduler().run();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('never lets a failure escape: the next scheduled run must still happen', async () => {
    execute.mockRejectedValue(new Error('database is down'));

    await expect(scheduler().run()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('database is down'),
    );
  });
});
