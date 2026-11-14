import {
  DuplicatePreferenceError,
  NoPreferencesError,
  PreferenceLimitReachedError,
} from '../errors/domain.error';
import { AREAS } from '../value-objects/area';
import { Preference } from '../value-objects/preference';
import { Salary } from '../value-objects/salary';
import { MAX_PREFERENCES, Subscriber } from './subscriber';
import { Vacancy } from './vacancy';

const preference = (area: string, region = 'SP', salary = 0) =>
  new Preference(area, region, new Salary(salary));

describe('Entity: Subscriber', () => {
  describe('subscription state', () => {
    it('starts inactive unless told otherwise', () => {
      expect(new Subscriber('1').isActive).toBe(false);
    });

    it('is activated and cancelled through domain methods', () => {
      const subscriber = new Subscriber('1');

      subscriber.activateSubscription();
      expect(subscriber.isActive).toBe(true);

      subscriber.cancelSubscription();
      expect(subscriber.isActive).toBe(false);
    });
  });

  describe('preference management', () => {
    it(`allows up to ${MAX_PREFERENCES} preferences`, () => {
      const subscriber = new Subscriber('1');

      for (const area of AREAS.slice(0, MAX_PREFERENCES)) {
        subscriber.addPreference(preference(area));
      }

      expect(subscriber.getPreferences()).toHaveLength(MAX_PREFERENCES);
    });

    it('blocks the preference beyond the limit with a typed error', () => {
      const subscriber = new Subscriber('1');
      for (const area of AREAS.slice(0, MAX_PREFERENCES)) {
        subscriber.addPreference(preference(area));
      }

      expect(() => subscriber.addPreference(preference('TI', 'RJ'))).toThrow(
        PreferenceLimitReachedError,
      );
    });

    it('rejects the same area and region twice, but allows another region', () => {
      const subscriber = new Subscriber('1');
      subscriber.addPreference(preference('TI', 'SP'));

      expect(() =>
        subscriber.addPreference(preference('TI', 'SP', 9000)),
      ).toThrow(DuplicatePreferenceError);

      subscriber.addPreference(preference('TI', 'RJ'));
      expect(subscriber.getPreferences()).toHaveLength(2);
    });

    it('removes only the preference with the given area and region', () => {
      const subscriber = new Subscriber('1');
      subscriber.addPreference(preference('TI', 'SP'));
      subscriber.addPreference(preference('TI', 'RJ'));

      subscriber.removePreference('TI', 'SP');

      const left = subscriber.getPreferences();
      expect(left).toHaveLength(1);
      expect(left[0].region).toBe('RJ');
    });

    it('does not expose its internal list', () => {
      const subscriber = new Subscriber('1');
      subscriber.addPreference(preference('TI'));

      subscriber.getPreferences().pop();

      expect(subscriber.getPreferences()).toHaveLength(1);
    });
  });

  describe('minimum salary', () => {
    it('applies the new minimum to every preference without mutating old ones', () => {
      const subscriber = new Subscriber('1');
      subscriber.addPreference(preference('TI', 'SP', 1000));
      subscriber.addPreference(preference('SAUDE', 'RJ', 2000));
      const before = subscriber.getPreferences();

      subscriber.applyMinimumSalary(new Salary(7000));

      expect(
        subscriber.getPreferences().map((p) => p.minimumSalary.value),
      ).toEqual([7000, 7000]);
      expect(before.map((p) => p.minimumSalary.value)).toEqual([1000, 2000]);
    });

    it('requires at least one preference', () => {
      expect(() =>
        new Subscriber('1').applyMinimumSalary(new Salary(5000)),
      ).toThrow(NoPreferencesError);
    });
  });

  describe('vacancy matching (hasInterest)', () => {
    let subscriber: Subscriber;
    const vacancy = (area: string, region: string, salary: number) =>
      new Vacancy('v1', 'Role', area, region, new Salary(salary));

    beforeEach(() => {
      subscriber = new Subscriber('1', true);
    });

    it('has no interest when inactive', () => {
      const inactive = new Subscriber('2', false);
      inactive.addPreference(preference('TI', 'SP', 5000));

      expect(inactive.hasInterest(vacancy('TI', 'SP', 6000))).toBe(false);
    });

    it('has no interest without preferences', () => {
      expect(subscriber.hasInterest(vacancy('TI', 'SP', 6000))).toBe(false);
    });

    it('matches when area and region match and the salary is high enough', () => {
      subscriber.addPreference(preference('TI', 'SP', 5000));

      expect(subscriber.hasInterest(vacancy('TI', 'SP', 8000))).toBe(true);
    });

    it('does not match when the salary is below the minimum', () => {
      subscriber.addPreference(preference('TI', 'SP', 10000));

      expect(subscriber.hasInterest(vacancy('TI', 'SP', 3000))).toBe(false);
    });

    it('matches any region for a national (BR) preference', () => {
      subscriber.addPreference(preference('TI', 'BR', 5000));

      expect(subscriber.hasInterest(vacancy('TI', 'AC', 6000))).toBe(true);
      expect(subscriber.hasInterest(vacancy('TI', 'RS', 6000))).toBe(true);
    });

    it('matches any area for a QUALQUER preference', () => {
      subscriber.addPreference(preference('QUALQUER', 'SP'));

      expect(subscriber.hasInterest(vacancy('SAUDE', 'SP', 1000))).toBe(true);
    });

    it('matches when any one preference matches', () => {
      subscriber.addPreference(preference('SAUDE', 'RJ', 5000));
      subscriber.addPreference(preference('TI', 'SP', 8000));

      expect(subscriber.hasInterest(vacancy('TI', 'SP', 9000))).toBe(true);
    });
  });
});
