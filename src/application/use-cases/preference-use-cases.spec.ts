import { Subscriber } from '../../domain/entities/subscriber';
import {
  DuplicatePreferenceError,
  InvalidPreferenceError,
  NoPreferencesError,
} from '../../domain/errors/domain.error';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';
import { SubscriberNotFoundError } from '../errors/subscriber-not-found.error';
import { AddPreferenceUseCase } from './add-preference.use-case';
import { DefineSalaryUseCase } from './define-salary.use-case';
import { RemovePreferenceUseCase } from './remove-preference.use-case';

describe('preference use cases', () => {
  let subscriber: Subscriber | null;
  let repository: jest.Mocked<ISubscriberRepository>;

  beforeEach(() => {
    subscriber = new Subscriber('42', true);
    repository = {
      save: jest.fn(),
      searchByTelegramId: jest.fn().mockImplementation(async () => subscriber),
      searchActiveSubscribers: jest.fn(),
    };
  });

  describe('AddPreferenceUseCase', () => {
    const useCase = () => new AddPreferenceUseCase(repository);

    it('adds a nationwide preference with no minimum salary by default', async () => {
      await useCase().execute('42', 'TI');

      const [pref] = subscriber!.getPreferences();
      expect(pref).toMatchObject({ area: 'TI', region: 'BR' });
      expect(pref.minimumSalary.value).toBe(0);
      expect(repository.save).toHaveBeenCalledWith(subscriber);
    });

    it('fails for an unknown subscriber', async () => {
      subscriber = null;

      await expect(useCase().execute('42', 'TI')).rejects.toBeInstanceOf(
        SubscriberNotFoundError,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown area before saving anything', async () => {
      await expect(
        useCase().execute('42', 'ASTRONAUTA'),
      ).rejects.toBeInstanceOf(InvalidPreferenceError);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects a duplicate area and region', async () => {
      await useCase().execute('42', 'TI', 'SP');

      await expect(useCase().execute('42', 'TI', 'SP')).rejects.toBeInstanceOf(
        DuplicatePreferenceError,
      );
    });
  });

  describe('RemovePreferenceUseCase', () => {
    it('removes only the chosen area and region', async () => {
      const add = new AddPreferenceUseCase(repository);
      await add.execute('42', 'TI', 'SP');
      await add.execute('42', 'TI', 'RJ');

      await new RemovePreferenceUseCase(repository).execute('42', 'TI', 'SP');

      expect(subscriber!.getPreferences().map((p) => p.region)).toEqual(['RJ']);
    });

    it('fails for an unknown subscriber', async () => {
      subscriber = null;

      await expect(
        new RemovePreferenceUseCase(repository).execute('42', 'TI', 'SP'),
      ).rejects.toBeInstanceOf(SubscriberNotFoundError);
    });
  });

  describe('DefineSalaryUseCase', () => {
    it('applies the minimum salary to every preference', async () => {
      const add = new AddPreferenceUseCase(repository);
      await add.execute('42', 'TI', 'SP');
      await add.execute('42', 'SAUDE', 'RJ');

      await new DefineSalaryUseCase(repository).execute('42', 7000);

      expect(
        subscriber!.getPreferences().map((p) => p.minimumSalary.value),
      ).toEqual([7000, 7000]);
    });

    it('requires at least one preference', async () => {
      await expect(
        new DefineSalaryUseCase(repository).execute('42', 7000),
      ).rejects.toBeInstanceOf(NoPreferencesError);
    });

    it('fails for an unknown subscriber', async () => {
      subscriber = null;

      await expect(
        new DefineSalaryUseCase(repository).execute('42', 7000),
      ).rejects.toBeInstanceOf(SubscriberNotFoundError);
    });
  });
});
