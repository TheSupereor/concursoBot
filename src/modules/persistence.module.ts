import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../shared/config/app.config';
import {
  APP_CONFIG,
  NOTIFICATION_LOG_REPOSITORY,
  PROCESSED_EVENT_REPOSITORY,
  SUBSCRIBER_REPOSITORY,
  VACANCY_REPOSITORY,
} from '../shared/tokens';
import { entities } from '../infrastructure/persistence/entities';
import { migrations } from '../infrastructure/persistence/migrations';
import { MysqlNotificationLogRepository } from '../infrastructure/persistence/repositories/mysql-notification-log.repository';
import { MysqlProcessedEventRepository } from '../infrastructure/persistence/repositories/mysql-processed-event.repository';
import { MysqlVacancyRepository } from '../infrastructure/persistence/repositories/mysql-vacancy.repository';
import { MysqlSubscriberRepository } from '../infrastructure/persistence/repositories/mysql-subscriber.repository';

/** Database connection and the repository adapters bound to their domain ports. */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        type: 'mysql' as const,
        ...config.database,
        entities,
        // The schema is owned by migrations; synchronize can silently drop columns.
        synchronize: false,
        migrations,
        migrationsRun: true,
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
    { provide: VACANCY_REPOSITORY, useClass: MysqlVacancyRepository },
  ],
  exports: [
    SUBSCRIBER_REPOSITORY,
    NOTIFICATION_LOG_REPOSITORY,
    PROCESSED_EVENT_REPOSITORY,
    VACANCY_REPOSITORY,
  ],
})
export class PersistenceModule {}
