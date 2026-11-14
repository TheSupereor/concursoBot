import { InvalidPreferenceError } from '../errors/domain.error';
import { AREAS } from './area';
import { Preference } from './preference';
import { REGIONS } from './region';
import { Salary } from './salary';

describe('Value Object: Preference', () => {
  it('accepts every supported area and region', () => {
    for (const area of AREAS) {
      for (const region of REGIONS) {
        expect(() => new Preference(area, region, new Salary(0))).not.toThrow();
      }
    }
  });

  it.each([
    ['unknown area', 'ASTRONAUTA', 'SP'],
    ['unknown region', 'TI', 'XX'],
    ['empty area', '', 'SP'],
    ['empty region', 'TI', ''],
  ])('rejects %s', (_label, area, region) => {
    expect(() => new Preference(area, region, new Salary(0))).toThrow(
      InvalidPreferenceError,
    );
  });

  it('is immutable: changing the salary returns a new preference', () => {
    const original = new Preference('TI', 'SP', new Salary(1000));

    const updated = original.withMinimumSalary(new Salary(5000));

    expect(updated).not.toBe(original);
    expect(updated.minimumSalary.value).toBe(5000);
    expect(original.minimumSalary.value).toBe(1000);
    expect(updated.area).toBe('TI');
    expect(updated.region).toBe('SP');
  });

  it('identifies the same area and region regardless of salary', () => {
    const a = new Preference('TI', 'SP', new Salary(0));

    expect(
      a.hasSameTargetAs(new Preference('TI', 'SP', new Salary(9000))),
    ).toBe(true);
    expect(a.hasSameTargetAs(new Preference('TI', 'RJ', new Salary(0)))).toBe(
      false,
    );
    expect(
      a.hasSameTargetAs(new Preference('SAUDE', 'SP', new Salary(0))),
    ).toBe(false);
  });
});
