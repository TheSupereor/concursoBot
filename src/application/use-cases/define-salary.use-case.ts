import { SubscriberNotFoundError } from '../errors/subscriber-not-found.error';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';
import { Salary } from '../../domain/value-objects/salary';

export class DefineSalaryUseCase {
  constructor(private readonly subscriberRepository: ISubscriberRepository) {}

  async execute(telegramId: string, valor: number): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      throw new SubscriberNotFoundError(telegramId);
    }

    const newSalary = new Salary(valor);
    subscriber.applyMinimumSalary(newSalary);

    await this.subscriberRepository.save(subscriber);
  }
}
