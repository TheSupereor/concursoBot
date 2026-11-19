import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { IVacancyPublisher } from '../../application/ports/vacancy-publisher.port';
import { Vacancy } from '../../domain/entities/vacancy';
import { RABBITMQ_CLIENT } from '../../shared/tokens';
import { VACANCY_EVENT } from './rabbitmq.config';

/**
 * Publishes a vacancy to the vacancy queue. The message carries everything the consumer needs
 * and is validated there (see VacancyConsumer), so both sides must agree on this shape.
 */
@Injectable()
export class RabbitMqVacancyPublisher implements IVacancyPublisher {
  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  async publish(vacancy: Vacancy): Promise<void> {
    // Waiting for the emit to settle is what turns a broker failure into an exception.
    await lastValueFrom(
      this.client.emit(VACANCY_EVENT, {
        id: vacancy.id,
        job: vacancy.job,
        areas: [...vacancy.areas],
        region: vacancy.region,
        salary: vacancy.salary.value,
        url: vacancy.details.url,
        organization: vacancy.details.organization,
        deadline: vacancy.details.deadline?.toISOString().slice(0, 10),
      }),
      // An event emit completes without producing a value.
      { defaultValue: undefined },
    );
  }
}
