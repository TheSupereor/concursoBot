import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';

// --- Entidades de Infraestrutura (ORM) ---
import { SubscriberOrmEntity } from './domain/entities/SubscriberOrmEntity';
import { PreferenceOrmEntity } from './domain/entities/PreferenceOrmEntity';

// --- Adaptadores (Implementações Reais) ---
import { TelegramNotificationService } from './infrastructure/telegram/TelegramNotificationService';
import { TelegramBotUpdate } from './infrastructure/telegram/TelegramBotUpdate';
import { VacancyConsumer } from './infrastructure/messaging/VacancyConsumer';
import { MysqlSubscriberRepository } from './infrastructure/database/repositories/MysqlAssinanteRepository';
import { MysqlNotificationLogRepository } from './infrastructure/database/repositories/MysqlNotificationLogRepository';
import { ISubscriberRepository } from './domain/ports/ISubscriberRepository';

// --- Casos de Uso (Aplicação) ---
import { NotifySubscriberUseCase } from './application/use-cases/NotifySubscriberUseCase';
import { SignUpSubscriberUseCase } from './application/use-cases/SignUpSubscriberUseCase';
import { RemovePreferenceUseCase } from './application/use-cases/removePreferenceUseCase';
import { AddPreferenceUseCase } from './application/use-cases/addPreferenceUseCase';
import { NotificationLogOrmEntity } from './domain/entities/NotificationLogOrmEntity';
import { ProcessApprovedPaymentUseCase } from './application/use-cases/processApprovedPaymentUseCase';
import { CancelSubscriptionUseCase } from './application/use-cases/cancelSubscription';

// --- Controllers ---
import { WebhookController } from './infrastructure/http/WebhookController';
import { DefineSalaryUseCase } from './application/use-cases/DefineSalaryUseCase';
import { PciConcursosScrapper } from './infrastructure/scrapper/pciConcursosScrapper';

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
        ],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([
      SubscriberOrmEntity,
      PreferenceOrmEntity,
      NotificationLogOrmEntity,
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
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: process.env.RABBITMQ_QUEUE || 'concursos.new',
          queueOptions: { durable: true },
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

    // --- ENTRADAS (Portas de Entrada / Gatilhos) ---
    TelegramBotUpdate,
    VacancyConsumer,
    PciConcursosScrapper,
  ],
  controllers: [WebhookController],
})
export class AppModule {}
