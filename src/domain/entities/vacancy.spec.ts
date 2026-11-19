import { Salary } from '../value-objects/salary';
import { Subscriber } from './subscriber';
import { Vacancy } from './vacancy';
import { Preference } from '../value-objects/preference';

const salary = new Salary(5000);

describe('Vacancy', () => {
  it('accepts a single area', () => {
    const vacancy = new Vacancy('v', 'Role', 'TI', 'SP', salary);

    expect(vacancy.areas).toEqual(['TI']);
    expect(vacancy.area).toBe('TI');
  });

  it('accepts several areas and exposes the first as the primary one', () => {
    const vacancy = new Vacancy('v', 'Role', ['EDUCACAO', 'TI'], 'SP', salary);

    expect(vacancy.areas).toEqual(['EDUCACAO', 'TI']);
    expect(vacancy.area).toBe('EDUCACAO');
  });

  it('keeps optional details such as the link, organization and deadline', () => {
    const deadline = new Date('2026-12-14T00:00:00.000Z');
    const vacancy = new Vacancy('v', 'Role', 'TI', 'SP', salary, {
      url: 'https://example.test/edital',
      organization: 'Prefeitura de Exemplo',
      deadline,
    });

    expect(vacancy.details).toEqual({
      url: 'https://example.test/edital',
      organization: 'Prefeitura de Exemplo',
      deadline,
    });
  });

  it('has empty details by default', () => {
    expect(new Vacancy('v', 'Role', 'TI', 'SP', salary).details).toEqual({});
  });

  it('rejects a vacancy without any area', () => {
    expect(() => new Vacancy('v', 'Role', [], 'SP', salary)).toThrow();
  });

  describe('matching a subscriber', () => {
    const subscriberWith = (area: string) => {
      const subscriber = new Subscriber('1', true);
      subscriber.addPreference(new Preference(area, 'SP', new Salary(0)));
      return subscriber;
    };
    const vacancy = new Vacancy(
      'v',
      'Role',
      ['EDUCACAO', 'TI'],
      'SP',
      new Salary(1000),
    );

    it('interests a subscriber who follows any one of the areas', () => {
      expect(subscriberWith('TI').hasInterest(vacancy)).toBe(true);
      expect(subscriberWith('EDUCACAO').hasInterest(vacancy)).toBe(true);
    });

    it('does not interest a subscriber who follows none of them', () => {
      expect(subscriberWith('SAUDE').hasInterest(vacancy)).toBe(false);
    });

    it('interests a subscriber who follows any area', () => {
      expect(subscriberWith('QUALQUER').hasInterest(vacancy)).toBe(true);
    });
  });
});
