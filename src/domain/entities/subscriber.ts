import { Preference } from '../value-objects/preference';
import { Salary } from '../value-objects/salary';
import { Vacancy } from './vacancy';

// NO ANEMIC CLASSES
export class Subscriber {
  private preferences: Preference[] = [];

  constructor(
    public readonly telegramId: string,
    public isActive: boolean = false,
  ) {}

  activateSubscription(): void {
    this.isActive = true;
  }

  cancelSubscription(): void {
    this.isActive = false;
  }

  // aggregation root
  addPreference(preference: Preference): void {
    if (this.preferences.length >= 5) {
      throw new Error('Limite de preferências atingido.');
    }
    this.preferences.push(preference);
  }

  removePreferenceByArea(areaToRemove: string): void {
    this.preferences = this.preferences.filter(
      (pref) => pref.area !== areaToRemove,
    );
  }

  // business rule matching
  hasInterest(vacancy: Vacancy): boolean {
    if (!this.isActive) return false;
    if (this.preferences.length === 0) return false;

    // at least one interest in commom
    return this.preferences.some((pref) => {
      const areaMatch = pref.area === vacancy.area || pref.area === 'QUALQUER';
      const regionMatch =
        pref.region === vacancy.region || pref.region === 'BR';
      const salaryMatch = vacancy.salary.isBiggerThanOrEqual(
        pref.minimunSalary,
      );

      return areaMatch && regionMatch && salaryMatch;
    });
  }

  getPreferences(): Preference[] {
    // return a copy
    return [...this.preferences];
  }

  defineMinimumGlobalSalary(newSalary: Salary): void {
    if (this.preferences.length === 0) {
      throw new Error(
        'Você precisa adicionar pelo menos uma área antes de definir o salário.',
      );
    }

    // Atualiza o piso salarial de todas as preferências atuais
    for (const pref of this.preferences) {
      pref.minimunSalary = newSalary;
    }
  }
}
