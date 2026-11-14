import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PciConcursosScraper } from '../infrastructure/scraper/pci-concursos.scraper';
import { vacancyQueueOptions } from '../infrastructure/messaging/rabbitmq.config';
import { AppConfig } from '../shared/config/app.config';
import { APP_CONFIG, RABBITMQ_CLIENT } from '../shared/tokens';

/** Collects vacancies on a schedule and publishes them to the vacancy queue. */
@Module({
  imports: [
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
  providers: [PciConcursosScraper],
})
export class ScrapingModule {}
