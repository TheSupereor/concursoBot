/** A vacancy as read from a source, before it is classified, identified and stored. */
export interface ScrapedVacancy {
  /** Public page of the listing; also what the alert links to. */
  url: string;
  title: string;
  organization: string;
  /** Federative unit as listed by the source (not validated here). */
  region: string;
  /** Roles offered, for example "Professor Substituto" or "Vários Cargos". */
  roles: string;
  education: string[];
  openings: number | null;
  reserveList: boolean;
  /** Highest monthly salary stated; null when absent or only given per hour. */
  salaryMax: number | null;
  /** Last day to register, when the source says so. */
  deadline: Date | null;
  status: 'open' | 'cancelled';
}

/**
 * Outbound port: somewhere vacancies can be read from. Adapters hide how (HTML page, feed,
 * API) and keep the source's own politeness rules (identification, robots.txt, pacing).
 */
export interface IVacancySource {
  /** Stable identifier, also part of the vacancy id so sources never collide. */
  readonly id: string;
  fetch(): Promise<ScrapedVacancy[]>;
}
