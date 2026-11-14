import { DomainError } from '../../domain/errors/domain.error';

export class SubscriberNotFoundError extends DomainError {
  readonly code = 'SUBSCRIBER_NOT_FOUND';

  constructor(telegramId: string) {
    super(`No subscriber found for Telegram id ${telegramId}`);
  }
}
