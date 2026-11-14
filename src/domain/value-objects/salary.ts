import { InvalidSalaryError } from '../errors/domain.error';

// A value object has no identity and must never exist in an invalid state.
export class Salary {
  constructor(public readonly value: number) {
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidSalaryError(value);
    }
  }

  isBiggerThanOrEqual(otherSalary: Salary): boolean {
    return this.value >= otherSalary.value;
  }
}
