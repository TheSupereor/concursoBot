import { Salary } from './Salary';

describe('Value Object: Salary', () => {
  it('should create a valid salary when the value is positive', () => {
    const salary = new Salary(5000);
    expect(salary.value).toBe(5000);
  });

  it('should launch an error when tries to create a negative salary', () => {
    expect(() => new Salary(-100)).toThrow('Um salário não pode ser negativo.'); // change to check for a error code in the future?
  });

  it('should return true if is bigger or equal to another salary', () => {
    const desiredSalary = new Salary(5000);
    const vacancySalary = new Salary(8000);
    const lowerSalary = new Salary(3000);

    expect(vacancySalary.isBiggerThanOrEqual(desiredSalary)).toBe(true);
    expect(desiredSalary.isBiggerThanOrEqual(desiredSalary)).toBe(true);
    expect(lowerSalary.isBiggerThanOrEqual(desiredSalary)).toBe(false);
  });
});
