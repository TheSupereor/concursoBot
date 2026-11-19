import { Vacancy } from '../../domain/entities/vacancy';

/** Outbound port: hands a new vacancy to whatever notifies subscribers (a message queue). */
export interface IVacancyPublisher {
  publish(vacancy: Vacancy): Promise<void>;
}
