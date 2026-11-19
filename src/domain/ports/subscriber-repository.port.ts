import { Subscriber } from '../entities/subscriber';
import { Vacancy } from '../entities/vacancy';

// Dependency Inversion
export interface ISubscriberRepository {
  save(subscriber: Subscriber): Promise<void>;
  searchByTelegramId(telegramId: string): Promise<Subscriber | null>;
  /**
   * Active subscribers that have at least one preference matching the vacancy, with their
   * complete preferences. A pre-filter: the domain rule (`Subscriber.hasInterest`) stays the
   * source of truth and is applied again by the caller.
   */
  searchInterestedIn(vacancy: Vacancy): Promise<Subscriber[]>;
}
