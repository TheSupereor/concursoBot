import { ILogger } from '../ports/logger.port';
import { Subscriber } from '../../domain/entities/subscriber';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';

export class SignUpSubscriberUseCase {
  constructor(
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(telegramId: string): Promise<void> {
    const existingSubscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (existingSubscriber) return;

    const newSubscriber = new Subscriber(telegramId, false);
    await this.subscriberRepository.save(newSubscriber);

    this.logger.info(`New subscriber registered: ${telegramId}`);
  }
}
