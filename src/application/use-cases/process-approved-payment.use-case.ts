import { ILogger } from '../ports/logger.port';
import { SubscriberNotFoundError } from '../errors/subscriber-not-found.error';
import { INotificationService } from '../../domain/ports/notification-service.port';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';

export class ProcessApprovedPaymentUseCase {
  constructor(
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly notificationService: INotificationService,
    private readonly logger: ILogger,
  ) {}

  async execute(telegramId: string): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      throw new SubscriberNotFoundError(telegramId);
    }

    // Idempotent: a repeated or concurrent payment event must not re-activate or re-notify.
    if (subscriber.isActive) return;

    subscriber.activateSubscription();
    await this.subscriberRepository.save(subscriber);
    await this.notificationService.sendCustomAlert(
      subscriber,
      `Assinatura ativada com sucesso!`,
    );
    this.logger.info(`Subscription activated for ${telegramId}`);
  }
}
