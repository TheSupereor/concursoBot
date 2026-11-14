import { Subscriber } from '../entities/subscriber';

// Dependency Inversion
export interface ISubscriberRepository {
  save(subscriber: Subscriber): Promise<void>;
  searchByTelegramId(telegramId: string): Promise<Subscriber | null>;
  searchActiveSubscribers(): Promise<Subscriber[]>;
}
