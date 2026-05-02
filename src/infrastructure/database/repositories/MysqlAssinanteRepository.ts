import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISubscriberRepository } from '../../../domain/ports/ISubscriberRepository';
import { Subscriber } from '../../../domain/entities/Subscriber';
import { Preference } from '../../../domain/value-objects/Preference';
import { Salary } from '../../../domain/value-objects/Salary';
import { SubscriberOrmEntity } from '../../../domain/entities/SubscriberOrmEntity';

@Injectable()
export class MysqlSubscriberRepository implements ISubscriberRepository {
  
  constructor(
    @InjectRepository(SubscriberOrmEntity)
    private readonly ormRepository: Repository<SubscriberOrmEntity>
  ) {}

  async searchActiveSubscribers(): Promise<Subscriber[]> {
    // Busca os dados "burros" do banco (TypeORM)
    const ormAssinantes = await this.ormRepository.find({
      where: { isActive: true },
      relations: ['preferences'] // Traz as preferências junto (JOIN)
    });

    // Transforma os dados do banco na nossa Entidade Rica (Domain)
    return ormAssinantes.map(ormData => {
      const subscriber = new Subscriber(ormData.telegramId, ormData.isActive);
      
      if (ormData.preferences) {
        for (const prefOrm of ormData.preferences) {
          subscriber.addPreference(
            new Preference(prefOrm.area, prefOrm.region, new Salary(prefOrm.minimunSalary))
          );
        }
      }
      return subscriber;
    });
  }

  async save(subscriber: Subscriber): Promise<void> {
    // Aqui faríamos o caminho inverso: extrair os dados da entidade
    // e salvar usando this.ormRepository.save(...)
  }

  async searchByTelegramId(telegramId: string): Promise<Subscriber | null> {
    // Implementação omitida para brevidade (segue a mesma lógica de mapeamento acima)
    return null;
  }
}