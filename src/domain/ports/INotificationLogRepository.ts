export interface INotificationLogRepository {
  alreadySent(telegramId: string, vacancyId: string): Promise<boolean>;
  registerSent(telegramId: string, vacancyId: string): Promise<void>;
}