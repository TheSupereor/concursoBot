import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Main');

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // <-- ADICIONE ISSO AQUI
  });

  // Conecta o "Motor" de Microserviços (RabbitMQ) à aplicação
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: process.env.RABBITMQ_QUEUE || 'concursos.new',
      queueOptions: {
        durable: true,
      },
      // FUNDAMENTAL: false significa que nós vamos confirmar manualmente (ack)
      // lá no VacancyConsumer apenas depois de processar a regra de negócio.
      noAck: false,
      // Controla a vazão: pega apenas 10 mensagens por vez para não estourar a API do Telegram
      prefetchCount: 10,
    },
  });

  // Iniciar o escutador do RabbitMQ
  await app.startAllMicroservices();
  logger.log('Microserviço RabbitMQ conectado e escutando filas.');

  // Inicia o servidor HTTP (na porta 3000 ou a que estiver no .env)
  // Isso será usado no futuro para escutar os webhooks do Stripe/Asaas
  const porta = process.env.PORT || 3000;
  await app.listen(porta);
  logger.log(`Servidor HTTP rodando na porta ${porta}`);
  logger.log('Bot do Telegram inicializado');
}

bootstrap();
