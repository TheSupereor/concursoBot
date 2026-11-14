import { INotificationService } from '../../domain/ports/notification-service.port';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';

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

    // Idempotent: cancelling an already inactive subscriber changes nothing and notifies no one.
    if (!subscriber.isActive) return;

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
