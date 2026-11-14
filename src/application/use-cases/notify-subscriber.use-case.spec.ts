import { Subscriber } from '../../domain/entities/subscriber';
import { Vacancy } from '../../domain/entities/vacancy';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';
import {
  DeliveryResult,
  INotificationService,
} from '../../domain/ports/notification-service.port';
import {
  ClaimResult,
  INotificationLogRepository,
} from '../../domain/ports/notification-log-repository.port';
import { Preference } from '../../domain/value-objects/preference';
import { Salary } from '../../domain/value-objects/salary';
import { NotifySubscriberUseCase } from './notify-subscriber.use-case';
import { RetryableDeliveryError } from '../errors/retryable-delivery.error';

/**
 * In-memory log with the same semantics as the MySQL implementation: claim is atomic and
 * only one caller can own a (subscriber, vacancy) pair until it is released or finished.
 */
class InMemoryNotificationLog implements INotificationLogRepository {
  readonly entries = new Map<string, 'PENDING' | 'SENT' | 'FAILED'>();

  private key(telegramId: string, vacancyId: string): string {
    return `${telegramId}:${vacancyId}`;
  }

  async claim(telegramId: string, vacancyId: string): Promise<ClaimResult> {
    const key = this.key(telegramId, vacancyId);
    const current = this.entries.get(key);
    if (current === undefined) {
      this.entries.set(key, 'PENDING');
      return 'claimed';
    }
    return current === 'PENDING' ? 'in_progress' : 'already_handled';
  }

  async markSent(telegramId: string, vacancyId: string): Promise<void> {
    this.entries.set(this.key(telegramId, vacancyId), 'SENT');
  }

  async markFailed(telegramId: string, vacancyId: string): Promise<void> {
    this.entries.set(this.key(telegramId, vacancyId), 'FAILED');
  }

  async release(telegramId: string, vacancyId: string): Promise<void> {
    this.entries.delete(this.key(telegramId, vacancyId));
  }
}

const interested = (telegramId: string, area = 'TI'): Subscriber => {
  const subscriber = new Subscriber(telegramId, true);
  subscriber.addPreference(new Preference(area, 'SP', new Salary(0)));
  return subscriber;
};

describe('NotifySubscriberUseCase', () => {
  let subscribers: jest.Mocked<ISubscriberRepository>;
  let notifier: jest.Mocked<INotificationService>;
  let log: InMemoryNotificationLog;
  let useCase: NotifySubscriberUseCase;
  const vacancy = new Vacancy('vaga-1', 'Dev', 'TI', 'SP', new Salary(8000));

  const deliverWith = (result: DeliveryResult) =>
    notifier.sendVacancyAlert.mockResolvedValue(result);

  beforeEach(() => {
    subscribers = {
      save: jest.fn(),
      searchByTelegramId: jest.fn(),
      searchActiveSubscribers: jest.fn(),
    };
    notifier = {
      sendVacancyAlert: jest.fn().mockResolvedValue({ status: 'sent' }),
      sendCustomAlert: jest.fn().mockResolvedValue({ status: 'sent' }),
    };
    log = new InMemoryNotificationLog();
    useCase = new NotifySubscriberUseCase(subscribers, notifier, log);
  });

  it('notifies only the subscribers interested in the vacancy', async () => {
    const tiSubscriber = interested('telegram-1', 'TI');
    const lawSubscriber = interested('telegram-2', 'Direito');
    subscribers.searchActiveSubscribers.mockResolvedValue([
      tiSubscriber,
      lawSubscriber,
    ]);

    await useCase.execute(vacancy);

    expect(notifier.sendVacancyAlert).toHaveBeenCalledTimes(1);
    expect(notifier.sendVacancyAlert).toHaveBeenCalledWith(
      tiSubscriber,
      vacancy,
    );
  });

  it('marks the notification as sent after a successful delivery', async () => {
    subscribers.searchActiveSubscribers.mockResolvedValue([
      interested('telegram-1'),
    ]);

    await useCase.execute(vacancy);

    expect(log.entries.get('telegram-1:vaga-1')).toBe('SENT');
  });

  describe('idempotency', () => {
    it('never delivers the same vacancy to the same subscriber twice', async () => {
      subscribers.searchActiveSubscribers.mockResolvedValue([
        interested('telegram-1'),
      ]);

      await useCase.execute(vacancy);
      await useCase.execute(vacancy);

      expect(notifier.sendVacancyAlert).toHaveBeenCalledTimes(1);
    });

    it('delivers once when two consumers process the same vacancy concurrently', async () => {
      subscribers.searchActiveSubscribers.mockResolvedValue([
        interested('telegram-1'),
      ]);
      // Keep delivery pending so the second consumer runs while the first still owns the claim.
      let finishDelivery: (result: DeliveryResult) => void = () => undefined;
      notifier.sendVacancyAlert.mockImplementationOnce(
        () => new Promise((resolve) => (finishDelivery = resolve)),
      );

      const first = useCase.execute(vacancy);
      await new Promise((resolve) => setImmediate(resolve));
      const second = useCase.execute(vacancy);

      // The second consumer must not deliver, and must ask for a retry instead of acking:
      // the first consumer could still crash before delivering.
      await expect(second).rejects.toBeInstanceOf(RetryableDeliveryError);
      finishDelivery({ status: 'sent' });
      await first;

      expect(notifier.sendVacancyAlert).toHaveBeenCalledTimes(1);
    });

    it('can retry after a transient failure without duplicating deliveries', async () => {
      subscribers.searchActiveSubscribers.mockResolvedValue([
        interested('telegram-1'),
      ]);
      deliverWith({ status: 'retryable' });
      await expect(useCase.execute(vacancy)).rejects.toBeInstanceOf(
        RetryableDeliveryError,
      );

      deliverWith({ status: 'sent' });
      await useCase.execute(vacancy);
      await useCase.execute(vacancy);

      expect(notifier.sendVacancyAlert).toHaveBeenCalledTimes(2);
      expect(log.entries.get('telegram-1:vaga-1')).toBe('SENT');
    });

    it('releases the claim when the adapter throws unexpectedly', async () => {
      subscribers.searchActiveSubscribers.mockResolvedValue([
        interested('telegram-1'),
      ]);
      notifier.sendVacancyAlert.mockRejectedValueOnce(new Error('boom'));

      await expect(useCase.execute(vacancy)).rejects.toThrow('boom');

      expect(log.entries.has('telegram-1:vaga-1')).toBe(false);
    });
  });

  describe('delivery failures', () => {
    it('keeps serving other subscribers when one delivery is retryable, then fails for retry', async () => {
      subscribers.searchActiveSubscribers.mockResolvedValue([
        interested('telegram-1'),
        interested('telegram-2'),
      ]);
      notifier.sendVacancyAlert.mockImplementation(async (subscriber) =>
        subscriber.telegramId === 'telegram-1'
          ? { status: 'retryable' }
          : { status: 'sent' },
      );

      await expect(useCase.execute(vacancy)).rejects.toBeInstanceOf(
        RetryableDeliveryError,
      );

      expect(log.entries.has('telegram-1:vaga-1')).toBe(false);
      expect(log.entries.get('telegram-2:vaga-1')).toBe('SENT');
    });

    it.each(['blocked', 'invalid'] as const)(
      'records a %s delivery as failed, without retrying it',
      async (status) => {
        subscribers.searchActiveSubscribers.mockResolvedValue([
          interested('telegram-1'),
        ]);
        deliverWith({ status });

        await expect(useCase.execute(vacancy)).resolves.toBeUndefined();
        await useCase.execute(vacancy);

        expect(log.entries.get('telegram-1:vaga-1')).toBe('FAILED');
        expect(notifier.sendVacancyAlert).toHaveBeenCalledTimes(1);
      },
    );
  });
});
