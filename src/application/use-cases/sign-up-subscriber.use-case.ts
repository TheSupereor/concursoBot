import { Subscriber } from '../../domain/entities/subscriber';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';

export class SignUpSubscriberUseCase {
  constructor(private readonly subscriberRepository: ISubscriberRepository) {}

  async execute(telegramId: string): Promise<void> {
    const existingSubscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (existingSubscriber) return;

    const newSubscriber = new Subscriber(telegramId, false);
    await this.subscriberRepository.save(newSubscriber);

    console.log(`[Domínio] Novo assinante cadastrado: ${telegramId}`);
  }
}
