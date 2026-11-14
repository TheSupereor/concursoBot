import {
  DuplicatePreferenceError,
  NoPreferencesError,
  PreferenceLimitReachedError,
} from '../errors/domain.error';
import { Preference } from '../value-objects/preference';
import { Salary } from '../value-objects/salary';
import { Vacancy } from './vacancy';

export const MAX_PREFERENCES = 5;

/** Aggregate root: preferences are only changed through the subscriber. */
export class Subscriber {
  private preferences: Preference[] = [];
  private active: boolean;

  constructor(
    public readonly telegramId: string,
    isActive: boolean = false,
  ) {
    this.active = isActive;
  }

  get isActive(): boolean {
    return this.active;
  }

  activateSubscription(): void {
    this.active = true;
  }

  cancelSubscription(): void {
    this.active = false;
  }

  addPreference(preference: Preference): void {
    if (this.preferences.length >= MAX_PREFERENCES) {
      throw new PreferenceLimitReachedError(MAX_PREFERENCES);
    }
    if (this.preferences.some((p) => p.hasSameTargetAs(preference))) {
      throw new DuplicatePreferenceError(preference.area, preference.region);
    }
    this.preferences.push(preference);
  }

  removePreference(area: string, region: string): void {
    this.preferences = this.preferences.filter(
      (p) => !(p.area === area && p.region === region),
    );
  }

  /** Applies one minimum salary to every current preference. */
  applyMinimumSalary(salary: Salary): void {
    if (this.preferences.length === 0) {
      throw new NoPreferencesError();
    }
    this.preferences = this.preferences.map((p) => p.withMinimumSalary(salary));
  }

  /** Business rule: is this vacancy worth an alert for this subscriber? */
  hasInterest(vacancy: Vacancy): boolean {
    if (!this.active) return false;

    // Interested when at least one preference matches.
    return this.preferences.some((pref) => {
      const areaMatch = pref.area === vacancy.area || pref.area === 'QUALQUER';
      const regionMatch =
        pref.region === vacancy.region || pref.region === 'BR';
      const salaryMatch = vacancy.salary.isBiggerThanOrEqual(
        pref.minimumSalary,
      );

      return areaMatch && regionMatch && salaryMatch;
    });
  }

  getPreferences(): Preference[] {
    return [...this.preferences];
  }
}
