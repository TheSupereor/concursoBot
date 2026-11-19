import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IngestVacanciesUseCase } from '../../application/use-cases/ingest-vacancies.use-case';

/** Triggers the ingestion of vacancies on a schedule. */
@Injectable()
export class VacancyIngestionScheduler {
  private readonly logger = new Logger(VacancyIngestionScheduler.name);

  constructor(private readonly ingestVacancies: IngestVacanciesUseCase) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    try {
      const summary = await this.ingestVacancies.execute();
      this.logger.log(`Ingestion finished: ${JSON.stringify(summary)}`);
    } catch (error) {
      // A scheduled job must not throw: the next run has to happen anyway.
      this.logger.error(
        `Ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
