import { INotificationService } from '../../domain/ports/INotificationService';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';

export class CancelSubscriptionUseCase {
  constructor(
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(telegramId: string): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      console.warn(
        `Tentativa de cancelamento para usuário não encontrado: ${telegramId}`,
      );
      return;
    }

    // 1. Regra de Negócio: Desativa a conta
    subscriber.cancelSubscription();

    // 2. Persiste a mudança no MySQL
    await this.subscriberRepository.save(subscriber);

    try {
      await this.notificationService.sendCustomAlert(
        subscriber,
        '⚠️ Sua assinatura foi cancelada e você não receberá mais alertas de vagas.\n\n' +
          'Se mudar de ideia, use /assinar para reativar quando quiser.',
      );
    } catch (error) {
      console.error('Erro ao notificar cancelamento', error);
    }
  }
}
