import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';

export class RemovePreferenceUseCase {
  constructor(private readonly subscriberRepository: ISubscriberRepository) {}

  async execute(telegramId: string, area: string): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      throw new Error('Assinante não encontrado.');
    }

    // Delega a ação para o domínio
    subscriber.removePreferenceByArea(area);

    // Salva o novo estado no banco de dados
    await this.subscriberRepository.save(subscriber);
  }
}
