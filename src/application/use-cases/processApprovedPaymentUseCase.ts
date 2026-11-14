import { INotificationService } from '../../domain/ports/INotificationService';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';

export class ProcessApprovedPaymentUseCase {
  constructor(
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(telegramId: string): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      throw new Error('Pagamento recebido para um assinante não encontrado.');
    }

    // Idempotent: a repeated or concurrent payment event must not re-activate or re-notify.
    if (subscriber.isActive) return;

    subscriber.activateSubscription();
    await this.subscriberRepository.save(subscriber);
    await this.notificationService.sendCustomAlert(
      subscriber,
      `Assinatura ativada com sucesso!`,
    );
    console.log(`[Pagamento] Assinatura ativada para o usuário ${telegramId}`);
  }
}
