import { Inject } from '@nestjs/common';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';

export interface PreferenceStatus {
  area: string;
  region: string;
  minimumSalary: number;
}

export interface SubscriberStatus {
  exists: boolean;
  isActive: boolean;
  preferences: PreferenceStatus[];
}

export class GetSubscriberStatusUseCase {
  constructor(
    @Inject('ISubscriberRepository')
    private readonly subscriberRepository: ISubscriberRepository,
  ) {}

  async execute(telegramId: string): Promise<SubscriberStatus> {
    const subscriber = await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber) {
      return { exists: false, isActive: false, preferences: [] };
    }

    return {
      exists: true,
      isActive: subscriber.isActive,
      preferences: subscriber.getPreferences().map((pref) => ({
        area: pref.area,
        region: pref.region,
        minimumSalary: pref.minimunSalary.value,
      })),
    };
  }
}
