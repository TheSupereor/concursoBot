import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';

// --- Entidades de Infraestrutura (ORM) ---
import { SubscriberOrmEntity } from './infrastructure/persistence/entities/subscriber.orm-entity';
import { PreferenceOrmEntity } from './infrastructure/persistence/entities/preference.orm-entity';

// --- Adaptadores (Implementações Reais) ---
import { TelegramNotificationService } from './infrastructure/telegram/telegram-notification.service';
import { TelegramBotUpdate } from './infrastructure/telegram/telegram-bot.update';
import { VacancyConsumer } from './infrastructure/messaging/vacancy.consumer';
import { MysqlSubscriberRepository } from './infrastructure/persistence/repositories/mysql-subscriber.repository';
import { MysqlNotificationLogRepository } from './infrastructure/persistence/repositories/mysql-notification-log.repository';
import { ISubscriberRepository } from './domain/ports/subscriber-repository.port';

// --- Casos de Uso (Aplicação) ---
import { NotifySubscriberUseCase } from './application/use-cases/notify-subscriber.use-case';
import { SignUpSubscriberUseCase } from './application/use-cases/sign-up-subscriber.use-case';
import { RemovePreferenceUseCase } from './application/use-cases/remove-preference.use-case';
import { AddPreferenceUseCase } from './application/use-cases/add-preference.use-case';
import { NotificationLogOrmEntity } from './infrastructure/persistence/entities/notification-log.orm-entity';
import { StripeEventOrmEntity } from './infrastructure/persistence/entities/stripe-event.orm-entity';
import { MysqlProcessedEventRepository } from './infrastructure/persistence/repositories/mysql-processed-event.repository';
import { ProcessApprovedPaymentUseCase } from './application/use-cases/process-approved-payment.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';

// --- Controllers ---
import { WebhookController } from './infrastructure/http/webhook.controller';
import { DefineSalaryUseCase } from './application/use-cases/define-salary.use-case';
import { GetSubscriberStatusUseCase } from './application/use-cases/get-subscriber-status.use-case';
import { PciConcursosScraper } from './infrastructure/scraper/pci-concursos.scraper';
import { DlqMonitorService } from './infrastructure/monitoring/dlq-monitor.service';
import {
  rabbitMqUrl,
  vacancyQueueName,
  vacancyQueueOptions,
} from './infrastructure/messaging/rabbitmq.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [
          SubscriberOrmEntity,
          PreferenceOrmEntity,
          NotificationLogOrmEntity,
          StripeEventOrmEntity,
        ],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([
      SubscriberOrmEntity,
      PreferenceOrmEntity,
      NotificationLogOrmEntity,
      StripeEventOrmEntity,
    ]),

    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('TELEGRAM_BOT_TOKEN'),
      }),
    }),

    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitMqUrl()],
          queue: vacancyQueueName(),
          queueOptions: vacancyQueueOptions,
        },
      },
    ]),
  ],
  providers: [
    // --- ADAPTADORES (Portas de Saída) ---
    // Usamos tokens (strings) para que o Domínio não dependa do NestJS
    {
      provide: 'ISubscriberRepository',
      useClass: MysqlSubscriberRepository,
    },
    {
      provide: 'INotificationService',
      useClass: TelegramNotificationService,
    },
    {
      provide: 'IProcessedEventRepository',
      useClass: MysqlProcessedEventRepository,
    },
    {
      provide: 'INotificationLogRepository',
      useClass: MysqlNotificationLogRepository,
    },

    // --- CASOS DE USO (Logística do Negócio) ---
    // Usamos useFactory para injetar as interfaces corretamente
    {
      provide: SignUpSubscriberUseCase,
      useFactory: (repo: MysqlSubscriberRepository) =>
        new SignUpSubscriberUseCase(repo),
      inject: ['ISubscriberRepository'],
    },
    {
      provide: NotifySubscriberUseCase,
      useFactory: (
        repo: MysqlSubscriberRepository,
        notification: TelegramNotificationService,
        notifLog: MysqlNotificationLogRepository,
      ) => new NotifySubscriberUseCase(repo, notification, notifLog),
      inject: [
        'ISubscriberRepository',
        'INotificationService',
        'INotificationLogRepository',
      ],
    },
    {
      provide: AddPreferenceUseCase,
      useFactory: (subscriperRepo: ISubscriberRepository) =>
        new AddPreferenceUseCase(subscriperRepo),
      inject: ['ISubscriberRepository'],
    },
    {
      provide: RemovePreferenceUseCase,
      useFactory: (subscriperRepo: ISubscriberRepository) =>
        new RemovePreferenceUseCase(subscriperRepo),
      inject: ['ISubscriberRepository'],
    },
    {
      provide: ProcessApprovedPaymentUseCase,
      useFactory: (
        subscriperRepo: ISubscriberRepository,
        notification: TelegramNotificationService,
      ) => new ProcessApprovedPaymentUseCase(subscriperRepo, notification),
      inject: ['ISubscriberRepository', 'INotificationService'],
    },
    {
      provide: CancelSubscriptionUseCase,
      useFactory: (
        subscriperRepo: ISubscriberRepository,
        notification: TelegramNotificationService,
      ) => new CancelSubscriptionUseCase(subscriperRepo, notification),
      inject: ['ISubscriberRepository', 'INotificationService'],
    },
    {
      provide: DefineSalaryUseCase,
      useFactory: (subscriperRepo: ISubscriberRepository) =>
        new DefineSalaryUseCase(subscriperRepo),
      inject: ['ISubscriberRepository'],
    },
    {
      provide: GetSubscriberStatusUseCase,
      useFactory: (subscriperRepo: ISubscriberRepository) =>
        new GetSubscriberStatusUseCase(subscriperRepo),
      inject: ['ISubscriberRepository'],
    },

    // --- ENTRADAS (Portas de Entrada / Gatilhos) ---
    TelegramBotUpdate,
    VacancyConsumer,
    PciConcursosScraper,
    DlqMonitorService,
  ],
  controllers: [WebhookController],
})
export class AppModule {}
