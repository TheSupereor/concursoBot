import { InvalidVacancyError } from '../errors/domain.error';
import { Salary } from '../value-objects/salary';

/** Extra facts about a vacancy that alerts show but matching does not use. */
export interface VacancyDetails {
  /** Public page of the listing, so the alert can link to it. */
  url?: string;
  organization?: string;
  /** Last day to register. */
  deadline?: Date | null;
}

export class Vacancy {
  /** Every area the vacancy belongs to (a city hall can hire a teacher and an IT analyst). */
  readonly areas: readonly string[];

  constructor(
    public readonly id: string,
    public readonly job: string,
    area: string | readonly string[],
    public readonly region: string,
    public readonly salary: Salary,
    public readonly details: VacancyDetails = {},
  ) {
    this.areas = typeof area === 'string' ? [area] : [...area];
    if (this.areas.length === 0) {
      throw new InvalidVacancyError('a vacancy needs at least one area');
    }
  }

  /** The strongest area, for messages that show only one. */
  get area(): string {
    return this.areas[0] as string;
  }
}
