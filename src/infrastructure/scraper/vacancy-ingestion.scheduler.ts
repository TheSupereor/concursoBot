import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { IJobLock } from '../../application/ports/job-lock.port';
import { IngestVacanciesUseCase } from '../../application/use-cases/ingest-vacancies.use-case';
import { AppConfig } from '../../shared/config/app.config';
import { APP_CONFIG, JOB_LOCK } from '../../shared/tokens';

const JOB_NAME = 'vacancy-ingestion';

/**
 * Triggers the ingestion of vacancies every configured interval.
 *
 * It stays off when no source is enabled. Every instance of the application runs this, so each
 * run takes a shared lock: only one instance reads the sources at a time.
 */
@Injectable()
export class VacancyIngestionScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(VacancyIngestionScheduler.name);
  private scheduled = false;

  constructor(
    private readonly ingestVacancies: IngestVacanciesUseCase,
    @Inject(JOB_LOCK) private readonly lock: IJobLock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly registry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    const { enabledSources, intervalMinutes, runOnStart } = this.config.scraper;

    if (enabledSources.length === 0) {
      this.logger.log('No vacancy source is enabled; ingestion is off');
      return;
    }

    this.registry.addInterval(
      JOB_NAME,
      setInterval(() => void this.run(), intervalMinutes * 60_000),
    );
    this.scheduled = true;
    this.logger.log(
      `Ingesting [${enabledSources.join(', ')}] every ${intervalMinutes} minutes`,
    );

    // Not awaited: the first run can take a while and must not delay start-up.
    if (runOnStart) void this.run();
  }

  onModuleDestroy(): void {
    if (this.scheduled) this.registry.deleteInterval(JOB_NAME);
  }

  async run(): Promise<void> {
    try {
      const result = await this.lock.runExclusive(JOB_NAME, () =>
        this.ingestVacancies.execute(),
      );
      if (result.acquired) {
        this.logger.log(`Ingestion finished: ${JSON.stringify(result.value)}`);
      } else {
        this.logger.log('Another instance is ingesting; skipping this run');
      }
    } catch (error) {
      // A scheduled job must not throw: the next run has to happen anyway.
      this.logger.error(
        `Ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
