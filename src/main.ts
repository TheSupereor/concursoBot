import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import {
  ensureDeadLetterQueue,
  vacancyQueueOptions,
} from './infrastructure/messaging/rabbitmq.config';
import { AppConfig } from './shared/config/app.config';
import { APP_CONFIG } from './shared/tokens';

async function bootstrap() {
  const logger = new Logger('Main');

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // required to verify Stripe webhook signatures
  });
  const config = app.get<AppConfig>(APP_CONFIG);

  // The DLQ is only declared, never consumed: rejected messages stay ready for
  // inspection and manual replay, and DlqMonitorService relies on that count.
  await ensureDeadLetterQueue(config.rabbitmq.url);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.rabbitmq.url],
      queue: config.rabbitmq.queue,
      queueOptions: vacancyQueueOptions,
      // false = manual ack, done in VacancyConsumer only after the business rule succeeded.
      noAck: false,
      // Throughput control: at most 10 unacked messages so Telegram's API is not flooded.
      prefetchCount: 10,
    },
  });

  await app.startAllMicroservices();
  logger.log('RabbitMQ consumer connected to the vacancy queue');

  await app.listen(config.port);
  logger.log(`HTTP server listening on port ${config.port}`);
}

void bootstrap();
