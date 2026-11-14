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
    preference.minimunSalary = '3500.00' as unknown as number;
    orm.preferences = [preference];
    return orm;
  };

  it('rebuilds the domain aggregate from a persisted row', () => {
    const subscriber = SubscriberMapper.toDomain(ormSubscriber());

    expect(subscriber.telegramId).toBe('42');
    expect(subscriber.isActive).toBe(true);
    expect(subscriber.getPreferences()).toHaveLength(1);
    expect(subscriber.getPreferences()[0].minimunSalary.value).toBe(3500);
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
    expect(orm.preferences[0]).toMatchObject({
      area: 'SAUDE',
      region: 'BR',
      minimunSalary: 0,
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
});
