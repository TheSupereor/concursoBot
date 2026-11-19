import { NotificationLogOrmEntity } from './notification-log.orm-entity';
import { PreferenceOrmEntity } from './preference.orm-entity';
import { StripeEventOrmEntity } from './stripe-event.orm-entity';
import { SubscriberOrmEntity } from './subscriber.orm-entity';
import { VacancyOrmEntity } from './vacancy.orm-entity';

/** Every persisted entity; shared by the application and the migration CLI. */
export const entities = [
  SubscriberOrmEntity,
  PreferenceOrmEntity,
  NotificationLogOrmEntity,
  StripeEventOrmEntity,
  VacancyOrmEntity,
];
