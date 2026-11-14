import { SubscriberNotFoundError } from '../errors/subscriber-not-found.error';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';
import { Preference } from '../../domain/value-objects/preference';
import { Salary } from '../../domain/value-objects/salary';

export class AddPreferenceUseCase {
  constructor(private readonly subscriberRepository: ISubscriberRepository) {}

  async execute(
    telegramId: string,
    area: string,
    region: string = 'BR',
  ): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);
    if (!subscriber) {
      throw new SubscriberNotFoundError(telegramId);
    }

    subscriber.addPreference(new Preference(area, region, new Salary(0)));
    await this.subscriberRepository.save(subscriber);
  }
}
