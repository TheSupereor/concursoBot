import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';
import { Salary } from '../../domain/value-objects/Salary';

export class DefineSalaryUseCase {
  constructor(private readonly subscriberRepository: ISubscriberRepository) {}

  async execute(telegramId: string, valor: number): Promise<void> {
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      throw new Error('Subscriber não encontrado.');
    }

    const newSalary = new Salary(valor);
    subscriber.defineMinimumGlobalSalary(newSalary);

    await this.subscriberRepository.save(subscriber);
  }
}
