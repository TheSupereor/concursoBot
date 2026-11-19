import { Subscriber } from '../../../domain/entities/subscriber';
import { Preference } from '../../../domain/value-objects/preference';
import { Salary } from '../../../domain/value-objects/salary';
import {
  TestDatabase,
  createTestDatabase,
} from '../../../shared/testing/test-database';
import { PreferenceOrmEntity } from '../entities/preference.orm-entity';
import { SubscriberOrmEntity } from '../entities/subscriber.orm-entity';
import { MysqlSubscriberRepository } from './mysql-subscriber.repository';

const pref = (area: string, region: string, salary = 0) =>
  new Preference(area, region, new Salary(salary));

describe('MysqlSubscriberRepository.save (integration)', () => {
  let db: TestDatabase;
  let repository: MysqlSubscriberRepository;

  const preferenceRows = () =>
    db.dataSource.getRepository(PreferenceOrmEntity).find({
      order: { id: 'ASC' },
      relations: { subscriber: true },
    });

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
    await db.dataSource.query('DELETE FROM subscribers');
  });

  it('keeps the ids of unchanged preferences when another preference is added', async () => {
    const subscriber = new Subscriber('42', true);
    subscriber.addPreference(pref('TI', 'SP'));
    subscriber.addPreference(pref('SAUDE', 'RJ'));
    await repository.save(subscriber);
    const before = await preferenceRows();

    const loaded = (await repository.searchByTelegramId('42'))!;
    loaded.addPreference(pref('EDUCACAO', 'BR'));
    await repository.save(loaded);
    const after = await preferenceRows();

    expect(after).toHaveLength(3);
    expect(after.slice(0, 2).map((r) => r.id)).toEqual(before.map((r) => r.id));
  });

  it('updates a preference in place when only its salary changes', async () => {
    const subscriber = new Subscriber('42', true);
    subscriber.addPreference(pref('TI', 'SP', 1000));
    await repository.save(subscriber);
    const [before] = await preferenceRows();

    const loaded = (await repository.searchByTelegramId('42'))!;
    loaded.applyMinimumSalary(new Salary(7000));
    await repository.save(loaded);
    const rows = await preferenceRows();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(before?.id);
    expect(Number(rows[0]?.minimumSalary)).toBe(7000);
  });

  it('removes only the preferences that were removed', async () => {
    const subscriber = new Subscriber('42', true);
    subscriber.addPreference(pref('TI', 'SP'));
    subscriber.addPreference(pref('TI', 'RJ'));
    await repository.save(subscriber);
    const [first] = await preferenceRows();

    const loaded = (await repository.searchByTelegramId('42'))!;
    loaded.removePreference('TI', 'RJ');
    await repository.save(loaded);
    const rows = await preferenceRows();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(first?.id);
    expect(rows[0]?.region).toBe('SP');
  });

  it('does not leave orphan preferences when a subscriber is deleted', async () => {
    const subscriber = new Subscriber('42', true);
    subscriber.addPreference(pref('TI', 'SP'));
    await repository.save(subscriber);

    await db.dataSource.query("DELETE FROM subscribers WHERE telegramId='42'");

    expect(await preferenceRows()).toHaveLength(0);
  });

  it('is atomic: a failing save changes nothing', async () => {
    const subscriber = new Subscriber('42', true);
    subscriber.addPreference(pref('TI', 'SP', 1000));
    await repository.save(subscriber);

    // The salary exceeds DECIMAL(10,2), so inserting this preference fails after the
    // subscriber row would already have been updated.
    const loaded = (await repository.searchByTelegramId('42'))!;
    loaded.cancelSubscription();
    loaded.addPreference(pref('SAUDE', 'RJ', 999999999999));

    await expect(repository.save(loaded)).rejects.toThrow();

    const unchanged = (await repository.searchByTelegramId('42'))!;
    expect(unchanged.isActive).toBe(true);
    expect(unchanged.getPreferences()).toHaveLength(1);
  });
});
