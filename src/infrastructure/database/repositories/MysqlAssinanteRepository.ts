import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISubscriberRepository } from '../../../domain/ports/subscriber-repository.port';
import { Subscriber } from '../../../domain/entities/subscriber';
import { Preference } from '../../../domain/value-objects/preference';
import { Salary } from '../../../domain/value-objects/salary';
import { SubscriberOrmEntity } from '../../../domain/entities/SubscriberOrmEntity';
import { PreferenceOrmEntity } from '../../../domain/entities/PreferenceOrmEntity';

@Injectable()
export class MysqlSubscriberRepository implements ISubscriberRepository {
  constructor(
    @InjectRepository(SubscriberOrmEntity)
    private readonly ormRepository: Repository<SubscriberOrmEntity>,
  ) {}

  async searchActiveSubscribers(): Promise<Subscriber[]> {
    const ormSubscribers = await this.ormRepository.find({
      where: { isActive: true },
      relations: ['preferences'],
    });

    return ormSubscribers.map((ormData) => this.toDomain(ormData));
  }

  async searchByTelegramId(telegramId: string): Promise<Subscriber | null> {
    const ormData = await this.ormRepository.findOne({
      where: { telegramId },
      relations: ['preferences'],
    });

    if (!ormData) return null;

    return this.toDomain(ormData);
  }

  async save(subscriber: Subscriber): Promise<void> {
    const ormEntity = new SubscriberOrmEntity();
    ormEntity.telegramId = subscriber.telegramId;
    ormEntity.isActive = subscriber.isActive;
    ormEntity.preferences = subscriber.getPreferences().map((pref) => {
      const prefOrm = new PreferenceOrmEntity();
      prefOrm.area = pref.area;
      prefOrm.region = pref.region;
      prefOrm.minimunSalary = pref.minimunSalary.value;
      return prefOrm;
    });

    await this.ormRepository.save(ormEntity);
  }

  private toDomain(ormData: SubscriberOrmEntity): Subscriber {
    const subscriber = new Subscriber(ormData.telegramId, ormData.isActive);

    if (ormData.preferences) {
      for (const prefOrm of ormData.preferences) {
        subscriber.addPreference(
          new Preference(
            prefOrm.area,
            prefOrm.region,
            new Salary(Number(prefOrm.minimunSalary)),
          ),
        );
      }
    }

    return subscriber;
  }
}
