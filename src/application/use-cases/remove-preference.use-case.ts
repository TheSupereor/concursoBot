import { SubscriberNotFoundError } from '../errors/subscriber-not-found.error';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';

export class RemovePreferenceUseCase {
  constructor(private readonly subscriberRepository: ISubscriberRepository) {}

  async execute(
    telegramId: string,
    area: string,
    region: string,
  ): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      throw new SubscriberNotFoundError(telegramId);
    }

    // Delega a ação para o domínio
    subscriber.removePreference(area, region);

    // Salva o novo estado no banco de dados
    await this.subscriberRepository.save(subscriber);
  }
}
