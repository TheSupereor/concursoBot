import { Subscriber } from '../../../domain/entities/subscriber';
import { Preference } from '../../../domain/value-objects/preference';
import { Salary } from '../../../domain/value-objects/salary';
import { PreferenceOrmEntity } from '../entities/preference.orm-entity';
import { SubscriberOrmEntity } from '../entities/subscriber.orm-entity';

/**
 * Translates between the domain aggregate and its persistence model, so neither knows about
 * the other's shape.
 */
export class SubscriberMapper {
  static toDomain(orm: SubscriberOrmEntity): Subscriber {
    const subscriber = new Subscriber(orm.telegramId, orm.isActive);

    for (const preference of orm.preferences ?? []) {
      subscriber.addPreference(
        new Preference(
          preference.area,
          preference.region,
          // DECIMAL columns come back from MySQL as strings.
          new Salary(Number(preference.minimumSalary)),
        ),
      );
    }

    return subscriber;
  }

  static toOrm(subscriber: Subscriber): SubscriberOrmEntity {
    const orm = new SubscriberOrmEntity();
    orm.telegramId = subscriber.telegramId;
    orm.isActive = subscriber.isActive;
    orm.preferences = subscriber.getPreferences().map((preference) => {
      const row = new PreferenceOrmEntity();
      row.area = preference.area;
      row.region = preference.region;
      row.minimumSalary = preference.minimumSalary.value;
      return row;
    });
    return orm;
  }
}
