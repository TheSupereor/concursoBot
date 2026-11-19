import { Vacancy } from '../../domain/entities/vacancy';
import { IVacancyPublisher } from '../ports/vacancy-publisher.port';
import { IVacancyRepository } from '../ports/vacancy-repository.port';
import { IVacancySource, ScrapedVacancy } from '../ports/vacancy-source.port';
import { silentLogger } from '../../shared/testing/silent-logger';
import { vacancyId } from '../vacancy-id';
import { IngestVacanciesUseCase } from './ingest-vacancies.use-case';

const NOW = new Date('2026-11-20T15:30:00.000Z');

const scraped = (overrides: Partial<ScrapedVacancy> = {}): ScrapedVacancy => ({
  url: 'https://example.test/noticias/prefeitura-exemplo',
  title: 'Prefeitura de Exemplo abre concurso',
  organization: 'Prefeitura de Exemplo',
  region: 'SP',
  roles: 'Analista de Sistemas',
  education: ['Superior'],
  openings: 3,
  reserveList: false,
  salaryMax: 5000,
  deadline: new Date('2026-12-14T00:00:00.000Z'),
  status: 'open',
  ...overrides,
});

class InMemoryVacancies implements IVacancyRepository {
  readonly registered = new Map<string, { vacancy: Vacancy; source: string }>();

  async exists(id: string) {
    return this.registered.has(id);
  }

  async register(vacancy: Vacancy, source: string) {
    this.registered.set(vacancy.id, { vacancy, source });
  }
}

class RecordingPublisher implements IVacancyPublisher {
  readonly published: Vacancy[] = [];
  failFor = new Set<string>();

  async publish(vacancy: Vacancy) {
    if (this.failFor.has(vacancy.id)) throw new Error('broker unavailable');
    this.published.push(vacancy);
  }
}

const source = (
  id: string,
  items: ScrapedVacancy[] | Error,
): IVacancySource => ({
  id,
  fetch: async () => {
    if (items instanceof Error) throw items;
    return items;
  },
});

describe('IngestVacanciesUseCase', () => {
  let vacancies: InMemoryVacancies;
  let publisher: RecordingPublisher;

  const run = (...sources: IVacancySource[]) =>
    new IngestVacanciesUseCase(
      sources,
      vacancies,
      publisher,
      silentLogger,
      () => NOW,
    ).execute();

  beforeEach(() => {
    vacancies = new InMemoryVacancies();
    publisher = new RecordingPublisher();
  });

  it('publishes a new vacancy with its classified areas, link and details', async () => {
    const summary = await run(source('pci', [scraped()]));

    expect(summary.published).toBe(1);
    const [vacancy] = publisher.published;
    expect(vacancy?.id).toBe(
      vacancyId('pci', 'https://example.test/noticias/prefeitura-exemplo'),
    );
    expect(vacancy?.job).toBe('Analista de Sistemas');
    expect(vacancy?.areas).toEqual(['TI']);
    expect(vacancy?.region).toBe('SP');
    expect(vacancy?.salary.value).toBe(5000);
    expect(vacancy?.details).toEqual({
      url: 'https://example.test/noticias/prefeitura-exemplo',
      organization: 'Prefeitura de Exemplo',
      deadline: new Date('2026-12-14T00:00:00.000Z'),
    });
  });

  it('records the vacancy under its source once published', async () => {
    await run(source('pci', [scraped()]));

    const [stored] = [...vacancies.registered.values()];
    expect(stored?.source).toBe('pci');
  });

  it('does not announce a vacancy it already published', async () => {
    await run(source('pci', [scraped()]));
    const second = await run(source('pci', [scraped()]));

    expect(publisher.published).toHaveLength(1);
    expect(second.published).toBe(0);
    expect(second.skipped.known).toBe(1);
  });

  it('uses the headline when the roles are generic', async () => {
    await run(source('pci', [scraped({ roles: 'Vários Cargos' })]));

    expect(publisher.published[0]?.job).toBe(
      'Prefeitura de Exemplo abre concurso',
    );
  });

  it('treats an undisclosed salary as zero', async () => {
    await run(source('pci', [scraped({ salaryMax: null })]));

    expect(publisher.published[0]?.salary.value).toBe(0);
  });

  describe('what it refuses to announce', () => {
    it('skips a cancelled competition', async () => {
      const summary = await run(
        source('pci', [scraped({ status: 'cancelled', deadline: null })]),
      );

      expect(publisher.published).toHaveLength(0);
      expect(summary.skipped.cancelled).toBe(1);
    });

    it('skips a competition whose registration has closed', async () => {
      const summary = await run(
        source('pci', [
          scraped({ deadline: new Date('2026-11-19T00:00:00.000Z') }),
        ]),
      );

      expect(publisher.published).toHaveLength(0);
      expect(summary.skipped.expired).toBe(1);
    });

    it('still announces a competition whose last registration day is today', async () => {
      await run(
        source('pci', [
          scraped({ deadline: new Date('2026-11-20T00:00:00.000Z') }),
        ]),
      );

      expect(publisher.published).toHaveLength(1);
    });

    it('announces a competition that states no deadline', async () => {
      await run(source('pci', [scraped({ deadline: null })]));

      expect(publisher.published).toHaveLength(1);
    });

    it('skips a region that is not a Brazilian state', async () => {
      const summary = await run(source('pci', [scraped({ region: 'XX' })]));

      expect(publisher.published).toHaveLength(0);
      expect(summary.skipped.invalid).toBe(1);
    });
  });

  describe('failures', () => {
    it('keeps ingesting the other sources when one fails', async () => {
      const summary = await run(
        source('broken', new Error('site is down')),
        source('pci', [scraped()]),
      );

      expect(summary.published).toBe(1);
      expect(summary.failedSources).toEqual(['broken']);
    });

    it('does not record a vacancy that could not be published, so the next run retries it', async () => {
      const id = vacancyId('pci', scraped().url);
      publisher.failFor.add(id);

      const first = await run(source('pci', [scraped()]));
      expect(first.failedPublishes).toBe(1);
      expect(vacancies.registered.has(id)).toBe(false);

      publisher.failFor.clear();
      const second = await run(source('pci', [scraped()]));
      expect(second.published).toBe(1);
    });

    it('keeps going after one vacancy fails to publish', async () => {
      publisher.failFor.add(vacancyId('pci', 'https://example.test/a'));

      const summary = await run(
        source('pci', [
          scraped({ url: 'https://example.test/a' }),
          scraped({ url: 'https://example.test/b' }),
        ]),
      );

      expect(summary.published).toBe(1);
      expect(summary.failedPublishes).toBe(1);
    });
  });

  it('reports what it fetched', async () => {
    const summary = await run(
      source('pci', [
        scraped(),
        scraped({ url: 'https://example.test/b', status: 'cancelled' }),
      ]),
    );

    expect(summary.fetched).toBe(2);
  });
});
