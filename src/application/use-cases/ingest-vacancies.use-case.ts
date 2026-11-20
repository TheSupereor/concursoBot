import { Vacancy } from '../../domain/entities/vacancy';
import { classifyAreas } from '../../domain/services/area-classifier';
import { isRegion } from '../../domain/value-objects/region';
import { Salary } from '../../domain/value-objects/salary';
import { ILogger } from '../ports/logger.port';
import { IVacancyPublisher } from '../ports/vacancy-publisher.port';
import { IVacancyRepository } from '../ports/vacancy-repository.port';
import { IVacancySource, ScrapedVacancy } from '../ports/vacancy-source.port';
import { vacancyId } from '../vacancy-id';

export interface IngestionSummary {
  fetched: number;
  published: number;
  skipped: {
    cancelled: number;
    expired: number;
    invalid: number;
    known: number;
  };
  /** Sources that could not be read at all. */
  failedSources: string[];
  /** Vacancies that could not be published; they are retried on the next run. */
  failedPublishes: number;
}

/** Listings titled like this say nothing about the role, so the headline is more useful. */
const GENERIC_ROLES = /^v[aá]rios cargos$/i;

const startOfDayUtc = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/**
 * Reads every vacancy source and announces the vacancies it has not announced before.
 *
 * Publishing comes before recording: if the process dies in between, the vacancy is published
 * again on the next run, which is harmless because the id is stable and notifications are
 * idempotent. The reverse order would lose the vacancy for good.
 */
export class IngestVacanciesUseCase {
  constructor(
    private readonly sources: IVacancySource[],
    private readonly vacancies: IVacancyRepository,
    private readonly publisher: IVacancyPublisher,
    private readonly logger: ILogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<IngestionSummary> {
    const summary: IngestionSummary = {
      fetched: 0,
      published: 0,
      skipped: { cancelled: 0, expired: 0, invalid: 0, known: 0 },
      failedSources: [],
      failedPublishes: 0,
    };
    const today = startOfDayUtc(this.now());

    for (const source of this.sources) {
      let scraped: ScrapedVacancy[];
      try {
        scraped = await source.fetch();
      } catch (error) {
        // One source being down must not stop the others.
        this.logger.error(
          `Could not read source ${source.id}: ${errorMessage(error)}`,
        );
        summary.failedSources.push(source.id);
        continue;
      }

      summary.fetched += scraped.length;
      for (const item of scraped) {
        await this.ingest(source.id, item, today, summary);
      }
    }

    this.logger.info(
      `Ingestion done: ${summary.published} published of ${summary.fetched} fetched`,
    );
    return summary;
  }

  private async ingest(
    sourceId: string,
    item: ScrapedVacancy,
    today: number,
    summary: IngestionSummary,
  ): Promise<void> {
    if (item.status === 'cancelled') {
      summary.skipped.cancelled++;
      return;
    }
    // The deadline is a calendar day: registration is open through that whole day.
    if (item.deadline && startOfDayUtc(item.deadline) < today) {
      summary.skipped.expired++;
      return;
    }
    if (!isRegion(item.region)) {
      summary.skipped.invalid++;
      return;
    }

    const vacancy = toVacancy(sourceId, item);
    if (await this.vacancies.exists(vacancy.id)) {
      summary.skipped.known++;
      return;
    }

    try {
      await this.publisher.publish(vacancy);
    } catch (error) {
      this.logger.error(
        `Could not publish ${vacancy.id}: ${errorMessage(error)}`,
      );
      summary.failedPublishes++;
      return;
    }
    summary.published++;

    try {
      await this.vacancies.register(vacancy, sourceId);
    } catch (error) {
      // Already published: the next run announces it again, and idempotency absorbs it.
      this.logger.error(
        `Published ${vacancy.id} but could not record it: ${errorMessage(error)}`,
      );
    }
  }
}

function toVacancy(sourceId: string, item: ScrapedVacancy): Vacancy {
  const job =
    GENERIC_ROLES.test(item.roles.trim()) || !item.roles.trim()
      ? item.title
      : item.roles;

  return new Vacancy(
    vacancyId(sourceId, item.url),
    job,
    classifyAreas({
      title: item.title,
      roles: item.roles,
      organization: item.organization,
    }),
    item.region,
    new Salary(item.salaryMax ?? 0),
    {
      url: item.url,
      organization: item.organization,
      deadline: item.deadline,
    },
  );
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';
