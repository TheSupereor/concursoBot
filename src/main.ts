import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import {
  ensureDeadLetterQueue,
  rabbitMqUrl,
  vacancyQueueName,
  vacancyQueueOptions,
} from './infrastructure/messaging/rabbitmq.config';

async function bootstrap() {
  const logger = new Logger('Main');

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // required to verify Stripe webhook signatures
  });

  // The DLQ is only declared, never consumed: rejected messages stay ready for
  // inspection and manual replay, and DlqMonitorService relies on that count.
  await ensureDeadLetterQueue();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMqUrl()],
      queue: vacancyQueueName(),
      queueOptions: vacancyQueueOptions,
      // false = manual ack, done in VacancyConsumer only after the business rule succeeded.
      noAck: false,
      // Throughput control: at most 10 unacked messages so Telegram's API is not flooded.
      prefetchCount: 10,
    },
  });

  // Iniciar o escutador do RabbitMQ
  await app.startAllMicroservices();
  logger.log(
    'RabbitMQ microservice connected and consuming the vacancy queue.',
  );

  // Inicia o servidor HTTP (na porta 3000 ou a que estiver no .env)
  // Isso será usado no futuro para escutar os webhooks do Stripe/Asaas
  const porta = process.env.PORT || 3000;
  await app.listen(porta);
  logger.log(`Servidor HTTP rodando na porta ${porta}`);
  logger.log('Bot do Telegram inicializado');
}

bootstrap();
