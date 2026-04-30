// value-objects are a business concept, they dont have an ID, but they have to validate themselves
// a value-object must never be initialized with an invalid state
export class Salary {
	constructor(public readonly value: number) {
		if (value < 0) {
			throw new Error("Um salário não pode ser negativo.")
		}
	}

	isBiggerThanOrEqual(otherSalary: Salary): boolean {
		return this.value >= otherSalary.value;
	}
}

