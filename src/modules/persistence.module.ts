import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../shared/config/app.config';
import {
  APP_CONFIG,
  NOTIFICATION_LOG_REPOSITORY,
  PROCESSED_EVENT_REPOSITORY,
  SUBSCRIBER_REPOSITORY,
} from '../shared/tokens';
import { NotificationLogOrmEntity } from '../infrastructure/persistence/entities/notification-log.orm-entity';
import { PreferenceOrmEntity } from '../infrastructure/persistence/entities/preference.orm-entity';
import { StripeEventOrmEntity } from '../infrastructure/persistence/entities/stripe-event.orm-entity';
import { SubscriberOrmEntity } from '../infrastructure/persistence/entities/subscriber.orm-entity';
import { MysqlNotificationLogRepository } from '../infrastructure/persistence/repositories/mysql-notification-log.repository';
import { MysqlProcessedEventRepository } from '../infrastructure/persistence/repositories/mysql-processed-event.repository';
import { MysqlSubscriberRepository } from '../infrastructure/persistence/repositories/mysql-subscriber.repository';

const entities = [
  SubscriberOrmEntity,
  PreferenceOrmEntity,
  NotificationLogOrmEntity,
  StripeEventOrmEntity,
];

/** Database connection and the repository adapters bound to their domain ports. */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        type: 'mysql' as const,
        ...config.database,
        entities,
        // TODO(phase 3): replace with migrations. Never enable in production.
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [
    { provide: SUBSCRIBER_REPOSITORY, useClass: MysqlSubscriberRepository },
    {
      provide: NOTIFICATION_LOG_REPOSITORY,
      useClass: MysqlNotificationLogRepository,
    },
    {
      provide: PROCESSED_EVENT_REPOSITORY,
      useClass: MysqlProcessedEventRepository,
    },
  ],
  exports: [
    SUBSCRIBER_REPOSITORY,
    NOTIFICATION_LOG_REPOSITORY,
    PROCESSED_EVENT_REPOSITORY,
  ],
})
export class PersistenceModule {}
