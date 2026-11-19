import { Subscriber } from '../../../domain/entities/subscriber';
import { Preference } from '../../../domain/value-objects/preference';
import { Salary } from '../../../domain/value-objects/salary';
import { PreferenceOrmEntity } from '../entities/preference.orm-entity';
import { SubscriberOrmEntity } from '../entities/subscriber.orm-entity';
import { SubscriberMapper } from './subscriber.mapper';

describe('SubscriberMapper', () => {
  const ormSubscriber = (): SubscriberOrmEntity => {
    const orm = new SubscriberOrmEntity();
    orm.telegramId = '42';
    orm.isActive = true;
    const preference = new PreferenceOrmEntity();
    preference.area = 'TI';
    preference.region = 'SP';
    // MySQL returns DECIMAL columns as strings
    preference.minimumSalary = '3500.00' as unknown as number;
    orm.preferences = [preference];
    return orm;
  };

  it('rebuilds the domain aggregate from a persisted row', () => {
    const subscriber = SubscriberMapper.toDomain(ormSubscriber());

    expect(subscriber.telegramId).toBe('42');
    expect(subscriber.isActive).toBe(true);
    expect(subscriber.getPreferences()).toHaveLength(1);
    expect(subscriber.getPreferences()[0]?.minimumSalary.value).toBe(3500);
  });

  it('tolerates a row loaded without its preferences relation', () => {
    const orm = ormSubscriber();
    orm.preferences = undefined as unknown as PreferenceOrmEntity[];

    expect(SubscriberMapper.toDomain(orm).getPreferences()).toEqual([]);
  });

  it('maps a domain aggregate to a persistable row', () => {
    const subscriber = new Subscriber('7', false);
    subscriber.addPreference(new Preference('SAUDE', 'BR', new Salary(0)));

    const orm = SubscriberMapper.toOrm(subscriber);

    expect(orm).toBeInstanceOf(SubscriberOrmEntity);
    expect(orm.telegramId).toBe('7');
    expect(orm.isActive).toBe(false);
    expect(orm.preferences).toHaveLength(1);
    expect(orm.preferences?.[0]).toMatchObject({
      area: 'SAUDE',
      region: 'BR',
      minimumSalary: 0,
    });
  });

  it('round-trips without losing data', () => {
    const original = SubscriberMapper.toDomain(ormSubscriber());

    const roundTripped = SubscriberMapper.toDomain(
      SubscriberMapper.toOrm(original),
    );

    expect(roundTripped.getPreferences()).toEqual(original.getPreferences());
    expect(roundTripped.isActive).toBe(original.isActive);
  });

  describe('reusing persisted rows', () => {
    const existingRow = (): SubscriberOrmEntity => {
      const orm = new SubscriberOrmEntity();
      orm.telegramId = '7';
      orm.isActive = true;
      const keep = new PreferenceOrmEntity();
      keep.id = 10;
      keep.area = 'TI';
      keep.region = 'SP';
      keep.minimumSalary = '1000.00';
      const drop = new PreferenceOrmEntity();
      drop.id = 11;
      drop.area = 'SAUDE';
      drop.region = 'RJ';
      drop.minimumSalary = '0.00';
      orm.preferences = [keep, drop];
      return orm;
    };

    it('keeps the id of a preference with the same area and region and updates its salary', () => {
      const subscriber = new Subscriber('7', true);
      subscriber.addPreference(new Preference('TI', 'SP', new Salary(9000)));

      const orm = SubscriberMapper.toOrm(subscriber, existingRow());

      expect(orm.preferences).toHaveLength(1);
      expect(orm.preferences?.[0]?.id).toBe(10);
      expect(orm.preferences?.[0]?.minimumSalary).toBe(9000);
    });

    it('creates a new row for a preference that did not exist and omits removed ones', () => {
      const subscriber = new Subscriber('7', true);
      subscriber.addPreference(new Preference('EDUCACAO', 'BR', new Salary(0)));

      const orm = SubscriberMapper.toOrm(subscriber, existingRow());

      expect(orm.preferences).toHaveLength(1);
      expect(orm.preferences?.[0]?.id).toBeUndefined();
      expect(orm.preferences?.[0]?.area).toBe('EDUCACAO');
    });
  });
});
