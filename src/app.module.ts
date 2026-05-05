import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';

// --- Entidades de Infraestrutura (ORM) ---
import { SubscriberOrmEntity } from './domain/entities/SubscriberOrmEntity';
import { PreferenceOrmEntity } from './domain/entities/PreferenceOrmEntity';

// --- Adaptadores (Implementações Reais) ---
import { TelegramNotificationService } from './infrastructure/telegram/TelegramNotificationService';
import { TelegramBotUpdate } from './infrastructure/telegram/TelegramBotUpdate';
import { VacancyConsumer } from './infrastructure/messaging/VacancyConsumer';
import { MysqlSubscriberRepository } from './infrastructure/database/repositories/MysqlAssinanteRepository';

// --- Casos de Uso (Aplicação) ---
import { NotifySubscriberUseCase } from './application/use-cases/NotifySubscriberUseCase';
import { SignUpSubscriberUseCase } from './application/use-cases/SignUpSubscriberUseCase';
import { MysqlNotificationLogRepository } from './infrastructure/database/repositories/MysqlNotificationLogRepository';
import { RemovePreferenceUseCase } from './application/use-cases/removePreferenceUseCase';
import { ISubscriberRepository } from './domain/ports/ISubscriberRepository';
import { AddPreferenceUseCase } from './application/use-cases/addPreferenceUseCase';
import { NotificationLogOrmEntity } from './domain/entities/NotificationLogOrmEntity';
import { ProcessApprovedPaymentUseCase } from './application/use-cases/processApprovedPaymentUseCase';
import { WebhookController } from './infrastructure/http/WebhookController';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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
        entities: [SubscriberOrmEntity, PreferenceOrmEntity],
        synchronize: true, // Em produção, use migrations!
      }),
    }),
    TypeOrmModule.forFeature([SubscriberOrmEntity, PreferenceOrmEntity, NotificationLogOrmEntity]),

    // Conexão com o Bot do Telegram
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('TELEGRAM_BOT_TOKEN'),
      }),
    }),
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
      useFactory: (repo: MysqlSubscriberRepository) => new SignUpSubscriberUseCase(repo),
      inject: ['ISubscriberRepository'],
    },
    {
      provide: NotifySubscriberUseCase,
      useFactory: (repo: MysqlSubscriberRepository, notification: TelegramNotificationService, notifLog: MysqlNotificationLogRepository) =>
        new NotifySubscriberUseCase(repo, notification, notifLog),
      inject: ['ISubscriberRepository', 'INotificationService', 'INotificationLogRepository'],
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
      useFactory: (subscriperRepo: ISubscriberRepository, notification: TelegramNotificationService) => 
        new ProcessApprovedPaymentUseCase(subscriperRepo, notification),
      inject: ['ISubscriberRepository', 'INotificationService'],
    },

    // --- ENTRADAS (Portas de Entrada / Gatilhos) ---
    TelegramBotUpdate, // Responde ao /start
    VacancyConsumer,      // Responde ao RabbitMQ
  ],
  controllers: [
    WebhookController,
  ]
})
export class AppModule { }