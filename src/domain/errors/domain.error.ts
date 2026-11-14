/**
 * Base class for business-rule violations. Each error carries a stable machine-readable
 * `code` so outer layers (Telegram, HTTP) can translate it to user-facing text without
 * parsing messages. Messages are for logs and developers, in English.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidSalaryError extends DomainError {
  readonly code = 'INVALID_SALARY';

  constructor(value: number) {
    super(`A salary must be a finite, non-negative number (received ${value})`);
  }
}

export class InvalidPreferenceError extends DomainError {
  readonly code = 'INVALID_PREFERENCE';

  constructor(reason: string) {
    super(`Invalid preference: ${reason}`);
  }
}

export class PreferenceLimitReachedError extends DomainError {
  readonly code = 'PREFERENCE_LIMIT_REACHED';

  constructor(limit: number) {
    super(`A subscriber can have at most ${limit} preferences`);
  }
}

export class DuplicatePreferenceError extends DomainError {
  readonly code = 'DUPLICATE_PREFERENCE';

  constructor(area: string, region: string) {
    super(`The preference ${area}/${region} already exists`);
  }
}

export class NoPreferencesError extends DomainError {
  readonly code = 'NO_PREFERENCES';

  constructor() {
    super('The subscriber has no preferences yet');
  }
}
