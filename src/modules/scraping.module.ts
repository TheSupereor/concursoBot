import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { IngestVacanciesUseCase } from '../application/use-cases/ingest-vacancies.use-case';
import { vacancyQueueOptions } from '../infrastructure/messaging/rabbitmq.config';
import { RabbitMqVacancyPublisher } from '../infrastructure/messaging/rabbitmq-vacancy.publisher';
import { createVacancySources } from '../infrastructure/scraper/vacancy-sources.factory';
import { VacancyIngestionScheduler } from '../infrastructure/scraper/vacancy-ingestion.scheduler';
import { AppConfig } from '../shared/config/app.config';
import { provideUseCase } from '../shared/provide-use-case';
import {
  APP_CONFIG,
  LOGGER,
  RABBITMQ_CLIENT,
  VACANCY_PUBLISHER,
  VACANCY_REPOSITORY,
  VACANCY_SOURCES,
} from '../shared/tokens';
import { PersistenceModule } from './persistence.module';

/** Reads vacancy sources on a schedule and publishes the new vacancies to the vacancy queue. */
@Module({
  imports: [
    PersistenceModule,
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        inject: [APP_CONFIG],
        useFactory: (config: AppConfig) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.rabbitmq.url],
            queue: config.rabbitmq.queue,
            queueOptions: vacancyQueueOptions,
          },
        }),
      },
    ]),
  ],
  providers: [
    { provide: VACANCY_PUBLISHER, useClass: RabbitMqVacancyPublisher },
    {
      provide: VACANCY_SOURCES,
      inject: [APP_CONFIG],
      useFactory: createVacancySources,
    },
    provideUseCase(IngestVacanciesUseCase, [
      VACANCY_SOURCES,
      VACANCY_REPOSITORY,
      VACANCY_PUBLISHER,
      LOGGER,
    ]),
    VacancyIngestionScheduler,
  ],
})
export class ScrapingModule {}
