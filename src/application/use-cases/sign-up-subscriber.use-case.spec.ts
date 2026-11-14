import { Subscriber } from '../../domain/entities/subscriber';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';
import { SignUpSubscriberUseCase } from './sign-up-subscriber.use-case';

describe('SignUpSubscriberUseCase', () => {
  let saved: Subscriber[];
  let repository: ISubscriberRepository;
  let existing: Subscriber | null;

  beforeEach(() => {
    saved = [];
    existing = null;
    repository = {
      save: async (subscriber) => {
        saved.push(subscriber);
      },
      searchByTelegramId: async () => existing,
      searchActiveSubscribers: async () => [],
    };
  });

  it('registers new users as inactive until a payment activates them', async () => {
    await new SignUpSubscriberUseCase(repository).execute('telegram-1');

    expect(saved).toHaveLength(1);
    expect(saved[0].telegramId).toBe('telegram-1');
    expect(saved[0].isActive).toBe(false);
  });

  it('does not touch an existing subscriber', async () => {
    existing = new Subscriber('telegram-1', true);

    await new SignUpSubscriberUseCase(repository).execute('telegram-1');

    expect(saved).toHaveLength(0);
    expect(existing.isActive).toBe(true);
  });
});
