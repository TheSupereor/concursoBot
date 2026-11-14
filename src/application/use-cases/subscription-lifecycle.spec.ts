import { Subscriber } from '../../domain/entities/Subscriber';
import { INotificationService } from '../../domain/ports/INotificationService';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';
import { CancelSubscriptionUseCase } from './cancelSubscription';
import { ProcessApprovedPaymentUseCase } from './processApprovedPaymentUseCase';

describe('subscription lifecycle use cases', () => {
  let subscriber: Subscriber;
  let repository: jest.Mocked<ISubscriberRepository>;
  let notifier: jest.Mocked<INotificationService>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      searchByTelegramId: jest.fn().mockImplementation(async () => subscriber),
      searchActiveSubscribers: jest.fn(),
    };
    notifier = {
      sendVacancyAlert: jest.fn(),
      sendCustomAlert: jest.fn().mockResolvedValue({ status: 'sent' }),
    };
  });

  describe('ProcessApprovedPaymentUseCase', () => {
    it('activates an inactive subscriber and tells them once', async () => {
      subscriber = new Subscriber('42', false);

      await new ProcessApprovedPaymentUseCase(repository, notifier).execute(
        '42',
      );

      expect(subscriber.isActive).toBe(true);
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(notifier.sendCustomAlert).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: a repeated payment event does not re-notify', async () => {
      subscriber = new Subscriber('42', true);

      await new ProcessApprovedPaymentUseCase(repository, notifier).execute(
        '42',
      );

      expect(repository.save).not.toHaveBeenCalled();
      expect(notifier.sendCustomAlert).not.toHaveBeenCalled();
    });
  });

  describe('CancelSubscriptionUseCase', () => {
    it('deactivates an active subscriber and tells them once', async () => {
      subscriber = new Subscriber('42', true);

      await new CancelSubscriptionUseCase(repository, notifier).execute('42');

      expect(subscriber.isActive).toBe(false);
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(notifier.sendCustomAlert).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: cancelling an inactive subscriber does nothing', async () => {
      subscriber = new Subscriber('42', false);

      await new CancelSubscriptionUseCase(repository, notifier).execute('42');

      expect(repository.save).not.toHaveBeenCalled();
      expect(notifier.sendCustomAlert).not.toHaveBeenCalled();
    });
  });
});
