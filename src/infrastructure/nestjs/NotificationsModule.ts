import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramNotificationService } from '../telegram/TelegramNotificationService';
import { MysqlSubscriberRepository } from '../database/repositories/MysqlAssinanteRepository';
import { NotifySubscriberUseCase } from '../../application/use-cases/NotifySubscriberUseCase';
import { SubscriberOrmEntity } from '../../domain/entities/SubscriberOrmEntity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriberOrmEntity]) // Conecta a tabela do TypeORM
  ],
  providers: [
    // 1. Registramos o Repositório do MySQL na "vaga" da Interface
    {
      provide: 'IAssinanteRepository',
      useClass: MysqlSubscriberRepository,
    },
    // 2. Registramos o Serviço do Telegram na "vaga" da Interface
    {
      provide: 'INotificacaoService',
      useClass: TelegramNotificationService,
    },
    // 3. Registramos o nosso Caso de Uso! (O NestJS vai injetar as dependências nele)
    {
      provide: NotifySubscriberUseCase,
      useFactory: (repo: MysqlSubscriberRepository, notificador: TelegramNotificationService) => {
        const noopLog = { alreadySent: async () => false, registerSent: async () => {} };
        return new NotifySubscriberUseCase(repo, notificador, noopLog);
      },
      inject: ['IAssinanteRepository', 'INotificacaoService'],
    }
  ],
  exports: [NotifySubscriberUseCase] // Expõe o caso de uso para ser chamado pelo Controller/Worker
})
export class NotificacoesModule {}