import { Subscriber } from '../../../domain/entities/subscriber';
import { Vacancy } from '../../../domain/entities/vacancy';
import { Preference } from '../../../domain/value-objects/preference';
import { Salary } from '../../../domain/value-objects/salary';
import {
  TestDatabase,
  createTestDatabase,
} from '../../../shared/testing/test-database';
import { SubscriberOrmEntity } from '../entities/subscriber.orm-entity';
import { MysqlSubscriberRepository } from './mysql-subscriber.repository';

const pref = (area: string, region: string, salary: number) =>
  new Preference(area, region, new Salary(salary));

describe('MysqlSubscriberRepository (integration)', () => {
  let db: TestDatabase;
  let repository: MysqlSubscriberRepository;

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new MysqlSubscriberRepository(
      db.dataSource.getRepository(SubscriberOrmEntity),
    );
  });

  afterAll(async () => {
    await db.drop();
  });

  beforeEach(async () => {
    // preferences cascade from subscribers
    await db.dataSource.query('DELETE FROM subscribers');
  });

  describe('searchInterestedIn', () => {
    const vacancy = (area: string, region: string, salary: number) =>
      new Vacancy('v1', 'Role', area, region, new Salary(salary));

    it('returns only active subscribers with a preference that matches', async () => {
      const match = new Subscriber('match', true);
      match.addPreference(pref('TI', 'SP', 5000));
      const inactive = new Subscriber('inactive', false);
      inactive.addPreference(pref('TI', 'SP', 0));
      const otherArea = new Subscriber('other-area', true);
      otherArea.addPreference(pref('SAUDE', 'SP', 0));
      const tooDemanding = new Subscriber('too-demanding', true);
      tooDemanding.addPreference(pref('TI', 'SP', 20000));
      for (const s of [match, inactive, otherArea, tooDemanding]) {
        await repository.save(s);
      }

      const found = await repository.searchInterestedIn(
        vacancy('TI', 'SP', 8000),
      );

      expect(found.map((s) => s.telegramId)).toEqual(['match']);
    });

    it('returns the whole aggregate, not only the matching preference', async () => {
      const subscriber = new Subscriber('multi', true);
      subscriber.addPreference(pref('TI', 'SP', 0));
      subscriber.addPreference(pref('SAUDE', 'RJ', 3000));
      await repository.save(subscriber);

      const [found] = await repository.searchInterestedIn(
        vacancy('TI', 'SP', 1000),
      );

      expect(found?.getPreferences()).toHaveLength(2);
    });

    it('returns each subscriber once even when several preferences match', async () => {
      const subscriber = new Subscriber('twice', true);
      subscriber.addPreference(pref('TI', 'SP', 0));
      subscriber.addPreference(pref('QUALQUER', 'BR', 0));
      await repository.save(subscriber);

      const found = await repository.searchInterestedIn(
        vacancy('TI', 'SP', 1000),
      );

      expect(found).toHaveLength(1);
    });

    it('agrees with the domain rule (Subscriber.hasInterest) for every combination', async () => {
      const areas = ['TI', 'SAUDE', 'EDUCACAO', 'QUALQUER'];
      const regions = ['BR', 'SP', 'RJ'];
      const minimums = [0, 5000];
      const subscribers: Subscriber[] = [];

      for (const active of [true, false]) {
        for (const area of areas) {
          for (const region of regions) {
            for (const minimum of minimums) {
              const s = new Subscriber(
                `${active}-${area}-${region}-${minimum}`,
                active,
              );
              s.addPreference(pref(area, region, minimum));
              subscribers.push(s);
            }
          }
        }
      }
      const multi = new Subscriber('multi-pref', true);
      multi.addPreference(pref('SAUDE', 'RJ', 1000));
      multi.addPreference(pref('TI', 'SP', 8000));
      subscribers.push(multi);
      for (const s of subscribers) await repository.save(s);

      let compared = 0;
      for (const area of ['TI', 'SAUDE', 'Geral']) {
        for (const region of ['SP', 'RJ', 'AC']) {
          for (const salary of [0, 1000, 5000, 8000, 9000]) {
            const v = vacancy(area, region, salary);
            const expected = subscribers
              .filter((s) => s.hasInterest(v))
              .map((s) => s.telegramId)
              .sort();

            const actual = (await repository.searchInterestedIn(v))
              .map((s) => s.telegramId)
              .sort();

            expect({ vacancy: `${area}/${region}/${salary}`, actual }).toEqual({
              vacancy: `${area}/${region}/${salary}`,
              actual: expected,
            });
            compared++;
          }
        }
      }
      expect(compared).toBe(45);
    });
  });

  describe('save and load', () => {
    it('round-trips a subscriber with its preferences', async () => {
      const subscriber = new Subscriber('42', true);
      subscriber.addPreference(pref('TI', 'SP', 3500.5));
      await repository.save(subscriber);

      const loaded = await repository.searchByTelegramId('42');

      expect(loaded?.isActive).toBe(true);
      expect(loaded?.getPreferences()).toEqual(subscriber.getPreferences());
    });

    it('returns null for an unknown subscriber', async () => {
      expect(await repository.searchByTelegramId('nobody')).toBeNull();
    });
  });
});
