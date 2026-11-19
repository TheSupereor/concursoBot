import { Vacancy } from '../../domain/entities/vacancy';

/**
 * Remembers which vacancies were already published, so a restart or a second run does not
 * announce the same competition again.
 */
export interface IVacancyRepository {
  exists(id: string): Promise<boolean>;
  /** Records a published vacancy. Registering the same id twice is not an error. */
  register(vacancy: Vacancy, source: string): Promise<void>;
}
