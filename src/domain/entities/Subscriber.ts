import { Preference } from "../value-objects/Preference";
import { Vacancy } from "./Vacancy";

// NO ANEMIC CLASSES
export class Subscriber {
	private preferences: Preference[] = [];

	constructor (
		public readonly telegramId: string,
		public isActive: boolean = true
	) {}

	// aggregation root
	addPreference (preference: Preference): void {
		if (this.preferences.length >= 5) {
			throw new Error("Limite de preferências atingido.");
		}
		this.preferences.push(preference);
	}

	// business rule matching
	hasInterest(vacancy: Vacancy): boolean {
		if (!this.isActive) return false;
		if (this.preferences.length === 0) return false;

		// at least one interest in commom
		return this.preferences.some(pref => {
			const areaMatch = pref.area === vacancy.area || pref.area === "QUALQUER";
			const regionMatch = pref.region === vacancy.region || pref.region === 'BR';
			const salaryMatch = vacancy.salary.isBiggerThanOrEqual(pref.minimunSalary);
			
			return areaMatch && regionMatch && salaryMatch;
		})
	}

	getPreferences(): Preference[] {
		// return a copy
		return [...this.preferences];
	}
}