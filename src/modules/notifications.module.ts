import { Module } from '@nestjs/common';
import { NotifySubscriberUseCase } from '../application/use-cases/notify-subscriber.use-case';
import { VacancyConsumer } from '../infrastructure/messaging/vacancy.consumer';
import { provideUseCase } from '../shared/provide-use-case';
import {
  LOGGER,
  NOTIFICATION_LOG_REPOSITORY,
  NOTIFICATION_SERVICE,
  SUBSCRIBER_REPOSITORY,
} from '../shared/tokens';
import { PersistenceModule } from './persistence.module';
import { TelegramModule } from './telegram.module';

/** Matches vacancies from the queue against subscribers and delivers the alerts. */
@Module({
  imports: [PersistenceModule, TelegramModule],
  providers: [
    provideUseCase(NotifySubscriberUseCase, [
      SUBSCRIBER_REPOSITORY,
      NOTIFICATION_SERVICE,
      NOTIFICATION_LOG_REPOSITORY,
      LOGGER,
    ]),
  ],
  controllers: [VacancyConsumer],
})
export class NotificationsModule {}
