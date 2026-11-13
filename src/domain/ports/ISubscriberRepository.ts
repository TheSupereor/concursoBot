import { Subscriber } from '../entities/Subscriber';

// Dependency Inversion
export interface ISubscriberRepository {
  save(subscriber: Subscriber): Promise<void>;
  searchByTelegramId(telegramId: string): Promise<Subscriber | null>;
  searchActiveSubscribers(): Promise<Subscriber[]>;
}
