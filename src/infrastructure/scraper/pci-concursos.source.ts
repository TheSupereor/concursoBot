import { Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IVacancySource,
  ScrapedVacancy,
} from '../../application/ports/vacancy-source.port';
import { parsePciListing } from './pci-concursos.parser';
import { RobotsPolicy } from './robots-policy';

export const PCI_SOURCE_ID = 'pci-concursos';

/** Regional listings of the site; together they cover the whole country. */
export const PCI_REGIONAL_PATHS = [
  'sudeste',
  'sul',
  'nordeste',
  'norte',
  'centro-oeste',
] as const;

export interface PciSourceOptions {
  baseUrl: string;
  /** Sent on every request so the site can see who is reading it and why. */
  userAgent: string;
  timeoutMs: number;
  /** Pause between two pages, to stay gentle with the site. */
  delayMs: number;
}

/** The part of an HTTP client this source uses (axios satisfies it). */
export interface HttpClient {
  get(
    url: string,
    config: {
      timeout: number;
      headers: Record<string, string>;
      responseType: 'text';
    },
  ): Promise<{ data: string }>;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads the regional listings of PCI Concursos.
 *
 * The site is not an API: its markup can change without notice. A page that fails is skipped
 * (the other regions are still returned), but when nothing at all can be read, or pages load
 * and yield no vacancy, the source fails loudly. That is how the previous scraper stayed
 * silently broken for months.
 */
export class PciConcursosSource implements IVacancySource {
  readonly id = PCI_SOURCE_ID;
  private readonly logger = new Logger(PciConcursosSource.name);

  constructor(
    private readonly options: PciSourceOptions,
    private readonly http: HttpClient = axios,
    private readonly sleep: (ms: number) => Promise<void> = wait,
    private readonly robots: Pick<RobotsPolicy, 'isAllowed'> = {
      isAllowed: () => Promise.resolve(true),
    },
  ) {}

  async fetch(): Promise<ScrapedVacancy[]> {
    const vacancies: ScrapedVacancy[] = [];
    let pagesRead = 0;
    let pagesBlocked = 0;
    let requested = false;

    for (const region of PCI_REGIONAL_PATHS) {
      const url = `${this.options.baseUrl}/concursos/${region}/`;
      if (!(await this.robots.isAllowed(url))) {
        // Not even requested: the site asked robots not to read this page.
        this.logger.warn(
          `robots.txt does not allow reading ${url}; skipping it`,
        );
        pagesBlocked++;
        continue;
      }

      // Pause only between two real requests.
      if (requested) await this.sleep(this.options.delayMs);
      requested = true;

      try {
        const html = await this.readPage(url);
        pagesRead++;
        vacancies.push(...parsePciListing(html, this.options.baseUrl));
      } catch (error) {
        this.logger.warn(
          `Could not read the ${region} listing: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    if (pagesRead === 0 && pagesBlocked > 0) {
      throw new Error(
        'robots.txt does not allow reading any PCI Concursos listing',
      );
    }
    if (pagesRead === 0) {
      throw new Error('No page could be read from PCI Concursos');
    }
    if (vacancies.length === 0) {
      throw new Error(
        'PCI Concursos pages loaded but no vacancy could be parsed: the layout may have changed',
      );
    }
    return vacancies;
  }

  private async readPage(url: string): Promise<string> {
    const response = await this.http.get(url, {
      timeout: this.options.timeoutMs,
      headers: {
        'User-Agent': this.options.userAgent,
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      responseType: 'text',
    });
    return response.data;
  }
}
