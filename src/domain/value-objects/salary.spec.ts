import { InvalidSalaryError } from '../errors/domain.error';
import { Salary } from './salary';

describe('Value Object: Salary', () => {
  it('creates a salary from a non-negative value', () => {
    expect(new Salary(5000).value).toBe(5000);
    expect(new Salary(0).value).toBe(0);
  });

  it.each([-100, NaN, Infinity])('rejects the invalid value %p', (value) => {
    expect(() => new Salary(value)).toThrow(InvalidSalaryError);
  });

  it('exposes a stable error code for the UI layer', () => {
    expect(() => new Salary(-1)).toThrow(
      expect.objectContaining({ code: 'INVALID_SALARY' }),
    );
  });

  it('compares with another salary', () => {
    const desiredSalary = new Salary(5000);

    expect(new Salary(8000).isBiggerThanOrEqual(desiredSalary)).toBe(true);
    expect(desiredSalary.isBiggerThanOrEqual(desiredSalary)).toBe(true);
    expect(new Salary(3000).isBiggerThanOrEqual(desiredSalary)).toBe(false);
  });
});
