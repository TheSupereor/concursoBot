import { Vacancy } from '../../domain/entities/Vacancy';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';
import { INotificationService } from '../../domain/ports/INotificationService';
import { INotificationLogRepository } from '../../domain/ports/INotificationLogRepository';
import { RetryableDeliveryError } from '../errors/RetryableDeliveryError';

export class NotifySubscriberUseCase {
  // Dependency Injection here: the use case asks for the interfaces, not real implementations.
  // This is the D from the SOLID
  constructor(
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly notificationService: INotificationService,
    private readonly notificationLogRepository: INotificationLogRepository,
  ) {}

  /**
   * Delivers a vacancy to every interested subscriber exactly once.
   *
   * Each subscriber is claimed before delivery (claim-first), so concurrent consumers and
   * redelivered messages cannot send duplicates. Throws RetryableDeliveryError when some
   * subscribers could not be served yet, so the message is retried instead of acknowledged.
   */
  async execute(newVacancy: Vacancy): Promise<void> {
    const activeSubscribers =
      await this.subscriberRepository.searchActiveSubscribers();

    let pendingRetries = 0;

    for (const subscriber of activeSubscribers) {
      // The business rule for "is this subscriber interested" lives in the domain.
      if (!subscriber.hasInterest(newVacancy)) continue;

      const { telegramId } = subscriber;
      const claim = await this.notificationLogRepository.claim(
        telegramId,
        newVacancy.id,
      );

      if (claim === 'already_handled') continue;

      if (claim === 'in_progress') {
        // Another worker owns this delivery; do not acknowledge until it is settled.
        pendingRetries++;
        continue;
      }

      let result;
      try {
        result = await this.notificationService.sendVacancyAlert(
          subscriber,
          newVacancy,
        );
      } catch (error) {
        await this.notificationLogRepository.release(telegramId, newVacancy.id);
        throw error;
      }

      switch (result.status) {
        case 'sent':
          await this.notificationLogRepository.markSent(
            telegramId,
            newVacancy.id,
          );
          break;
        case 'retryable':
          await this.notificationLogRepository.release(
            telegramId,
            newVacancy.id,
          );
          pendingRetries++;
          break;
        case 'blocked':
        case 'invalid':
          // Retrying cannot help; record it so one bad recipient never blocks the others.
          await this.notificationLogRepository.markFailed(
            telegramId,
            newVacancy.id,
          );
          // TODO(phase 2): replace console.* with a logger port.
          console.warn(
            `Skipping vacancy ${newVacancy.id} for ${telegramId}: delivery ${result.status}`,
          );
          break;
      }
    }

    if (pendingRetries > 0) {
      throw new RetryableDeliveryError(newVacancy.id, pendingRetries);
    }
  }
}
