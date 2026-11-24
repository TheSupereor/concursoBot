import { Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IVacancySource,
  ScrapedVacancy,
} from '../../application/ports/vacancy-source.port';
import {
  CebraspeEventDetail,
  CebraspeEventSummary,
  CebraspeFormatError,
  parseCebraspeEvent,
  parseCebraspePhase,
  toScrapedVacancy,
} from './cebraspe.parser';
import { RobotsPolicy } from './robots-policy';

export const CEBRASPE_SOURCE_ID = 'cebraspe';

/** Phases worth an alert: just announced, and registration open. Later phases are skipped. */
export const CEBRASPE_PHASES = ['novos', 'inscricoes-abertas'] as const;

export interface CebraspeSourceOptions {
  /** Base of the JSON API, for example https://apis.cebraspe.org.br/cebraspe. */
  apiUrl: string;
  /** Public site the alerts link to. */
  siteUrl: string;
  /** Sent on every request so the organizer can see who is reading it and why. */
  userAgent: string;
  timeoutMs: number;
  /** Pause between two requests, to stay gentle with the API. */
  delayMs: number;
}

/** The part of an HTTP client this source uses (axios satisfies it). */
export interface JsonHttpClient {
  get(
    url: string,
    config: { timeout: number; headers: Record<string, string> },
  ): Promise<{ data: unknown }>;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads the competitions run by Cebraspe from the JSON API behind its website.
 *
 * The API is undocumented, so every response is validated: a format change fails loudly
 * instead of yielding nothing. An empty phase is normal (no competition open right now); a
 * phase that cannot be read is skipped, and the source fails only when no phase could be read.
 * Details (roles, registration period) are best effort: without them the competition is still
 * announced.
 */
export class CebraspeSource implements IVacancySource {
  readonly id = CEBRASPE_SOURCE_ID;
  private readonly logger = new Logger(CebraspeSource.name);
  private requested = false;

  constructor(
    private readonly options: CebraspeSourceOptions,
    private readonly http: JsonHttpClient = axios,
    private readonly sleep: (ms: number) => Promise<void> = wait,
    private readonly robots: Pick<RobotsPolicy, 'isAllowed'> = {
      isAllowed: () => Promise.resolve(true),
    },
  ) {}

  async fetch(): Promise<ScrapedVacancy[]> {
    this.requested = false;
    const summaries = new Map<string, CebraspeEventSummary>();
    let phasesRead = 0;
    let formatError: CebraspeFormatError | null = null;

    for (const phase of CEBRASPE_PHASES) {
      const url = `${this.options.apiUrl}/eventos/tipo/concursos/fase/${phase}`;
      try {
        const body = await this.read(url);
        if (body === null) continue;
        phasesRead++;
        for (const summary of parseCebraspePhase(body)) {
          // A competition can appear in more than one phase; announce it once.
          summaries.set(summary.eventoURL, summary);
        }
      } catch (error) {
        if (error instanceof CebraspeFormatError) formatError = error;
        this.logger.warn(
          `Could not read the ${phase} phase: ${messageOf(error)}`,
        );
      }
    }

    if (formatError) throw formatError;
    if (phasesRead === 0) {
      throw new Error('No phase could be read from the Cebraspe API');
    }

    const vacancies: ScrapedVacancy[] = [];
    for (const summary of summaries.values()) {
      vacancies.push(
        toScrapedVacancy(
          summary,
          await this.details(summary),
          this.options.siteUrl,
        ),
      );
    }
    return vacancies;
  }

  private async details(
    summary: CebraspeEventSummary,
  ): Promise<CebraspeEventDetail | null> {
    const url = `${this.options.apiUrl}/eventos/${summary.eventoURL}`;
    try {
      const body = await this.read(url);
      return body === null ? null : parseCebraspeEvent(body);
    } catch (error) {
      this.logger.warn(
        `Could not read the details of ${summary.eventoURL}: ${messageOf(error)}`,
      );
      return null;
    }
  }

  /** The response body, or null when robots.txt does not allow the request. */
  private async read(url: string): Promise<unknown> {
    if (!(await this.robots.isAllowed(url))) {
      this.logger.warn(`robots.txt does not allow reading ${url}; skipping it`);
      return null;
    }
    // Pause only between two real requests.
    if (this.requested) await this.sleep(this.options.delayMs);
    this.requested = true;

    const response = await this.http.get(url, {
      timeout: this.options.timeoutMs,
      headers: {
        'User-Agent': this.options.userAgent,
        Accept: 'application/json',
      },
    });
    return response.data;
  }
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';
